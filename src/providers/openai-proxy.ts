import { Context } from "hono"
import { streamText } from 'hono/streaming'

// 辅助函数
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

const processStreamData = (
    lines: string[],
    saveUsage: (usage: Usage) => Promise<void>
): void => {
    lines
        .map(line => line.trim())
        .filter(line => line.length > 0 && line.startsWith('data:'))
        .map(line => line.replace('data: ', '').trim())
        .filter(line => line !== '[DONE]')
        .forEach(jsonContent => {
            try {
                const res = JSON.parse(jsonContent) as OpenAIResponse
                checkoutUsageData(saveUsage, res)
            } catch (e) {
                console.error("Error parsing stream data:", e)
            }
        })
}

const handleStreamResponse = async (
    c: Context<HonoCustomType>,
    response: Response,
    saveUsage: (usage: Usage) => Promise<void>
): Promise<Response> => {
    return streamText(c, async (stream) => {
        const reader = response.body?.getReader()
        if (!reader) {
            throw new Error("No reader found in response body")
        }

        const decoder = new TextDecoder('utf-8')
        let buffer = ""

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            await stream.write(chunk)
            buffer += chunk

            if (!chunk.includes('\n')) continue

            const lines = buffer.split('\n')
            buffer = lines.pop() || ""

            processStreamData(lines, saveUsage)
        }

        // 处理最后剩余的数据
        if (buffer.trim()) {
            processStreamData([buffer], saveUsage)
        }
    })
}

export default {
    async fetch(
        c: Context<HonoCustomType>,
        config: ChannelConfig,
        saveUsage: (usage: Usage) => Promise<void>,
    ): Promise<Response> {
        // 准备请求数据
        const reqJson = await c.req.json()
        // 强制包含使用数据
        const { model: modelName, stream } = reqJson;
        if (stream) {
            reqJson.stream_options = { "include_usage": true }
        }

        // 检查模型是否受支持
        const deploymentName = config.deployment_mapper[modelName]
        if (!deploymentName) {
            throw new Error(`Model ${modelName} not supported`)
        }

        // 替换模型名称为映射后的名称
        reqJson.model = deploymentName

        // 构建目标请求
        const proxyRequest = buildProxyRequest(c.req.raw, reqJson, config)

        // 发送请求并获取响应
        const response = await fetch(proxyRequest)

        // 处理流式响应
        if (stream) {
            return handleStreamResponse(c, response, saveUsage)
        }

        // 处理常规响应
        if (response.ok) {
            await checkoutUsageData(saveUsage, response)
        }

        return response
    }
}
