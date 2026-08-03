package com.q3js.master.stats.domain;

public record SiteStats(
    int playersOnline,
    TopFragger mostFragsLast24Hours,
    long totalFragsEver
) {
}
