package com.q3js.master.server.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(requiredProperties = {
    "id", "sv_hostname", "mapname", "g_gametype", "fraglimit", "timelimit",
    "sv_maxclients", "g_needpass", "fs_game", "capturelimit", "version", "location",
    "players", "ping", "host", "port", "challenge", "sv_maxPing", "sv_minPing",
    "com_gamename", "com_protocol", "dmflags", "sv_privateClients", "sv_minRate",
    "sv_maxRate", "sv_dlRate", "sv_floodProtect", "sv_allowDownload", "bot_minplayers",
    "gamename", "g_maxGameClients", "users", "proxyPort", "targetPort"
})
public record ServerInfo(
    String id,
    String sv_hostname,
    String mapname,
    int g_gametype,
    int fraglimit,
    int timelimit,
    int sv_maxclients,
    int g_needpass,
    String fs_game,
    int capturelimit,
    String version,
    String location,
    int players,
    int ping,
    String host,
    int port,
    String challenge,
    int sv_maxPing,
    int sv_minPing,
    String com_gamename,
    int com_protocol,
    int dmflags,
    int sv_privateClients,
    int sv_minRate,
    int sv_maxRate,
    int sv_dlRate,
    int sv_floodProtect,
    int sv_allowDownload,
    int bot_minplayers,
    String gamename,
    int g_maxGameClients,
    List<ServerPlayer> users,
    int proxyPort,
    int targetPort
) {
}
