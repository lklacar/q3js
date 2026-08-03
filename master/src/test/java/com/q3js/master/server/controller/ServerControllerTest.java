package com.q3js.master.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.q3js.master.server.dto.HeartbeatRequest;
import com.q3js.master.server.dto.ServerInfo;
import com.q3js.master.server.dto.ServerResponse;
import com.q3js.master.server.service.ServerService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@QuarkusTest
class ServerControllerTest {
    @InjectMock
    ServerService serverService;

    @Test
    void returnsRegisteredServers() throws Exception {
        var info = new ObjectMapper().readValue(
            "{\"sv_hostname\":\"Q3JS Arena\",\"players\":2,\"users\":[]}",
            ServerInfo.class
        );
        when(serverService.servers()).thenReturn(List.of(
            new ServerResponse("game.example.com", 27961, 27960, true, info)
        ));

        given()
            .when().get("/api/servers")
            .then()
            .statusCode(200)
            .body("size()", is(1))
            .body("[0].host", is("game.example.com"))
            .body("[0].info.sv_hostname", is("Q3JS Arena"));
    }

    @Test
    void registersHeartbeat() {
        given()
            .contentType("application/json")
            .body(Map.of(
                "targetHost", "game.example.com",
                "proxyPort", 27961,
                "targetPort", 27960,
                "secure", true
            ))
            .when().put("/api/servers/heartbeat")
            .then()
            .statusCode(204);

        verify(serverService).register(new HeartbeatRequest("game.example.com", 27961, 27960, true));
    }

    @Test
    void rejectsInvalidHeartbeat() {
        given()
            .contentType("application/json")
            .body(Map.of(
                "targetHost", "",
                "proxyPort", 0,
                "targetPort", 27960,
                "secure", false
            ))
            .when().put("/api/servers/heartbeat")
            .then()
            .statusCode(400);
    }
}
