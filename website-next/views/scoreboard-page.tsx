import {ScoreboardClient} from "@/components/scoreboard-client";
import {JsonLd} from "@/components/seo/json-ld";
import {absoluteUrl, siteConfig} from "@/lib/seo";
import {KillDistributionPointResponse, ScoreboardEntryResponse, ScoreboardPeriod} from "@/lib/client";

const scoreboardStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Global Scoreboard",
    description: "Live Q3JS scoreboard with last 24 hours, weekly, monthly, and all-time frag leaders.",
    url: absoluteUrl("/scoreboard"),
    isPartOf: {
        "@type": "WebSite",
        name: siteConfig.name,
        url: siteConfig.url,
    },
    inLanguage: "en-US",
};

export default function ScoreboardPage(props: {
    killDistributions: Record<ScoreboardPeriod, KillDistributionPointResponse[]>;
    scoreboards: Record<ScoreboardPeriod, ScoreboardEntryResponse[]>;
}) {
    return (
        <main className="container mx-auto px-4 py-12 md:py-16">
            <JsonLd data={scoreboardStructuredData}/>
            <section className="mx-auto max-w-5xl space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Global Scoreboard</h1>
                    <p className="text-sm text-muted-foreground md:text-base">
                        Switch between last 24 hours, weekly, monthly, and all-time frags across reported servers.
                    </p>
                </div>

                <ScoreboardClient
                    killDistributions={props.killDistributions}
                    scoreboards={props.scoreboards}
                />
            </section>
        </main>
    );
}
