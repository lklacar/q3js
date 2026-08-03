package com.q3js.master.country.mapper;

import com.q3js.master.country.domain.CountryLookup;
import com.q3js.master.country.dto.CountryResponse;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class CountryMapper {
    static final String ATTRIBUTION = "IP Geolocation by DB-IP";
    static final String ATTRIBUTION_URL = "https://db-ip.com";

    public CountryResponse response(CountryLookup country) {
        return new CountryResponse(
            country.ip(),
            country.countryCode(),
            country.countryName(),
            ATTRIBUTION,
            ATTRIBUTION_URL
        );
    }
}
