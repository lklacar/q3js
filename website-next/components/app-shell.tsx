import {Footer} from "@/components/footer";
import {Header} from "@/components/header";
import React from "react";

export function AppShell(props: {
    children: React.ReactNode;
}) {
    return (
        <div className="bg-background">
            <Header/>
            {props.children}
            <Footer/>
        </div>
    );
}
