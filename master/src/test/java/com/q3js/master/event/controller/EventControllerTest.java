package com.q3js.master.event.controller;

import com.q3js.master.event.dto.EventRequest;
import com.q3js.master.event.security.EventAuthenticator;
import com.q3js.master.event.service.EventService;

import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@QuarkusTest
class EventControllerTest {
    private static final String DEVELOPMENT_SECRET =
        "98e9b63a7b1bcd9103cdc951cda26976d06b6076df6ab13da1f20c25c7699167";

    @InjectMock
    EventService eventService;

    @Test
    void acceptsAuthenticatedEvents() {
        given()
            .contentType("application/json")
            .header(EventAuthenticator.CLIENT_SECRET_HEADER, DEVELOPMENT_SECRET)
            .body(Map.of(
                "event", "kill",
                "killer", Map.of("clientNum", 1, "name", "Ranger"),
                "victim", Map.of("clientNum", 2, "name", "Sarge"),
                "meansOfDeath", 6,
                "gameTime", 1234,
                "serverTime", 5678,
                "map", "q3dm17"
            ))
            .when().post("/api/events")
            .then()
            .statusCode(204);

        verify(eventService).ingest(any(EventRequest.class), anyString());
    }

    @Test
    void rejectsMissingClientSecret() {
        given()
            .contentType("application/json")
            .body(validLifecycleEvent())
            .when().post("/api/events")
            .then()
            .statusCode(401);

        verifyNoInteractions(eventService);
    }

    @Test
    void rejectsWrongClientSecret() {
        given()
            .contentType("application/json")
            .header(EventAuthenticator.CLIENT_SECRET_HEADER, "wrong-secret-with-enough-characters")
            .body(validLifecycleEvent())
            .when().post("/api/events")
            .then()
            .statusCode(401);

        verifyNoInteractions(eventService);
    }

    @Test
    void rejectsUnknownEventTypes() {
        given()
            .contentType("application/json")
            .header(EventAuthenticator.CLIENT_SECRET_HEADER, DEVELOPMENT_SECRET)
            .body(Map.of(
                "event", "match",
                "gameTime", 0,
                "serverTime", 0,
                "map", "q3dm17"
            ))
            .when().post("/api/events")
            .then()
            .statusCode(400);

        verifyNoInteractions(eventService);
    }

    private Map<String, Object> validLifecycleEvent() {
        return Map.of(
            "event", "join",
            "player", Map.of("clientNum", 1, "name", "Ranger"),
            "gameTime", 0,
            "serverTime", 0,
            "map", "q3dm17"
        );
    }
}
