package com.q3js.controller;

import com.q3js.service.GeoIpService;
import com.q3js.service.IpAddressResolver;
import com.q3js.service.dto.CountryResponse;
import io.vertx.core.http.HttpServerRequest;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;

@ApplicationScoped
@Path("/api/country")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RequiredArgsConstructor
public class CountryController {
    private final GeoIpService geoIpService;
    private final IpAddressResolver ipAddressResolver;

    @Context
    HttpServerRequest request;

    @Context
    HttpHeaders headers;

    @GET
    public CountryResponse getRequesterCountry() {
        return geoIpService.lookupCountry(ipAddressResolver.resolve(headers, request));
    }

    @GET
    @Path("/lookup")
    public CountryResponse getCountryForIp(@QueryParam("ip") String ipAddress) {
        return geoIpService.lookupCountry(ipAddress);
    }
}
