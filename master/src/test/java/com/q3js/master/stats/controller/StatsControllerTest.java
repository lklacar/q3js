package com.q3js.master.stats.controller;

import com.q3js.master.stats.domain.SiteStats;
import com.q3js.master.stats.domain.TopFragger;
import com.q3js.master.stats.service.StatsService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.mockito.Mockito.when;

@QuarkusTest
class StatsControllerTest {
    @InjectMock
    StatsService statsService;

    @Test
    void returnsHomepageStatistics() {
        when(statsService.stats()).thenReturn(new SiteStats(
            7,
            new TopFragger("^1Ranger", 42),
            1_337
        ));

        given()
            .when().get("/api/stats")
            .then()
            .statusCode(200)
            .body("playersOnline", is(7))
            .body("mostFragsLast24Hours.playerName", is("^1Ranger"))
            .body("mostFragsLast24Hours.frags", is(42))
            .body("totalFragsEver", is(1_337));
    }
}
