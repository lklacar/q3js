package com.q3js.controller;

import com.q3js.service.AdminService;
import com.q3js.service.dto.AdminBanRequest;
import com.q3js.service.dto.AdminLoginResponse;
import com.q3js.service.dto.AdminPlayersRequest;
import com.q3js.service.dto.AdminPlayersResponse;
import com.q3js.service.dto.BannedIpResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;

@ApplicationScoped
@Path("/api/admin")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RequiredArgsConstructor
public class AdminController {
    private final AdminService adminService;

    @POST
    @Path("/login")
    public AdminLoginResponse login(AdminPlayersRequest request) {
        return adminService.login(request != null ? request.getPassword() : null);
    }

    @GET
    @Path("/players")
    public AdminPlayersResponse getPlayers(@HeaderParam("Authorization") String authorizationHeader) {
        return adminService.getPlayers(authorizationHeader);
    }

    @POST
    @Path("/bans")
    public BannedIpResponse ban(
            @HeaderParam("Authorization") String authorizationHeader,
            AdminBanRequest request
    ) {
        return adminService.ban(authorizationHeader, request);
    }

    @DELETE
    @Path("/bans/{ipAddress}")
    public void unban(
            @HeaderParam("Authorization") String authorizationHeader,
            @PathParam("ipAddress") String ipAddress
    ) {
        adminService.unban(authorizationHeader, ipAddress);
    }
}
