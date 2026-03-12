import type {Metadata} from "next";
import HomePage from "@/views/home-page";
import {buildPageMetadata, siteConfig} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
    path: "/",
});

export default function HomeRoute() {
    return <HomePage/>;
}
