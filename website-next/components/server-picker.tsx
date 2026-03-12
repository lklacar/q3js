"use client";

import {Card, CardContent} from "@/components/ui/card";
import {ServerCard} from "@/components/server-card.tsx";
import {useMemo, useState, useTransition} from "react";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {stripQ3Colors} from "@/lib/utils.ts";
import Link from "next/link";
import {Search} from "lucide-react";
import {ServerResponse} from "@/lib/client";
import {useRouter} from "next/navigation";


function formatCount(count: number, singular: string, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}

export function ServerPicker({servers}: { servers: ServerResponse[] }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isRefreshing, startRefreshTransition] = useTransition();
    const router = useRouter();

    const filteredServers = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return servers.filter((server) => {
            const hostname = stripQ3Colors(server.sv_hostname).toLowerCase();
            const mapname = server.mapname.toLowerCase();

            return normalizedSearch.length === 0 ||
                hostname.includes(normalizedSearch) ||
                mapname.includes(normalizedSearch);
        });
    }, [servers, searchTerm]);

    const totalPlayerCount = useMemo(
        () => servers.reduce((sum, server) => sum + server.players, 0),
        [servers]
    );

    const filteredPlayerCount = useMemo(
        () => filteredServers.reduce((sum, server) => sum + server.players, 0),
        [filteredServers]
    );
    const activeFilterCount = [searchTerm.trim().length > 0].filter(Boolean).length;

    function clearFilters() {
        setSearchTerm("");
    }

    function refreshServerList() {
        startRefreshTransition(() => {
            router.refresh();
        });
    }

    return (
        <section id="server-browser" className="container mx-auto px-4 pb-24 scroll-mt-24">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold">Server Browser</h2>
                    <p className="text-muted-foreground text-sm">
                        Pick a server and jump in immediately. Your player name is reused for every join.
                    </p>
                </div>

                <Card className="bg-card/60 border-border/60">
                    <CardContent className="p-4 space-y-4">
                        <div className="grid gap-3">
                            <div className="relative">
                                <Search
                                    className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"/>
                                <Input
                                    placeholder="Search server or map"
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                                <span>
                                    {activeFilterCount > 0
                                        ? `${filteredServers.length}/${servers.length} servers`
                                        : formatCount(servers.length, "server")}
                                </span>
                                <span>
                                    {activeFilterCount > 0
                                        ? `${filteredPlayerCount}/${totalPlayerCount} players online`
                                        : `${formatCount(totalPlayerCount, "player")} online`}
                                </span>
                                {activeFilterCount > 0 && (
                                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                                        Clear filters
                                    </Button>
                                )}
                            </div>
                        </div>

                    </CardContent>
                </Card>

                <div className="grid gap-4">
                    {filteredServers.map((server) => (
                        <ServerCard
                            key={server.id}
                            server={server}
                        />
                    ))}
                </div>

                {servers.length === 0 && (
                    <Card className="bg-card/50 border-border/50">
                        <CardContent className="py-10 text-center space-y-3">
                            <p className="text-muted-foreground">No servers are live right now.</p>
                            <div className="flex items-center justify-center gap-2">
                                <Button variant="outline" onClick={refreshServerList} disabled={isRefreshing}>
                                    {isRefreshing ? "Refreshing..." : "Refresh list"}
                                </Button>
                                <Button asChild>
                                    <Link href="/guide">Run your own server</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {servers.length > 0 && filteredServers.length === 0 && (
                    <Card className="bg-card/50 border-border/50">
                        <CardContent className="py-10 text-center space-y-3">
                            <p className="text-muted-foreground">No servers match your current filters.</p>
                            <div className="flex items-center justify-center gap-2">
                                <Button variant="outline" onClick={clearFilters}>
                                    Clear filters
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={refreshServerList}
                                    disabled={isRefreshing}
                                >
                                    {isRefreshing ? "Refreshing..." : "Refresh list"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </section>
    );
}
