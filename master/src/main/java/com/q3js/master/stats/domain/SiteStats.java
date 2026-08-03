package com.q3js.master.stats.domain;

public record SiteStats(
    int playersOnline,
    int botsOnline,
    TopFragger mostFragsLast24Hours,
    long totalFragsEver
) {
}
