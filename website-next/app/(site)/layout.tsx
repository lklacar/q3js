import {AppShell} from "@/components/app-shell";
import {getInitialServers} from "@/lib/initial-data";
import React from "react";

export default async function SiteLayout({
                                             children,
                                         }: Readonly<{
    children: React.ReactNode;
}>) {
    return <AppShell>{children}</AppShell>;
}
