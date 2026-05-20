package com.q3js.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class BannedIpResponse {
    private String ipAddress;
    private String playerName;
    private String bannedAt;
}
