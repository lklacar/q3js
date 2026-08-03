package com.q3js.master.server;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ServerStatusParserTest {
    private final ServerStatusParser parser = new ServerStatusParser(new ObjectMapper());

    @Test
    void parsesQuakeStatusResponse() {
        RegisteredServer server = new RegisteredServer(
            "game.example.com",
            27961,
            27960,
            true,
            OffsetDateTime.now()
        );
        String response = "\u00ff\u00ff\u00ff\u00ffstatusResponse\n"
            + "\\sv_hostname\\Q3JS Arena\\mapname\\q3dm17\\g_gametype\\0"
            + "\\sv_maxclients\\16\\gamename\\q3js\\challenge\\abc\n"
            + "12 42 \"Player One\"\n"
            + "0 0 \"Bot\"\n";

        var parsed = parser.parse(response, server, 18);

        assertTrue(parsed.isPresent());
        assertEquals("Q3JS Arena", parsed.orElseThrow().path("sv_hostname").asText());
        assertEquals("q3dm17", parsed.orElseThrow().path("mapname").asText());
        assertEquals(16, parsed.orElseThrow().path("sv_maxclients").asInt());
        assertEquals(2, parsed.orElseThrow().path("players").asInt());
        assertEquals(18, parsed.orElseThrow().path("ping").asInt());
        assertEquals("Player One", parsed.orElseThrow().path("users").get(0).path("name").asText());
        assertEquals(27961, parsed.orElseThrow().path("proxyPort").asInt());
    }

    @Test
    void rejectsMalformedResponse() {
        RegisteredServer server = new RegisteredServer(
            "localhost",
            27961,
            27960,
            false,
            OffsetDateTime.now()
        );

        assertTrue(parser.parse("not a status response", server, 1).isEmpty());
    }
}
