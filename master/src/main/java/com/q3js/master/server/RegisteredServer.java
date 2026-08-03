package com.q3js.master.server;

import java.time.OffsetDateTime;

public record RegisteredServer(
    String host,
    int proxyPort,
    int targetPort,
    boolean secure,
    OffsetDateTime lastHeartbeat
) {
}
