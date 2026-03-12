import {GAME_TYPES} from "@/lib/q3.ts";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {Activity, Globe, Lock, Users} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {getGameLimits, getPercentage, getPingColor} from "@/lib/utils.ts";
import {JoinServerButton} from "@/components/join-server-button.tsx";
import {PlayerList} from "@/components/player-list.tsx";
import {ServerResponse} from "@/lib/client";

export function ServerCard(props: {
    server: ServerResponse;
}) {
    const info = props.server;

    const sortedUsers = [...info.users].sort((a, b) => b.score - a.score);

    return (
        <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-all">
            <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-lg font-bold text-foreground">
                                        {info.sv_hostname}
                                    </h3>
                                    {info.g_needpass === 1 && (
                                        <Lock className="h-4 w-4 text-muted-foreground"/>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <Badge
                                        variant="outline"
                                        className="font-mono text-xs border-border/50 text-muted-foreground"
                                    >
                                        <Globe className="h-3 w-3 mr-1"/> {info.location ?? "Unknown"}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="font-mono text-xs border-border/50 text-muted-foreground"
                                    >
                                        {info.mapname.toUpperCase()}
                                    </Badge>
                                    <Badge className="font-mono text-xs bg-accent/20 text-accent border-accent/30">
                                        {GAME_TYPES[info.g_gametype] || "Unknown"}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="font-mono text-xs border-border/50 text-muted-foreground"
                                    >
                                        {getGameLimits(info)}
                                    </Badge>
                                </div>
                            </div>

                            <JoinServerButton server={info}/>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground"/>
                                <span className="text-foreground font-mono">
                                    {info.players}/{info.sv_maxclients}
                                </span>
                                <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full"
                                        style={{
                                            width: `${getPercentage(
                                                info.players,
                                                info.sv_maxclients
                                            )}%`
                                        }}
                                    />
                                </div>
                            </div>
                            {info.ping !== undefined && (
                                <div className="flex items-center gap-2">
                                    <Activity className={`h-4 w-4 ${getPingColor(info.ping)}`}/>
                                    <span className={`font-mono ${getPingColor(info.ping)}`}>
                                        {info.ping}ms
                                    </span>
                                </div>
                            )}
                        </div>

                        <PlayerList users={sortedUsers}/>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
