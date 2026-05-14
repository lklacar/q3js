"use client";

import {Button} from "@/components/ui/button.tsx";
import {Dice6Icon, Zap} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {useLocalStorage} from "@/hooks/use-local-storage.ts";
import {createRandomPlayerName} from "@/lib/player-name-generator.ts";
import {ServerResponse} from "@/lib/client";
import {env} from "@/env";

export function JoinServerButton(props: {
    server: ServerResponse;
    ctaLabel?: string;
    className?: string;
}) {
    const isFull = props.server.info.players >= props.server.info.sv_maxclients;
    const ctaLabel = props.ctaLabel ?? "Join now";

    const [name, setName] = useLocalStorage(
        "name",
        createRandomPlayerName()
    );

    const gamePageBaseUrl = !props.server.secure
        ? env.NEXT_PUBLIC_INSECURE_GAME_PAGE_BASE_URL
        : "";

    if (isFull) {
        return (
            <Button
                size="lg"
                className={`w-full sm:w-auto bg-primary text-primary-foreground font-bold ${
                    props.className ?? ""
                }`.trim()}
                disabled
            >
                Server Full
            </Button>
        );
    }

    const fsGame = props.server.info.gamename === "cpma" ? "cpma" : "q3js";

    const gameUrl = `${gamePageBaseUrl}/game?host=${props.server.host}&proxyPort=${props.server.proxyPort}&name=${encodeURIComponent(
        name
    )}&fs_game=${fsGame}`;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    size="lg"
                    className={`w-full sm:w-auto bg-primary text-primary-foreground font-bold ${
                        props.className ?? ""
                    }`.trim()}
                >
                    <Zap className="h-4 w-4 mr-2"/>
                    {ctaLabel}
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Join server</DialogTitle>
                    <DialogDescription>
                        Choose your player name before joining{" "}
                        <span className="font-semibold">
              {props.server.info.sv_hostname}
            </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2 w-full">
                    <Label htmlFor="player-name">Player name</Label>
                    <div className="flex flex-row items-center">
                        <Input
                            id="player-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your player name"
                        />
                        <Button variant={'secondary'} size={"icon"} onClick={() => setName(createRandomPlayerName())}
                                className="ml-2">
                            <Dice6Icon/>
                        </Button>
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <a
                        className="w-full"
                        href={gameUrl}
                        aria-label={`Join ${props.server.info.sv_hostname}`}
                    >
                        <Button className="w-full" size="lg">
                            <Zap className="h-4 w-4 mr-2"/>
                            {ctaLabel}
                        </Button>
                    </a>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
