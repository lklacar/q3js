import type { Metadata } from "next";
import { PlayClient } from "@/components/play-client";

export const metadata: Metadata = {
  title: "Play — Q3JS",
  description: "Launch Quake III in your browser and connect to a Q3JS server.",
};

export default function PlayPage() {
  return (
    <main className="relative isolate h-dvh min-h-dvh w-screen overflow-hidden bg-black text-foreground">
      <PlayClient />
    </main>
  );
}
