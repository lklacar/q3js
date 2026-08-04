package com.q3js.master.server.repository;

import com.q3js.master.server.domain.RegisteredServer;
import com.q3js.master.server.domain.StoredServer;

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

    public RegisteredServer upsert(RegisteredServer server) {
        dsl.insertInto(
                SERVERS,
                SERVERS.HOST,
                SERVERS.PROXY_PORT,
                SERVERS.TARGET_PORT,
                SERVERS.SECURE,
                SERVERS.OFFICIAL,
                SERVERS.LAST_HEARTBEAT
            )
            .values(
                server.host(),
                server.proxyPort(),
                server.targetPort(),
                server.secure(),
                server.official(),
                server.lastHeartbeat()
            )
            .onConflict(SERVERS.HOST, SERVERS.PROXY_PORT)
            .doUpdate()
            .set(SERVERS.TARGET_PORT, server.targetPort())
            .set(SERVERS.SECURE, server.secure())
            .set(SERVERS.OFFICIAL, server.official())
            .set(SERVERS.LAST_HEARTBEAT, server.lastHeartbeat())
            .execute();

        return server;
    }

    public boolean insertIfMissing(RegisteredServer server) {
        return dsl.insertInto(
                SERVERS,
                SERVERS.HOST,
                SERVERS.PROXY_PORT,
                SERVERS.TARGET_PORT,
                SERVERS.SECURE,
                SERVERS.OFFICIAL,
                SERVERS.LAST_HEARTBEAT
            )
            .values(
                server.host(),
                server.proxyPort(),
                server.targetPort(),
                server.secure(),
                server.official(),
                server.lastHeartbeat()
            )
            .onConflict(SERVERS.HOST, SERVERS.PROXY_PORT)
            .doNothing()
            .execute() > 0;
    }

    public List<StoredServer> findAll() {
        return dsl.selectFrom(SERVERS)
            .fetch(record -> new StoredServer(
                new RegisteredServer(
                    record.getHost(),
                    record.getProxyPort(),
                    record.getTargetPort(),
                    Boolean.TRUE.equals(record.getSecure()),
                    Boolean.TRUE.equals(record.getOfficial()),
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
