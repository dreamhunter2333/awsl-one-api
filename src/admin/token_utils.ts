import { Context } from "hono";

// Token 工具类
export class TokenUtils {
    static async updateUsage(c: Context<HonoCustomType>, key: string, usageAmount: number): Promise<boolean> {
        try {
            const result = await c.env.DB.prepare(
                `UPDATE api_token SET usage = usage + ?, updated_at = datetime('now') WHERE key = ?`
            ).bind(usageAmount, key).run();

            return result.success;
        } catch (error) {
            console.error('Error updating token usage:', error);
            return false;
        }
    }
}
