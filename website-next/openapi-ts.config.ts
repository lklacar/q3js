import {defineConfig} from '@hey-api/openapi-ts'

export default defineConfig({
    input: 'http://localhost:8080/q/openapi',
    output: 'lib/client',
    plugins: [
        {
            name: "@hey-api/client-next",
            runtimeConfigPath: '@/lib/hey-api.ts',
        },
        {
            name: '@tanstack/react-query',
        },
        {
            enums: true,
            name: '@hey-api/typescript',
        },
        {
            name: '@hey-api/sdk',
            transformer: true,
        },
        {
            dates: true,
            name: '@hey-api/transformers',
        }
    ],
})