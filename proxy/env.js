const {createEnv} = require('@t3-oss/env-core');
const {z} = require('zod');

const env = createEnv({
    server: {
        MASTER_SERVER_BASE: z.url().default('https://master.q3js.com'),
        HEARTBEAT_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
        BAN_REFRESH_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
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
