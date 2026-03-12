import { Context } from "hono"
import { getApiKeyFromHeaders, fetchTokenData, fetchChannelsForToken } from "./auth"
import { RouteId, getRoutePolicy } from "./route-policy"
import { findDeploymentMapping } from "../../utils"
import { TokenUtils } from "../../admin/token_utils"

export type ChannelResolution = {
    channel: { key: string; config: ChannelConfig }
    requestBody: any
    saveUsage: (usage: Usage) => Promise<void>
}

export const resolveChannel = async (
    c: Context<HonoCustomType>,
    routeId: RouteId
): Promise<ChannelResolution | Response> => {
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

    const policy = getRoutePolicy(routeId);
    const allowedTypes = policy.allowedTypes;

    const availableChannels: Array<{ key: string, config: ChannelConfig, mapping: { pattern: string, deployment: string } }> = [];

    for (const row of channelsResult.results) {
        const config = JSON.parse(row.value) as ChannelConfig;

        if (allowedTypes && (!config.type || !allowedTypes.includes(config.type))) {
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
        return c.text(`Model not mapped: ${model}. Please configure deployment_mapper.`, 400);
    }

    const randomIndex = Math.floor(Math.random() * availableChannels.length);
    const selectedChannel = availableChannels[randomIndex];
    const targetChannelKey = selectedChannel.key;
    const targetChannelConfig = selectedChannel.config;

    requestBody.model = selectedChannel.mapping.deployment;

    if (!targetChannelConfig.type) {
        return c.text("Channel type invalid", 400);
    }

    const saveUsage = async (usage: Usage) => {
        try {
            await TokenUtils.processUsage(c, apiKey, requestBody.model, targetChannelKey, targetChannelConfig, usage);
        } catch (error) {
            console.error('Error processing usage:', error);
        }
    };

    return {
        channel: { key: targetChannelKey, config: targetChannelConfig },
        requestBody,
        saveUsage,
    };
}
