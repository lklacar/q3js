"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Users } from "@phosphor-icons/react";
import { Q3ColoredText } from "@/components/q3-colored-text";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { masterServerQueryOptions } from "@/lib/master-server-query";

function countLabel(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function OnlinePlayersSheetQuery() {
  const { data: servers = [], error, isPending } = useQuery(masterServerQueryOptions());
  const players = servers.flatMap((server) =>
    server.users
      .filter((player) => !player.bot)
      .map((player) => ({ player, server })),
  );
  const activeServerCount = new Set(players.map(({ server }) => server.id)).size;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-5 right-5 z-40 h-12 gap-2 border border-primary/70 px-4 shadow-[0_8px_30px_rgba(0,0,0,0.45)] sm:bottom-6 sm:right-6"
          aria-label={isPending ? "Loading online players" : `View ${countLabel(players.length, "player")} online`}
        >
          <Users className={isPending ? "animate-pulse" : undefined} weight="fill" aria-hidden="true" />
          {isPending ? "Players" : `${players.length} online`}
        </Button>
      </SheetTrigger>

      <SheetContent aria-describedby="online-players-description">
        <SheetHeader>
          <SheetTitle>Players online</SheetTitle>
          <SheetDescription id="online-players-description">
            {players.length > 0
              ? `${countLabel(players.length, "player")} across ${countLabel(activeServerCount, "arena")}. Updated live.`
              : error
                ? "The live player list is unavailable right now."
                : "No human players are connected right now. Updated live."}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          {players.length > 0 ? (
            <div className="divide-y divide-border/60">
              {players.map(({ player, server }, index) => (
                <SheetClose key={`${server.id}-${player.name}-${index}`} asChild>
                  <Link
                    href={`/players/${encodeURIComponent(player.name)}`}
                    className="block px-5 py-4 transition-colors hover:bg-muted/60"
                  >
                    <span className="flex min-w-0 items-center gap-2 font-mono text-sm font-bold">
                      <Q3ColoredText text={player.name} className="min-w-0 truncate" />
                      <span className="text-muted-foreground" aria-hidden="true">@</span>
                      <Q3ColoredText
                        text={server.coloredName}
                        className="min-w-0 truncate text-xs font-normal"
                      />
                    </span>
                    <span className="mt-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
                      <span>{server.map}</span>
                      <span aria-hidden="true">/</span>
                      <span>{player.score} score</span>
                      <span aria-hidden="true">/</span>
                      <span>{player.ping} ping</span>
                    </span>
                  </Link>
                </SheetClose>
              ))}
            </div>
          ) : (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <Users className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="mt-4 font-mono text-sm font-bold uppercase">
                {error ? "Player list unavailable" : "The arenas are quiet"}
              </p>
              <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                {error
                  ? error.message
                  : "Human players will appear here as soon as they connect to a live server."}
              </p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function OnlinePlayersSheet() {
  const pathname = usePathname();

  if (pathname.startsWith("/play")) return null;

  return <OnlinePlayersSheetQuery />;
}
