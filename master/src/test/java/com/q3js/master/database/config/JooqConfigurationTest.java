package com.q3js.master.database.config;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.jooq.DSLContext;
import org.jooq.SQLDialect;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
class JooqConfigurationTest {

    @Inject
    DSLContext dsl;

    @Test
    void configuresPostgresDialect() {
        assertEquals(SQLDialect.POSTGRES, dsl.dialect());
    }
}
