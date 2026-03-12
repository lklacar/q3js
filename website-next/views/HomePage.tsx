import {ServerPicker} from "@/components/server-picker"
import {Hero} from "@/components/hero.tsx";
import {ScoreboardPreview} from "@/components/scoreboard-preview.tsx";
import {JsonLd} from "@/components/seo/json-ld";
import {absoluteUrl, siteConfig} from "@/lib/seo";
import {stripQ3Colors} from "@/lib/utils.ts";
import {Suspense} from "react";
import ServerPickerSkeleton from "@/components/server-picker-skeleton.tsx";
import {getInitialScoreboard, getInitialServers} from "@/lib/initial-data.tsx";


const homeStructuredData = [
    {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
        inLanguage: "en-US",
        potentialAction: {
            "@type": "ViewAction",
            name: "Browse live Quake III Arena servers",
            target: absoluteUrl("/#server-browser"),
        },
    },
    {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: siteConfig.name,
        applicationCategory: "GameApplication",
        operatingSystem: "Web Browser",
        description: siteConfig.description,
        url: siteConfig.url,
        image: absoluteUrl(siteConfig.ogImage),
        genre: "First-person shooter",
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
        },
    },
];

export default async function HomePage() {
    const [initialServers, allTimeScoreboard, dailyScoreboard] = await Promise.all([
        getInitialServers(),
        getInitialScoreboard("ALL_TIME"),
        getInitialScoreboard("DAILY"),
    ]);

    const currentPlayerCount = initialServers.reduce((sum, server) => sum + server.players, 0);
    const totalKillCount = allTimeScoreboard.reduce((sum, entry) => sum + entry.kills, 0);
    const firstServer = initialServers[0];
    const topDailyPlayer = [...dailyScoreboard].sort((a, b) => {
        if (b.kills !== a.kills) return b.kills - a.kills;
        return stripQ3Colors(a.playerName).localeCompare(stripQ3Colors(b.playerName));
    })[0] ?? null;

    return (
        <main>
            <JsonLd data={homeStructuredData}/>
            <Hero
                currentPlayerCount={currentPlayerCount}
                serverCount={initialServers.length}
                totalKillCount={totalKillCount}
                topDailyPlayer={topDailyPlayer}
                firstServer={firstServer}
            />
            <ScoreboardPreview initialPeriod="DAILY" initialScoreboard={dailyScoreboard}/>

            <Suspense fallback={<ServerPickerSkeleton/>}>
                <ServerPicker/>
            </Suspense>
        </main>
    )
}
