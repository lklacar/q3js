"use client";

import {FormEvent, useCallback, useEffect, useMemo, useState} from "react";
import {env} from "@/env";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Badge} from "@/components/ui/badge";
import {Q3ColoredText} from "@/components/q3-colored-text";
import {BanIcon, KeyRoundIcon, LogOutIcon, RefreshCwIcon, ShieldCheckIcon} from "lucide-react";

const REFRESH_INTERVAL_MS = 5000;
const ADMIN_TOKEN_STORAGE_KEY = "q3js.admin.jwt";

type AdminPlayer = {
    serverName?: string;
    serverHost?: string;
    serverProxyPort?: number;
    clientNum?: number;
    playerName?: string;
    score?: number;
    ping?: number | null;
    state?: string;
    address?: string;
    ipAddress?: string;
    rate?: number;
    path?: string;
    lastSeen?: string;
    banned?: boolean;
};

type AdminPlayersResponse = {
    serversChecked?: number;
    players?: AdminPlayer[];
};

type AdminLoginResponse = {
    token?: string;
    expiresAt?: number;
};

function adminEndpoint(path: string) {
    return `${env.NEXT_PUBLIC_MASTER_SERVER_URL.replace(/\/$/, "")}/api/admin${path}`;
}

function readStoredToken() {
    try {
        return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "";
    } catch {
        return "";
    }
}

function storeToken(token: string) {
    try {
        window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
    } catch {
        return;
    }
}

function clearStoredToken() {
    try {
        window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    } catch {
        return;
    }
}

function playersEndpoint() {
    return `${env.NEXT_PUBLIC_MASTER_SERVER_URL.replace(/\/$/, "")}/api/admin/players`;
}

export function AdminPlayerPanel() {
    const [password, setPassword] = useState("");
    const [token, setToken] = useState("");
    const [response, setResponse] = useState<AdminPlayersResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [banningIp, setBanningIp] = useState<string | null>(null);

    const players = useMemo(
        () => [...(response?.players ?? [])].sort((a, b) => {
            const aSeen = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
            const bSeen = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
            return bSeen - aSeen;
        }),
        [response]
    );

    const logout = useCallback(() => {
        clearStoredToken();
        setToken("");
        setResponse(null);
        setPassword("");
        setError(null);
    }, []);

    const loadPlayers = useCallback(async (authToken = token) => {
        if (!authToken) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(playersEndpoint(), {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });

            if (res.status === 401) {
                logout();
                setError("Admin session expired.");
                return;
            }

            if (!res.ok) {
                setResponse(null);
                setError(`Admin request failed with HTTP ${res.status}.`);
                return;
            }

            setResponse(await res.json());
        } catch (exception) {
            setResponse(null);
            setError(exception instanceof Error ? exception.message : "Admin request failed.");
        } finally {
            setIsLoading(false);
        }
    }, [logout, token]);

    async function login(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(adminEndpoint("/login"), {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({password}),
            });

            if (res.status === 401) {
                setError("Invalid admin password.");
                return;
            }

            if (!res.ok) {
                setError(`Login failed with HTTP ${res.status}.`);
                return;
            }

            const loginResponse = await res.json() as AdminLoginResponse;
            if (!loginResponse.token) {
                setError("Login response did not include a token.");
                return;
            }

            storeToken(loginResponse.token);
            setToken(loginResponse.token);
            setPassword("");
            await loadPlayers(loginResponse.token);
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : "Login failed.");
        } finally {
            setIsLoading(false);
        }
    }

    async function banPlayer(player: AdminPlayer) {
        if (!token || !player.ipAddress) {
            return;
        }

        setBanningIp(player.ipAddress);
        setError(null);

        try {
            const res = await fetch(adminEndpoint("/bans"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ipAddress: player.ipAddress,
                    playerName: player.playerName,
                }),
            });

            if (res.status === 401) {
                logout();
                setError("Admin session expired.");
                return;
            }

            if (!res.ok) {
                setError(`Ban failed with HTTP ${res.status}.`);
                return;
            }

            await loadPlayers();
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : "Ban failed.");
        } finally {
            setBanningIp(null);
        }
    }

    useEffect(() => {
        const storedToken = readStoredToken();
        if (!storedToken) {
            return;
        }

        setToken(storedToken);
        loadPlayers(storedToken);
    }, [loadPlayers]);

    useEffect(() => {
        if (!token || !response) {
            return;
        }

        const interval = window.setInterval(() => {
            loadPlayers();
        }, REFRESH_INTERVAL_MS);

        return () => window.clearInterval(interval);
    }, [loadPlayers, response, token]);

    if (!token) {
        return (
            <main className="container mx-auto grid min-h-[calc(100vh-9rem)] place-items-center px-4 py-8">
                <section className="w-full max-w-sm border border-border/60 bg-card px-6 py-6 shadow-sm">
                    <div className="mb-6 flex flex-col items-center gap-3 text-center">
                        <div className="flex size-11 items-center justify-center border border-primary/40 text-primary">
                            <ShieldCheckIcon className="size-5"/>
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight">Admin Login</h1>
                            <p className="text-sm text-muted-foreground">Enter the admin password to continue.</p>
                        </div>
                    </div>

                    <form onSubmit={login} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="admin-password" className="text-center">Password</Label>
                            <Input
                                id="admin-password"
                                type="password"
                                autoComplete="current-password"
                                autoFocus
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="h-11 text-center font-mono"
                            />
                        </div>

                        {error && (
                            <div className="border border-destructive/50 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="h-11 w-full" disabled={isLoading || password.trim().length === 0}>
                            {isLoading ? <RefreshCwIcon className="size-4 animate-spin"/> : <KeyRoundIcon className="size-4"/>}
                            Log In
                        </Button>
                    </form>
                </section>
            </main>
        );
    }

    return (
        <main className="container mx-auto flex min-h-[calc(100vh-9rem)] flex-col gap-6 px-4 py-8">
            <section className="flex flex-col gap-4 border-b border-border/60 pb-6">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <ShieldCheckIcon className="size-5 text-primary"/>
                        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
                    </div>
                </div>

                <div className="flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center">
                    <Badge variant="outline" className="h-9 border-primary/40 px-3 text-primary">
                        Logged in
                    </Badge>
                    <Button type="button" variant="outline" onClick={() => loadPlayers()} disabled={isLoading}>
                        {isLoading ? <RefreshCwIcon className="size-4 animate-spin"/> : <RefreshCwIcon className="size-4"/>}
                        Refresh
                    </Button>
                    <Button type="button" variant="outline" onClick={logout}>
                        <LogOutIcon className="size-4"/>
                        Log Out
                    </Button>
                </div>
            </section>

            {error && (
                <div className="border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {response && (
                <section className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{players.length} players</Badge>
                        <Badge variant="outline">20 second window</Badge>
                    </div>

                    <div className="overflow-x-auto border border-border/60">
                        <table className="w-full min-w-[42rem] border-collapse text-sm">
                            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Player</th>
                                    <th className="px-4 py-3 font-medium">IP</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium">Page</th>
                                    <th className="px-4 py-3 text-right font-medium">Last Seen</th>
                                    <th className="px-4 py-3 text-right font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {players.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                            No players online.
                                        </td>
                                    </tr>
                                )}
                                {players.map((player) => (
                                    <tr
                                        key={`${player.ipAddress}:${player.playerName}:${player.path}`}
                                        className="border-t border-border/60"
                                    >
                                        <td className="max-w-[14rem] px-4 py-3 font-medium">
                                            <Q3ColoredText text={player.playerName ?? ""} className="block truncate"/>
                                        </td>
                                        <td className="px-4 py-3 font-mono">{player.ipAddress}</td>
                                        <td className="px-4 py-3">
                                            {player.banned ? (
                                                <Badge variant="outline" className="border-destructive/40 text-destructive">
                                                    Banned
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="border-primary/40 text-primary">
                                                    Active
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-muted-foreground">{player.path}</td>
                                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                                            {player.lastSeen ? new Date(player.lastSeen).toLocaleTimeString() : "-"}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                disabled={Boolean(player.banned) || banningIp === player.ipAddress}
                                                onClick={() => banPlayer(player)}
                                                className="border-destructive/40 text-destructive hover:border-destructive"
                                            >
                                                {banningIp === player.ipAddress ? (
                                                    <RefreshCwIcon className="size-4 animate-spin"/>
                                                ) : (
                                                    <BanIcon className="size-4"/>
                                                )}
                                                Ban
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </main>
    );
}
