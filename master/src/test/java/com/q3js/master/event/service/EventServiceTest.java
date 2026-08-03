package com.q3js.master.event.service;

import com.q3js.master.event.domain.GameEventPlayer;
import com.q3js.master.event.domain.IngestedEvent;
import com.q3js.master.event.dto.EventRequest;
import com.q3js.master.event.repository.EventRepository;

import jakarta.ws.rs.BadRequestException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
class EventServiceTest {
    private final RecordingEventRepository repository = new RecordingEventRepository();
    private final EventService service = new EventService(repository);

    @Test
    void persistsLifecycleEventsInTheExistingSchemaShape() {
        var player = new EventRequest.EventPlayer(4, "^1Ranger");
        service.ingest(new EventRequest(
            "JOIN",
            player,
            null,
            null,
            null,
            1234,
            5678,
            " q3dm17 "
        ), "127.0.0.1");

        assertEquals(
            new IngestedEvent(
                "join",
                new GameEventPlayer(player.clientNum(), player.name()),
                null,
                null,
                null,
                1234,
                5678,
                "q3dm17"
            ),
            repository.event
        );
        assertEquals("127.0.0.1", repository.sourceIp);
    }

    @Test
    void persistsKillEventsInTheExistingSchemaShape() {
        var killer = new EventRequest.EventPlayer(1, "Ranger");
        var victim = new EventRequest.EventPlayer(2, "Sarge");
        service.ingest(new EventRequest(
            "kill",
            null,
            killer,
            victim,
            6,
            1234,
            5678,
            "q3dm17"
        ), null);

        assertEquals(
            new IngestedEvent(
                "kill",
                null,
                new GameEventPlayer(killer.clientNum(), killer.name()),
                new GameEventPlayer(victim.clientNum(), victim.name()),
                6,
                1234,
                5678,
                "q3dm17"
            ),
            repository.event
        );
        assertEquals(null, repository.sourceIp);
    }

    @Test
    void rejectsMalformedLifecycleEvents() {
        var player = new EventRequest.EventPlayer(1, "Ranger");
        var victim = new EventRequest.EventPlayer(2, "Sarge");
        var request = new EventRequest("join", player, null, victim, null, 0, 0, "q3dm17");

        BadRequestException exception = assertThrows(
            BadRequestException.class,
            () -> service.ingest(request, null)
        );

        assertEquals("Lifecycle events require only a player.", exception.getMessage());
        assertEquals(null, repository.event);
    }

    @Test
    void rejectsMalformedKillEvents() {
        var request = new EventRequest("kill", null, null, null, 6, 0, 0, "q3dm17");

        assertThrows(BadRequestException.class, () -> service.ingest(request, null));
        assertEquals(null, repository.event);
    }

    private static final class RecordingEventRepository extends EventRepository {
        private IngestedEvent event;
        private String sourceIp;

        private RecordingEventRepository() {
            super(null);
        }

        @Override
        public void insert(IngestedEvent event, String sourceIp) {
            this.event = event;
            this.sourceIp = sourceIp;
        }
    }
}
