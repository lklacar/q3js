import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { ScoreboardDistributionPage } from "@/components/scoreboard-distribution-page";
import { SiteHeader } from "@/components/site-header";
import { fetchScoreboardDistribution } from "@/lib/scoreboard-server";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Frag Activity",
  description: "Explore hourly and daily Q3JS frag activity across the last 24 hours, week, month, or all time.",
  path: "/scoreboard/distribution",
  keywords: [
    "Q3JS activity",
    "Quake 3 activity chart",
    "Quake III frag statistics",
    "Q3JS kill distribution",
  ],
});

type SearchParameters = Record<string, string | string[] | undefined>;

function parameter(parameters: SearchParameters, name: string): string | undefined {
  const value = parameters[name];
  return Array.isArray(value) ? value[0] : value;
}

function distributionPeriod(value?: string): string {
  const normalized = value?.trim().toLowerCase().replaceAll("_", "-");
  return ["daily", "weekly", "monthly", "all-time"].includes(normalized ?? "")
    ? normalized!
    : "daily";
}

function distributionTimeZone(value?: string): string {
  const timeZone = value?.trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
    return timeZone;
  } catch {
    return "UTC";
  }
}

export default async function ScoreboardDistributionRoute({
  searchParams,
}: Readonly<{ searchParams: Promise<SearchParameters> }>) {
  const parameters = await searchParams;
  const period = distributionPeriod(parameter(parameters, "period"));
  const timeZone = distributionTimeZone(parameter(parameters, "timeZone"));
  const distribution = await fetchScoreboardDistribution(period, timeZone);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <ScoreboardDistributionPage data={distribution} period={period} timeZone={timeZone} />
      <Footer />
    </div>
  );
}
