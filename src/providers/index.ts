import { Context, Hono } from "hono"
import { contentJson, fromHono, OpenAPIRoute } from 'chanfana';

import azureOpenaiProxy from "./azure-openai-proxy"
import openaiProxy from "./openai-proxy"
import claudeProxy from "./claude-proxy"
import claudeToOpenaiProxy from "./claude-to-openai-proxy"
import openaiResponsesProxy from "./openai-responses-proxy"
import azureOpenaiResponsesProxy from "./azure-openai-responses-proxy"
import utils, { findDeploymentMapping } from "../utils"
import { TokenUtils } from "../admin/token_utils"
import { CONSTANTS } from "../constants"
import { z } from "zod";

export const api = fromHono(new Hono<HonoCustomType>())

const providerMap: Record<
    string,
    (
        c: Context<HonoCustomType>,
        config: ChannelConfig,
        requestBody: any,
        saveUsage: (usage: Usage) => Promise<void>
    ) => Promise<Response>
> = {
    "azure-openai": azureOpenaiProxy.fetch,
    "openai": openaiProxy.fetch,
    "claude": claudeProxy.fetch,
    "claude-to-openai": claudeToOpenaiProxy.fetch,
    "openai-responses": openaiResponsesProxy.fetch,
    "azure-openai-responses": azureOpenaiResponsesProxy.fetch,
};

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
        const apiKey = getApiKeyFromHeaders(c);
        if (!apiKey) {
            return c.text("Authorization header or x-api-key not found", 401);
        }

        const tokenInfo = await fetchTokenData(c, apiKey);
        if (!tokenInfo) {
            return c.text("Invalid API key", 401);
        }

        const { tokenData, usage } = tokenInfo;

        // Check if token has sufficient quota
        if (usage >= tokenData.total_quota) {
            return c.text("Quota exceeded", 402);
        }        // Get available channel configs based on token permissions
        const channelsResult = await fetchChannelsForToken(c, tokenData);

        if (!channelsResult.results || channelsResult.results.length === 0) {
            return c.text("No available channels for this token", 401);
        }

        let requestBody: any;
        try {
            requestBody = await c.req.json();
        } catch (error) {
            return c.text("Invalid JSON body", 400);
        }
        const model = requestBody.model;
        if (!model) {
            return c.text("Model is required", 400);
        }

        // Filter channels that support the requested model
        const availableChannels: Array<{ key: string, config: ChannelConfig, mapping: { pattern: string, deployment: string } }> = [];

        for (const row of channelsResult.results) {
            const config = JSON.parse(row.value) as ChannelConfig;

            // Check if channel supports the model (has deployment mapping for it)
            const mapping = findDeploymentMapping(config.deployment_mapper, model);
            if (mapping) {
                availableChannels.push({
                    key: row.key,
                    config: config,
                    mapping: mapping
                });
            }
        }

        if (availableChannels.length === 0) {
            if (!channelsResult.results || channelsResult.results.length === 0) {
                return c.text("No available channels for this token", 404);
            }
            return c.text(`Model not mapped: ${model}. Please configure deployment_mapper.`, 400);
        }

        // Randomly select one available channel
        const randomIndex = Math.floor(Math.random() * availableChannels.length);
        const selectedChannel = availableChannels[randomIndex];
        const targetChannelKey = selectedChannel.key;
        const targetChannelConfig = selectedChannel.config;

        // 统一在上层完成模型名映射
        requestBody.model = selectedChannel.mapping.deployment;

        if (!targetChannelConfig.type) {
            return c.text("Channel type invalid", 400);
        }

        const proxyFetch = providerMap[targetChannelConfig.type];
        if (!proxyFetch) {
            return c.text("Channel type not supported", 400);
        }

        return proxyFetch(c, targetChannelConfig, requestBody,
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

class ResponsesProxyEndpoint extends OpenAPIRoute {
    schema = {
        tags: ['OpenAI Responses Proxy'],
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
        const apiKey = getApiKeyFromHeaders(c);
        if (!apiKey) {
            return c.text("Authorization header or x-api-key not found", 401);
        }

        const tokenInfo = await fetchTokenData(c, apiKey);
        if (!tokenInfo) {
            return c.text("Invalid API key", 401);
        }

        const { tokenData, usage } = tokenInfo;

        if (usage >= tokenData.total_quota) {
            return c.text("Quota exceeded", 402);
        }

        const channelsResult = await fetchChannelsForToken(c, tokenData);

        if (!channelsResult.results || channelsResult.results.length === 0) {
            return c.text("No available channels for this token", 401);
        }

        let requestBody: any;
        try {
            requestBody = await c.req.json();
        } catch (error) {
            return c.text("Invalid JSON body", 400);
        }
        const model = requestBody.model;
        if (!model) {
            return c.text("Model is required", 400);
        }

        const allowedTypes: ChannelType[] = ["openai-responses", "azure-openai-responses"];
        const availableChannels: Array<{ key: string, config: ChannelConfig, mapping: { pattern: string, deployment: string } }> = [];

        for (const row of channelsResult.results) {
            const config = JSON.parse(row.value) as ChannelConfig;

            if (!config.type || !allowedTypes.includes(config.type)) {
                continue;
            }

            const mapping = findDeploymentMapping(config.deployment_mapper, model);
            if (mapping) {
                availableChannels.push({
                    key: row.key,
                    config: config,
                    mapping: mapping
                });
            }
        }

        if (availableChannels.length === 0) {
            if (!channelsResult.results || channelsResult.results.length === 0) {
                return c.text("No available channels for this token", 404);
            }
            return c.text(`Model not mapped: ${model}. Please configure deployment_mapper.`, 400);
        }

        const randomIndex = Math.floor(Math.random() * availableChannels.length);
        const selectedChannel = availableChannels[randomIndex];
        const targetChannelKey = selectedChannel.key;
        const targetChannelConfig = selectedChannel.config;

        // 统一在上层完成模型名映射
        requestBody.model = selectedChannel.mapping.deployment;

        const proxyFetch = providerMap[targetChannelConfig.type || ""];
        if (!proxyFetch) {
            return c.text("Channel type not supported", 400);
        }

        return proxyFetch(c, targetChannelConfig, requestBody,
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

api.post("/v1/responses", ResponsesProxyEndpoint)

// Models endpoint
import { ModelsEndpoint } from "./models"
api.get("/v1/models", ModelsEndpoint)
