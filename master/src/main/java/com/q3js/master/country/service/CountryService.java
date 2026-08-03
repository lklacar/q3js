package com.q3js.master.country.service;

import com.maxmind.geoip2.DatabaseReader;
import com.maxmind.geoip2.exception.AddressNotFoundException;
import com.q3js.master.country.domain.CountryLookup;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Optional;

@ApplicationScoped
public class CountryService {
    private static final Logger LOG = Logger.getLogger(CountryService.class);

    private final Path databasePath;
    private final String databaseResource;
    private final String fallbackCountryCode;
    private DatabaseReader reader;

    public CountryService(
        @ConfigProperty(name = "q3js.master.geoip.country-db-path") Path databasePath,
        @ConfigProperty(name = "q3js.master.geoip.country-db-resource") String databaseResource,
        @ConfigProperty(name = "q3js.master.geoip.fallback-country-code") Optional<String> fallbackCountryCode
    ) {
        this.databasePath = databasePath;
        this.databaseResource = databaseResource;
        this.fallbackCountryCode = fallbackCountryCode
            .map(value -> value.trim().toUpperCase(Locale.ROOT))
            .filter(value -> value.matches("[A-Z]{2}"))
            .orElse(null);
    }

    @PostConstruct
    void openDatabase() {
        try {
            if (Files.isRegularFile(databasePath)) {
                reader = new DatabaseReader.Builder(databasePath.toFile()).build();
                LOG.infof("Loaded GeoIP country database from %s", databasePath);
                return;
            }

            try (InputStream resource = getClass().getClassLoader().getResourceAsStream(databaseResource)) {
                if (resource == null) {
                    LOG.warnf(
                        "GeoIP database not found at %s or classpath resource %s; country lookups will be unknown",
                        databasePath,
                        databaseResource
                    );
                    return;
                }
                reader = new DatabaseReader.Builder(resource).build();
                LOG.infof("Loaded GeoIP country database from classpath resource %s", databaseResource);
            }
        } catch (IOException exception) {
            LOG.warnf(exception, "Unable to load GeoIP country database; country lookups will be unknown");
        }
    }

    @PreDestroy
    void closeDatabase() throws IOException {
        if (reader != null) {
            reader.close();
        }
    }

    public CountryLookup lookup(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank() || reader == null) {
            return unknown(ipAddress);
        }

        try {
            com.maxmind.geoip2.model.CountryResponse response = reader.country(InetAddress.getByName(ipAddress));
            return new CountryLookup(
                ipAddress,
                response.country().isoCode(),
                response.country().names().get("en")
            );
        } catch (AddressNotFoundException exception) {
            return unknown(ipAddress);
        } catch (Exception exception) {
            LOG.debugf(exception, "Unable to resolve GeoIP country for %s", ipAddress);
            return unknown(ipAddress);
        }
    }

    private CountryLookup unknown(String ipAddress) {
        if (fallbackCountryCode != null) {
            return new CountryLookup(ipAddress, fallbackCountryCode, null);
        }
        return CountryLookup.unknown(ipAddress);
    }
}
