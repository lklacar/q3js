package com.q3js.controller;

import com.q3js.service.BanService;
import com.q3js.service.dto.BannedIpResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;

import java.util.List;

@ApplicationScoped
@Path("/api/bans")
@Produces(MediaType.APPLICATION_JSON)
@RequiredArgsConstructor
public class BanController {
    private final BanService banService;

    @GET
    public List<BannedIpResponse> getBannedIps() {
        return banService.getBannedIps();
    }
}
