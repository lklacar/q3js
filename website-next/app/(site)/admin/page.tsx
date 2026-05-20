import {Metadata} from "next";
import {AdminPlayerPanel} from "@/components/admin-player-panel";
import {buildPageMetadata} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "Q3JS Admin",
    description: "Q3JS server administration.",
    path: "/admin",
    robots: {
        index: false,
        follow: false,
    },
});

export default function AdminPage() {
    return <AdminPlayerPanel/>;
}
