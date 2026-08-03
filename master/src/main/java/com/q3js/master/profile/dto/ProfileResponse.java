package com.q3js.master.profile.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.OffsetDateTime;
import java.util.List;

@Schema(requiredProperties = {
    "playerName", "playtimeSeconds", "lastOnline", "rank", "kills", "deaths",
    "killDeathRatio", "favoriteMap", "favoriteWeapon", "weaponBreakdown", "topVictims", "topNemeses"
})
public record ProfileResponse(
    String playerName,
    long playtimeSeconds,
    @Schema(nullable = true) OffsetDateTime lastOnline,
    @Schema(nullable = true) Integer rank,
    int kills,
    int deaths,
    @Schema(nullable = true) Double killDeathRatio,
    @Schema(nullable = true) ProfileMapResponse favoriteMap,
    @Schema(nullable = true) ProfileWeaponResponse favoriteWeapon,
    List<ProfileWeaponResponse> weaponBreakdown,
    List<ProfileRivalResponse> topVictims,
    List<ProfileRivalResponse> topNemeses
) {
}
