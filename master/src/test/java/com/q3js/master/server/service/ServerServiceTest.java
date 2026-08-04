package com.q3js.master.server.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.q3js.master.server.client.ServerStatusClient;
import com.q3js.master.server.domain.RegisteredServer;
import com.q3js.master.server.domain.StoredServer;
import com.q3js.master.server.repository.ServerRepository;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ServerServiceTest {
    @Test
    void addsPieterAsASecureCommunityServerBeforeRefreshing() {
        var repository = new ServerRepository(null) {
            private RegisteredServer inserted;

            @Override
            public boolean insertIfMissing(RegisteredServer server) {
                inserted = server;
                return true;
            }

            @Override
            public List<StoredServer> findAll() {
                return List.of();
            }
        };
        ServerService service = new ServerService(
            repository,
            new ServerStatusClient(new ServerStatusParser(), Duration.ofSeconds(1)),
            new ObjectMapper(),
            Duration.ofMinutes(2)
        );

        service.refreshServers();

        assertEquals("q3.pieter.com", repository.inserted.host());
        assertEquals(443, repository.inserted.proxyPort());
        assertEquals(0, repository.inserted.targetPort());
        assertTrue(repository.inserted.secure());
        assertFalse(repository.inserted.official());
    }

    @Test
    void listsOfficialServersBeforeCommunityServersRegardlessOfPlayerCount() {
        OffsetDateTime now = OffsetDateTime.now();
        List<StoredServer> storedServers = List.of(
            new StoredServer(
                new RegisteredServer("community.example.com", 27961, 27960, true, false, now),
                "{\"sv_hostname\":\"Community\",\"players\":2,\"users\":["
                    + "{\"score\":10,\"ping\":25,\"name\":\"Player One\"},"
                    + "{\"score\":5,\"ping\":30,\"name\":\"Player Two\"}]}",
                now
            ),
            new StoredServer(
                new RegisteredServer("official.example.com", 27961, 27960, true, true, now),
                "{\"sv_hostname\":\"Official\",\"players\":0,\"users\":[]}",
                now
            )
        );
        ServerRepository repository = new ServerRepository(null) {
            @Override
            public List<StoredServer> findAll() {
                return storedServers;
            }
        };
        ServerService service = new ServerService(
            repository,
            new ServerStatusClient(new ServerStatusParser(), Duration.ofSeconds(1)),
            new ObjectMapper(),
            Duration.ofMinutes(2)
        );

        assertEquals(
            List.of("official.example.com", "community.example.com"),
            service.servers().stream().map(server -> server.host()).toList()
        );
    }
}
