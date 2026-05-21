package com.q3js.service;

import com.q3js.service.dto.AdminBanRequest;
import com.q3js.service.dto.BannedIpResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.Record;
import org.jooq.Table;
import org.jooq.impl.DSL;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@ApplicationScoped
@RequiredArgsConstructor
public class BanService {
    private static final Table<Record> BANNED_IPS = DSL.table(DSL.name("banned_ips"));
    private static final Field<String> IP_ADDRESS = DSL.field(DSL.name("ip_address"), String.class);
    private static final Field<String> PLAYER_NAME = DSL.field(DSL.name("player_name"), String.class);
    private static final Field<OffsetDateTime> BANNED_AT = DSL.field(DSL.name("banned_at"), OffsetDateTime.class);

    private final DSLContext dsl;

    @Transactional
    public BannedIpResponse ban(AdminBanRequest request) {
        String ipAddress = normalizeIp(request != null ? request.getIpAddress() : null);
        if (ipAddress == null) {
            throw new BadRequestException("IP address is required.");
        }

        String playerName = trimToMax(blankToNull(request.getPlayerName()), 64);
        OffsetDateTime bannedAt = OffsetDateTime.now();
        dsl.insertInto(BANNED_IPS)
                .columns(IP_ADDRESS, PLAYER_NAME, BANNED_AT)
                .values(ipAddress, playerName, bannedAt)
                .onConflict(IP_ADDRESS)
                .doUpdate()
                .set(PLAYER_NAME, playerName)
                .set(BANNED_AT, bannedAt)
                .execute();

        return BannedIpResponse.builder()
                .ipAddress(ipAddress)
                .playerName(playerName)
                .bannedAt(bannedAt.toString())
                .build();
    }

    @Transactional
    public void unban(String ipAddress) {
        String normalizedIp = normalizeIp(ipAddress);
        if (normalizedIp == null) {
            throw new BadRequestException("IP address is required.");
        }

        dsl.deleteFrom(BANNED_IPS)
                .where(IP_ADDRESS.eq(normalizedIp))
                .execute();
    }

    public List<BannedIpResponse> getBannedIps() {
        return dsl.select(IP_ADDRESS, PLAYER_NAME, BANNED_AT)
                .from(BANNED_IPS)
                .orderBy(BANNED_AT.desc(), IP_ADDRESS.asc())
                .fetch(record -> BannedIpResponse.builder()
                        .ipAddress(record.get(IP_ADDRESS))
                        .playerName(record.get(PLAYER_NAME))
                        .bannedAt(record.get(BANNED_AT) != null ? record.get(BANNED_AT).toString() : null)
                        .build());
    }

    public Set<String> getBannedIpSet() {
        return getBannedIps().stream()
                .map(BannedIpResponse::getIpAddress)
                .collect(Collectors.toSet());
    }

    private String normalizeIp(String ipAddress) {
        String normalized = blankToNull(ipAddress);
        if (normalized == null) {
            return null;
        }

        if (normalized.startsWith("[") && normalized.contains("]")) {
            normalized = normalized.substring(1, normalized.indexOf(']'));
        }

        if (normalized.startsWith("::ffff:")) {
            normalized = normalized.substring("::ffff:".length());
        }

        int lastColonIndex = normalized.lastIndexOf(':');
        if (lastColonIndex > 0 && normalized.indexOf(':') == lastColonIndex && normalized.indexOf('.') >= 0) {
            normalized = normalized.substring(0, lastColonIndex);
        }

        return trimToMax(normalized, 128);
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String trimToMax(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }

        return value.substring(0, maxLength);
    }
}
