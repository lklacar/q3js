"use client";

import Link from "next/link";
import {Badge} from "@/components/ui/badge.tsx";
import {Button, buttonVariants} from "@/components/ui/button.tsx";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from "@/components/ui/sheet.tsx";
import {useQuery} from "@tanstack/react-query";
import {getAllServersOptions} from "@/lib/client/@tanstack/react-query.gen.ts";
import {useLocalStorage} from "@/hooks/use-local-storage.ts";
import {createRandomPlayerName} from "@/lib/player-name-generator.ts";
import {MenuIcon} from "lucide-react";
import {cn} from "@/lib/utils.ts";
import {PwaInstallControl} from "@/components/pwa-install-control.tsx";
import {buildJediAcademyUrl} from "@/lib/jedi-academy";

const HEADER_STATUS_STYLES = {
    offline: {
        badgeClassName: "border-destructive/40 text-destructive",
        dotClassName: "bg-destructive",
    },
    online: {
        badgeClassName: "border-primary/30 text-primary",
        dotClassName: "bg-primary animate-pulse",
    },
    pending: {
        badgeClassName: "border-primary/30 text-primary",
        dotClassName: "bg-primary animate-pulse",
    },
} as const;

function getHeaderStatus(isOffline: boolean, isPending: boolean) {
    if (isOffline) return "offline";
    if (isPending) return "pending";
    return "online";
}

const HEADER_LINK_CLASS_NAME =
    "h-6 border-muted-foreground/30 text-muted-foreground hover:border-foreground hover:text-foreground transition-colors";

type HeaderNavItem = {
    href?: string;
    label: string;
    mobileLabel?: string;
    external?: boolean;
};

function HeaderNavBadge(props: HeaderNavItem) {
    const label = props.mobileLabel ?? props.label;

    if (!props.href) {
        return (
            <Badge
                variant="outline"
                className={HEADER_LINK_CLASS_NAME}
            >
                {label}
            </Badge>
        );
    }

    return (
        <Badge
            asChild
            variant="outline"
            className={HEADER_LINK_CLASS_NAME}
        >
            <Link
                href={props.href}
                target={props.external ? "_blank" : undefined}
                rel={props.external ? "noreferrer" : undefined}
            >
                {label}
            </Link>
        </Badge>
    );
}

function HeaderSheetLink(props: HeaderNavItem) {
    const label = props.mobileLabel ?? props.label;

    if (!props.href) {
        return (
            <span
                className={cn(
                    buttonVariants({variant: "outline"}),
                    "justify-start border-muted-foreground/30 text-muted-foreground opacity-60"
                )}
            >
                {label}
            </span>
        );
    }

    return (
        <SheetClose asChild>
            <Link
                href={props.href}
                target={props.external ? "_blank" : undefined}
                rel={props.external ? "noreferrer" : undefined}
                className={cn(
                    buttonVariants({variant: "outline"}),
                    "justify-start border-muted-foreground/30 text-muted-foreground hover:border-foreground hover:text-foreground"
                )}
            >
                {label}
            </Link>
        </SheetClose>
    );
}

export function Header() {
    const [name] = useLocalStorage(
        "name",
        createRandomPlayerName()
    );

    const serversResponse = useQuery({
        ...getAllServersOptions()
    });

    const servers = serversResponse.data;
    const normalizedName = name.trim();
    const profileHref = normalizedName.length > 0
        ? `/players/${encodeURIComponent(normalizedName)}`
        : null;

    const serverCount = servers?.length ?? 0;
    const isOffline = serversResponse.isError;
    const status = getHeaderStatus(isOffline, serversResponse.isPending);
    const statusLabel = {
        offline: "Master offline",
        pending: "Checking...",
        online: `${serverCount} servers live`,
    }[status];
    const statusStyles = HEADER_STATUS_STYLES[status];
    const navItems: HeaderNavItem[] = [
        {
            href: buildJediAcademyUrl(normalizedName),
            label: "Jedi Academy",
            external: true,
        },
        {
            href: "/scoreboard/distribution",
            label: "Activity",
            mobileLabel: "Activity",
        },
        {
            href: "/scoreboard",
            label: "Global Scoreboard",
            mobileLabel: "Global Scoreboard",
        },
        {
            href: profileHref ?? undefined,
            label: "My Profile",
        },
        {
            href: "https://discord.gg/mKvM9su443",
            label: "Join Discord",
            external: true,
        },
    ];

    return <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-4">
            <Link href="/" className="flex items-center gap-3">
                <div>
                    <p className="text-xl font-bold tracking-tight text-foreground">Q3JS</p>
                    <p className="text-xs text-muted-foreground font-mono">v0.0.1</p>
                </div>
            </Link>

            <div className="flex items-center gap-2">
                <Badge
                    variant="outline"
                    className={`h-6 max-w-[11rem] gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap ${statusStyles.badgeClassName}`}
                >
                    <span className={`h-2 w-2 rounded-full ${statusStyles.dotClassName}`}/>
                    {statusLabel}
                </Badge>
                <PwaInstallControl/>
                <div className="hidden items-center gap-2 md:flex">
                    {navItems.map((item) => (
                        <HeaderNavBadge
                            key={item.label}
                            {...item}
                        />
                    ))}
                </div>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon-sm"
                            className="border-muted-foreground/30 text-muted-foreground hover:border-foreground hover:text-foreground md:hidden"
                        >
                            <MenuIcon className="size-4"/>
                            <span className="sr-only">Open navigation menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent
                        side="right"
                        className="w-[min(24rem,calc(100vw-1.5rem))] border-l border-border/50 bg-background/95 px-0"
                    >
                        <SheetHeader className="border-b border-border/50">
                            <SheetTitle>Navigation</SheetTitle>
                            <SheetDescription>
                                Browse scoreboards, activity, your profile, and community links.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="flex flex-col gap-3 p-4">
                            <Badge
                                variant="outline"
                                className={`h-8 justify-start gap-1.5 px-3 text-sm ${statusStyles.badgeClassName}`}
                            >
                                <span className={`h-2 w-2 rounded-full ${statusStyles.dotClassName}`}/>
                                {statusLabel}
                            </Badge>
                            {navItems.map((item) => (
                                <HeaderSheetLink
                                    key={item.label}
                                    {...item}
                                />
                            ))}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </div>
    </header>;
}
