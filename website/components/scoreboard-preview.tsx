import { Trophy } from "@phosphor-icons/react/dist/ssr";

export type ScoreboardEntry = {
  name: string;
  frags: number;
};

export function ScoreboardPreview({ entries }: { entries: ScoreboardEntry[] }) {
  return (
    <aside id="scoreboard" aria-labelledby="scoreboard-heading" className="border border-border bg-card/40">
      <div className="flex items-center justify-between gap-4 border-b border-border p-4">
        <div>
          <h2 id="scoreboard-heading" className="text-sm font-bold uppercase">Top fraggers</h2>
          <p className="mt-1 text-[10px] uppercase text-muted-foreground">Last 24 hours</p>
        </div>
        <Trophy className="size-5 text-primary" />
      </div>

      {entries.length > 0 ? (
        <ol className="divide-y divide-border">
          {entries.slice(0, 5).map((entry, index) => (
            <li key={`${entry.name}-${index}`} className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 px-4 py-3 text-xs">
              <span className="text-muted-foreground">#{index + 1}</span>
              <span className="truncate font-semibold">{entry.name}</span>
              <span className="tabular-nums">{entry.frags}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="grid min-h-48 place-items-center p-6 text-center">
          <div>
            <p className="text-xs font-semibold">No frag events yet</p>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              Rankings will populate when matches are connected.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
