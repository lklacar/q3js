import Link from "next/link";
import { Crosshair, Trophy } from "@phosphor-icons/react/dist/ssr";
import { JsonLd } from "@/components/json-ld";
import { Q3ColoredText } from "@/components/q3-colored-text";
import type {
  ProfileResponse,
  ProfileRivalResponse,
  ProfileWeaponResponse,
} from "@/lib/api/generated/types.gen";
import { formatRelativeTime } from "@/lib/format";
import { absoluteUrl, siteConfig } from "@/lib/seo";
import { cn } from "@/lib/utils";

function stripQuakeColors(value: string): string {
  return value.replace(/\^(?:[0-9]|x[0-9a-f]{6})/gi, "").replaceAll("^^", "^");
}

function formatPlaytime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function Stat({
  compact = false,
  label,
  value,
}: Readonly<{ compact?: boolean; label: string; value: React.ReactNode }>) {
  return (
    <div className="min-w-0 px-4 py-4">
      <dt className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className={cn(
        "mt-1 font-bold tabular-nums",
        compact ? "text-sm leading-5" : "truncate font-mono text-xl tracking-[0.025em]",
      )}>{value}</dd>
    </div>
  );
}

function WeaponBreakdown({ kills, weapons }: Readonly<{ kills: number; weapons: ProfileWeaponResponse[] }>) {
  const maximum = Math.max(...weapons.map((weapon) => weapon.kills), 1);
  return (
    <section aria-labelledby="weapons-heading" className="border border-border/60 bg-card/45 p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="weapons-heading" className="font-mono text-xl font-bold uppercase tracking-[0.03em]">Weapons</h2>
        <span className="font-mono text-xs uppercase text-muted-foreground">{kills} total kills</span>
      </div>
      {weapons.length ? (
        <div className="mt-5 space-y-4">
          {weapons.map((weapon) => (
            <div key={weapon.meansOfDeath}>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold">{weapon.weaponName}</span>
                <span className="font-mono text-muted-foreground">
                  {weapon.kills} · {kills ? Math.round((weapon.kills / kills) * 100) : 0}%
                </span>
              </div>
              <div className="mt-2 h-1.5 bg-secondary" aria-hidden="true">
                <div className="h-full bg-primary" style={{ width: `${(weapon.kills / maximum) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No weapon data recorded.</p>
      )}
    </section>
  );
}

function Rivals({
  empty,
  players,
  title,
}: Readonly<{ empty: string; players: ProfileRivalResponse[]; title: string }>) {
  return (
    <section className="border border-border/60 bg-card/45 p-5 md:p-6">
      <h2 className="font-mono text-xl font-bold uppercase tracking-[0.03em]">{title}</h2>
      {players.length ? (
        <ol className="mt-4 divide-y divide-border/40">
          {players.map((player, index) => (
            <li key={player.playerName} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 py-3 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
              <Link
                href={`/players/${encodeURIComponent(player.playerName)}`}
                className="truncate font-semibold hover:text-primary"
              >
                <Q3ColoredText text={player.playerName} />
              </Link>
              <span className="font-mono text-muted-foreground">{player.kills} kills</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

export function ProfilePage({ profile }: Readonly<{ profile: ProfileResponse }>) {
  const plainName = stripQuakeColors(profile.playerName) || profile.playerName;
  const profileUrl = absoluteUrl(`/players/${encodeURIComponent(profile.playerName)}`);
  const description = `${plainName}'s Q3JS player profile: ${profile.kills} kills and ${profile.deaths} deaths.`;
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 md:pt-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          name: `${plainName} Player Profile`,
          description,
          url: profileUrl,
          inLanguage: siteConfig.language,
          dateModified: profile.lastOnline,
          isPartOf: {
            "@type": "WebSite",
            name: siteConfig.name,
            url: siteConfig.url,
          },
          mainEntity: {
            "@type": "Person",
            name: plainName,
            identifier: profile.playerName,
            url: profileUrl,
            description: `All-time Q3JS stats for ${plainName}.`,
            mainEntityOfPage: profileUrl,
            additionalProperty: [
              { "@type": "PropertyValue", name: "Q3JS rank", value: profile.rank ?? "Unranked" },
              { "@type": "PropertyValue", name: "Kills", value: profile.kills },
              { "@type": "PropertyValue", name: "Deaths", value: profile.deaths },
              { "@type": "PropertyValue", name: "Playtime in seconds", value: profile.playtimeSeconds },
            ],
          },
        }}
      />
      <header>
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Combat record / Player profile</p>
          <h1 className="mt-2 break-words font-mono text-3xl font-black tracking-[0.03em] md:text-4xl">
            <Q3ColoredText text={profile.playerName} />
          </h1>
          {plainName !== profile.playerName && (
            <p className="mt-2 font-mono text-xs text-muted-foreground">{plainName}</p>
          )}
        </div>
      </header>

      <dl className="mt-8 grid grid-cols-2 border border-border/60 bg-card/55 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Rank" value={profile.rank ? `#${profile.rank}` : "—"} />
        <Stat label="Kills" value={profile.kills} />
        <Stat label="Deaths" value={profile.deaths} />
        <Stat label="K/D" value={profile.killDeathRatio ?? (profile.kills ? "∞" : "0.00")} />
        <Stat label="Playtime" value={formatPlaytime(profile.playtimeSeconds)} />
        <Stat compact label="Last online" value={formatRelativeTime(profile.lastOnline)} />
      </dl>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="border border-border/60 bg-card/35 p-5 md:p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="size-4" />
            <h2 className="font-mono text-xs uppercase tracking-[0.12em]">Favorite map</h2>
          </div>
          <p className="mt-3 font-mono text-xl font-bold uppercase tracking-[0.03em]">{profile.favoriteMap?.mapName ?? "No map yet"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile.favoriteMap ? `${profile.favoriteMap.kills} kills recorded here.` : "No kills recorded."}
          </p>
        </section>
        <section className="border border-border/60 bg-card/35 p-5 md:p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Crosshair className="size-4" />
            <h2 className="font-mono text-xs uppercase tracking-[0.12em]">Favorite weapon</h2>
          </div>
          <p className="mt-3 font-mono text-xl font-bold uppercase tracking-[0.03em]">{profile.favoriteWeapon?.weaponName ?? "No weapon yet"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile.favoriteWeapon
              ? `${profile.favoriteWeapon.kills} kills · MOD ${profile.favoriteWeapon.meansOfDeath}`
              : "No kills recorded."}
          </p>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <WeaponBreakdown kills={profile.kills} weapons={profile.weaponBreakdown} />
        <div className="grid gap-4">
          <Rivals title="Top victims" players={profile.topVictims} empty="No victims recorded." />
          <Rivals title="Top nemeses" players={profile.topNemeses} empty="No nemeses recorded." />
        </div>
      </div>

    </main>
  );
}
