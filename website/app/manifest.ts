import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Q3JS — Play Quake III in Your Browser",
    short_name: "Q3JS",
    description: "Play Quake III Arena instantly in your browser with WebAssembly-powered multiplayer.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "any",
    background_color: "#151515",
    theme_color: "#151515",
    lang: "en-US",
    dir: "ltr",
    categories: ["games", "entertainment"],
    icons: [
      { src: "/favicon.ico", sizes: "64x64 32x32 24x24 16x16", type: "image/x-icon" },
      { src: "/logo192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/logo512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
