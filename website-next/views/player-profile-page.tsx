import Link from "next/link";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {JsonLd} from "@/components/seo/json-ld";
import {Q3ColoredText} from "@/components/q3-colored-text.tsx";
import {absoluteUrl, siteConfig} from "@/lib/seo";
import {stripQ3Colors} from "@/lib/utils.ts";
import {SCOREBOARD_PERIOD_LABELS} from "@/lib/scoreboard.ts";
import {PlayerStatsResponse, ScoreboardPeriod} from "@/lib/client";

function formatRatio(value: number | null) {
    if (value === null) return "Perfect";
    return value.toFixed(2);
}

function formatPlaytime(totalSeconds:  number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
}

function PlayerListCard(props: {
    title: string;
    emptyLabel: string;
    players: PlayerStatsResponse["topVictims"];
}) {
    return (
        <Card className="border-border/60 bg-card/60">
            <CardHeader className="gap-1">
                <CardTitle className="text-lg">{props.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {props.players.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{props.emptyLabel}</p>
                ) : (
                    props.players.map((player, index) => (
                        <div key={`${player.playerName}-${index}`}
                             className="flex items-center justify-between gap-4 border-b border-border/40 pb-3 last:border-b-0 last:pb-0">
                            <Link
                                href={`/players/${encodeURIComponent(player.playerName)}`}
                                className="min-w-0 text-sm font-semibold hover:text-primary transition-colors"
                            >
                                <Q3ColoredText text={player.playerName} className="truncate"/>
                            </Link>
                            <span className="font-mono text-sm text-muted-foreground">{player.kills} frags</span>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

function WeaponBreakdownCard(props: { weapons: PlayerStatsResponse["weaponBreakdown"]; totalKills: number }) {
    const maxKills = props.weapons[0]?.kills ?? 0;

    return (
        <Card className="border-border/60 bg-card/60 lg:col-span-2">
            <CardHeader className="gap-1">
                <CardTitle className="text-lg">Kills Per Weapon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {props.weapons.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No weapon data recorded for this period.</p>
                ) : (
                    props.weapons.map((weapon) => {
                        const percentOfKills = props.totalKills > 0 ? Math.round((weapon.kills / props.totalKills) * 100) : 0;
                        const barWidth = maxKills > 0 ? (weapon.kills / maxKills) * 100 : 0;

                        return (
                            <div key={weapon.meansOfDeath} className="space-y-1.5">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="font-semibold">{weapon.weaponName}</div>
                                        <div className="text-xs text-muted-foreground">MOD {weapon.meansOfDeath}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono text-sm">{weapon.kills} kills</div>
                                        <div className="text-xs text-muted-foreground">{percentOfKills}%</div>
                                    </div>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                                    <div className="h-full rounded-full bg-primary" style={{width: `${barWidth}%`}}/>
                                </div>
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}

export default function PlayerProfilePage(props: {
    playerName: string;
    period: ScoreboardPeriod;
    stats: PlayerStatsResponse;
}) {
    const plainName = stripQ3Colors(props.playerName);
    const periodLabel = SCOREBOARD_PERIOD_LABELS[props.period];
    const profileStructuredData = {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        name: `${plainName} player profile`,
        description: `${periodLabel} Q3JS profile for ${plainName}, including kills, deaths, favorite map, and rivals.`,
        url: absoluteUrl(`/players/${encodeURIComponent(props.playerName)}`),
        isPartOf: {
            "@type": "WebSite",
            name: siteConfig.name,
            url: siteConfig.url,
        },
        inLanguage: "en-US",
    };

    return (
        <main className="container mx-auto px-4 py-12 md:py-16">
            <JsonLd data={profileStructuredData}/>
            <section className="mx-auto max-w-5xl space-y-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-primary/30 text-primary">
                                Player Profile
                            </Badge>
                            <Badge variant="outline" className="border-border/60 text-muted-foreground">
                                {periodLabel}
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight">
                                <Q3ColoredText text={props.playerName}/>
                            </h1>
                            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                                Frag profile for {plainName}. Drill into their output, favorite tools, and the players
                                they farm or fear most.
                            </p>
                        </div>
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/scoreboard">Back to scoreboard</Link>
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Card className="border-border/60 bg-card/60">
                        <CardHeader className="gap-1">
                            <CardTitle className="text-sm text-muted-foreground">Rank</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {props.stats.rank !== null ? `#${props.stats.rank}` : "Unranked"}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 bg-card/60">
                        <CardHeader className="gap-1">
                            <CardTitle className="text-sm text-muted-foreground">Kills / Deaths</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{props.stats.kills} / {props.stats.deaths}</div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 bg-card/60">
                        <CardHeader className="gap-1">
                            <CardTitle className="text-sm text-muted-foreground">K/D Ratio</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{formatRatio(props.stats.killDeathRatio)}</div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 bg-card/60">
                        <CardHeader className="gap-1">
                            <CardTitle className="text-sm text-muted-foreground">Playtime</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{formatPlaytime(Number(props.stats.playtimeSeconds))}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="border-border/60 bg-card/60">
                        <CardHeader className="gap-1">
                            <CardTitle className="text-lg">Favorite Map</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {props.stats.favoriteMap ? (
                                <>
                                    <div
                                        className="text-3xl font-bold uppercase">{props.stats.favoriteMap.mapName}</div>
                                    <p className="text-sm text-muted-foreground">
                                        {props.stats.favoriteMap.kills} kills landed here.
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">No kills recorded for this period.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 bg-card/60">
                        <CardHeader className="gap-1">
                            <CardTitle className="text-lg">Favorite Weapon</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {props.stats.favoriteWeapon ? (
                                <>
                                    <div className="text-3xl font-bold">{props.stats.favoriteWeapon.weaponName}</div>
                                    <p className="text-sm text-muted-foreground">
                                        {props.stats.favoriteWeapon.kills} kills,
                                        MOD {props.stats.favoriteWeapon.meansOfDeath}.
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">No weapon trends yet for this period.</p>
                            )}
                        </CardContent>
                    </Card>

                    <WeaponBreakdownCard weapons={props.stats.weaponBreakdown} totalKills={props.stats.kills}/>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <PlayerListCard
                        title="Top Victims"
                        emptyLabel="No victims recorded for this period."
                        players={props.stats.topVictims}
                    />
                    <PlayerListCard
                        title="Top Nemeses"
                        emptyLabel="Nobody has farmed this player yet."
                        players={props.stats.topNemeses}
                    />
                </div>
            </section>
        </main>
    );
}
