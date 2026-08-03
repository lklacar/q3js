package com.q3js.master.server.controller;

import com.q3js.master.event.security.EventAuthenticator;
import com.q3js.master.server.dto.HeartbeatRequest;
import com.q3js.master.server.dto.ServerResponse;
import com.q3js.master.server.service.ServerService;

import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;

@Path("/api/servers")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Servers", description = "Game server discovery and registration")
public class ServerController {
    private final EventAuthenticator authenticator;
    private final ServerService serverService;

    public ServerController(EventAuthenticator authenticator, ServerService serverService) {
        this.authenticator = authenticator;
        this.serverService = serverService;
    }

    @GET
    @Operation(summary = "List live game servers")
    @APIResponse(responseCode = "200", description = "Live servers with their latest Quake status")
    public List<ServerResponse> servers() {
        return serverService.servers();
    }

    @PUT
    @Path("/heartbeat")
    @Operation(summary = "Register or refresh a game server")
    @APIResponse(responseCode = "204", description = "Heartbeat accepted")
    @APIResponse(responseCode = "400", description = "Heartbeat payload is invalid")
    public Response heartbeat(
        @Valid HeartbeatRequest heartbeat,
        @HeaderParam(EventAuthenticator.CLIENT_SECRET_HEADER)
        @Parameter(description = "Shared game-server event secret")
        String suppliedSecret
    ) {
        serverService.register(heartbeat, authenticator.isAuthorized(suppliedSecret));
        return Response.noContent().build();
    }
}
