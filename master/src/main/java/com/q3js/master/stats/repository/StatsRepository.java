package com.q3js.master.stats.repository;

import com.q3js.master.stats.domain.TopFragger;
import jakarta.enterprise.context.ApplicationScoped;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.impl.DSL;
import org.jooq.impl.SQLDataType;

import java.time.OffsetDateTime;

import static com.q3js.master.database.generated.Tables.EVENTS;

@ApplicationScoped
public class StatsRepository {
    private final DSLContext dsl;

    public StatsRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public TopFragger findTopFraggerSince(OffsetDateTime periodStart) {
        Field<Long> frags = DSL.count().cast(SQLDataType.BIGINT).as("frags");
        return dsl.select(EVENTS.KILLER_NAME, frags)
            .from(EVENTS)
            .where(killCondition().and(EVENTS.RECEIVED_AT.ge(periodStart)))
            .groupBy(EVENTS.KILLER_NAME)
            .orderBy(frags.desc(), EVENTS.KILLER_NAME.asc())
            .limit(1)
            .fetchOne(record -> new TopFragger(
                record.get(EVENTS.KILLER_NAME),
                valueOrZero(record.get(frags))
            ));
    }

    public long countTotalFrags() {
        Field<Long> frags = DSL.count().cast(SQLDataType.BIGINT).as("frags");
        Long count = dsl.select(frags)
            .from(EVENTS)
            .where(killCondition())
            .fetchOne(frags);
        return valueOrZero(count);
    }

    private static Condition killCondition() {
        return EVENTS.EVENT_TYPE.eq("kill").and(EVENTS.KILLER_NAME.isNotNull());
    }

    private static long valueOrZero(Long value) {
        return value == null ? 0 : value;
    }
}
