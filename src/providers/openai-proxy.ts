import { Context } from "hono"
import { checkoutUsageData, handleStreamResponse } from "./shared/openai-stream-utils"

const buildProxyRequest = (
    request: Request,
    reqJson: any,
    config: ChannelConfig
): Request => {
    const url = new URL(request.url)
    const targetUrl = new URL(config.endpoint)

    targetUrl.pathname = url.pathname

    const targetHeaders = new Headers(request.headers)
    targetHeaders.delete("Host")
    targetHeaders.delete("Cookie")
    targetHeaders.set("Authorization", `Bearer ${config.api_key}`)

    return new Request(targetUrl, {
        method: request.method,
        headers: targetHeaders,
        body: JSON.stringify(reqJson),
    })
}

export default {
    async fetch(
        c: Context<HonoCustomType>,
        config: ChannelConfig,
        requestBody: any,
        saveUsage: (usage: Usage) => Promise<void>,
    ): Promise<Response> {
        const { stream } = requestBody;

        if (stream) {
            requestBody.stream_options = {
                ...(requestBody.stream_options || {}),
                include_usage: true,
            }
        }

        const proxyRequest = buildProxyRequest(c.req.raw, requestBody, config)
        const response = await fetch(proxyRequest)

        if (stream) {
            const [streamForClient, streamForServer] = response.body?.tee() || []
            c.executionCtx.waitUntil(handleStreamResponse(c, streamForServer, saveUsage))
            return new Response(streamForClient, {
                headers: response.headers,
                status: response.status,
                statusText: response.statusText,
            })
        }

        if (response.ok) {
            await checkoutUsageData(saveUsage, response)
        }

        return response
    }
}
