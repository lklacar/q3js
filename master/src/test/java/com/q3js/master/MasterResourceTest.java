package com.q3js.master;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;

@QuarkusTest
class MasterResourceTest {

    @Test
    void reportsServiceStatus() {
        given()
            .when().get("/api/status")
            .then()
            .statusCode(200)
            .body("service", is("q3js-master"))
            .body("status", is("ok"));
    }
}
