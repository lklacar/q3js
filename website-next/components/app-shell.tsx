import {Footer} from "@/components/footer";
import {Header} from "@/components/header";
import React from "react";
import {PageVisitReporter} from "@/components/page-visit-reporter";

export function AppShell(props: {
    children: React.ReactNode;
}) {
    return (
        <div className="bg-background">
            <PageVisitReporter/>
            <Header/>
            {props.children}
            <Footer/>
        </div>
    );
}
