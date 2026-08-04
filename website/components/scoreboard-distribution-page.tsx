import Link from "next/link";
import { ArrowLeft, ChartBar } from "@phosphor-icons/react/dist/ssr";
import { JsonLd } from "@/components/json-ld";
import { KillDistributionChart } from "@/components/kill-distribution-chart";
import { Button } from "@/components/ui/button";
import type { KillDistributionPointResponse } from "@/lib/api/generated/types.gen";
import { absoluteUrl, siteConfig } from "@/lib/seo";
import { cn } from "@/lib/utils";

const periods = [
  { value: "daily", label: "24 hours", description: "the last 24 hours", bucketUnit: "hour" },
  { value: "weekly", label: "This week", description: "this week", bucketUnit: "day" },
  { value: "monthly", label: "This month", description: "this month", bucketUnit: "day" },
  { value: "all-time", label: "All time", description: "all recorded time", bucketUnit: "day" },
] as const;

function distributionHref(period: string, timeZone: string): string {
  const parameters = new URLSearchParams({ period });
  if (timeZone !== "UTC") parameters.set("timeZone", timeZone);
  return `/scoreboard/distribution?${parameters.toString()}`;
}

function scoreboardHref(period: string, timeZone: string): string {
  const parameters = new URLSearchParams({ period });
  if (timeZone !== "UTC") parameters.set("timeZone", timeZone);
  return `/scoreboard?${parameters.toString()}`;
}

export function ScoreboardDistributionPage({
  data,
  period,
  timeZone,
}: Readonly<{
  data: KillDistributionPointResponse[];
  period: string;
  timeZone: string;
}>) {
  const activePeriod = periods.find((option) => option.value === period) ?? periods[0];
  const description = `Global Q3JS frag activity across ${activePeriod.description}.`;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 md:pt-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Q3JS Frag Activity",
          description,
          url: absoluteUrl("/scoreboard/distribution"),
          inLanguage: siteConfig.language,
          isPartOf: {
            "@type": "WebSite",
            name: siteConfig.name,
            url: siteConfig.url,
          },
          temporalCoverage: activePeriod.label,
          variableMeasured: "Reported frags",
        }}
      />

      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Frag archive / Activity timeline</p>
          <h1 className="mt-2 flex items-center gap-3 font-mono text-3xl font-black uppercase tracking-[0.035em] md:text-4xl">
            <ChartBar className="size-8 text-primary" weight="fill" /> Activity
          </h1>
          <p className="mt-3 max-w-xl text-base leading-6 text-muted-foreground">
            See when the global Q3JS arena is busiest and how frag activity changes over time.
          </p>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link href={scoreboardHref(activePeriod.value, timeZone)}>
            <ArrowLeft /> Back to scoreboard
          </Link>
        </Button>
      </header>

      <nav aria-label="Activity period" className="mt-8 flex flex-wrap gap-1 border border-border/60 bg-card/45 p-1">
        {periods.map((option) => (
          <Link
            key={option.value}
            href={distributionHref(option.value, timeZone)}
            aria-current={option.value === activePeriod.value ? "page" : undefined}
            className={cn(
              "px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground",
              option.value === activePeriod.value && "bg-secondary text-foreground",
            )}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4">
        <KillDistributionChart
          bucketUnit={activePeriod.bucketUnit}
          data={data}
          periodLabel={activePeriod.description}
          timeZone={timeZone}
        />
      </div>
    </main>
  );
}
