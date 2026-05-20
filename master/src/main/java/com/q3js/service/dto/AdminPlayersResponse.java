package com.q3js.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class AdminPlayersResponse {
    private Integer serversChecked;
    private List<AdminPlayerResponse> players;
    private List<AdminServerErrorResponse> serverErrors;
}
