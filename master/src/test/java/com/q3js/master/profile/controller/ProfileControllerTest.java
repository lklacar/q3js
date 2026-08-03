package com.q3js.master.profile.controller;

import com.q3js.master.profile.domain.PlayerProfile;
import com.q3js.master.profile.domain.ProfilePeriod;
import com.q3js.master.profile.service.ProfileService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.ws.rs.NotFoundException;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@QuarkusTest
class ProfileControllerTest {
    @InjectMock
    ProfileService profileService;

    @Test
    void searchesProfiles() {
        when(profileService.search("ran", 2)).thenReturn(List.of(
            "^1Ranger",
            "Rango"
        ));

        given()
            .queryParam("search", "ran")
            .queryParam("limit", 2)
            .when().get("/api/players")
            .then()
            .statusCode(200)
            .body("size()", is(2))
            .body("[0].playerName", is("^1Ranger"));
    }

    @Test
    void returnsAProfileWithParsedPeriodAndTimeZone() {
        var profile = new PlayerProfile(
            "Ranger",
            ProfilePeriod.WEEKLY,
            3600,
            OffsetDateTime.parse("2026-08-03T12:00:00Z"),
            2,
            12,
            5,
            2.4,
            null,
            null,
            List.of(),
            List.of(),
            List.of()
        );
        when(profileService.get("Ranger", ProfilePeriod.WEEKLY, ZoneId.of("Europe/Belgrade")))
            .thenReturn(profile);

        given()
            .queryParam("period", "week")
            .queryParam("timeZone", "Europe/Belgrade")
            .when().get("/api/players/Ranger")
            .then()
            .statusCode(200)
            .body("playerName", is("Ranger"))
            .body("period", is("WEEKLY"))
            .body("kills", is(12));

        verify(profileService).get("Ranger", ProfilePeriod.WEEKLY, ZoneId.of("Europe/Belgrade"));
    }

    @Test
    void returnsNotFoundForUnknownProfiles() {
        when(profileService.get("Unknown", ProfilePeriod.ALL_TIME, ZoneId.of("Z")))
            .thenThrow(new NotFoundException());

        given()
            .when().get("/api/players/Unknown")
            .then()
            .statusCode(404);
    }

    @Test
    void rejectsInvalidQueryParameters() {
        given()
            .queryParam("limit", 101)
            .when().get("/api/players")
            .then()
            .statusCode(400);

        given()
            .queryParam("period", "forever")
            .when().get("/api/players/Ranger")
            .then()
            .statusCode(400);

        given()
            .queryParam("timeZone", "Mars/Olympus")
            .when().get("/api/players/Ranger")
            .then()
            .statusCode(400);
    }
}
