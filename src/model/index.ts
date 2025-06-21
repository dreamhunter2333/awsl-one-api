import { z, ZodType } from 'zod';

export const CommonSuccessfulResponse = (
    dataType: ZodType | null = null
) => {
    return {
        200: {
            description: 'Successful Request',
            content: {
                'application/json': {
                    schema: z.object({
                        success: z.boolean(),
                        message: z.nullable(z.string()),
                        data: z.nullable(dataType || z.any()),
                    }),
                }
            },
        }
    }
}

export const CommonErrorResponse = {
    400: {
        description: 'Bad Request',
        content: {
            'text/plain': {
                schema: z.string(),
            }
        },
    },
    401: {
        description: 'Unauthorized',
        content: {
            'text/plain': {
                schema: z.string(),
            }
        },
    },
    500: {
        description: 'Internal Server Error',
        content: {
            'text/plain': {
                schema: z.string(),
            }
        }
    }
}
