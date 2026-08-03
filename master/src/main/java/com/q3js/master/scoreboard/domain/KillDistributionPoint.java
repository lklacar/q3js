package com.q3js.master.scoreboard.domain;

import java.time.OffsetDateTime;

public record KillDistributionPoint(OffsetDateTime bucketStart, long kills) {
}
