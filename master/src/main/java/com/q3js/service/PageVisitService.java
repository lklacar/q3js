package com.q3js.service;

import com.q3js.service.dto.AdminPlayerResponse;
import com.q3js.service.dto.PageVisitRequest;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.Table;
import org.jooq.impl.DSL;

import java.time.OffsetDateTime;
import java.util.List;

import static com.q3js.jooq.Tables.PLAYER_PAGE_VISITS;

@ApplicationScoped
@RequiredArgsConstructor
public class PageVisitService {
    private static final int ACTIVE_WINDOW_SECONDS = 20;

    private final DSLContext dsl;

    @Transactional
    public void record(PageVisitRequest request, String sourceIp, String userAgent) {
        dsl.insertInto(PLAYER_PAGE_VISITS)
                .columns(
                        PLAYER_PAGE_VISITS.PLAYER_NAME,
                        PLAYER_PAGE_VISITS.SOURCE_IP,
                        PLAYER_PAGE_VISITS.PATH,
                        PLAYER_PAGE_VISITS.USER_AGENT
                )
                .values(
                        normalizePlayerName(request != null ? request.getPlayerName() : null),
                        blankToNull(sourceIp),
                        normalizePath(request != null ? request.getPath() : null),
                        trimToMax(blankToNull(userAgent), 512)
                )
                .execute();
    }

    public List<AdminPlayerResponse> getLatestPlayers() {
        Field<Integer> rowNumber = DSL.rowNumber()
                .over()
                .partitionBy(
                        DSL.coalesce(PLAYER_PAGE_VISITS.PLAYER_NAME, ""),
                        DSL.coalesce(PLAYER_PAGE_VISITS.SOURCE_IP, "")
                )
                .orderBy(PLAYER_PAGE_VISITS.RECEIVED_AT.desc(), PLAYER_PAGE_VISITS.ID.desc())
                .as("row_number");

        Table<?> rankedVisits = dsl.select(
                        PLAYER_PAGE_VISITS.ID,
                        PLAYER_PAGE_VISITS.PLAYER_NAME,
                        PLAYER_PAGE_VISITS.SOURCE_IP,
                        PLAYER_PAGE_VISITS.PATH,
                        PLAYER_PAGE_VISITS.USER_AGENT,
                        PLAYER_PAGE_VISITS.RECEIVED_AT,
                        rowNumber
                )
                .from(PLAYER_PAGE_VISITS)
                .where(PLAYER_PAGE_VISITS.SOURCE_IP.isNotNull())
                .and(PLAYER_PAGE_VISITS.RECEIVED_AT.ge(OffsetDateTime.now().minusSeconds(ACTIVE_WINDOW_SECONDS)))
                .asTable("ranked_visits");

        Field<String> rankedPlayerName = DSL.field(DSL.name("ranked_visits", "player_name"), String.class);
        Field<String> rankedSourceIp = DSL.field(DSL.name("ranked_visits", "source_ip"), String.class);
        Field<String> rankedPath = DSL.field(DSL.name("ranked_visits", "path"), String.class);
        Field<OffsetDateTime> rankedReceivedAt = DSL.field(DSL.name("ranked_visits", "received_at"), OffsetDateTime.class);
        Field<Integer> rankedRowNumber = DSL.field(DSL.name("ranked_visits", "row_number"), Integer.class);

        return dsl.select(rankedPlayerName, rankedSourceIp, rankedPath, rankedReceivedAt)
                .from(rankedVisits)
                .where(rankedRowNumber.eq(1))
                .orderBy(rankedReceivedAt.desc())
                .fetch(record -> AdminPlayerResponse.builder()
                        .playerName(record.get(rankedPlayerName))
                        .ipAddress(record.get(rankedSourceIp))
                        .address(record.get(rankedSourceIp))
                        .path(record.get(rankedPath))
                        .lastSeen(record.get(rankedReceivedAt) != null ? record.get(rankedReceivedAt).toString() : null)
                        .build());
    }

    private String normalizePlayerName(String playerName) {
        String normalized = trimToMax(blankToNull(playerName), 64);
        return normalized != null ? normalized : "Unknown player";
    }

    private String normalizePath(String path) {
        String normalized = trimToMax(blankToNull(path), 256);
        if (normalized == null || !normalized.startsWith("/")) {
            return "/";
        }
        return normalized;
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
