package com.q3js.controller;

import com.q3js.service.EventPersistenceService;
import com.q3js.service.EventService;
import com.q3js.service.dto.CreateEventRequest;
import jakarta.ws.rs.NotAuthorizedException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class EventControllerTest {
    @Test
    void ingestEventAcceptsConfiguredHeaderClientSecret() {
        RecordingEventService eventService = new RecordingEventService();
        EventController controller = new EventController(eventService);
        CreateEventRequest event = CreateEventRequest.builder()
                .event("join")
                .build();
        controller.clientSecret = "secret";

        controller.ingestEvent(event, "secret");

        assertEquals(event, eventService.lastEvent);
        assertEquals(1, eventService.ingestCount);
    }

    @Test
    void ingestEventAcceptsConfiguredBodyClientSecret() {
        RecordingEventService eventService = new RecordingEventService();
        EventController controller = new EventController(eventService);
        CreateEventRequest event = CreateEventRequest.builder()
                .clientSecret("secret")
                .event("join")
                .build();
        controller.clientSecret = "secret";

        controller.ingestEvent(event, null);

        assertEquals(event, eventService.lastEvent);
        assertEquals(1, eventService.ingestCount);
    }

    @Test
    void ingestEventRejectsMissingClientSecretWhenConfigured() {
        RecordingEventService eventService = new RecordingEventService();
        EventController controller = new EventController(eventService);
        controller.clientSecret = "secret";

        assertThrows(
                NotAuthorizedException.class,
                () -> controller.ingestEvent(CreateEventRequest.builder().event("join").build(), null)
        );
        assertEquals(0, eventService.ingestCount);
    }

    @Test
    void ingestEventAllowsMissingClientSecretWhenNotConfigured() {
        RecordingEventService eventService = new RecordingEventService();
        EventController controller = new EventController(eventService);
        CreateEventRequest event = CreateEventRequest.builder()
                .event("join")
                .build();
        controller.clientSecret = "";

        controller.ingestEvent(event, null);

        assertEquals(event, eventService.lastEvent);
        assertEquals(1, eventService.ingestCount);
    }

    private static class RecordingEventService extends EventService {
        private CreateEventRequest lastEvent;
        private int ingestCount;

        private RecordingEventService() {
            super(null, new EventPersistenceService(null));
        }

        @Override
        public boolean ingestEvent(CreateEventRequest createEventRequest) {
            lastEvent = createEventRequest;
            ingestCount++;
            return true;
        }
    }
}
