import { Context } from "hono";
import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';
import { getJsonSetting, saveSetting } from "../utils";
import { CONSTANTS } from "../constants";
import { CommonErrorResponse, CommonSuccessfulResponse } from "../model";

// Pricing 获取配置 API
export class PricingGetEndpoint extends OpenAPIRoute {
    schema = {
        tags: ['Admin API'],
        summary: 'Get global pricing configuration',
        responses: {
            ...CommonSuccessfulResponse(z.record(z.object({
                input: z.number(),
                output: z.number(),
            }))),
            ...CommonErrorResponse,
        },
    };

    async handle(c: Context<HonoCustomType>) {
        const pricingConfig = await getJsonSetting<Record<string, ModelPricing>>(
            c,
            CONSTANTS.MODEL_PRICING_KEY
        );

        return {
            success: true,
            data: pricingConfig || {}
        } as CommonResponse;
    }
}

// Pricing 更新配置 API
export class PricingUpdateEndpoint extends OpenAPIRoute {
    schema = {
        tags: ['Admin API'],
        summary: 'Update global pricing configuration',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: z.record(z.object({
                            input: z.number(),
                            output: z.number(),
                        })),
                    }
                }
            }
        },
        responses: {
            ...CommonSuccessfulResponse(),
            ...CommonErrorResponse,
        },
    };

    async handle(c: Context<HonoCustomType>) {
        const body = await c.req.json<Record<string, ModelPricing>>();

        await saveSetting(
            c,
            CONSTANTS.MODEL_PRICING_KEY,
            JSON.stringify(body)
        );

        return {
            success: true,
            message: "Pricing config updated successfully"
        } as CommonResponse;
    }
}
