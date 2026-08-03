import Link from "next/link";
import { CaretLeft, CaretRight, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { JsonLd } from "@/components/json-ld";
import { Q3ColoredText } from "@/components/q3-colored-text";
import { Button } from "@/components/ui/button";
import type { ScoreboardPageResponse, ScoreboardPeriod } from "@/lib/api/generated/types.gen";
import { formatRelativeTime } from "@/lib/format";
import { absoluteUrl, siteConfig } from "@/lib/seo";
import { cn } from "@/lib/utils";

const periods = [
  { value: "daily", response: "DAILY", label: "24 hours" },
  { value: "weekly", response: "WEEKLY", label: "This week" },
  { value: "monthly", response: "MONTHLY", label: "This month" },
  { value: "all-time", response: "ALL_TIME", label: "All time" },
] as const satisfies ReadonlyArray<{ value: string; response: ScoreboardPeriod; label: string }>;

interface ScoreboardHrefOptions {
  page?: number;
  period: string;
  search: string;
  timeZone: string;
}

function scoreboardHref({ page = 1, period, search, timeZone }: ScoreboardHrefOptions): string {
  const parameters = new URLSearchParams({ period });
  if (page > 1) parameters.set("page", String(page));
  if (search) parameters.set("search", search);
  if (timeZone !== "UTC") parameters.set("timeZone", timeZone);
  return `/scoreboard?${parameters.toString()}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}

function stripQuakeColors(value: string): string {
  return value.replace(/\^(?:[0-9]|x[0-9a-f]{6})/gi, "").replaceAll("^^", "^");
}

function SummaryStat({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="px-5 py-4">
      <dt className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-xl font-bold tracking-[0.025em] tabular-nums">{value}</dd>
    </div>
  );
}

export function ScoreboardPage({
  scoreboard,
  search,
  timeZone,
}: Readonly<{
  scoreboard: ScoreboardPageResponse;
  search: string;
  timeZone: string;
}>) {
  const activePeriod = periods.find((period) => period.response === scoreboard.period) ?? periods[0];
  const firstRank = (scoreboard.page - 1) * scoreboard.pageSize + 1;
  const description = `Global Q3JS frag rankings for ${activePeriod.label.toLowerCase()}.`;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 md:pt-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Q3JS Global Scoreboard",
          description,
          url: absoluteUrl("/scoreboard"),
          inLanguage: siteConfig.language,
          isPartOf: {
            "@type": "WebSite",
            name: siteConfig.name,
            url: siteConfig.url,
          },
          mainEntity: {
            "@type": "ItemList",
            name: `${activePeriod.label} frag rankings`,
            numberOfItems: scoreboard.totalEntries,
            itemListElement: scoreboard.entries.map((entry, index) => ({
              "@type": "ListItem",
              position: firstRank + index,
              url: absoluteUrl(`/players/${encodeURIComponent(entry.playerName)}`),
              name: stripQuakeColors(entry.playerName) || entry.playerName,
            })),
          },
        }}
      />
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Frag archive / Global rankings</p>
          <h1 className="mt-2 font-mono text-3xl font-black uppercase tracking-[0.035em] md:text-4xl">Scoreboard</h1>
          <p className="mt-3 max-w-xl text-base leading-6 text-muted-foreground">
            Frag leaders across every Q3JS server reporting to the master.
          </p>
        </div>

        <nav aria-label="Scoreboard period" className="flex flex-wrap gap-1 border border-border/60 bg-card/45 p-1">
          {periods.map((period) => (
            <Link
              key={period.value}
              href={scoreboardHref({ period: period.value, search, timeZone })}
              aria-current={scoreboard.period === period.response ? "page" : undefined}
              className={cn(
                "px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground",
                scoreboard.period === period.response && "bg-secondary text-foreground",
              )}
            >
              {period.label}
            </Link>
          ))}
        </nav>
      </header>

      <dl className="mt-8 grid grid-cols-2 border border-border/60 bg-card/55 sm:grid-cols-3">
        <SummaryStat label={search ? "Matching players" : "Ranked players"} value={formatNumber(scoreboard.totalEntries)} />
        <SummaryStat label={search ? "Matching frags" : "Total frags"} value={formatNumber(scoreboard.totalKills)} />
        <div className="col-span-2 sm:col-span-1">
          <SummaryStat label="Period" value={activePeriod.label} />
        </div>
      </dl>

      <form action="/scoreboard" method="get" className="mt-4 flex flex-col gap-2 border border-border/60 bg-card/35 p-3 sm:flex-row">
        <input type="hidden" name="period" value={activePeriod.value} />
        {timeZone !== "UTC" && <input type="hidden" name="timeZone" value={timeZone} />}
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search scoreboard players</span>
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="search"
            defaultValue={search}
            maxLength={128}
            placeholder="Search player"
            className="h-10 w-full bg-input pl-9 pr-3 font-mono text-sm placeholder:text-muted-foreground focus:outline-2 focus:outline-ring"
          />
        </label>
        <Button type="submit" size="lg" className="h-10 px-5">Search</Button>
        {search && (
          <Button asChild type="button" variant="ghost" size="lg" className="h-10 px-4">
            <Link href={scoreboardHref({ period: activePeriod.value, search: "", timeZone })}>Clear</Link>
          </Button>
        )}
      </form>

      {scoreboard.entries.length ? (
        <div className="mt-4 overflow-x-auto border border-border/60 bg-card/35">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-card/70 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th scope="col" className="w-20 px-5 py-3 font-medium">Rank</th>
                <th scope="col" className="px-3 py-3 font-medium">Player</th>
                <th scope="col" className="w-28 px-5 py-3 text-right font-medium">Frags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {scoreboard.entries.map((entry, index) => {
                const rank = firstRank + index;
                return (
                  <tr key={`${entry.playerName}-${rank}`}>
                    <td className={cn(
                      "px-5 py-4 font-mono tabular-nums text-muted-foreground",
                      rank <= 3 && "font-bold text-primary",
                    )}>
                      #{rank}
                    </td>
                    <td className="min-w-0 px-3 py-4">
                      <Link
                        href={`/players/${encodeURIComponent(entry.playerName)}`}
                        className="inline-block max-w-full truncate font-semibold hover:text-primary"
                      >
                        <Q3ColoredText text={entry.playerName} />
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last online {formatRelativeTime(entry.lastOnline)}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-semibold tabular-nums">
                      {formatNumber(entry.kills)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 border border-border/60 bg-card/35 px-6 py-12 text-center">
          <p className="text-base font-semibold">{search ? "No matching players." : "No frags recorded yet."}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {search ? "Try a shorter player name or clear the search." : "Play a match and check back here."}
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-4 font-mono text-xs text-muted-foreground">
        <span>Page {scoreboard.page} of {scoreboard.totalPages}</span>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className={cn(!scoreboard.hasPreviousPage && "pointer-events-none opacity-40")}>
            <Link
              href={scoreboardHref({
                page: scoreboard.page - 1,
                period: activePeriod.value,
                search,
                timeZone,
              })}
              aria-disabled={!scoreboard.hasPreviousPage}
              tabIndex={scoreboard.hasPreviousPage ? undefined : -1}
            >
              <CaretLeft /> Previous
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className={cn(!scoreboard.hasNextPage && "pointer-events-none opacity-40")}>
            <Link
              href={scoreboardHref({
                page: scoreboard.page + 1,
                period: activePeriod.value,
                search,
                timeZone,
              })}
              aria-disabled={!scoreboard.hasNextPage}
              tabIndex={scoreboard.hasNextPage ? undefined : -1}
            >
              Next <CaretRight />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
