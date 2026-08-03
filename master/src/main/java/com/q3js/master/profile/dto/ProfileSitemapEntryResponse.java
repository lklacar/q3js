package com.q3js.master.profile.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.OffsetDateTime;

@Schema(requiredProperties = {"playerName", "lastModified"})
public record ProfileSitemapEntryResponse(
    String playerName,
    OffsetDateTime lastModified
) {
}
