import { Context } from "hono";
import { OpenAPIRoute } from "chanfana";
import { z } from "zod";

const getApiKeyFromHeaders = (c: Context<HonoCustomType>): string | null => {
    const authHeader = c.req.raw.headers.get('Authorization');
    const xApiKey = c.req.raw.headers.get('x-api-key');

    if (authHeader) {
        return authHeader.replace("Bearer ", "").trim();
    }
    if (xApiKey) {
        return xApiKey.trim();
    }
    return null;
}

const fetchTokenData = async (c: Context<HonoCustomType>, apiKey: string) => {
    const tokenResult = await c.env.DB.prepare(
        `SELECT * FROM api_token WHERE key = ?`
    ).bind(apiKey).first();

    if (!tokenResult || !tokenResult.value) {
        return null;
    }

    return {
        tokenData: JSON.parse(tokenResult.value as string) as ApiTokenData,
        usage: tokenResult.usage as number || 0,
    };
}

const fetchChannelsForToken = async (
    c: Context<HonoCustomType>,
    tokenData: ApiTokenData
) => {
    const channelKeys = tokenData.channel_keys;

    if (!channelKeys || channelKeys.length === 0) {
        return await c.env.DB.prepare(
            `SELECT key, value FROM channel_config`
        ).all<ChannelConfigRow>();
    }

    const channelQuery = channelKeys.map(() => '?').join(',');
    return await c.env.DB.prepare(
        `SELECT key, value FROM channel_config WHERE key IN (${channelQuery})`
    ).bind(...channelKeys).all<ChannelConfigRow>();
}

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
            return c.text("Authorization header or x-api-key not found", 401);
        }

        const tokenInfo = await fetchTokenData(c, apiKey);
        if (!tokenInfo) {
            return c.text("Invalid API key", 401);
        }

        const { tokenData } = tokenInfo;

        const channelsResult = await fetchChannelsForToken(c, tokenData);

        if (!channelsResult.results || channelsResult.results.length === 0) {
            return c.json({
                object: "list",
                data: [],
            });
        }

        // Collect all unique models from all available channels
        const modelsSet = new Set<string>();

        for (const row of channelsResult.results) {
            const config = JSON.parse(row.value) as ChannelConfig;
            if (config.deployment_mapper) {
                for (const modelName of Object.keys(config.deployment_mapper)) {
                    modelsSet.add(modelName);
                }
            }
        }

        // Convert to OpenAI models format
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
