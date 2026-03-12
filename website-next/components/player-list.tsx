import Link from "next/link";
import {Users} from "lucide-react";
import {ScrollArea} from "@/components/ui/scroll-area.tsx";
import {Q3ColoredText} from "@/components/q3-colored-text.tsx";
import {ServerUserResponse} from "@/lib/client";

export function PlayerList(props: { users: ServerUserResponse[] }) {
    return <div className="mt-4 border-t border-border/50 pt-4">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4"/>
                <span className="font-semibold text-foreground">
                                                        Players ({props.users.length})
                                                    </span>
            </div>
        </div>

        <div>
            {props.users.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                    No players online.
                </p>
            ) : (
                <ScrollArea
                    className="h-40 overflow-y-auto rounded-md border border-border/40 bg-background/40">
                    <div
                        className="grid grid-cols-[4rem_4rem_minmax(0,1fr)] px-3 py-2 text-[11px] font-mono text-muted-foreground border-b border-border/40">
                        <span>SCORE</span>
                        <span>PING</span>
                        <span>NAME</span>
                    </div>
                    {props.users.map((u, idx) => (
                        <div
                            key={`player-${idx}-${u.name}`}
                            className="grid grid-cols-[4rem_4rem_minmax(0,1fr)] px-3 py-1.5 text-[11px] font-mono text-foreground odd:bg-background/40"
                        >
                            <span className="tabular-nums">{u.score}</span>
                            <span className="tabular-nums">{u.ping}</span>
                            <Link
                                href={`/players/${encodeURIComponent(u.name)}`}
                                className="truncate hover:text-primary transition-colors"
                            >
                                <Q3ColoredText text={u.name}/>
                            </Link>
                        </div>
                    ))}
                </ScrollArea>
            )}
        </div>
    </div>;
}
