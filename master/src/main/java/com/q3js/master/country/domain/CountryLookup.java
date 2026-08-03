package com.q3js.master.country.domain;

public record CountryLookup(
    String ip,
    String countryCode,
    String countryName
) {
    public static CountryLookup unknown(String ip) {
        return new CountryLookup(ip, null, null);
    }
}
