"use client";

import {ExternalLinkIcon, SwordsIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useStoredPlayerName} from "@/hooks/use-stored-player-name";
import {buildJediAcademyUrl} from "@/lib/jedi-academy";

export function JediAcademyLinkButton(props: {
    className?: string;
    label?: string;
}) {
    const playerName = useStoredPlayerName();
    const jediAcademyUrl = buildJediAcademyUrl(playerName);

    return (
        <Button variant="outline" size="lg" className={props.className} asChild>
            <a href={jediAcademyUrl}>
                <SwordsIcon className="h-4 w-4"/>
                {props.label ?? "Jedi Academy"}
                <ExternalLinkIcon className="h-4 w-4"/>
            </a>
        </Button>
    );
}
