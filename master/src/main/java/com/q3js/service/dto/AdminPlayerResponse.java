package com.q3js.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class AdminPlayerResponse {
    private String serverName;
    private String serverHost;
    private Integer serverProxyPort;
    private Integer clientNum;
    private String playerName;
    private Integer score;
    private Integer ping;
    private String state;
    private String address;
    private String ipAddress;
    private String countryCode;
    private String countryName;
    private Integer rate;
    private String path;
    private String lastSeen;
    private Boolean banned;
}
