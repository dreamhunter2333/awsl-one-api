import { Context } from "hono"

type OpenAIResponsesUsage = {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
}

type OpenAIResponsesResponse = {
    usage?: OpenAIResponsesUsage;
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
}

type OpenAIResponsesStreamEvent = {
    type?: string;
    response?: OpenAIResponsesResponse;
    delta?: string;
    text?: string;
}

const buildProxyRequest = (
    request: Request,
    reqJson: any,
    config: ChannelConfig
): Request => {
    const url = new URL(request.url)
    const targetUrl = new URL(config.endpoint)

    targetUrl.pathname = url.pathname

    const targetHeaders = new Headers(request.headers)
    targetHeaders.set("Authorization", `Bearer ${config.api_key}`)

    return new Request(targetUrl, {
        method: request.method,
        headers: targetHeaders,
        body: JSON.stringify(reqJson),
    })
}

const normalizeUsage = (raw?: OpenAIResponsesUsage): Usage | null => {
    if (!raw) return null
    const promptTokens = raw.prompt_tokens ?? raw.input_tokens
    const completionTokens = raw.completion_tokens ?? raw.output_tokens
    const totalTokens = raw.total_tokens ?? (
        (promptTokens ?? 0) + (completionTokens ?? 0)
    )
    if (promptTokens == null && completionTokens == null && totalTokens == null) {
        return null
    }
    return {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
    }
}

const extractUsageFromResponse = (res?: OpenAIResponsesResponse): Usage | null => {
    if (!res) return null
    return normalizeUsage(res.usage || res)
}

const estimateTokensFromText = (text: string): number => {
    if (!text) return 0
    const bytes = new TextEncoder().encode(text).length
    return Math.ceil(bytes / 4)
}

const estimateUsageFromBodies = (
    requestBody: any,
    responseBody?: any,
    streamedOutputText?: string
): Usage | null => {
    const promptText = requestBody ? JSON.stringify(requestBody) : ""
    const completionText = streamedOutputText
        ? streamedOutputText
        : (responseBody ? JSON.stringify(responseBody) : "")
    const promptTokens = estimateTokensFromText(promptText)
    const completionTokens = estimateTokensFromText(completionText)
    if (!promptTokens && !completionTokens) return null
    return {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
    }
}

const checkoutUsageData = async (
    saveUsage: (usage: Usage) => Promise<void>,
    response: Response | OpenAIResponsesResponse
): Promise<void> => {
    try {
        const res = response instanceof Response
            ? await response.clone().json<OpenAIResponsesResponse>()
            : response
        const usage = extractUsageFromResponse(res)
        if (!usage) return
        await saveUsage(usage)
    } catch (error) {
        console.error("Error logging usage data:", error)
    }
}

const processStreamData = async (
    lines: string[],
    usageSaved: { value: boolean },
    outputText: { value: string },
    outputLimit: number,
    saveUsage: (usage: Usage) => Promise<void>
): Promise<void> => {
    if (usageSaved.value) return
    const processedLines = lines
        .map(line => line.trim())
        .filter(line => line.length > 0 && line.startsWith('data:'))
        .map(line => line.replace('data:', '').trim())
        .filter(line => line !== '[DONE]')

    for (const jsonContent of processedLines) {
        try {
            const event = JSON.parse(jsonContent) as OpenAIResponsesStreamEvent
            if (event.type === "response.output_text.delta") {
                const deltaText = typeof event.delta === "string"
                    ? event.delta
                    : (typeof event.text === "string" ? event.text : "")
                if (deltaText) {
                    if (outputText.value.length < outputLimit) {
                        outputText.value += deltaText
                    }
                }
                continue
            }
            if (event.type !== "response.completed") {
                continue
            }
            const usage = extractUsageFromResponse(event.response)
            if (usage && !usageSaved.value) {
                await saveUsage(usage)
                usageSaved.value = true
            }
        } catch (e) {
            console.error("Error parsing stream data:", e)
        }
    }
}

const handleStreamResponse = async (
    c: Context<HonoCustomType>,
    streamForServer: ReadableStream<any> | undefined,
    requestBody: any,
    saveUsage: (usage: Usage) => Promise<void>
): Promise<void> => {
    const reader = streamForServer?.getReader()
    if (!reader) {
        throw new Error("No reader found in response body")
    }

    const decoder = new TextDecoder('utf-8')
    let buffer = ""
    const usageSaved = { value: false }
    const outputText = { value: "" }
    const outputLimit = 200_000
    while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        if (!chunk.includes('\n')) continue

        const lines = buffer.split('\n')
        buffer = lines.pop() || ""

        await processStreamData(lines, usageSaved, outputText, outputLimit, saveUsage)
    }

    if (buffer.trim()) {
        await processStreamData([buffer], usageSaved, outputText, outputLimit, saveUsage)
    }

    if (!usageSaved.value) {
        const estimatedUsage = estimateUsageFromBodies(
            requestBody,
            undefined,
            outputText.value
        )
        if (estimatedUsage) {
            await saveUsage(estimatedUsage)
        }
    }
}

export default {
    async fetch(
        c: Context<HonoCustomType>,
        config: ChannelConfig,
        requestBody: any,
        saveUsage: (usage: Usage) => Promise<void>,
    ): Promise<Response> {
        const reqJson = requestBody
        const { stream } = reqJson

        const proxyRequest = buildProxyRequest(c.req.raw, reqJson, config)
        const response = await fetch(proxyRequest)

        if (stream) {
            const [streamForClient, streamForServer] = response.body?.tee() || []
            c.executionCtx.waitUntil(handleStreamResponse(c, streamForServer, reqJson, saveUsage))
            return new Response(streamForClient, {
                headers: response.headers,
                status: response.status,
                statusText: response.statusText,
            })
        }

        if (response.ok) {
            try {
                const resJson = await response.clone().json<OpenAIResponsesResponse>()
                const usage = extractUsageFromResponse(resJson)
                if (usage) {
                    await saveUsage(usage)
                } else {
                    const estimatedUsage = estimateUsageFromBodies(reqJson, resJson)
                    if (estimatedUsage) {
                        await saveUsage(estimatedUsage)
                    }
                }
            } catch (error) {
                console.error("Error parsing response JSON for usage:", error)
            }
        }

        return response
    }
}
