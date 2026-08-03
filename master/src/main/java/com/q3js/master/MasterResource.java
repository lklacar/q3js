package com.q3js.master;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/api/status")
@Produces(MediaType.APPLICATION_JSON)
public class MasterResource {

    @GET
    public StatusResponse status() {
        return new StatusResponse("q3js-master", "ok");
    }

    public record StatusResponse(String service, String status) {
    }
}
