package com.q3js.service;

import com.maxmind.geoip2.DatabaseReader;
import com.maxmind.geoip2.exception.AddressNotFoundException;
import com.maxmind.geoip2.model.CountryResponse;
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

@ApplicationScoped
public class GeoIpService {
    private static final Logger LOG = Logger.getLogger(GeoIpService.class);

    @ConfigProperty(name = "q3js.geoip.country-db-path")
    Path countryDatabasePath;

    @ConfigProperty(name = "q3js.geoip.country-db-resource")
    String countryDatabaseResource;

    private DatabaseReader reader;

    @PostConstruct
    void openDatabase() {
        try (InputStream resourceStream = getClass().getClassLoader().getResourceAsStream(countryDatabaseResource)) {
            if (countryDatabasePath != null && Files.isRegularFile(countryDatabasePath)) {
                reader = new DatabaseReader.Builder(countryDatabasePath.toFile()).build();
                LOG.infof("Loaded GeoIP country database from %s", countryDatabasePath);
                return;
            }

            if (resourceStream == null) {
                LOG.warnf(
                        "GeoIP country database not found at %s or classpath resource %s. Country lookups will return null country fields.",
                        countryDatabasePath,
                        countryDatabaseResource
                );
                return;
            }

            reader = new DatabaseReader.Builder(resourceStream).build();
            LOG.infof("Loaded GeoIP country database from classpath resource %s", countryDatabaseResource);
        } catch (IOException e) {
            LOG.warnf(e, "Unable to load GeoIP country database. Country lookups will return null country fields.");
        }
    }

    @PreDestroy
    void closeDatabase() throws IOException {
        if (reader != null) {
            reader.close();
        }
    }

    public com.q3js.service.dto.CountryResponse lookupCountry(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank() || reader == null) {
            return com.q3js.service.dto.CountryResponse.unknown(ipAddress);
        }

        try {
            CountryResponse response = reader.country(InetAddress.getByName(ipAddress));
            return com.q3js.service.dto.CountryResponse.builder()
                    .ip(ipAddress)
                    .countryCode(response.country().isoCode())
                    .countryName(response.country().names().get("en"))
                    .attribution(com.q3js.service.dto.CountryResponse.DB_IP_ATTRIBUTION)
                    .attributionUrl(com.q3js.service.dto.CountryResponse.DB_IP_ATTRIBUTION_URL)
                    .build();
        } catch (AddressNotFoundException e) {
            return com.q3js.service.dto.CountryResponse.unknown(ipAddress);
        } catch (Exception e) {
            LOG.debugf(e, "Unable to resolve GeoIP country for %s", ipAddress);
            return com.q3js.service.dto.CountryResponse.unknown(ipAddress);
        }
    }
}
