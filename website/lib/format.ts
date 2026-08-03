export function formatRelativeTime(value: string | null): string {
  if (!value) return "Unknown";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Unknown";

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  const units = [
    { seconds: 31_536_000, label: "year" },
    { seconds: 2_592_000, label: "month" },
    { seconds: 86_400, label: "day" },
    { seconds: 3_600, label: "hour" },
    { seconds: 60, label: "minute" },
  ] as const;

  for (const unit of units) {
    if (elapsedSeconds >= unit.seconds) {
      const amount = Math.floor(elapsedSeconds / unit.seconds);
      return `${amount} ${unit.label}${amount === 1 ? "" : "s"} ago`;
    }
  }
  return "Just now";
}
