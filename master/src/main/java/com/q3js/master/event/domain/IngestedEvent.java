package com.q3js.master.event.domain;

public record IngestedEvent(
    String type,
    GameEventPlayer player,
    GameEventPlayer killer,
    GameEventPlayer victim,
    Integer meansOfDeath,
    int gameTime,
    int serverTime,
    String map
) {
}
