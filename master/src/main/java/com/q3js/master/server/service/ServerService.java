package com.q3js.master.server.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.q3js.master.server.client.ServerStatusClient;
import com.q3js.master.server.domain.RegisteredServer;
import com.q3js.master.server.domain.StoredServer;
import com.q3js.master.server.dto.HeartbeatRequest;
import com.q3js.master.server.dto.ServerInfo;
import com.q3js.master.server.dto.ServerResponse;
import com.q3js.master.server.repository.ServerRepository;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class ServerService {
    private static final Logger LOG = Logger.getLogger(ServerService.class);

    private final ServerRepository repository;
    private final ServerStatusClient statusClient;
    private final ObjectMapper objectMapper;
    private final Duration heartbeatTtl;

    public ServerService(
        ServerRepository repository,
        ServerStatusClient statusClient,
        ObjectMapper objectMapper,
        @ConfigProperty(name = "q3js.master.heartbeat-ttl") Duration heartbeatTtl
    ) {
        this.repository = repository;
        this.statusClient = statusClient;
        this.objectMapper = objectMapper;
        this.heartbeatTtl = heartbeatTtl;
    }

    public void register(HeartbeatRequest heartbeat) {
        RegisteredServer server = repository.upsert(new RegisteredServer(
            heartbeat.targetHost(),
            heartbeat.proxyPort(),
            heartbeat.targetPort(),
            heartbeat.secure(),
            OffsetDateTime.now()
        ));
        refresh(server);
    }

    public List<ServerResponse> servers() {
        return repository.findAll().stream()
            .map(this::response)
            .flatMap(Optional::stream)
            .sorted(Comparator.comparingInt(ServerService::realPlayerCount).reversed())
            .toList();
    }

    @Scheduled(
        every = "${q3js.master.refresh-every}",
        concurrentExecution = Scheduled.ConcurrentExecution.SKIP
    )
    void refreshServers() {
        for (StoredServer stored : repository.findAll()) {
            refresh(stored.server());
        }
    }

    @Scheduled(
        every = "${q3js.master.prune-every}",
        concurrentExecution = Scheduled.ConcurrentExecution.SKIP
    )
    void pruneServers() {
        int deleted = repository.deleteOlderThan(OffsetDateTime.now().minus(heartbeatTtl));
        if (deleted > 0) {
            LOG.infof("Pruned %d stale Q3JS server(s)", deleted);
        }
    }

    private void refresh(RegisteredServer server) {
        statusClient.query(server).ifPresent(info -> {
            try {
                repository.updateInfo(server, objectMapper.writeValueAsString(info), OffsetDateTime.now());
            } catch (JsonProcessingException exception) {
                LOG.errorf(exception, "Unable to serialize status for %s:%d", server.host(), server.proxyPort());
            }
        });
    }

    private Optional<ServerResponse> response(StoredServer stored) {
        if (stored.infoJson() == null || stored.infoJson().isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(new ServerResponse(
                stored.server().host(),
                stored.server().proxyPort(),
                stored.server().targetPort(),
                stored.server().secure(),
                objectMapper.readValue(stored.infoJson(), ServerInfo.class)
            ));
        } catch (JsonProcessingException exception) {
            LOG.warnf(
                exception,
                "Ignoring invalid stored status for %s:%d",
                stored.server().host(),
                stored.server().proxyPort()
            );
            return Optional.empty();
        }
    }

    private static int realPlayerCount(ServerResponse server) {
        if (server.info().users() == null) {
            return 0;
        }
        return (int) server.info().users().stream()
            .filter(user -> user.ping() > 0)
            .count();
    }
}
