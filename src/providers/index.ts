import { Context, Hono } from "hono"
import { contentJson, fromHono, OpenAPIRoute } from 'chanfana';
import { z } from "zod";

import { resolveRouteId } from "./shared/route-policy"
import { resolveChannel } from "./shared/channel-resolver"
import { getProvider } from "./shared/provider-registry"
import { ModelsEndpoint } from "./models"

export const api = fromHono(new Hono<HonoCustomType>())

class UnifiedProxyEndpoint extends OpenAPIRoute {
    schema = {
        tags: ['OpenAI Proxy'],
        request: {
            headers: z.object({
                'Authorization': z.string().optional().describe("Token for authentication (OpenAI format)"),
                'x-api-key': z.string().optional().describe("API key for authentication (Claude format)"),
            }),
            body: contentJson({
                schema: z.any(),
            }),
        },
        responses: {
            200: {
                description: 'Successful response',
            },
        },
    };

    async handle(c: Context<HonoCustomType>) {
        const routeId = resolveRouteId(c.req.path)
        if (!routeId) {
            return c.text("Unknown route", 404)
        }

        const result = await resolveChannel(c, routeId)
        if (result instanceof Response) return result

        const { channel, requestBody, saveUsage } = result

        const provider = getProvider(channel.config.type || "")
        if (!provider) {
            return c.text("Channel type not supported", 400)
        }

        return provider(c, channel.config, requestBody, saveUsage)
    }
}

api.post("/v1/chat/completions", UnifiedProxyEndpoint)
api.post("/v1/messages", UnifiedProxyEndpoint)
api.post("/v1/responses", UnifiedProxyEndpoint)
api.get("/v1/models", ModelsEndpoint)
