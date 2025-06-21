import { Context } from "hono";
import { CONSTANTS } from "../constants";
import utils from "../utils";

const DB_INIT_QUERIES = `
CREATE TABLE IF NOT EXISTS channel_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS api_token (
    key TEXT PRIMARY KEY,
    value TEXT,
    usage REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`

const dbOperations = {
    initialize: async (c: Context<HonoCustomType>) => {
        // remove all \r and \n characters from the query string
        // split by ; and join with a ;\n
        const query = DB_INIT_QUERIES.replace(/[\r\n]/g, "")
            .split(";")
            .map((query) => query.trim())
            .join(";\n");
        await c.env.DB.exec(query);

        const version = await utils.getSetting(c, CONSTANTS.DB_VERSION_KEY);
        if (version) {
            return c.json({ message: "Database already initialized" });
        }
        await utils.saveSetting(c, CONSTANTS.DB_VERSION_KEY, CONSTANTS.DB_VERSION);
    },
    migrate: async (c: Context<HonoCustomType>) => {
        const version = await utils.getSetting(c, CONSTANTS.DB_VERSION_KEY);
        if (version != CONSTANTS.DB_VERSION) {
            // TODO: Perform migration logic here

            // Update the version in the settings table
            await utils.saveSetting(c, CONSTANTS.DB_VERSION_KEY, CONSTANTS.DB_VERSION);
        }
    },
    getVersion: async (c: Context<HonoCustomType>): Promise<string | null> => {
        return await utils.getSetting(c, CONSTANTS.DB_VERSION_KEY);
    }
}

export default dbOperations;
