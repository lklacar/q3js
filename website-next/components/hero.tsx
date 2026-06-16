import Link from "next/link";
import {Button} from "@/components/ui/button.tsx";
import {Github, Skull, Target, Users, XIcon} from "lucide-react";
import {JoinServerButton} from "@/components/join-server-button.tsx";
import {Q3ColoredText} from "@/components/q3-colored-text.tsx";
import {ScoreboardEntryResponse, ServerResponse} from "@/lib/client";
import {JediAcademyLinkButton} from "@/components/jedi-academy-link-button";


function formatCount(count: number, singular: string, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}

function formatNumber(value: number) {
    return new Intl.NumberFormat().format(value);
}

export function Hero(props: {
    currentPlayerCount: number;
    serverCount: number;
    totalKillCount: number;
    topDailyPlayer: ScoreboardEntryResponse | null;
    firstServer?: ServerResponse;
}) {
    return (
        <section className="border-b border-border/60 bg-background">
            <div className="container mx-auto px-4 py-14 md:py-18">
                <div className="mx-auto max-w-4xl text-center">
                    <p className="text-xs uppercase tracking-[0.24em] text-primary">
                        Quake 3 in browser
                    </p>

                    <h1 className="mt-3 text-3xl font-bold uppercase leading-tight tracking-[0.04em] md:text-4xl">
                        Play Quake III Multiplayer in Your Browser
                    </h1>

                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                        No install step. Click play, pick a server, and jump straight into a live Quake 3 match.
                    </p>

                    <div className="mt-6 mx-auto grid max-w-md grid-cols-2 gap-3">
                        {props.firstServer ? (
                            <JoinServerButton server={props.firstServer} ctaLabel={"Quick Play"}/>
                        ) : (
                            <Button size="lg" className="w-full" asChild>
                                <Link href="#server-browser">Quick Play</Link>
                            </Button>
                        )}
                        <Button variant="secondary" size="lg" className="w-full" asChild>
                            <Link href="/scoreboard">Scoreboard</Link>
                        </Button>
                        <Button variant="outline" size="lg" className="w-full" asChild>
                            <Link
                                href="https://github.com/lklacar/q3js"
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Github className="h-4 w-4"/>
                                GitHub Repo
                            </Link>
                        </Button>
                        <Button variant="outline" size="lg" className="w-full" asChild>
                            <Link
                                href="https://x.com/lukathedev"
                                target="_blank"
                                rel="noreferrer"
                            >
                                <XIcon className="h-4 w-4"/>
                                @lukathedev
                            </Link>
                        </Button>
                    </div>

                    <JediAcademyLinkButton className="mx-auto mt-3 w-full max-w-md" label="Play Jedi Academy"/>

                    <div className="mt-8 grid gap-3 text-left md:grid-cols-3">
                        <div className="border border-border/70 bg-card/40 px-4 py-4">
                            <div
                                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                <Users className="h-4 w-4 text-primary"/>
                                Players Online
                            </div>
                            <div className="mt-2 text-2xl font-bold leading-none text-foreground">
                                {formatNumber(props.currentPlayerCount)}
                            </div>
                            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                Across {formatCount(props.serverCount, "live server")}
                            </p>
                        </div>

                        <div className="border border-border/70 bg-card/40 px-4 py-4">
                            <div
                                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                <Target className="h-4 w-4 text-primary"/>
                                Most Frags Last 24 Hours
                            </div>
                            <div className="mt-2 text-xl font-bold leading-none text-foreground">
                                {props.topDailyPlayer ? (
                                    <Link
                                        href={`/players/${encodeURIComponent(props.topDailyPlayer.playerName)}`}
                                        className="hover:text-primary transition-colors"
                                    >
                                        <Q3ColoredText text={props.topDailyPlayer.playerName}/>
                                    </Link>
                                ) : (
                                    "No frags yet"
                                )}
                            </div>
                            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                {props.topDailyPlayer
                                    ? `${formatNumber(props.topDailyPlayer.kills)} frags in the last 24 hours`
                                    : "Last 24 hours scoreboard is empty"}
                            </p>
                        </div>

                        <div className="border border-border/70 bg-card/40 px-4 py-4">
                            <div
                                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                <Skull className="h-4 w-4 text-primary"/>
                                Total Frags Ever
                            </div>
                            <div className="mt-2 text-2xl font-bold leading-none text-foreground">
                                {formatNumber(props.totalKillCount)}
                            </div>
                            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                Global scoreboard total
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
