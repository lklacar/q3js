import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/footer";
import { ProfilePage } from "@/components/profile-page";
import { SiteHeader } from "@/components/site-header";
import { fetchProfile } from "@/lib/profile-server";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type RouteParameters = { name: string };
type SearchParameters = Record<string, string | string[] | undefined>;

function parameter(parameters: SearchParameters, name: string): string | undefined {
  const value = parameters[name];
  return Array.isArray(value) ? value[0] : value;
}

function decodePlayerName(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function profilePeriod(value?: string): string {
  const normalized = value?.trim().toLowerCase();
  return ["daily", "weekly", "monthly", "all-time"].includes(normalized ?? "")
    ? normalized!
    : "all-time";
}

function profileTimeZone(value?: string): string {
  const timeZone = value?.trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
    return timeZone;
  } catch {
    return "UTC";
  }
}

async function routeProfile(params: Promise<RouteParameters>, searchParams: Promise<SearchParameters>) {
  const [parameters, query] = await Promise.all([params, searchParams]);
  const playerName = decodePlayerName(parameters.name);
  const period = profilePeriod(parameter(query, "period"));
  const timeZone = profileTimeZone(parameter(query, "timeZone"));
  return {
    playerName,
    period,
    timeZone,
    profile: await fetchProfile(playerName, period, timeZone),
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: Readonly<{ params: Promise<RouteParameters>; searchParams: Promise<SearchParameters> }>): Promise<Metadata> {
  const { playerName, profile } = await routeProfile(params, searchParams);
  const path = `/players/${encodeURIComponent(playerName)}`;
  if (!profile) {
    return buildPageMetadata({
      title: "Player not found",
      description: "This Q3JS player profile could not be found.",
      path,
      robots: { index: false, follow: false },
    });
  }
  const plainName = playerName.replace(/\^(?:[0-9]|x[0-9a-f]{6})/gi, "");
  const displayName = plainName || playerName;
  return buildPageMetadata({
    title: `${displayName} Player Profile`,
    description: `Kills, deaths, playtime, weapons, maps, and rivals for ${plainName || playerName} on Q3JS.`,
    path,
    keywords: [displayName, `${displayName} Q3JS`, "Q3JS player", "Quake 3 stats", "Quake III Arena player"],
  });
}

export default async function PlayerProfileRoute({
  params,
  searchParams,
}: Readonly<{ params: Promise<RouteParameters>; searchParams: Promise<SearchParameters> }>) {
  const { profile, timeZone } = await routeProfile(params, searchParams);
  if (!profile) notFound();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <ProfilePage profile={profile} timeZone={timeZone} />
      <Footer />
    </div>
  );
}
