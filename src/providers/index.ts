import { Context, Hono } from "hono"
import { contentJson, fromHono, OpenAPIRoute } from 'chanfana';

import azureOpenaiProxy from "./azure-openai-proxy"
import openaiProxy from "./openai-proxy"
import claudeProxy from "./claude-proxy"
import utils from "../utils"
import { TokenUtils } from "../admin/token_utils"
import { CONSTANTS } from "../constants"
import { z } from "zod";

export const api = fromHono(new Hono<HonoCustomType>())

const providerMap: Record<
    string,
    (
        c: Context<HonoCustomType>,
        config: ChannelConfig,
        saveUsage: (usage: Usage) => Promise<void>
    ) => Promise<Response>
> = {
    "azure-openai": azureOpenaiProxy.fetch,
    "openai": openaiProxy.fetch,
    "claude": claudeProxy.fetch,
};

class ProxyEndpoint extends OpenAPIRoute {
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
        // Support both OpenAI format (Authorization: Bearer xxx) and Claude format (x-api-key: xxx)
        const authHeader = c.req.raw.headers.get('Authorization');
        const xApiKey = c.req.raw.headers.get('x-api-key');

        let apiKey: string | undefined;

        if (authHeader) {
            // OpenAI format: Authorization: Bearer sk-xxx
            apiKey = authHeader.replace("Bearer ", "").trim();
        } else if (xApiKey) {
            // Claude format: x-api-key: sk-xxx
            apiKey = xApiKey.trim();
        }

        if (!apiKey) {
            return c.text("Authorization header or x-api-key not found", 401);
        }

        // Get token from database using direct SQL query
        const tokenResult = await c.env.DB.prepare(
            `SELECT * FROM api_token WHERE key = ?`
        ).bind(apiKey).first();

        if (!tokenResult || !tokenResult.value) {
            return c.text("Invalid API key", 401);
        }

        const tokenData = JSON.parse(tokenResult.value as string) as ApiTokenData;
        const usage = tokenResult.usage as number || 0;

        // Check if token has sufficient quota
        if (usage >= tokenData.total_quota) {
            return c.text("Quota exceeded", 402);
        }        // Get available channel configs based on token permissions
        const channelKeys = tokenData.channel_keys;

        let channelsResult;
        if (!channelKeys || channelKeys.length === 0) {
            // If channel_keys is empty, get all channels
            channelsResult = await c.env.DB.prepare(
                `SELECT key, value FROM channel_config`
            ).all<ChannelConfigRow>();
        } else {
            // Query specified channels
            const channelQuery = channelKeys.map(() => '?').join(',');
            channelsResult = await c.env.DB.prepare(
                `SELECT key, value FROM channel_config WHERE key IN (${channelQuery})`
            ).bind(...channelKeys).all<ChannelConfigRow>();
        }

        if (!channelsResult.results || channelsResult.results.length === 0) {
            return c.text("No available channels for this token", 401);
        }

        // Parse channel configs and get the model from request
        const requestBody = await c.req.json();
        const model = requestBody.model || 'gpt-3.5-turbo';

        // Filter channels that support the requested model
        const availableChannels: Array<{ key: string, config: ChannelConfig }> = [];

        for (const row of channelsResult.results) {
            const config = JSON.parse(row.value) as ChannelConfig;

            // Check if channel supports the model (has deployment mapping for it)
            if (config.deployment_mapper && config.deployment_mapper[model]) {
                availableChannels.push({
                    key: row.key,
                    config: config
                });
            }
        }

        if (availableChannels.length === 0) {
            return c.text(`No channels available for model: ${model}`, 400);
        }

        // Randomly select one available channel
        const randomIndex = Math.floor(Math.random() * availableChannels.length);
        const selectedChannel = availableChannels[randomIndex];
        const targetChannelKey = selectedChannel.key;
        const targetChannelConfig = selectedChannel.config;

        if (!targetChannelConfig.type) {
            return c.text("Channel type invalid", 400);
        }

        const proxyFetch = providerMap[targetChannelConfig.type];
        if (!proxyFetch) {
            return c.text("Channel type not supported", 400);
        }

        return proxyFetch(c, targetChannelConfig,
            async (usage: Usage) => {
                try {
                    await TokenUtils.processUsage(c, apiKey, model, targetChannelKey, targetChannelConfig, usage);
                } catch (error) {
                    console.error('Error processing usage:', error);
                }
            }
        );
    }
}

api.post("/v1/chat/completions", ProxyEndpoint)
api.post("/v1/messages", ProxyEndpoint)  // Claude API endpoint
