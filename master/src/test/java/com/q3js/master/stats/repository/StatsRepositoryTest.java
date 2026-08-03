package com.q3js.master.stats.repository;

import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.SQLDialect;
import org.jooq.impl.DSL;
import org.jooq.tools.jdbc.MockConnection;
import org.jooq.tools.jdbc.MockDataProvider;
import org.jooq.tools.jdbc.MockExecuteContext;
import org.jooq.tools.jdbc.MockResult;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Locale;

import static com.q3js.master.database.generated.Tables.EVENTS;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StatsRepositoryTest {
    @Test
    void readsTopFraggerAndAllTimeTotal() {
        var provider = new StatsProvider();
        var repository = new StatsRepository(
            DSL.using(new MockConnection(provider), SQLDialect.POSTGRES)
        );
        OffsetDateTime cutoff = OffsetDateTime.parse("2026-08-02T12:00:00Z");

        var topFragger = repository.findTopFraggerSince(cutoff);
        long totalFrags = repository.countTotalFrags();

        assertNotNull(topFragger);
        assertEquals("^1Ranger", topFragger.playerName());
        assertEquals(42, topFragger.frags());
        assertEquals(1_337, totalFrags);
        assertTrue(provider.topSql.toLowerCase(Locale.ROOT).contains("group by"));
        assertTrue(Arrays.asList(provider.topBindings).contains("kill"));
        assertTrue(Arrays.stream(provider.topBindings)
            .map(Object::toString)
            .anyMatch(value -> value.startsWith("2026-08-02 12:00:00")),
            Arrays.toString(provider.topBindings));
        assertTrue(provider.totalSql.toLowerCase(Locale.ROOT).contains("count"));
    }

    private static final class StatsProvider implements MockDataProvider {
        private final DSLContext dsl = DSL.using(SQLDialect.POSTGRES);
        private String topSql;
        private Object[] topBindings;
        private String totalSql;

        @Override
        public MockResult[] execute(MockExecuteContext context) {
            Field<Long> frags = DSL.field(DSL.name("frags"), Long.class);
            if (context.sql().toLowerCase(Locale.ROOT).contains("group by")) {
                topSql = context.sql();
                topBindings = context.bindings();
                var result = dsl.newResult(EVENTS.KILLER_NAME, frags);
                result.add(dsl.newRecord(EVENTS.KILLER_NAME, frags).values("^1Ranger", 42L));
                return new MockResult[]{new MockResult(1, result)};
            }

            totalSql = context.sql();
            var result = dsl.newResult(frags);
            result.add(dsl.newRecord(frags).values(1_337L));
            return new MockResult[]{new MockResult(1, result)};
        }
    }
}
