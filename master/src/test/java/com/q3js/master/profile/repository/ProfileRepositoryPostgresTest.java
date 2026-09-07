package com.q3js.master.profile.repository;

import org.jooq.SQLDialect;
import org.jooq.impl.DSL;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.stream.Stream;

import static com.q3js.master.database.generated.Tables.EVENTS;
import static org.junit.jupiter.api.Assertions.assertEquals;

@EnabledIfSystemProperty(named = "q3js.test.db.url", matches = ".+")
class ProfileRepositoryPostgresTest {
    @ParameterizedTest(name = "{0}")
    @MethodSource("lastOnlineCases")
    void lastOnlineMatchesOriginalQuery(
        String scenario,
        OffsetDateTime lastKillerEvent,
        OffsetDateTime lastVictimEvent,
        OffsetDateTime expected
    ) throws SQLException {
        // A temporary table isolates each case from application data and other tests.
        try (var connection = DriverManager.getConnection(
            System.getProperty("q3js.test.db.url"),
            System.getProperty("q3js.test.db.user", "postgres"),
            System.getProperty("q3js.test.db.password", "postgres")
        )) {
            var dsl = DSL.using(connection, SQLDialect.POSTGRES);
            dsl.execute("""
                CREATE TEMPORARY TABLE events (
                    killer_name TEXT,
                    victim_name TEXT,
                    received_at TIMESTAMP WITH TIME ZONE NOT NULL
                )
                """);
            String playerName = "^1Ranger's";
            if (lastKillerEvent != null) {
                dsl.insertInto(EVENTS, EVENTS.KILLER_NAME, EVENTS.VICTIM_NAME, EVENTS.RECEIVED_AT)
                    .values(playerName, null, lastKillerEvent.minusDays(1))
                    .values(playerName, "Other", lastKillerEvent)
                    .execute();
            }
            if (lastVictimEvent != null) {
                dsl.insertInto(EVENTS, EVENTS.KILLER_NAME, EVENTS.VICTIM_NAME, EVENTS.RECEIVED_AT)
                    .values("Other", playerName, lastVictimEvent)
                    .values(null, playerName, lastVictimEvent.minusDays(1))
                    .execute();
            }
            // More recent events for other players must not affect the result.
            dsl.insertInto(EVENTS, EVENTS.KILLER_NAME, EVENTS.VICTIM_NAME, EVENTS.RECEIVED_AT)
                .values("Ranger's", "Other", OffsetDateTime.parse("2026-09-07T12:00:00Z"))
                .execute();

            OffsetDateTime original = dsl.select(DSL.max(EVENTS.RECEIVED_AT))
                .from(EVENTS)
                .where(EVENTS.KILLER_NAME.eq(playerName).or(EVENTS.VICTIM_NAME.eq(playerName)))
                .fetchOne(0, OffsetDateTime.class);
            OffsetDateTime actual = new ProfileRepository(dsl).findLastOnline(playerName);

            assertEquals(
                expected == null ? null : expected.toInstant(),
                original == null ? null : original.toInstant()
            );
            assertEquals(original, actual);
        }
    }

    private static Stream<Arguments> lastOnlineCases() {
        var earlier = OffsetDateTime.parse("2026-08-01T12:00:00Z");
        var later = earlier.plusDays(1);
        return Stream.of(
            Arguments.of("killer only", later, null, later),
            Arguments.of("victim only", null, later, later),
            Arguments.of("both, killer latest", later, earlier, later),
            Arguments.of("both, victim latest", earlier, later, later),
            Arguments.of("both, same timestamp", later, later, later),
            Arguments.of("no matching events", null, null, null)
        );
    }
}
