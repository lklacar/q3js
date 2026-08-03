package com.q3js.master.profile.domain;

import java.time.OffsetDateTime;
import java.util.List;

public record PlayerProfile(
    String playerName,
    long playtimeSeconds,
    OffsetDateTime lastOnline,
    Integer rank,
    int kills,
    int deaths,
    Double killDeathRatio,
    ProfileMapStats favoriteMap,
    ProfileWeaponStats favoriteWeapon,
    List<ProfileWeaponStats> weaponBreakdown,
    List<ProfileRivalStats> topVictims,
    List<ProfileRivalStats> topNemeses
) {
}
