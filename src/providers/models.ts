import { Context } from "hono";
import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { getApiKeyFromHeaders, fetchTokenData, fetchChannelsForToken } from "./shared/auth";

export class ModelsEndpoint extends OpenAPIRoute {
    schema = {
        tags: ['OpenAI Proxy'],
        summary: 'List available models',
        request: {
            headers: z.object({
                'Authorization': z.string().optional().describe("Token for authentication (OpenAI format)"),
                'x-api-key': z.string().optional().describe("API key for authentication (Claude format)"),
            }),
        },
        responses: {
            200: {
                description: 'List of available models',
                content: {
                    'application/json': {
                        schema: z.object({
                            object: z.string(),
                            data: z.array(z.object({
                                id: z.string(),
                                object: z.string(),
                                created: z.number(),
                                owned_by: z.string(),
                            })),
                        }),
                    },
                },
            },
        },
    };

    async handle(c: Context<HonoCustomType>) {
        const apiKey = getApiKeyFromHeaders(c);
        if (!apiKey) {
            return c.json({ object: "list", data: [] });
        }

        const tokenInfo = await fetchTokenData(c, apiKey);
        if (!tokenInfo) {
            return c.text("Invalid API key", 401);
        }

        const channelsResult = await fetchChannelsForToken(c, tokenInfo.tokenData);

        if (!channelsResult || !channelsResult.results || channelsResult.results.length === 0) {
            return c.json({
                object: "list",
                data: [],
            });
        }

        const modelsSet = new Set<string>();

        for (const row of channelsResult.results) {
            const config = JSON.parse(row.value) as ChannelConfig;
            if (config.deployment_mapper) {
                for (const modelName of Object.keys(config.deployment_mapper)) {
                    modelsSet.add(modelName);
                }
            }
        }

        const models = Array.from(modelsSet).sort().map((modelId) => ({
            id: modelId,
            object: "model" as const,
            created: 1700000000,
            owned_by: "system",
        }));

        return c.json({
            object: "list",
            data: models,
        });
    }
}
