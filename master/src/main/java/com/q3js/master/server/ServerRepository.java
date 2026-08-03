package com.q3js.master.server;

import jakarta.enterprise.context.ApplicationScoped;
import org.jooq.DSLContext;

import java.time.OffsetDateTime;
import java.util.List;

import static com.q3js.master.database.generated.Tables.SERVERS;

@ApplicationScoped
public class ServerRepository {
    private final DSLContext dsl;

    public ServerRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public RegisteredServer upsert(HeartbeatRequest heartbeat, OffsetDateTime receivedAt) {
        dsl.insertInto(
                SERVERS,
                SERVERS.HOST,
                SERVERS.PROXY_PORT,
                SERVERS.TARGET_PORT,
                SERVERS.SECURE,
                SERVERS.LAST_HEARTBEAT
            )
            .values(
                heartbeat.targetHost(),
                heartbeat.proxyPort(),
                heartbeat.targetPort(),
                heartbeat.secure(),
                receivedAt
            )
            .onConflict(SERVERS.HOST, SERVERS.PROXY_PORT)
            .doUpdate()
            .set(SERVERS.TARGET_PORT, heartbeat.targetPort())
            .set(SERVERS.SECURE, heartbeat.secure())
            .set(SERVERS.LAST_HEARTBEAT, receivedAt)
            .execute();

        return new RegisteredServer(
            heartbeat.targetHost(),
            heartbeat.proxyPort(),
            heartbeat.targetPort(),
            heartbeat.secure(),
            receivedAt
        );
    }

    public List<StoredServer> findAll() {
        return dsl.selectFrom(SERVERS)
            .fetch(record -> new StoredServer(
                new RegisteredServer(
                    record.getHost(),
                    record.getProxyPort(),
                    record.getTargetPort(),
                    Boolean.TRUE.equals(record.getSecure()),
                    record.getLastHeartbeat()
                ),
                record.getLastInfoJson(),
                record.getLastInfoFetchedAt()
            ));
    }

    public void updateInfo(RegisteredServer server, String infoJson, OffsetDateTime fetchedAt) {
        dsl.update(SERVERS)
            .set(SERVERS.LAST_INFO_JSON, infoJson)
            .set(SERVERS.LAST_INFO_FETCHED_AT, fetchedAt)
            .where(
                SERVERS.HOST.eq(server.host())
                    .and(SERVERS.PROXY_PORT.eq(server.proxyPort()))
            )
            .execute();
    }

    public int deleteOlderThan(OffsetDateTime cutoff) {
        return dsl.deleteFrom(SERVERS)
            .where(SERVERS.LAST_HEARTBEAT.lt(cutoff))
            .execute();
    }
}
