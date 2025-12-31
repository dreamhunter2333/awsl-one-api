import { Context } from "hono";

import { CONSTANTS } from "../constants";
import utils from "../utils";

// Token 工具对象
export const TokenUtils = {
    async updateUsage(c: Context<HonoCustomType>, key: string, usageAmount: number): Promise<boolean> {
        try {
            const result = await c.env.DB.prepare(
                `UPDATE api_token SET usage = usage + ?, updated_at = datetime('now') WHERE key = ?`
            ).bind(usageAmount, key).run();

            return result.success;
        } catch (error) {
            console.error('Error updating token usage:', error);
            return false;
        }
    },
    async getPricing(c: Context<HonoCustomType>, model: string, channelConfig: ChannelConfig): Promise<ModelPricing | null> {
        // Check channel-specific pricing first
        if (channelConfig?.model_pricing?.[model]) {
            return channelConfig.model_pricing[model];
        }

        // Fallback to global pricing
        const globalPricingMap = await utils.getJsonSetting(c, CONSTANTS.MODEL_PRICING_KEY);
        return globalPricingMap?.[model] || null;
    },

    async processUsage(c: Context<HonoCustomType>, apiKey: string, model: string, targetChannelKey: string, targetChannelConfig: ChannelConfig, usage: Usage): Promise<void> {
        console.log("Usage data:", usage);

        // Get pricing and calculate cost
        const pricing = await this.getPricing(c, model, targetChannelConfig);
        const hasTokens = usage.prompt_tokens != null && usage.completion_tokens != null;

        if (pricing && hasTokens) {
            const inputCost = usage.prompt_tokens! * pricing.input;
            const outputCost = usage.completion_tokens! * pricing.output;
            const totalCost = inputCost + outputCost;
            // Update token usage and log data
            await this.updateUsage(c, apiKey, totalCost);
            // 长度不够直接显示 *
            var maskedApiKey = apiKey.length < 3 ? '*'.repeat(apiKey.length) : (
                apiKey.slice(0, apiKey.length / 3)
                + '*'.repeat(apiKey.length / 3)
                + apiKey.slice((2 * apiKey.length) / 3)
            );
            console.log(`Model: ${model}, Channel: ${targetChannelKey}, apiKey: ${maskedApiKey}, Cost: ${totalCost}`);
        } else {
            console.warn(`No pricing found for model: ${model} in channel: ${targetChannelKey}`);
        }
    }
};
