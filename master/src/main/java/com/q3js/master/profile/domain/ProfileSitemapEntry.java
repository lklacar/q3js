package com.q3js.master.profile.domain;

import java.time.OffsetDateTime;

public record ProfileSitemapEntry(
    String playerName,
    OffsetDateTime lastModified
) {
}
