package com.q3js.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CountryResponse {
    public static final String DB_IP_ATTRIBUTION = "IP Geolocation by DB-IP";
    public static final String DB_IP_ATTRIBUTION_URL = "https://db-ip.com";

    private String ip;
    private String countryCode;
    private String countryName;
    private String attribution;
    private String attributionUrl;

    public static CountryResponse unknown(String ip) {
        return CountryResponse.builder()
                .ip(ip)
                .attribution(DB_IP_ATTRIBUTION)
                .attributionUrl(DB_IP_ATTRIBUTION_URL)
                .build();
    }
}
