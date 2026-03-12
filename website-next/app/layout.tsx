import "./globals.css";
import type {Metadata, Viewport} from "next";
import {siteConfig, siteOgImage} from "@/lib/seo";
import {env} from "@/env";
import {GoogleAnalytics} from "@next/third-parties/google";
import QueryClientProviderWrapper from "@/lib/query-client-provider-wrapper.tsx";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export const metadata: Metadata = {
    metadataBase: new URL(siteConfig.url),
    title: {
        default: siteConfig.defaultTitle,
        template: `%s | ${siteConfig.name}`,
    },
    description: siteConfig.description,
    applicationName: siteConfig.name,
    keywords: siteConfig.keywords,
    category: "Gaming",
    creator: siteConfig.name,
    publisher: siteConfig.name,
    formatDetection: {
        telephone: false,
        address: false,
        email: false,
    },
    manifest: "/manifest.json",
    icons: {
        icon: "/favicon.ico",
        apple: "/apple-touch-icon.png",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    openGraph: {
        type: "website",
        locale: siteConfig.locale,
        url: siteConfig.url,
        siteName: siteConfig.name,
        title: `${siteConfig.defaultTitle} | ${siteConfig.name}`,
        description: siteConfig.description,
        images: [siteOgImage],
    },
    twitter: {
        card: "summary_large_image",
        title: `${siteConfig.defaultTitle} | ${siteConfig.name}`,
        description: siteConfig.description,
        images: [siteConfig.ogImage],
    },
};

export const viewport: Viewport = {
    themeColor: "#101010",
    colorScheme: "dark",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    const gaMeasurementId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

    return (
        <html lang="en-US">
        <body className="antialiased">
        <QueryClientProviderWrapper>
            <div className="font-mono">{children}</div>
        </QueryClientProviderWrapper>
        </body>
        <GoogleAnalytics gaId={gaMeasurementId}/>
        </html>
    );
}
