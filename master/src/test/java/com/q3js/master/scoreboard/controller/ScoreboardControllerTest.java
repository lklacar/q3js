package com.q3js.master.scoreboard.controller;

import com.q3js.master.scoreboard.domain.KillDistributionPoint;
import com.q3js.master.scoreboard.domain.ScoreboardEntry;
import com.q3js.master.scoreboard.domain.ScoreboardPage;
import com.q3js.master.scoreboard.domain.ScoreboardPeriod;
import com.q3js.master.scoreboard.service.ScoreboardService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@QuarkusTest
class ScoreboardControllerTest {
    @InjectMock
    ScoreboardService scoreboardService;

    @Test
    void returnsAFilteredScoreboard() {
        ZoneId timeZone = ZoneId.of("Europe/Belgrade");
        when(scoreboardService.scoreboard(ScoreboardPeriod.WEEKLY, timeZone, 2, 10, "ran"))
            .thenReturn(new ScoreboardPage(
                ScoreboardPeriod.WEEKLY,
                2,
                10,
                12,
                2,
                84,
                true,
                false,
                List.of(new ScoreboardEntry(
                    "^1Ranger",
                    42,
                    OffsetDateTime.parse("2026-08-03T12:00:00Z")
                ))
            ));

        given()
            .queryParam("period", "week")
            .queryParam("timeZone", "Europe/Belgrade")
            .queryParam("page", 2)
            .queryParam("pageSize", 10)
            .queryParam("search", "ran")
            .when().get("/api/scoreboard")
            .then()
            .statusCode(200)
            .body("period", is("WEEKLY"))
            .body("page", is(2))
            .body("totalKills", is(84))
            .body("entries[0].playerName", is("^1Ranger"))
            .body("entries[0].kills", is(42));

        verify(scoreboardService).scoreboard(ScoreboardPeriod.WEEKLY, timeZone, 2, 10, "ran");
    }

    @Test
    void returnsFragDistribution() {
        when(scoreboardService.distribution(ScoreboardPeriod.DAILY, ZoneId.of("Z")))
            .thenReturn(List.of(new KillDistributionPoint(
                OffsetDateTime.parse("2026-08-03T12:00:00Z"),
                7
            )));

        given()
            .queryParam("period", "daily")
            .when().get("/api/scoreboard/distribution")
            .then()
            .statusCode(200)
            .body("size()", is(1))
            .body("[0].kills", is(7));
    }

    @Test
    void rejectsInvalidParameters() {
        given().queryParam("period", "forever").when().get("/api/scoreboard").then().statusCode(400);
        given().queryParam("timeZone", "Mars/Olympus").when().get("/api/scoreboard").then().statusCode(400);
        given().queryParam("page", 0).when().get("/api/scoreboard").then().statusCode(400);
        given().queryParam("pageSize", 101).when().get("/api/scoreboard").then().statusCode(400);
        given().queryParam("search", "x".repeat(129)).when().get("/api/scoreboard").then().statusCode(400);
    }
}
