package com.q3js.master.event;

public record IngestedEvent(
    String type,
    EventRequest.EventPlayer player,
    EventRequest.EventPlayer killer,
    EventRequest.EventPlayer victim,
    Integer meansOfDeath,
    int gameTime,
    int serverTime,
    String map
) {
}
