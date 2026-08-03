package com.q3js.master.country.controller;

import com.q3js.master.country.dto.CountryResponse;
import com.q3js.master.country.mapper.CountryMapper;
import com.q3js.master.country.service.CountryService;
import com.q3js.master.country.service.IpAddressResolver;
import io.vertx.core.http.HttpServerRequest;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/api/country")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Country", description = "Requester country lookup for game userinfo")
public class CountryController {
    private final CountryService countryService;
    private final CountryMapper countryMapper;
    private final IpAddressResolver ipAddressResolver;

    @Context
    HttpServerRequest request;

    @Context
    HttpHeaders headers;

    public CountryController(
        CountryService countryService,
        CountryMapper countryMapper,
        IpAddressResolver ipAddressResolver
    ) {
        this.countryService = countryService;
        this.countryMapper = countryMapper;
        this.ipAddressResolver = ipAddressResolver;
    }

    @GET
    @Operation(operationId = "getRequesterCountry", summary = "Get the requester's country")
    @APIResponse(responseCode = "200", description = "Country resolved from the requester's public IP address")
    public CountryResponse country() {
        String ipAddress = ipAddressResolver.resolve(headers, request);
        return countryMapper.response(countryService.lookup(ipAddress));
    }
}
