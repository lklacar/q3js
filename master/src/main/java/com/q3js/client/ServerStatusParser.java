package com.q3js.client;

import com.q3js.domain.Server;
import com.q3js.service.dto.ServerInfoResponse;
import com.q3js.service.dto.ServerUserResponse;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

public final class ServerStatusParser {
    private static final Pattern PLAYER_LINE_PATTERN = Pattern.compile("^\\s*(-?\\d+)\\s+(\\d+)\\s+\"(.*)\"\\s*$");

    private ServerStatusParser() {
    }

    static ServerInfoResponse parse(String rawStatus, Server server, int ping) {
        var lines = rawStatus.replace("\r", "").split("\n");
        int statusLineIndex = -1;
        for (int i = 0; i < lines.length; i++) {
            if (lines[i].contains("statusResponse")) {
                statusLineIndex = i;
                break;
            }
        }

        if (statusLineIndex == -1 || statusLineIndex + 1 >= lines.length) {
            return null;
        }

        var rulesLine = lines[statusLineIndex + 1].trim();
        if (rulesLine.isEmpty()) {
            return null;
        }

        var kv = parseRules(rulesLine);
        var users = parseUsers(lines, statusLineIndex + 2);

        return ServerInfoResponse.builder()
                .id(server.getHost() + ":" + server.getTargetPort())
                .sv_hostname(defaultString(kv.getOrDefault("sv_hostname", kv.getOrDefault("hostname", "Unnamed Server")), "Unnamed Server"))
                .mapname(kv.getOrDefault("mapname", "unknown"))
                .g_gametype(toInt(kv.getOrDefault("g_gametype", kv.getOrDefault("gametype", "0"))))
                .fraglimit(toInt(kv.get("fraglimit")))
                .timelimit(toInt(kv.get("timelimit")))
                .sv_maxclients(toInt(kv.get("sv_maxclients")))
                .g_needpass(toInt(kv.get("g_needpass")))
                .fsGame(defaultString(kv.get("fs_game"), "baseq3"))
                .capturelimit(toInt(kv.get("capturelimit")))
                .version(defaultString(kv.get("version"), defaultString(kv.get("com_gamename"), kv.get("gamename"))))
                .players(users.size())
                .ping(ping)
                .port(server.getTargetPort())
                .challenge(kv.get("challenge"))
                .sv_maxPing(toInt(kv.get("sv_maxping")))
                .sv_minPing(toInt(kv.get("sv_minping")))
                .com_gamename(kv.get("com_gamename"))
                .com_protocol(toInt(kv.get("com_protocol")))
                .dmflags(toInt(kv.get("dmflags")))
                .sv_privateClients(toInt(kv.get("sv_privateclients")))
                .sv_minRate(toInt(kv.get("sv_minrate")))
                .sv_maxRate(toInt(kv.get("sv_maxrate")))
                .sv_dlRate(toInt(kv.get("sv_dlrate")))
                .sv_floodProtect(toInt(kv.get("sv_floodprotect")))
                .sv_allowDownload(toInt(kv.get("sv_allowdownload")))
                .bot_minplayers(toInt(kv.get("bot_minplayers")))
                .gamename(kv.get("gamename"))
                .g_maxGameClients(toInt(kv.get("g_maxgameclients")))
                .host(server.getHost())
                .proxyPort(server.getProxyPort())
                .targetPort(server.getTargetPort())
                .users(users)
                .build();
    }

    private static Map<String, String> parseRules(String rulesLine) {
        var parts = rulesLine.split("\\\\");
        Map<String, String> kv = new HashMap<>();
        for (int i = 1; i + 1 < parts.length; i += 2) {
            kv.put(parts[i].toLowerCase(), parts[i + 1]);
        }
        return kv;
    }

    private static List<ServerUserResponse> parseUsers(String[] lines, int startIndex) {
        List<ServerUserResponse> users = new ArrayList<>();
        for (int i = startIndex; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line.isEmpty()) {
                continue;
            }

            var matcher = PLAYER_LINE_PATTERN.matcher(line);
            if (!matcher.matches()) {
                continue;
            }

            users.add(ServerUserResponse.builder()
                    .score(Integer.parseInt(matcher.group(1)))
                    .ping(Integer.parseInt(matcher.group(2)))
                    .name(defaultString(matcher.group(3), ""))
                    .build());
        }
        return users;
    }

    private static Integer toInt(String value) {
        try {
            return Integer.parseInt(defaultString(value, "0"));
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private static String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
