import { Context } from "hono"

const AUDIO_OUTPUT_TOKENS_PER_MINUTE = 1250
const TEXT_TOKENS_PER_CHAR = 0.25
const SPEECH_CHARS_PER_MINUTE = 750

const collectInputText = (input: unknown): string => {
    if (typeof input === "string") {
        return input
    }

    if (Array.isArray(input)) {
        return input
            .map((item) => collectInputText(item))
            .filter((text) => text.length > 0)
            .join(" ")
    }

    if (input && typeof input === "object") {
        if ("text" in input && typeof input.text === "string") {
            return input.text
        }

        if ("content" in input) {
            return collectInputText(input.content)
        }
    }

    return ""
}

const estimateAudioSpeechUsage = (requestBody: any): Usage | null => {
    const inputText = collectInputText(requestBody?.input).trim()
    if (!inputText) {
        return null
    }

    const characterCount = Array.from(inputText).length
    const promptTokens = Math.max(1, Math.ceil(characterCount * TEXT_TOKENS_PER_CHAR))
    const estimatedMinutes = Math.max(1 / 60, characterCount / SPEECH_CHARS_PER_MINUTE)
    const completionTokens = Math.max(1, Math.ceil(estimatedMinutes * AUDIO_OUTPUT_TOKENS_PER_MINUTE))

    return {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
    }
}

export const checkoutUsageData = async (
    saveUsage: (usage: Usage) => Promise<void>,
    response: Response | OpenAIResponse,
    requestBody?: any,
): Promise<void> => {
    try {
        if (response instanceof Response) {
            const contentType = response.headers.get("content-type") || ""
            if (contentType.startsWith("audio/")) {
                const estimatedUsage = estimateAudioSpeechUsage(requestBody)
                if (!estimatedUsage) return
                await saveUsage(estimatedUsage)
                return
            }

            if (!contentType.includes("application/json")) {
                return
            }

            const res = await response.clone().json<OpenAIResponse>()
            if (!res.usage) return;
            await saveUsage(res.usage)
            return
        }

        const res = response
        if (!res.usage) return;
        await saveUsage(res.usage)
    } catch (error) {
        console.error("Error logging usage data:", error)
    }
}

export const processStreamData = async (
    lines: string[],
    usageSaved: { value: boolean },
    saveUsage: (usage: Usage) => Promise<void>
): Promise<void> => {
    if (usageSaved.value) return
    const processedLines = lines
        .map(line => line.trim())
        .filter(line => line.length > 0 && line.startsWith('data:'))
        .map(line => line.replace('data: ', '').trim())
        .filter(line => line !== '[DONE]')

    for (const jsonContent of processedLines) {
        try {
            const res = JSON.parse(jsonContent) as OpenAIResponse
            if (!res.usage) continue
            await saveUsage(res.usage)
            usageSaved.value = true
            break
        } catch (e) {
            console.error("Error parsing stream data:", e)
        }
    }
}

export const handleStreamResponse = async (
    c: Context<HonoCustomType>,
    streamForServer: ReadableStream<any> | undefined,
    saveUsage: (usage: Usage) => Promise<void>
): Promise<void> => {
    const reader = streamForServer?.getReader()
    if (!reader) {
        throw new Error("No reader found in response body")
    }

    const decoder = new TextDecoder('utf-8')
    let buffer = ""
    const usageSaved = { value: false }
    while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        if (!chunk.includes('\n')) continue

        const lines = buffer.split('\n')
        buffer = lines.pop() || ""

        await processStreamData(lines, usageSaved, saveUsage)
    }

    if (buffer.trim()) {
        await processStreamData([buffer], usageSaved, saveUsage)
    }
}
