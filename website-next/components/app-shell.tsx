import {Footer} from "@/components/footer";
import {Header} from "@/components/header";
import {JediAcademyPromoDialog} from "@/components/jedi-academy-promo-dialog";
import React from "react";

export function AppShell(props: {
    children: React.ReactNode;
}) {
    return (
        <div className="bg-background">
            <JediAcademyPromoDialog/>
            <Header/>
            {props.children}
            <Footer/>
        </div>
    );
}
