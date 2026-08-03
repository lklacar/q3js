package com.q3js.master.scoreboard.domain;

import java.time.OffsetDateTime;

public record ScoreboardEntry(String playerName, long kills, OffsetDateTime lastOnline) {
}
