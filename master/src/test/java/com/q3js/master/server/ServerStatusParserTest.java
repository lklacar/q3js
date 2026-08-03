package com.q3js.master.server;

import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ServerStatusParserTest {
    private final ServerStatusParser parser = new ServerStatusParser();

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
        assertEquals("Q3JS Arena", parsed.orElseThrow().sv_hostname());
        assertEquals("q3dm17", parsed.orElseThrow().mapname());
        assertEquals(16, parsed.orElseThrow().sv_maxclients());
        assertEquals(2, parsed.orElseThrow().players());
        assertEquals(18, parsed.orElseThrow().ping());
        assertEquals("Player One", parsed.orElseThrow().users().get(0).name());
        assertEquals(27961, parsed.orElseThrow().proxyPort());
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
