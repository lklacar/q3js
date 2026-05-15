package com.q3js.service;

import com.q3js.service.dto.CountryResponse;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GeoIpServiceTest {
    @Test
    void lookupCountryUsesBundledDatabaseResource() throws Exception {
        GeoIpService service = new GeoIpService();
        service.countryDatabasePath = Path.of("/does/not/exist.mmdb");
        service.countryDatabaseResource = "dbip-country-lite.mmdb";
        service.openDatabase();

        try {
            CountryResponse response = service.lookupCountry("8.8.8.8");

            assertEquals("US", response.getCountryCode());
            assertEquals("United States", response.getCountryName());
            assertEquals(CountryResponse.DB_IP_ATTRIBUTION, response.getAttribution());
            assertEquals(CountryResponse.DB_IP_ATTRIBUTION_URL, response.getAttributionUrl());
        } finally {
            service.closeDatabase();
        }
    }
}
