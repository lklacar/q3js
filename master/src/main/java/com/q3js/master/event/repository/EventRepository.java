package com.q3js.master.event.repository;

import com.q3js.master.event.domain.IngestedEvent;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.jooq.DSLContext;

import static com.q3js.master.database.generated.Tables.EVENTS;

@ApplicationScoped
public class EventRepository {
    private final DSLContext dsl;

    public EventRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    @Transactional
    public void insert(IngestedEvent event, String sourceIp) {
        var record = dsl.newRecord(EVENTS);
        record.setSourceIp(sourceIp);
        record.setEventType(event.type());
        record.setGameTime(event.gameTime());
        record.setServerTime(event.serverTime());
        record.setMapName(event.map());

        if (event.player() != null) {
            record.setKillerClientNum(event.player().clientNum());
            record.setKillerName(event.player().name());
        } else {
            record.setKillerClientNum(event.killer().clientNum());
            record.setKillerName(event.killer().name());
            record.setVictimClientNum(event.victim().clientNum());
            record.setVictimName(event.victim().name());
            record.setMeansOfDeath(event.meansOfDeath());
        }

        record.store();
    }
}
