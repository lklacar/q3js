package com.q3js.service.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class ServerUserResponse {

    @NotNull
    private Integer score;

    @NotNull
    private Integer ping;

    @NotNull
    private String name;
}
