package com.q3js.master.server;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

@ApplicationScoped
public class ServerStatusParser {
    private static final Pattern PLAYER_LINE = Pattern.compile("^\\s*(-?\\d+)\\s+(\\d+)\\s+\"(.*)\"\\s*$");

    private final ObjectMapper objectMapper;

    public ServerStatusParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Optional<ObjectNode> parse(String rawStatus, RegisteredServer server, int ping) {
        String[] lines = rawStatus.replace("\r", "").split("\n");
        int responseLine = findResponseLine(lines);
        if (responseLine < 0 || responseLine + 1 >= lines.length) {
            return Optional.empty();
        }

        Map<String, String> rules = parseRules(lines[responseLine + 1]);
        if (rules.isEmpty()) {
            return Optional.empty();
        }

        ArrayNode users = parseUsers(lines, responseLine + 2);
        ObjectNode info = objectMapper.createObjectNode();
        info.put("id", server.host() + ":" + server.targetPort());
        info.put("sv_hostname", value(rules, "sv_hostname", value(rules, "hostname", "Unnamed Server")));
        info.put("mapname", value(rules, "mapname", "unknown"));
        putInteger(info, "g_gametype", rules, "g_gametype", "gametype");
        putInteger(info, "fraglimit", rules, "fraglimit");
        putInteger(info, "timelimit", rules, "timelimit");
        putInteger(info, "sv_maxclients", rules, "sv_maxclients");
        putInteger(info, "g_needpass", rules, "g_needpass");
        info.put("fsGame", value(rules, "fs_game", "baseq3"));
        putInteger(info, "capturelimit", rules, "capturelimit");
        info.put("version", value(rules, "version", value(rules, "com_gamename", value(rules, "gamename", ""))));
        info.put("location", value(rules, "location", ""));
        info.put("players", users.size());
        info.put("ping", ping);
        info.put("host", server.host());
        info.put("port", server.targetPort());
        info.put("challenge", value(rules, "challenge", ""));
        putInteger(info, "sv_maxPing", rules, "sv_maxping");
        putInteger(info, "sv_minPing", rules, "sv_minping");
        info.put("com_gamename", value(rules, "com_gamename", ""));
        putInteger(info, "com_protocol", rules, "com_protocol");
        putInteger(info, "dmflags", rules, "dmflags");
        putInteger(info, "sv_privateClients", rules, "sv_privateclients");
        putInteger(info, "sv_minRate", rules, "sv_minrate");
        putInteger(info, "sv_maxRate", rules, "sv_maxrate");
        putInteger(info, "sv_dlRate", rules, "sv_dlrate");
        putInteger(info, "sv_floodProtect", rules, "sv_floodprotect");
        putInteger(info, "sv_allowDownload", rules, "sv_allowdownload");
        putInteger(info, "bot_minplayers", rules, "bot_minplayers");
        info.put("gamename", value(rules, "gamename", ""));
        putInteger(info, "g_maxGameClients", rules, "g_maxgameclients");
        info.set("users", users);
        info.put("proxyPort", server.proxyPort());
        info.put("targetPort", server.targetPort());
        return Optional.of(info);
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

    private ArrayNode parseUsers(String[] lines, int startIndex) {
        ArrayNode users = objectMapper.createArrayNode();
        for (int index = startIndex; index < lines.length; index++) {
            var match = PLAYER_LINE.matcher(lines[index].trim());
            if (!match.matches()) {
                continue;
            }
            ObjectNode user = users.addObject();
            user.put("score", Integer.parseInt(match.group(1)));
            user.put("ping", Integer.parseInt(match.group(2)));
            user.put("name", match.group(3));
        }
        return users;
    }

    private static void putInteger(ObjectNode target, String outputName, Map<String, String> rules, String... names) {
        String raw = "0";
        for (String name : names) {
            if (rules.containsKey(name)) {
                raw = rules.get(name);
                break;
            }
        }
        try {
            target.put(outputName, Integer.parseInt(raw));
        } catch (NumberFormatException ignored) {
            target.put(outputName, 0);
        }
    }

    private static String value(Map<String, String> rules, String name, String fallback) {
        String result = rules.get(name);
        return result == null || result.isBlank() ? fallback : result;
    }
}
