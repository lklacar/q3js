package com.q3js.master.server.service;

import com.q3js.master.server.domain.RegisteredServer;
import com.q3js.master.server.dto.ServerInfo;
import com.q3js.master.server.dto.ServerPlayer;

import jakarta.enterprise.context.ApplicationScoped;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

@ApplicationScoped
public class ServerStatusParser {
    private static final Pattern PLAYER_LINE = Pattern.compile("^\\s*(-?\\d+)\\s+(\\d+)\\s+\"(.*)\"\\s*$");

    public Optional<ServerInfo> parse(String rawStatus, RegisteredServer server, int ping) {
        String[] lines = rawStatus.replace("\r", "").split("\n");
        int responseLine = findResponseLine(lines);
        if (responseLine < 0 || responseLine + 1 >= lines.length) {
            return Optional.empty();
        }

        Map<String, String> rules = parseRules(lines[responseLine + 1]);
        if (rules.isEmpty()) {
            return Optional.empty();
        }

        List<ServerPlayer> users = parseUsers(lines, responseLine + 2);
        return Optional.of(new ServerInfo(
            server.host() + ":" + server.targetPort(),
            value(rules, "sv_hostname", value(rules, "hostname", "Unnamed Server")),
            value(rules, "mapname", "unknown"),
            integer(rules, "g_gametype", "gametype"),
            integer(rules, "fraglimit"),
            integer(rules, "timelimit"),
            integer(rules, "sv_maxclients"),
            integer(rules, "g_needpass"),
            value(rules, "fs_game", ""),
            integer(rules, "capturelimit"),
            value(rules, "version", value(rules, "com_gamename", value(rules, "gamename", ""))),
            value(rules, "location", ""),
            users.size(),
            ping,
            server.host(),
            server.targetPort(),
            value(rules, "challenge", ""),
            integer(rules, "sv_maxping"),
            integer(rules, "sv_minping"),
            value(rules, "com_gamename", ""),
            integer(rules, "com_protocol"),
            integer(rules, "dmflags"),
            integer(rules, "sv_privateclients"),
            integer(rules, "sv_minrate"),
            integer(rules, "sv_maxrate"),
            integer(rules, "sv_dlrate"),
            integer(rules, "sv_floodprotect"),
            integer(rules, "sv_allowdownload"),
            integer(rules, "bot_minplayers"),
            value(rules, "gamename", ""),
            integer(rules, "g_maxgameclients"),
            users,
            server.proxyPort(),
            server.targetPort()
        ));
    }

    private static int findResponseLine(String[] lines) {
        for (int index = 0; index < lines.length; index++) {
            if (lines[index].contains("statusResponse")) {
                return index;
            }
        }
        return -1;
    }

    private static Map<String, String> parseRules(String rulesLine) {
        String[] parts = rulesLine.trim().split("\\\\");
        Map<String, String> rules = new HashMap<>();
        for (int index = 1; index + 1 < parts.length; index += 2) {
            rules.put(parts[index].toLowerCase(), parts[index + 1]);
        }
        return rules;
    }

    private static List<ServerPlayer> parseUsers(String[] lines, int startIndex) {
        List<ServerPlayer> users = new ArrayList<>();
        for (int index = startIndex; index < lines.length; index++) {
            var match = PLAYER_LINE.matcher(lines[index].trim());
            if (match.matches()) {
                users.add(new ServerPlayer(
                    Integer.parseInt(match.group(1)),
                    Integer.parseInt(match.group(2)),
                    match.group(3)
                ));
            }
        }
        return List.copyOf(users);
    }

    private static int integer(Map<String, String> rules, String... names) {
        for (String name : names) {
            String raw = rules.get(name);
            if (raw == null) {
                continue;
            }
            try {
                return Integer.parseInt(raw);
            } catch (NumberFormatException ignored) {
                return 0;
            }
        }
        return 0;
    }

    private static String value(Map<String, String> rules, String name, String fallback) {
        String result = rules.get(name);
        return result == null || result.isBlank() ? fallback : result;
    }
}
