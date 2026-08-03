package com.q3js.master.event.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record EventRequest(
    @NotBlank
    @Pattern(regexp = "(?i)kill|join|leave")
    String event,
    @Valid EventPlayer player,
    @Valid EventPlayer killer,
    @Valid EventPlayer victim,
    @Min(0) @Max(1024) Integer meansOfDeath,
    @NotNull @Min(0) Integer gameTime,
    @NotNull @Min(0) Integer serverTime,
    @NotBlank @Size(max = 64) String map
) {
    public record EventPlayer(
        @NotNull @Min(0) @Max(1023) Integer clientNum,
        @NotBlank @Size(max = 128) String name
    ) {
    }
}
