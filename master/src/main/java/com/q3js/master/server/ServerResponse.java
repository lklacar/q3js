package com.q3js.master.server;

import com.fasterxml.jackson.databind.JsonNode;

public record ServerResponse(
    String host,
    int proxyPort,
    int targetPort,
    boolean secure,
    JsonNode info
) {
}
