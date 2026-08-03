package com.q3js.master.country.config;

import com.maxmind.db.DatabaseRecord;
import com.maxmind.db.Metadata;
import com.maxmind.db.Network;
import com.maxmind.geoip2.model.CountryResponse;
import com.maxmind.geoip2.record.Continent;
import com.maxmind.geoip2.record.Country;
import com.maxmind.geoip2.record.MaxMind;
import com.maxmind.geoip2.record.RepresentedCountry;
import com.maxmind.geoip2.record.Traits;
import io.quarkus.runtime.annotations.RegisterForReflection;

@RegisterForReflection(
    targets = {
        Metadata.class,
        Network.class,
        DatabaseRecord.class,
        CountryResponse.class,
        Continent.class,
        Country.class,
        MaxMind.class,
        RepresentedCountry.class,
        Traits.class
    },
    fields = false
)
public final class GeoIpReflectionConfiguration {
    private GeoIpReflectionConfiguration() {
    }
}
