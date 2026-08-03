package com.q3js.master.server.domain;

import java.time.OffsetDateTime;

public record StoredServer(
    RegisteredServer server,
    String infoJson,
    OffsetDateTime infoFetchedAt
) {
}
