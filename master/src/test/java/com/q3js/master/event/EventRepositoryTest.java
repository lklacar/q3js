package com.q3js.master.event;

import org.jooq.DSLContext;
import org.jooq.SQLDialect;
import org.jooq.impl.DSL;
import org.jooq.tools.jdbc.MockConnection;
import org.jooq.tools.jdbc.MockDataProvider;
import org.jooq.tools.jdbc.MockExecuteContext;
import org.jooq.tools.jdbc.MockResult;
import org.junit.jupiter.api.Test;

import static com.q3js.master.database.generated.Tables.EVENTS;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EventRepositoryTest {
    @Test
    void insertsEventsUsingTheExistingDatabaseSchema() {
        var provider = new RecordingProvider();
        var repository = new EventRepository(
            DSL.using(new MockConnection(provider), SQLDialect.POSTGRES)
        );
        var killer = new EventRequest.EventPlayer(1, "Ranger");
        var victim = new EventRequest.EventPlayer(2, "Sarge");

        repository.insert(
            new IngestedEvent("kill", null, killer, victim, 6, 1234, 5678, "q3dm17"),
            "10.0.0.1"
        );

        assertEquals(1, provider.executeCount);
        assertTrue(provider.sql.toLowerCase().contains("insert into"));
        assertTrue(provider.sql.toLowerCase().contains("events"));
        assertArrayEquals(new Object[]{
            "10.0.0.1", "kill", 1, "Ranger", 2, "Sarge", 6, 1234, 5678, "q3dm17"
        }, provider.bindings);
    }

    private static final class RecordingProvider implements MockDataProvider {
        private final DSLContext dsl = DSL.using(SQLDialect.POSTGRES);
        private int executeCount;
        private String sql;
        private Object[] bindings;

        @Override
        public MockResult[] execute(MockExecuteContext context) {
            executeCount++;
            sql = context.sql();
            bindings = context.bindings();
            return new MockResult[]{new MockResult(1, dsl.newResult(EVENTS.fields()))};
        }
    }
}
