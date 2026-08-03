package com.q3js.master.scoreboard.repository;

import com.q3js.master.scoreboard.domain.ScoreboardEntry;
import com.q3js.master.scoreboard.domain.ScoreboardTotals;
import jakarta.enterprise.context.ApplicationScoped;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.Table;
import org.jooq.impl.DSL;
import org.jooq.impl.SQLDataType;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static com.q3js.master.database.generated.Tables.EVENTS;

@ApplicationScoped
public class ScoreboardRepository {
    private static final String Q3_COLOR_CODE_REGEX = "\\^\\d";

    private final DSLContext dsl;

    public ScoreboardRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public ScoreboardTotals totals(OffsetDateTime periodStart, String search) {
        ScoreboardQuery scoreboard = scoreboard(periodStart, search);
        Field<Long> totalEntries = DSL.count().cast(SQLDataType.BIGINT).as("total_entries");
        Field<Long> totalKills = DSL.field(
            "coalesce(sum({0}), 0)",
            SQLDataType.BIGINT,
            scoreboard.kills()
        ).as("total_kills");
        var record = dsl.select(totalEntries, totalKills)
            .from(scoreboard.table())
            .where(scoreboard.condition())
            .fetchOne();

        long entries = record == null ? 0 : valueOrZero(record.get(totalEntries));
        long kills = record == null ? 0 : valueOrZero(record.get(totalKills));
        return new ScoreboardTotals(Math.toIntExact(entries), kills);
    }

    public List<ScoreboardEntry> entries(
        OffsetDateTime periodStart,
        String search,
        int limit,
        int offset
    ) {
        ScoreboardQuery scoreboard = scoreboard(periodStart, search);
        Table<?> lastOnlineByPlayer = lastOnlineByPlayerTable();
        Field<String> lastOnlinePlayer = DSL.field(
            DSL.name("last_online_by_player", "player_name"),
            String.class
        );
        Field<OffsetDateTime> lastOnline = DSL.field(
            DSL.name("last_online_by_player", "last_online"),
            OffsetDateTime.class
        );

        return dsl.select(scoreboard.playerName(), scoreboard.kills(), lastOnline)
            .from(scoreboard.table())
            .leftJoin(lastOnlineByPlayer)
            .on(scoreboard.playerName().eq(lastOnlinePlayer))
            .where(scoreboard.condition())
            .orderBy(scoreboard.kills().desc(), scoreboard.playerName().asc())
            .limit(limit)
            .offset(offset)
            .fetch(record -> new ScoreboardEntry(
                record.get(scoreboard.playerName()),
                valueOrZero(record.get(scoreboard.kills())),
                record.get(lastOnline)
            ));
    }

    public Map<Integer, Long> hourlyDistribution(OffsetDateTime periodStart, OffsetDateTime periodEnd) {
        Field<Integer> bucket = DSL.field(
            "floor(extract(epoch from ({0} - {1})) / 3600)::int",
            SQLDataType.INTEGER,
            EVENTS.RECEIVED_AT,
            DSL.val(periodStart)
        ).as("bucket");
        Field<Long> kills = DSL.count().cast(SQLDataType.BIGINT).as("kills");
        Map<Integer, Long> distribution = new LinkedHashMap<>();
        dsl.select(bucket, kills)
            .from(EVENTS)
            .where(killCondition(periodStart, periodEnd))
            .groupBy(bucket)
            .orderBy(bucket.asc())
            .fetch()
            .forEach(record -> distribution.put(record.get(bucket), valueOrZero(record.get(kills))));
        return distribution;
    }

    public Map<LocalDate, Long> dailyDistribution(
        OffsetDateTime periodStart,
        OffsetDateTime periodEnd,
        ZoneId timeZone
    ) {
        Field<LocalDate> bucket = DSL.field(
            "timezone({0}, {1})::date",
            SQLDataType.LOCALDATE,
            DSL.inline(timeZone.getId()),
            EVENTS.RECEIVED_AT
        ).as("bucket");
        Field<Long> kills = DSL.count().cast(SQLDataType.BIGINT).as("kills");
        Map<LocalDate, Long> distribution = new LinkedHashMap<>();
        dsl.select(bucket, kills)
            .from(EVENTS)
            .where(killCondition(periodStart, periodEnd))
            .groupBy(bucket)
            .orderBy(bucket.asc())
            .fetch()
            .forEach(record -> distribution.put(record.get(bucket), valueOrZero(record.get(kills))));
        return distribution;
    }

    private ScoreboardQuery scoreboard(OffsetDateTime periodStart, String search) {
        Field<Long> kills = DSL.count().cast(SQLDataType.BIGINT).as("kills");
        Table<?> table = dsl.select(EVENTS.KILLER_NAME.as("player_name"), kills)
            .from(EVENTS)
            .where(killCondition(periodStart, null))
            .groupBy(EVENTS.KILLER_NAME)
            .asTable("scoreboard");
        Field<String> playerName = DSL.field(DSL.name("scoreboard", "player_name"), String.class);
        Field<Long> scoreboardKills = DSL.field(DSL.name("scoreboard", "kills"), Long.class);
        String normalizedSearch = normalizeSearch(search);
        Condition condition = normalizedSearch.isBlank()
            ? DSL.noCondition()
            : normalizedPlayerName(playerName).contains(normalizedSearch);
        return new ScoreboardQuery(table, playerName, scoreboardKills, condition);
    }

    private Table<?> lastOnlineByPlayerTable() {
        Table<?> activity = dsl.select(
                EVENTS.KILLER_NAME.as("player_name"),
                EVENTS.RECEIVED_AT.as("received_at")
            )
            .from(EVENTS)
            .where(EVENTS.KILLER_NAME.isNotNull())
            .unionAll(
                dsl.select(
                        EVENTS.VICTIM_NAME.as("player_name"),
                        EVENTS.RECEIVED_AT.as("received_at")
                    )
                    .from(EVENTS)
                    .where(EVENTS.VICTIM_NAME.isNotNull())
            )
            .asTable("player_activity");
        Field<String> playerName = DSL.field(DSL.name("player_activity", "player_name"), String.class);
        Field<OffsetDateTime> receivedAt = DSL.field(
            DSL.name("player_activity", "received_at"),
            OffsetDateTime.class
        );
        return dsl.select(playerName, DSL.max(receivedAt).as("last_online"))
            .from(activity)
            .groupBy(playerName)
            .asTable("last_online_by_player");
    }

    private static Condition killCondition(OffsetDateTime periodStart, OffsetDateTime periodEnd) {
        Condition condition = EVENTS.EVENT_TYPE.eq("kill").and(EVENTS.KILLER_NAME.isNotNull());
        if (periodStart != null) {
            condition = condition.and(EVENTS.RECEIVED_AT.ge(periodStart));
        }
        if (periodEnd != null) {
            condition = condition.and(EVENTS.RECEIVED_AT.lt(periodEnd));
        }
        return condition;
    }

    private static Field<String> normalizedPlayerName(Field<String> playerName) {
        return DSL.lower(DSL.trim(DSL.field(
            "regexp_replace({0}, {1}, '', 'g')",
            SQLDataType.VARCHAR,
            playerName,
            DSL.inline(Q3_COLOR_CODE_REGEX)
        )));
    }

    private static String normalizeSearch(String search) {
        return search == null
            ? ""
            : search.replaceAll(Q3_COLOR_CODE_REGEX, "").trim().toLowerCase(Locale.ROOT);
    }

    private static long valueOrZero(Long value) {
        return value == null ? 0 : value;
    }

    private record ScoreboardQuery(
        Table<?> table,
        Field<String> playerName,
        Field<Long> kills,
        Condition condition
    ) {
    }
}
