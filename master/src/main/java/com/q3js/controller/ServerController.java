package com.q3js.controller;

import com.q3js.service.ServerService;
import com.q3js.service.dto.HeartbeatRequest;
import com.q3js.service.dto.ServerInfoResponse;
import com.q3js.service.dto.ServerResponse;
import io.vertx.core.http.HttpServerRequest;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;

import java.util.List;

@ApplicationScoped
@Path("/api/servers")
@RequiredArgsConstructor
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ServerController {

    private final ServerService serverService;

    @Context
    HttpHeaders headers;

    @Context
    HttpServerRequest request;

    @GET
    public List<ServerResponse> getAllServers() {
        return serverService.getAllServers();
    }


    @PUT
    @Path("/heartbeat")
    public void refreshServer(HeartbeatRequest heartbeatRequest) {
        serverService.handleHeartbeat(heartbeatRequest);
    }

}
