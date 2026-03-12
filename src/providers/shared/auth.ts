import { Context } from "hono"

export const getApiKeyFromHeaders = (c: Context<HonoCustomType>): string | null => {
    const authHeader = c.req.raw.headers.get('Authorization');
    const xApiKey = c.req.raw.headers.get('x-api-key');

    if (authHeader) {
        return authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
    }
    if (xApiKey) {
        return xApiKey.trim();
    }
    return null;
}

export const fetchTokenData = async (c: Context<HonoCustomType>, apiKey: string) => {
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

export const fetchChannelsForToken = async (
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

export const fetchAllChannels = async (c: Context<HonoCustomType>) => {
    return await c.env.DB.prepare(
        `SELECT key, value FROM channel_config`
    ).all<ChannelConfigRow>();
}
