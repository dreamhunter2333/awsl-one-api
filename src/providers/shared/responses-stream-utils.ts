import { Context } from "hono"
import {
    OpenAIResponsesResponse,
    OpenAIResponsesStreamEvent,
    extractUsageFromResponse,
    estimateUsageFromBodies,
} from "./usage-utils"

export const processStreamData = async (
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

export const handleStreamResponse = async (
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

export const checkoutResponsesUsageData = async (
    saveUsage: (usage: Usage) => Promise<void>,
    response: Response,
    requestBody: any,
): Promise<void> => {
    try {
        const resJson = await response.clone().json<OpenAIResponsesResponse>()
        const usage = extractUsageFromResponse(resJson)
        if (usage) {
            await saveUsage(usage)
        } else {
            const estimatedUsage = estimateUsageFromBodies(requestBody, resJson)
            if (estimatedUsage) {
                await saveUsage(estimatedUsage)
            }
        }
    } catch (error) {
        console.error("Error parsing response JSON for usage:", error)
    }
}

export { OpenAIResponsesResponse, extractUsageFromResponse, estimateUsageFromBodies }
