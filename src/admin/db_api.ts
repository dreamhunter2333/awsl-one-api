import { Context } from "hono"
import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';

import db from "../db"
import { CommonErrorResponse, CommonSuccessfulResponse } from "../model";

export class DBInitializeEndpoint extends OpenAPIRoute {
    schema = {
        tags: ['Admin API'],
        responses: {
            ...CommonSuccessfulResponse(z.string()),
            ...CommonErrorResponse,
        },
    };

    async handle(c: Context<HonoCustomType>) {
        await db.initialize(c);
        await db.migrate(c);
        return {
            success: true,
            data: await db.getVersion(c)
        } as CommonResponse;
    }
}
