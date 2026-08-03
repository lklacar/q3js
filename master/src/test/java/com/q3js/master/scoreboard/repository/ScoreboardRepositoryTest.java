package com.q3js.master.scoreboard.repository;

import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.SQLDialect;
import org.jooq.impl.DSL;
import org.jooq.tools.jdbc.MockConnection;
import org.jooq.tools.jdbc.MockDataProvider;
import org.jooq.tools.jdbc.MockExecuteContext;
import org.jooq.tools.jdbc.MockResult;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ScoreboardRepositoryTest {
    @Test
    void queriesTotalsEntriesAndActivityBuckets() {
        var provider = new ScoreboardProvider();
        var repository = new ScoreboardRepository(
            DSL.using(new MockConnection(provider), SQLDialect.POSTGRES)
        );
        OffsetDateTime start = OffsetDateTime.parse("2026-08-02T12:00:00Z");
        OffsetDateTime end = OffsetDateTime.parse("2026-08-03T12:00:00Z");

        var totals = repository.totals(start, " ^1RAN ");
        var entries = repository.entries(start, " ^1RAN ", 25, 50);
        var hourly = repository.hourlyDistribution(start, end);
        var daily = repository.dailyDistribution(null, end, ZoneId.of("Europe/Belgrade"));

        assertEquals(51, totals.entries());
        assertEquals(1_337, totals.kills());
        assertEquals("^1Ranger", entries.get(0).playerName());
        assertEquals(42, entries.get(0).kills());
        assertEquals(OffsetDateTime.parse("2026-08-03T11:55:00Z"), entries.get(0).lastOnline());
        assertEquals(3, hourly.get(0));
        assertEquals(5, daily.get(LocalDate.of(2026, 8, 3)));
        assertTrue(provider.sql.stream().anyMatch(query -> query.contains("regexp_replace")));
        assertTrue(provider.sql.stream().anyMatch(query -> query.contains("floor(extract")));
        assertTrue(provider.sql.stream().anyMatch(query -> query.contains("timezone")));
        assertTrue(provider.bindings.stream().flatMap(values -> Arrays.stream(values))
            .anyMatch("ran"::equals));
        assertTrue(provider.bindings.stream().flatMap(values -> Arrays.stream(values))
            .filter(Number.class::isInstance)
            .map(Number.class::cast)
            .anyMatch(value -> value.intValue() == 25));
        assertTrue(provider.bindings.stream().flatMap(values -> Arrays.stream(values))
            .filter(Number.class::isInstance)
            .map(Number.class::cast)
            .anyMatch(value -> value.intValue() == 50));
    }

    private static final class ScoreboardProvider implements MockDataProvider {
        private final DSLContext dsl = DSL.using(SQLDialect.POSTGRES);
        private final List<String> sql = new ArrayList<>();
        private final List<Object[]> bindings = new ArrayList<>();

        @Override
        public MockResult[] execute(MockExecuteContext context) {
            String query = context.sql().toLowerCase(Locale.ROOT);
            sql.add(query);
            bindings.add(context.bindings());

            if (query.contains("total_entries")) {
                Field<Long> entries = DSL.field(DSL.name("total_entries"), Long.class);
                Field<Long> kills = DSL.field(DSL.name("total_kills"), Long.class);
                var result = dsl.newResult(entries, kills);
                result.add(dsl.newRecord(entries, kills).values(51L, 1_337L));
                return new MockResult[]{new MockResult(1, result)};
            }
            if (query.contains("last_online_by_player")) {
                Field<String> player = DSL.field(DSL.name("scoreboard", "player_name"), String.class);
                Field<Long> kills = DSL.field(DSL.name("scoreboard", "kills"), Long.class);
                Field<OffsetDateTime> lastOnline = DSL.field(
                    DSL.name("last_online_by_player", "last_online"),
                    OffsetDateTime.class
                );
                var result = dsl.newResult(player, kills, lastOnline);
                result.add(dsl.newRecord(player, kills, lastOnline).values(
                    "^1Ranger",
                    42L,
                    OffsetDateTime.parse("2026-08-03T11:55:00Z")
                ));
                return new MockResult[]{new MockResult(1, result)};
            }
            if (query.contains("floor(extract")) {
                Field<Integer> bucket = DSL.field(DSL.name("bucket"), Integer.class);
                Field<Long> kills = DSL.field(DSL.name("kills"), Long.class);
                var result = dsl.newResult(bucket, kills);
                result.add(dsl.newRecord(bucket, kills).values(0, 3L));
                return new MockResult[]{new MockResult(1, result)};
            }

            Field<LocalDate> bucket = DSL.field(DSL.name("bucket"), LocalDate.class);
            Field<Long> kills = DSL.field(DSL.name("kills"), Long.class);
            var result = dsl.newResult(bucket, kills);
            result.add(dsl.newRecord(bucket, kills).values(LocalDate.of(2026, 8, 3), 5L));
            return new MockResult[]{new MockResult(1, result)};
        }
    }
}
