import { Context } from "hono"
import {
    handleStreamResponse,
    checkoutResponsesUsageData,
} from "./shared/responses-stream-utils"

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
        const { stream } = requestBody

        const proxyRequest = buildProxyRequest(c.req.raw, requestBody, config)
        const response = await fetch(proxyRequest)

        if (stream) {
            const [streamForClient, streamForServer] = response.body?.tee() || []
            c.executionCtx.waitUntil(handleStreamResponse(c, streamForServer, requestBody, saveUsage))
            return new Response(streamForClient, {
                headers: response.headers,
                status: response.status,
                statusText: response.statusText,
            })
        }

        if (response.ok) {
            await checkoutResponsesUsageData(saveUsage, response, requestBody)
        }

        return response
    }
}
