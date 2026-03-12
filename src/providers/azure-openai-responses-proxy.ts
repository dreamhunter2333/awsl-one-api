import { Context } from "hono"
import {
    handleStreamResponse,
    OpenAIResponsesResponse,
    extractUsageFromResponse,
    estimateUsageFromBodies,
} from "./shared/responses-stream-utils"

const buildProxyRequest = (
    request: Request,
    reqJson: any,
    config: ChannelConfig
): Request => {
    const url = new URL(request.url)
    const targetUrl = new URL(config.endpoint)

    if (!config.endpoint.endsWith('#')) {
        targetUrl.pathname = `/openai${url.pathname}`
    }

    if (config.api_version) {
        targetUrl.searchParams.set('api-version', config.api_version)
    }

    const targetHeaders = new Headers(request.headers)
    targetHeaders.delete("Authorization")
    targetHeaders.delete("Host")
    targetHeaders.delete("Cookie")
    targetHeaders.set("api-key", config.api_key)

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

        return response
    }
}
