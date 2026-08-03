package com.q3js.master.country.controller;

import com.q3js.master.country.domain.CountryLookup;
import com.q3js.master.country.service.CountryService;
import com.q3js.master.country.service.IpAddressResolver;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@QuarkusTest
class CountryControllerTest {
    @InjectMock
    CountryService countryService;

    @InjectMock
    IpAddressResolver ipAddressResolver;

    @Test
    void returnsRequesterCountryWithAttribution() {
        when(ipAddressResolver.resolve(any(), any())).thenReturn("203.0.113.10");
        when(countryService.lookup("203.0.113.10"))
            .thenReturn(new CountryLookup("203.0.113.10", "RS", "Serbia"));

        given()
            .when().get("/api/country")
            .then()
            .statusCode(200)
            .body("ip", is("203.0.113.10"))
            .body("countryCode", is("RS"))
            .body("countryName", is("Serbia"))
            .body("attribution", is("IP Geolocation by DB-IP"))
            .body("attributionUrl", is("https://db-ip.com"));
    }
}
