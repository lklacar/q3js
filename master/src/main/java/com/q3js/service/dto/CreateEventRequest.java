package com.q3js.service.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class CreateEventRequest {
    @ToString.Exclude
    private String clientSecret;
    private String event;
    private EventPlayer player;
    private EventPlayer killer;
    private EventPlayer victim;
    private Integer meansOfDeath;
    private Integer gameTime;
    private Integer serverTime;
    private String map;

    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class EventPlayer {
        private Integer clientNum;
        private String name;
    }
}
