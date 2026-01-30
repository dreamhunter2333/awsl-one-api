import { Context } from "hono"
import { streamText } from 'hono/streaming'

// 辅助函数
const buildProxyRequest = (
    request: Request,
    reqJson: any,
    config: ChannelConfig,
    deploymentName: string
): Request => {
    const url = new URL(request.url)
    const targetUrl = new URL(config.endpoint)

    // 如果 endpoint 末尾不带 #，则设置标准的 Azure OpenAI pathname（保留原有 path 前缀）
    if (!config.endpoint.endsWith('#')) {
        const basePath = targetUrl.pathname.endsWith('/')
            ? targetUrl.pathname.slice(0, -1)
            : targetUrl.pathname
        targetUrl.pathname = `${basePath}/openai/deployments/${deploymentName}/${url.pathname.replace('/v1/', '')}`
    }

    if (config.api_version) {
        targetUrl.searchParams.set('api-version', config.api_version)
    }

    const targetHeaders = new Headers(request.headers)
    targetHeaders.delete("Authorization")
    targetHeaders.set("api-key", config.api_key)

    return new Request(targetUrl, {
        method: request.method,
        headers: targetHeaders,
        body: JSON.stringify(reqJson),
    })
}

const checkoutUsageData = async (
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

const processStreamData = async (
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

const handleStreamResponse = async (
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

    // 处理最后剩余的数据
    if (buffer.trim()) {
        await processStreamData([buffer], usageSaved, saveUsage)
    }
}

export default {
    async fetch(
        c: Context<HonoCustomType>,
        config: ChannelConfig,
        requestBody: any,
        saveUsage: (usage: Usage) => Promise<void>,
    ): Promise<Response> {
        // model 已在上层完成映射，直接作为 deploymentName 使用
        const { model: deploymentName, stream } = requestBody;

        // 强制包含使用数据
        if (stream) {
            requestBody.stream_options = {
                ...(requestBody.stream_options || {}),
                include_usage: true,
            }
        }

        // 构建目标请求
        const proxyRequest = buildProxyRequest(c.req.raw, requestBody, config, deploymentName)

        // 发送请求并获取响应
        const response = await fetch(proxyRequest)

        // 处理流式响应
        if (stream) {
            const [streamForClient, streamForServer] = response.body?.tee() || []
            c.executionCtx.waitUntil(handleStreamResponse(c, streamForServer, saveUsage))
            return new Response(streamForClient, {
                headers: response.headers,
                status: response.status,
                statusText: response.statusText,
            })
        }

        // 处理常规响应
        if (response.ok) {
            await checkoutUsageData(saveUsage, response)
        }

        return response
    }
}
