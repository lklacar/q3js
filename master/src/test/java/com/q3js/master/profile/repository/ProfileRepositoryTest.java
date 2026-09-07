package com.q3js.master.profile.repository;

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

import static com.q3js.master.database.generated.Tables.EVENTS;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProfileRepositoryTest {
    @Test
    void lastOnlineUsesTwoIndependentIndexedLookupsInOneQuery() {
        String playerName = "^1Ranger's";
        var queries = new ArrayList<String>();
        MockDataProvider provider = context -> {
            String sql = context.sql().toLowerCase(Locale.ROOT);
            queries.add(sql);
            assertTrue(sql.startsWith("select greatest((select max("));
            assertTrue(sql.contains("where \"events\".\"killer_name\" = ?"));
            assertTrue(sql.contains("where \"events\".\"victim_name\" = ?"));
            assertEquals(2, sql.split("from \"events\"", -1).length - 1);
            assertFalse(sql.contains(" or "));
            assertArrayEquals(new Object[]{playerName, playerName}, context.bindings());

            var dsl = DSL.using(SQLDialect.POSTGRES);
            var result = dsl.newResult(EVENTS.RECEIVED_AT);
            result.add(dsl.newRecord(EVENTS.RECEIVED_AT).values((OffsetDateTime) null));
            return new MockResult[]{new MockResult(1, result)};
        };
        var repository = new ProfileRepository(DSL.using(new MockConnection(provider), SQLDialect.POSTGRES));

        assertNull(repository.findLastOnline(playerName));
        assertEquals(1, queries.size());
    }

    @Test
    void searchIgnoresQuakeColorsAndAppliesTheLimit() {
        var provider = new SearchProvider();
        var repository = new ProfileRepository(
            DSL.using(new MockConnection(provider), SQLDialect.POSTGRES)
        );

        List<String> players = repository.search(" ^1RAN ", 2);

        assertEquals(List.of("^1Ranger", "Rango"), players);
        assertTrue(provider.sql.toLowerCase(Locale.ROOT).contains("regexp_replace"));
        assertTrue(Arrays.asList(provider.bindings).contains("ran"));
        assertTrue(Arrays.asList(provider.bindings).contains(2));
    }

    @Test
    void killDistributionsAreScopedToTheExactPlayer() {
        var provider = new DistributionProvider();
        var repository = new ProfileRepository(
            DSL.using(new MockConnection(provider), SQLDialect.POSTGRES)
        );
        var start = OffsetDateTime.parse("2026-08-02T12:00:00Z");
        var end = OffsetDateTime.parse("2026-08-03T12:00:00Z");

        var hourly = repository.hourlyKillDistribution("^1Ranger", start, end);
        var daily = repository.dailyKillDistribution("^1Ranger", null, end, ZoneId.of("Europe/Belgrade"));

        assertEquals(3, hourly.get(0));
        assertEquals(5, daily.get(LocalDate.of(2026, 8, 3)));
        assertTrue(provider.sql.stream().anyMatch(query -> query.contains("floor(extract")));
        assertTrue(provider.sql.stream().anyMatch(query -> query.contains("timezone")));
        assertTrue(provider.bindings.stream()
            .flatMap(values -> Arrays.stream(values))
            .anyMatch("^1Ranger"::equals));
    }

    private static final class SearchProvider implements MockDataProvider {
        private final DSLContext dsl = DSL.using(SQLDialect.POSTGRES);
        private String sql;
        private Object[] bindings;

        @Override
        public MockResult[] execute(MockExecuteContext context) {
            sql = context.sql();
            bindings = context.bindings();
            Field<String> playerName = DSL.field(DSL.name("players", "player_name"), String.class);
            var result = dsl.newResult(playerName);
            result.add(dsl.newRecord(playerName).values("^1Ranger"));
            result.add(dsl.newRecord(playerName).values("Rango"));
            return new MockResult[]{new MockResult(2, result)};
        }
    }

    private static final class DistributionProvider implements MockDataProvider {
        private final DSLContext dsl = DSL.using(SQLDialect.POSTGRES);
        private final List<String> sql = new ArrayList<>();
        private final List<Object[]> bindings = new ArrayList<>();

        @Override
        public MockResult[] execute(MockExecuteContext context) {
            String query = context.sql().toLowerCase(Locale.ROOT);
            sql.add(query);
            bindings.add(context.bindings());
            Field<Long> kills = DSL.field(DSL.name("kills"), Long.class);

            if (query.contains("floor(extract")) {
                Field<Integer> bucket = DSL.field(DSL.name("bucket"), Integer.class);
                var result = dsl.newResult(bucket, kills);
                result.add(dsl.newRecord(bucket, kills).values(0, 3L));
                return new MockResult[]{new MockResult(1, result)};
            }

            Field<LocalDate> bucket = DSL.field(DSL.name("bucket"), LocalDate.class);
            var result = dsl.newResult(bucket, kills);
            result.add(dsl.newRecord(bucket, kills).values(LocalDate.of(2026, 8, 3), 5L));
            return new MockResult[]{new MockResult(1, result)};
        }
    }
}
