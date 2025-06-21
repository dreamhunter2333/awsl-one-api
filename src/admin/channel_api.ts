import { Context } from "hono"
import { contentJson, OpenAPIRoute } from 'chanfana';
import { z } from 'zod';

import { CommonErrorResponse, CommonSuccessfulResponse } from "../model";
import { ChannelConfigRow } from "../db/db_model";

// 获取所有 Channel 配置
export class ChannelGetEndpoint extends OpenAPIRoute {
    schema = {
        tags: ['Admin API'],
        summary: 'Get all channel configurations',
        responses: {
            ...CommonSuccessfulResponse(z.array(z.object({
                key: z.string(),
                value: z.string(),
                created_at: z.string(),
                updated_at: z.string(),
            }))),
            ...CommonErrorResponse,
        },
    };

    async handle(c: Context<HonoCustomType>) {
        const result = await c.env.DB.prepare(
            "SELECT * FROM channel_config"
        ).all<ChannelConfigRow>();

        return {
            success: true,
            data: result.results
        } as CommonResponse;
    }
}

// 创建或更新 Channel 配置
export class ChannelUpsertEndpoint extends OpenAPIRoute {
    schema = {
        tags: ['Admin API'],
        summary: 'Create or update channel configuration',
        request: {
            params: z.object({
                key: z.string().describe('Channel key'),
            }),
            body: {
                content: {
                    'application/json': {
                        schema: z.object({
                            name: z.string().describe('Channel name'),
                            type: z.string().describe('Channel type'),
                            endpoint: z.string().describe('API endpoint'),
                            api_key: z.string().describe('API key'),
                            api_version: z.string().describe('API version'),
                            deployment_mapper: z.record(z.string()).describe('Model deployment mapping'),
                            model_pricing: z.record(z.object({
                                input: z.number().describe('Input token price per 1000 tokens'),
                                output: z.number().describe('Output token price per 1000 tokens'),
                            })).optional().describe('Custom model pricing for this channel'),
                        }),
                    },
                },
            },
        },
        responses: {
            ...CommonSuccessfulResponse(z.boolean()),
            ...CommonErrorResponse,
        },
    };

    async handle(c: Context<HonoCustomType>) {
        const { key } = c.req.param();
        const config = await c.req.json<ChannelConfig>();

        // Upsert channel config directly using SQL
        // excluded.value 指的是 INSERT 语句中要插入的新值
        // 当发生冲突时，用新值更新现有记录
        const result = await c.env.DB.prepare(
            `INSERT INTO channel_config (key, value)
             VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET
             value = excluded.value,
             updated_at = datetime('now')`
        ).bind(key, JSON.stringify(config)).run();

        if (!result.success) {
            return c.text('Failed to upsert channel config', 500);
        }

        return {
            success: true,
            data: true
        } as CommonResponse;
    }
}

// 删除 Channel 配置
export class ChannelDeleteEndpoint extends OpenAPIRoute {
    schema = {
        tags: ['Admin API'],
        summary: 'Delete channel configuration',
        request: {
            params: z.object({
                key: z.string().describe('Channel key'),
            }),
        },
        responses: {
            ...CommonSuccessfulResponse(z.boolean()),
            ...CommonErrorResponse,
        },
    };

    async handle(c: Context<HonoCustomType>) {
        const { key } = c.req.param();

        // Delete channel config directly using SQL
        const result = await c.env.DB.prepare(
            `DELETE FROM channel_config WHERE key = ?`
        ).bind(key).run();

        return {
            success: true,
            data: result.success
        } as CommonResponse;
    }
}
