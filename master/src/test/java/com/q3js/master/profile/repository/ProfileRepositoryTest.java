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

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProfileRepositoryTest {
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
}
