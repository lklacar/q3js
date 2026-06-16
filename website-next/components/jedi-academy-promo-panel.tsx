"use client";

import {ExternalLinkIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useStoredPlayerName} from "@/hooks/use-stored-player-name";
import {buildJediAcademyUrl} from "@/lib/jedi-academy";

export function JediAcademyPromoPanel() {
    const playerName = useStoredPlayerName();
    const jediAcademyUrl = buildJediAcademyUrl(playerName);
    const normalizedName = playerName.trim();

    return (
        <section className="relative min-h-[18rem] overflow-hidden rounded-md border border-primary/35 bg-black shadow-lg shadow-black/40">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(255,255,255,0.12),transparent_28%),linear-gradient(120deg,rgba(120,16,16,0.62),rgba(0,0,0,0.86)_45%,rgba(18,34,42,0.84))]"/>
            <div className="absolute left-[-4rem] top-12 h-2 w-[34rem] rotate-[-18deg] rounded-full bg-primary shadow-[0_0_18px_var(--color-primary),0_0_54px_var(--color-primary)]"/>
            <div className="absolute bottom-10 right-[-5rem] h-2 w-[31rem] rotate-[-18deg] rounded-full bg-chart-4 shadow-[0_0_18px_var(--color-chart-4),0_0_54px_var(--color-chart-4)]"/>
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.78),rgba(0,0,0,0.38)_58%,rgba(0,0,0,0.12))]"/>

            <div className="relative flex min-h-[18rem] flex-col justify-between gap-8 p-6 sm:p-8">
                <div className="max-w-3xl space-y-4">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
                        New browser launch
                    </p>
                    <div className="space-y-2">
                        <p className="text-sm uppercase text-muted-foreground">Star Wars Jedi Knight</p>
                        <h3 className="text-4xl font-bold leading-none text-foreground sm:text-6xl">
                            Jedi Academy
                        </h3>
                    </div>
                    <p className="max-w-xl text-base leading-7 text-foreground/85">
                        Lightsaber duels and Force powers, playable at jk.q3js.com. Your Q3JS name
                        {normalizedName.length > 0 ? `, ${normalizedName},` : ""} comes with you.
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button asChild size="lg" className="w-full sm:w-auto">
                        <a href={jediAcademyUrl}>
                            Play Jedi Academy
                            <ExternalLinkIcon className="size-4"/>
                        </a>
                    </Button>
                    <p className="font-mono text-sm text-muted-foreground">
                        jk.q3js.com{normalizedName.length > 0 ? `?name=${normalizedName}` : ""}
                    </p>
                </div>
            </div>
        </section>
    );
}
