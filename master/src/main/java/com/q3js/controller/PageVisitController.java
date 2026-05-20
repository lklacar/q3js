package com.q3js.controller;

import com.q3js.service.IpAddressResolver;
import com.q3js.service.PageVisitService;
import com.q3js.service.dto.PageVisitRequest;
import io.vertx.core.http.HttpServerRequest;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;

@ApplicationScoped
@Path("/api/page-visits")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RequiredArgsConstructor
public class PageVisitController {
    private final PageVisitService pageVisitService;
    private final IpAddressResolver ipAddressResolver;

    @Context
    HttpHeaders headers;

    @Context
    HttpServerRequest request;

    @POST
    public void record(PageVisitRequest pageVisitRequest) {
        pageVisitService.record(
                pageVisitRequest,
                ipAddressResolver.resolve(headers, request),
                headers != null ? headers.getHeaderString(HttpHeaders.USER_AGENT) : null
        );
    }
}
