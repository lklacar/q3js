import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://q3js.com"),
  title: "Q3JS — Play Quake III in your browser",
  description: "Join live Quake III multiplayer servers directly from your browser.",
  applicationName: "Q3JS",
};

export const viewport: Viewport = {
  themeColor: "#1b1b1b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
