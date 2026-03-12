import type {Metadata} from "next";
import GuidePage from "@/views/guide-page";
import {buildPageMetadata} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "Run Your Own Q3JS Server",
    description:
        "Step-by-step guide to run your own Q3JS Quake III server with Docker, required ports, and baseq3 setup instructions.",
    path: "/guide",
    keywords: [
        "Q3JS server setup",
        "Quake 3 dedicated server",
        "ioq3 Docker",
        "run Quake 3 server",
        "Q3JS guide",
    ],
});

export default function GuideRoute() {
    return <GuidePage/>;
}
