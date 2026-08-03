package com.q3js.master.server;

import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("/api/servers")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class ServerResource {
    private final ServerService serverService;

    public ServerResource(ServerService serverService) {
        this.serverService = serverService;
    }

    @GET
    public List<ServerResponse> servers() {
        return serverService.servers();
    }

    @PUT
    @Path("/heartbeat")
    public Response heartbeat(@Valid HeartbeatRequest heartbeat) {
        serverService.register(heartbeat);
        return Response.noContent().build();
    }
}
