import { Context } from "hono"

export const checkoutUsageData = async (
    saveUsage: (usage: Usage) => Promise<void>,
    response: Response | OpenAIResponse
): Promise<void> => {
    try {
        const res = response instanceof Response
            ? await response.clone().json<OpenAIResponse>()
            : response
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
