package com.q3js.service.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class ServerResponse {

    @NotNull
    private String id;

    @NotNull
    private String sv_hostname;

    @NotNull
    private String mapname;

    @NotNull
    private Integer g_gametype;

    @NotNull
    private Integer fraglimit;

    @NotNull
    private Integer timelimit;

    @NotNull
    private Integer sv_maxclients;

    @NotNull
    private Integer g_needpass;


    private Integer capturelimit;
    private String version;
    private String location;

    @NotNull
    private Integer players;

    private Integer ping;
    private String host;
    private Integer port;
    private String challenge;
    private Integer sv_maxPing;
    private Integer sv_minPing;
    private String com_gamename;
    private Integer com_protocol;
    private Integer dmflags;
    private Integer sv_privateClients;
    private Integer sv_minRate;
    private Integer sv_maxRate;
    private Integer sv_dlRate;
    private Integer sv_floodProtect;
    private Integer sv_allowDownload;
    private Integer bot_minplayers;
    private String gamename;
    private Integer g_maxGameClients;

    @NotNull
    private List<ServerUserResponse> users;
    private Integer proxyPort;
    private Integer targetPort;
}
