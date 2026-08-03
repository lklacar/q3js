package com.q3js.master.country.service;

import com.q3js.master.country.domain.CountryLookup;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class CountryServiceTest {
    @Test
    void resolvesPublicAddressFromBundledDatabase() throws Exception {
        CountryService service = new CountryService(
            Path.of("src/main/resources/dbip-country-lite.mmdb"),
            "dbip-country-lite.mmdb",
            Optional.empty()
        );

        try {
            service.openDatabase();
            CountryLookup country = service.lookup("8.8.8.8");

            assertEquals("8.8.8.8", country.ip());
            assertNotNull(country.countryCode());
            assertEquals(2, country.countryCode().length());
            assertNotNull(country.countryName());
        } finally {
            service.closeDatabase();
        }
    }

    @Test
    void usesConfiguredFallbackForLoopbackAddress() throws Exception {
        CountryService service = new CountryService(
            Path.of("src/main/resources/dbip-country-lite.mmdb"),
            "dbip-country-lite.mmdb",
            Optional.of("rs")
        );

        try {
            service.openDatabase();
            CountryLookup country = service.lookup("::1");

            assertEquals("::1", country.ip());
            assertEquals("RS", country.countryCode());
        } finally {
            service.closeDatabase();
        }
    }
}
