package com.q3js.master.country.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(requiredProperties = {"ip", "attribution", "attributionUrl"})
public record CountryResponse(
    String ip,
    @Schema(nullable = true) String countryCode,
    @Schema(nullable = true) String countryName,
    String attribution,
    String attributionUrl
) {
}
