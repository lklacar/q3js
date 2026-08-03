package com.q3js.master.profile.domain;

import java.time.OffsetDateTime;

public record ProfileLifecycleEvent(String sourceIp, String type, OffsetDateTime receivedAt) {
}
