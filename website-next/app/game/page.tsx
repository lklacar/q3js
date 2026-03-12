import GamePage from "@/views/game-page";
import type {Metadata} from "next";
import {Suspense} from "react";
import {buildPageMetadata} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "Play Quake III Arena",
    description: "Join a Q3JS server and play Quake III Arena in your browser.",
    path: "/game",
    robots: {
        index: false,
        follow: false,
        noarchive: true,
        googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
        },
    },
});

export default function GameRoute() {
    return (
        <Suspense fallback={null}>
            <GamePage/>
        </Suspense>
    );
}
