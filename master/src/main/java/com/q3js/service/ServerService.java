package com.q3js.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.q3js.client.ServerStatusClient;
import com.q3js.domain.Server;
import com.q3js.jooq.tables.records.ServersRecord;
import com.q3js.service.dto.HeartbeatRequest;
import com.q3js.service.dto.ServerInfoResponse;
import com.q3js.service.dto.ServerResponse;
import com.q3js.service.dto.ServerUserResponse;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;
import org.jooq.DSLContext;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import static com.q3js.jooq.Tables.SERVERS;

@ApplicationScoped
@RequiredArgsConstructor
public class ServerService {
    private static final Logger LOG = Logger.getLogger(ServerService.class);
    private static final int HEARTBEAT_TTL_MINUTES = 5;
    private static final String FFA_HOST = "ffa.q3js.com";
    private static final String PIETER_HOST = "q3.pieter.com";
    private static final int DEFAULT_PROXY_PORT = 443;

    private final DSLContext dsl;
    private final ServerStatusClient serverStatusClient;
    private final ObjectMapper objectMapper;

    public void handleHeartbeat(HeartbeatRequest heartbeatRequest) {
        if (heartbeatRequest.getTargetHost() == null) {
            LOG.warnf(
                    "Received heartbeat with null target host from proxy port %d",
                    heartbeatRequest.getProxyPort()
            );
            return;
        }

        Server server = upsertServer(
                heartbeatRequest.getTargetHost(),
                heartbeatRequest.getProxyPort(),
                heartbeatRequest.getTargetPort(),
                heartbeatRequest.isSecure(),
                OffsetDateTime.now()
        );

        refreshStoredServerInfo(server).ifPresentOrElse(
                ignored -> LOG.debugf("Stored server info from heartbeat for %s:%d", server.getHost(), server.getProxyPort()),
                () -> LOG.warnf("Failed to fetch server info from heartbeat for %s:%d", server.getHost(), server.getProxyPort())
        );
    }

    @Scheduled(every = "5s", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    public void refreshServerInfo() {
        addIfMissing(FFA_HOST, DEFAULT_PROXY_PORT, true);
        addIfMissing(PIETER_HOST, DEFAULT_PROXY_PORT, true);

        List<PersistedServer> servers = loadPersistedServers();
        int visibleServers = 0;

        for (PersistedServer persistedServer : servers) {
            Server server = persistedServer.server();
            Optional<ServerInfoResponse> refreshedInfo = refreshStoredServerInfo(server);

            if (refreshedInfo.isPresent()) {
                visibleServers++;
                continue;
            }

            if (persistedServer.lastInfoJson() != null) {
                visibleServers++;
                LOG.debugf(
                        "Using stored server info for %s:%d (lastFetchedAt=%s)",
                        server.getHost(),
                        server.getProxyPort(),
                        persistedServer.lastInfoFetchedAt()
                );
                continue;
            }

            LOG.warnf(
                    "Failed to refresh server info for %s:%d (lastHeartbeat=%s)",
                    server.getHost(),
                    server.getProxyPort(),
                    server.getLastHeartbeat()
            );
        }

        LOG.debugf(
                "Refresh complete: knownServers=%d visibleServers=%d",
                servers.size(),
                visibleServers
        );
    }

    private void addIfMissing(String host, int proxyPort, boolean secure) {
        int inserted = dsl.insertInto(
                        SERVERS,
                        SERVERS.HOST,
                        SERVERS.PROXY_PORT,
                        SERVERS.TARGET_PORT,
                        SERVERS.SECURE,
                        SERVERS.LAST_HEARTBEAT
                )
                .values(host, proxyPort, 0, secure, OffsetDateTime.now())
                .onConflict(SERVERS.HOST, SERVERS.PROXY_PORT)
                .doNothing()
                .execute();

        if (inserted > 0) {
            LOG.infof("Adding static server %s:%d", host, proxyPort);
        }
    }

    @Scheduled(every = "10s")
    public void pruneServers() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusMinutes(HEARTBEAT_TTL_MINUTES);
        List<Server> expiredServers = dsl.selectFrom(SERVERS)
                .where(SERVERS.LAST_HEARTBEAT.lt(cutoff))
                .fetch(this::toServer);

        if (expiredServers.isEmpty()) {
            return;
        }

        for (Server server : expiredServers) {
            LOG.warnf(
                    "Pruning server %s:%d, lastHeartbeat=%s",
                    server.getHost(),
                    server.getProxyPort(),
                    server.getLastHeartbeat()
            );
        }

        dsl.deleteFrom(SERVERS)
                .where(SERVERS.LAST_HEARTBEAT.lt(cutoff))
                .execute();
    }

    public List<ServerResponse> getAllServers() {
        return loadPersistedServers().stream()
                .map(this::toStoredResponse)
                .flatMap(Optional::stream)
                .sorted(
                        Comparator.comparingInt(ServerService::getDisplayPriority)
                                .thenComparing(
                                        Comparator.comparingInt((ServerResponse s) -> getRealUsers(s).size())
                                                .reversed()
                                )
                )
                .toList();
    }

    private static int getDisplayPriority(ServerResponse server) {
        if (isServer(server, FFA_HOST, DEFAULT_PROXY_PORT)) {
            return 0;
        }

        if (isServer(server, PIETER_HOST, DEFAULT_PROXY_PORT)) {
            return 1;
        }

        return 2;
    }

    private static boolean isServer(ServerResponse server, String host, int proxyPort) {
        return host.equals(server.getHost()) && proxyPort == server.getProxyPort();
    }

    private static List<ServerUserResponse> getRealUsers(ServerResponse s) {
        return s.getInfo().getUsers().stream()
                .filter(u -> u.getPing() > 0)
                .toList();
    }

    private Server upsertServer(String host, int proxyPort, int targetPort, boolean secure, OffsetDateTime lastHeartbeat) {
        dsl.insertInto(
                        SERVERS,
                        SERVERS.HOST,
                        SERVERS.PROXY_PORT,
                        SERVERS.TARGET_PORT,
                        SERVERS.SECURE,
                        SERVERS.LAST_HEARTBEAT
                )
                .values(host, proxyPort, targetPort, secure, lastHeartbeat)
                .onConflict(SERVERS.HOST, SERVERS.PROXY_PORT)
                .doUpdate()
                .set(SERVERS.TARGET_PORT, targetPort)
                .set(SERVERS.SECURE, secure)
                .set(SERVERS.LAST_HEARTBEAT, lastHeartbeat)
                .execute();

        return Server.builder()
                .host(host)
                .proxyPort(proxyPort)
                .targetPort(targetPort)
                .secure(secure)
                .lastHeartbeat(lastHeartbeat)
                .build();
    }

    private Optional<ServerInfoResponse> refreshStoredServerInfo(Server server) {
        return serverStatusClient.query(server)
                .map(info -> {
                    persistServerInfo(server, info, OffsetDateTime.now());
                    return info;
                });
    }

    private void persistServerInfo(Server server, ServerInfoResponse info, OffsetDateTime fetchedAt) {
        dsl.update(SERVERS)
                .set(SERVERS.TARGET_PORT, server.getTargetPort())
                .set(SERVERS.SECURE, server.isSecure())
                .set(SERVERS.LAST_INFO_JSON, serializeServerInfo(info))
                .set(SERVERS.LAST_INFO_FETCHED_AT, fetchedAt)
                .where(SERVERS.HOST.eq(server.getHost()).and(SERVERS.PROXY_PORT.eq(server.getProxyPort())))
                .execute();
    }

    private List<PersistedServer> loadPersistedServers() {
        return dsl.selectFrom(SERVERS)
                .fetch(this::toPersistedServer);
    }

    private Optional<PersistedServer> loadPersistedServer(String host, int proxyPort) {
        return dsl.selectFrom(SERVERS)
                .where(SERVERS.HOST.eq(host).and(SERVERS.PROXY_PORT.eq(proxyPort)))
                .fetchOptional(this::toPersistedServer);
    }

    private PersistedServer toPersistedServer(ServersRecord record) {
        return new PersistedServer(
                toServer(record),
                record.getLastInfoJson(),
                record.getLastInfoFetchedAt()
        );
    }

    private Server toServer(ServersRecord record) {
        return Server.builder()
                .host(record.getHost())
                .proxyPort(record.getProxyPort())
                .targetPort(record.getTargetPort())
                .secure(Boolean.TRUE.equals(record.getSecure()))
                .lastHeartbeat(record.getLastHeartbeat())
                .build();
    }

    private Optional<ServerResponse> toStoredResponse(PersistedServer persistedServer) {
        return deserializeServerInfo(persistedServer.lastInfoJson())
                .map(info -> new ServerResponse(
                        persistedServer.server().getHost(),
                        persistedServer.server().getProxyPort(),
                        persistedServer.server().getTargetPort(),
                        persistedServer.server().isSecure(),
                        info
                ));
    }

    private Optional<ServerInfoResponse> deserializeServerInfo(String infoJson) {
        if (infoJson == null || infoJson.isBlank()) {
            return Optional.empty();
        }

        try {
            return Optional.of(objectMapper.readValue(infoJson, ServerInfoResponse.class));
        } catch (JsonProcessingException e) {
            LOG.errorf(e, "Failed to deserialize stored server info");
            return Optional.empty();
        }
    }

    private String serializeServerInfo(ServerInfoResponse info) {
        try {
            return objectMapper.writeValueAsString(info);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize server info", e);
        }
    }

    private record PersistedServer(Server server, String lastInfoJson, OffsetDateTime lastInfoFetchedAt) {
    }
}
