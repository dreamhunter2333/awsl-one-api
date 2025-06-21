import { Context, Hono } from "hono"
import { contentJson, fromHono, OpenAPIRoute } from 'chanfana';

import azureOpenaiProxy from "./azure-openai-proxy"
import utils from "../utils"
import { TokenUtils } from "../admin/token_utils"
import { ChannelConfigRow } from "../db/db_model"
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
};

class ProxyEndpoint extends OpenAPIRoute {
    schema = {
        tags: ['OpenAI Proxy'],
        request: {
            headers: z.object({
                'Authorization': z.string().describe("Token for authentication"),
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
        const authHeader = c.req.raw.headers.get('Authorization');
        const apiKey = authHeader?.replace("Bearer ", "").trim();
        if (!apiKey) {
            return c.text("Authorization header not found", 401);
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
                console.log("Usage data:", usage);

                // Calculate cost based on usage and model pricing
                // Model was already extracted above

                // Get global pricing as base configuration
                let pricing = null;
                const globalPricing = await utils.getSetting(c, CONSTANTS.MODEL_PRICING_KEY);
                if (globalPricing) {
                    const globalPricingMap = JSON.parse(globalPricing);
                    pricing = globalPricingMap[model];
                }

                // Override with channel-specific pricing if available
                if (targetChannelConfig.model_pricing?.[model]) {
                    pricing = targetChannelConfig.model_pricing[model];
                }

                if (pricing && usage.prompt_tokens && usage.completion_tokens) {
                    const inputCost = usage.prompt_tokens * pricing.input;
                    const outputCost = usage.completion_tokens * pricing.output;
                    const totalCost = inputCost + outputCost;

                    // Update token usage using TokenUtils
                    const updated = await TokenUtils.updateUsage(c, apiKey, totalCost);
                    if (!updated) {
                        console.error("Failed to update token usage");
                    }

                    console.log(`Model: ${model}, Channel: ${targetChannelKey}, Channel pricing: ${!!targetChannelConfig.model_pricing?.[model]}, Cost: ${totalCost}, Updated: ${updated}`);
                }
                else {
                    console.warn(`No pricing found for model: ${model} in channel: ${targetChannelKey}`);
                }
            }
        );
    }
}

api.post("/v1/chat/completions", ProxyEndpoint)
