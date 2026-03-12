"use client";


import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {ReactNode} from "react";

export default function QueryClientProviderWrapper({children}: { children: ReactNode }) {
    const queryClient = new QueryClient();
    return <QueryClientProvider client={queryClient}>
        {children}
    </QueryClientProvider>
}