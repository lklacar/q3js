"use client";

import {useEffect, useState} from "react";
import {ExternalLinkIcon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.tsx";
import {useLocalStorage} from "@/hooks/use-local-storage.ts";
import {useStoredPlayerName} from "@/hooks/use-stored-player-name";
import {buildJediAcademyUrl} from "@/lib/jedi-academy";

const JEDI_ACADEMY_PROMO_STORAGE_KEY = "q3js.jedi-academy-promo.dismissed";

export function JediAcademyPromoDialog() {
    const [dismissed, setDismissed] = useLocalStorage(JEDI_ACADEMY_PROMO_STORAGE_KEY, false);
    const [open, setOpen] = useState(false);
    const playerName = useStoredPlayerName();
    const jediAcademyUrl = buildJediAcademyUrl(playerName);
    const normalizedName = playerName.trim();

    useEffect(() => {
        const openDialogTimer = window.setTimeout(() => {
            if (dismissed) {
                return;
            }

            setOpen(true);
        }, 0);

        return () => window.clearTimeout(openDialogTimer);
    }, [dismissed]);

    function handleDontShowAgain() {
        setDismissed(true);
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="gap-0 overflow-hidden border-primary/35 bg-black p-0 shadow-xl shadow-black/60 sm:max-w-xl">
                <div className="relative min-h-48 overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.14),transparent_28%),linear-gradient(120deg,rgba(122,18,18,0.72),rgba(0,0,0,0.88)_50%,rgba(18,42,56,0.82))]"/>
                    <div className="absolute left-[-5rem] top-14 h-2 w-[30rem] rotate-[-18deg] rounded-full bg-primary shadow-[0_0_18px_var(--color-primary),0_0_52px_var(--color-primary)]"/>
                    <div className="absolute bottom-12 right-[-6rem] h-2 w-[29rem] rotate-[-18deg] rounded-full bg-chart-4 shadow-[0_0_18px_var(--color-chart-4),0_0_52px_var(--color-chart-4)]"/>
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.82),rgba(0,0,0,0.38)_66%,rgba(0,0,0,0.16))]"/>

                    <DialogHeader className="relative gap-3 p-6 text-left sm:p-8">
                        <p className="text-xs font-bold uppercase text-primary">New browser launch</p>
                        <DialogTitle className="max-w-md text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                            Jedi Academy is live
                        </DialogTitle>
                        <DialogDescription className="max-w-md text-sm leading-6 text-foreground/80">
                            Star Wars Jedi Knight: Jedi Academy now runs in the browser at jk.q3js.com.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="space-y-5 bg-card/95 p-6 sm:p-8">
                    <p className="text-sm leading-6 text-muted-foreground">
                        Jump into lightsaber duels, Force powers, and multiplayer from the browser
                        {normalizedName.length > 0 ? ` as ${normalizedName}` : ""}.
                    </p>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={handleDontShowAgain}>
                            Don&apos;t show again
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Not now
                        </Button>
                        <Button asChild>
                            <a href={jediAcademyUrl}>
                                Play now
                                <ExternalLinkIcon className="size-4"/>
                            </a>
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
