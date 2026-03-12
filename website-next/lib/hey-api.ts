import type {CreateClientConfig} from './client/client.gen';
import {env} from "@/env.ts";

export const createClientConfig: CreateClientConfig = (config) => ({
    ...config,
    baseUrl: env.NEXT_PUBLIC_MASTER_SERVER_URL,
});