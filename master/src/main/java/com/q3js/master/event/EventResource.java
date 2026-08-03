package com.q3js.master.event;

import io.vertx.core.http.HttpServerRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SecuritySchemeIn;
import org.eclipse.microprofile.openapi.annotations.enums.SecuritySchemeType;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.security.SecurityScheme;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/api/events")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Events", description = "Authenticated game event ingestion")
@SecurityScheme(
    securitySchemeName = "eventClientSecret",
    type = SecuritySchemeType.APIKEY,
    in = SecuritySchemeIn.HEADER,
    apiKeyName = EventAuthenticator.CLIENT_SECRET_HEADER,
    description = "Shared secret configured through Q3JS_EVENT_CLIENT_SECRET"
)
@SecurityRequirement(name = "eventClientSecret")
public class EventResource {
    private final EventAuthenticator authenticator;
    private final EventService eventService;

    @Context
    HttpServerRequest request;

    public EventResource(EventAuthenticator authenticator, EventService eventService) {
        this.authenticator = authenticator;
        this.eventService = eventService;
    }

    @POST
    @Operation(summary = "Ingest a game event")
    @APIResponse(responseCode = "204", description = "Event persisted")
    @APIResponse(responseCode = "400", description = "Event payload is invalid")
    @APIResponse(responseCode = "401", description = "Event client secret is missing or invalid")
    public Response ingest(
        @Valid @NotNull EventRequest event,
        @HeaderParam(EventAuthenticator.CLIENT_SECRET_HEADER)
        @Parameter(description = "Shared game-server event secret", required = true)
        String suppliedSecret
    ) {
        if (!authenticator.isAuthorized(suppliedSecret)) {
            throw new WebApplicationException(Response.status(Response.Status.UNAUTHORIZED).build());
        }

        eventService.ingest(event, sourceIp());
        return Response.noContent().build();
    }

    private String sourceIp() {
        return request != null && request.remoteAddress() != null
            ? request.remoteAddress().host()
            : null;
    }
}
