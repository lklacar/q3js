package com.q3js.master;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasKey;

@QuarkusTest
class OpenApiTest {

    @Test
    void exposesOpenApiDocument() {
        given()
            .queryParam("format", "json")
            .when().get("/q/openapi")
            .then()
            .statusCode(200)
            .body("info.title", equalTo("Q3JS Master API"))
            .body("paths", hasKey("/api/status"))
            .body("paths", hasKey("/api/servers"))
            .body("paths", hasKey("/api/servers/heartbeat"))
            .body("paths", hasKey("/api/events"))
            .body("paths", hasKey("/api/players"))
            .body("paths", hasKey("/api/players/{playerName}"));
    }

    @Test
    void servesSwaggerUi() {
        given()
            .when().get("/q/swagger-ui")
            .then()
            .statusCode(200)
            .body(containsString("swagger-ui-bundle.js"));
    }
}
