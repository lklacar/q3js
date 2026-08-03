import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { PlayClient } from "@/components/play-client";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Play — Q3JS",
  description: "Launch Quake III in your browser and connect to a Q3JS server.",
};

export default function PlayPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
        <PlayClient />
      </main>
      <Footer />
    </div>
  );
}
