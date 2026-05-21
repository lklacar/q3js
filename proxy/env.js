const {createEnv} = require('@t3-oss/env-core');
const {z} = require('zod');

const env = createEnv({
    server: {
        MASTER_SERVER_BASE: z.url().default('https://master.q3js.com'),
        HEARTBEAT_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
        BAN_REFRESH_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
        BLOCKED_COUNTRY_CODES: z.string().default('MD'),
        COUNTRY_CACHE_TTL_MS: z.coerce.number().int().positive().default(60 * 60 * 1000),
        COUNTRY_LOOKUP_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
        GEO_BLOCK_FAIL_CLOSED: z.coerce.boolean().default(false),
        TARGET_HOST: z.string().min(1).default('127.0.0.1'),
        TARGET_PORT: z.coerce.number().int().min(1).max(65535).default(27960),
        PROXY_PORT: z.coerce.number().int().min(1).max(65535).default(27961),
        SECURE: z.coerce.boolean().default(false),

        PUBLISH_HOST: z.string().optional(),
        PUBLISH_PORT: z.coerce.number().int().min(1).max(65535).optional(),
    },
    clientPrefix: '',
    client: {},
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
});

module.exports = {env};
