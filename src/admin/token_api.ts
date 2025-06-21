import { Context } from "hono"
import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';

import { CommonErrorResponse, CommonSuccessfulResponse } from "../model";

// Token 列表 API
export class TokenListEndpoint extends OpenAPIRoute {
    schema = {
        tags: ['Admin API'],
        summary: 'Get all tokens',
        responses: {
            ...CommonSuccessfulResponse(z.array(z.object({
                key: z.string(),
                value: z.string(),
                usage: z.number(),
                created_at: z.string(),
                updated_at: z.string(),
            }))),
            ...CommonErrorResponse,
        },
    };

    async handle(c: Context<HonoCustomType>) {
        const result = await c.env.DB.prepare(
            `SELECT * FROM api_token ORDER BY created_at DESC`
        ).all<ApiTokenRow>();

        return {
            success: true,
            data: result.results
        } as CommonResponse;
    }
}

// Token 创建/更新 API (Upsert)
export class TokenUpsertEndpoint extends OpenAPIRoute {
    schema = {
        tags: ['Admin API'],
        summary: 'Create or update a token',
        request: {
            params: z.object({
                key: z.string().describe('Token key'),
            }),
            body: {
                content: {
                    'application/json': {
                        schema: z.object({
                            name: z.string().describe('Token name'),
                            channel_keys: z.array(z.string()).describe('Channel keys to bind (empty array means access to all channels)'),
                            total_quota: z.number().describe('Total quota amount'),
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
        const body = await c.req.json<ApiTokenData>();
        const { key } = c.req.param();

        // Validate channels exist using batch query (if channel_keys is not empty)
        if (body.channel_keys && body.channel_keys.length > 0) {
            const channelQuery = body.channel_keys.map(() => '?').join(',');
            const existingChannels = await c.env.DB.prepare(
                `SELECT key FROM channel_config WHERE key IN (${channelQuery})`
            ).bind(...body.channel_keys).all();

            if (!existingChannels.results || existingChannels.results.length !== body.channel_keys.length) {
                const existingKeys = existingChannels.results?.map((row: any) => row.key) || [];
                const missingKeys = body.channel_keys.filter(key => !existingKeys.includes(key));
                return c.text(`Channels not found: ${missingKeys.join(', ')}`, 400);
            }
        }

        // Upsert token directly using SQL with ON CONFLICT
        const result = await c.env.DB.prepare(
            `INSERT INTO api_token (key, value)
             VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET
             value = excluded.value,
             updated_at = datetime('now')`
        ).bind(key, JSON.stringify(body)).run();

        if (!result.success) {
            return c.text('Failed to upsert token', 500);
        }

        return {
            success: true,
            data: true
        } as CommonResponse;
    }
}

// Token 删除 API
export class TokenDeleteEndpoint extends OpenAPIRoute {
    schema = {
        tags: ['Admin API'],
        summary: 'Delete token',
        request: {
            params: z.object({
                key: z.string().describe('Token key'),
            }),
        },
        responses: {
            ...CommonSuccessfulResponse(z.boolean()),
            ...CommonErrorResponse,
        },
    };

    async handle(c: Context<HonoCustomType>) {
        const { key } = c.req.param();

        // Delete token directly using SQL
        const result = await c.env.DB.prepare(
            `DELETE FROM api_token WHERE key = ?`
        ).bind(key).run();

        return {
            success: true,
            data: result.success
        } as CommonResponse;
    }
}
