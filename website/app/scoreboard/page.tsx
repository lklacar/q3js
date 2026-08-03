import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { ScoreboardPage } from "@/components/scoreboard-page";
import { SiteHeader } from "@/components/site-header";
import { fetchScoreboard } from "@/lib/scoreboard-server";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Global Scoreboard",
  description: "Live Q3JS scoreboard with last 24 hours, weekly, monthly, and all-time frag leaders.",
  path: "/scoreboard",
  keywords: [
    "Q3JS scoreboard",
    "Quake 3 leaderboard",
    "frag leaderboard",
    "Q3JS stats",
    "Quake III player stats",
  ],
});

type SearchParameters = Record<string, string | string[] | undefined>;

function parameter(parameters: SearchParameters, name: string): string | undefined {
  const value = parameters[name];
  return Array.isArray(value) ? value[0] : value;
}

function scoreboardPeriod(value?: string): string {
  const normalized = value?.trim().toLowerCase().replaceAll("_", "-");
  return ["daily", "weekly", "monthly", "all-time"].includes(normalized ?? "")
    ? normalized!
    : "daily";
}

function scoreboardPage(value?: string): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function scoreboardSearch(value?: string): string {
  return value?.trim().slice(0, 128) ?? "";
}

function scoreboardTimeZone(value?: string): string {
  const timeZone = value?.trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
    return timeZone;
  } catch {
    return "UTC";
  }
}

export default async function ScoreboardRoute({
  searchParams,
}: Readonly<{ searchParams: Promise<SearchParameters> }>) {
  const parameters = await searchParams;
  const period = scoreboardPeriod(parameter(parameters, "period"));
  const page = scoreboardPage(parameter(parameters, "page"));
  const search = scoreboardSearch(parameter(parameters, "search"));
  const timeZone = scoreboardTimeZone(parameter(parameters, "timeZone"));
  const scoreboard = await fetchScoreboard(period, timeZone, page, 25, search);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <ScoreboardPage scoreboard={scoreboard} search={search} timeZone={timeZone} />
      <Footer />
    </div>
  );
}
