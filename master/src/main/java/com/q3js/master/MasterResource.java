package com.q3js.master;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/api/status")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Status", description = "Master server status")
public class MasterResource {

    @GET
    @Operation(summary = "Get master server status")
    @APIResponse(responseCode = "200", description = "The master server is running")
    public StatusResponse status() {
        return new StatusResponse("q3js-master", "ok");
    }

    public record StatusResponse(String service, String status) {
    }
}
