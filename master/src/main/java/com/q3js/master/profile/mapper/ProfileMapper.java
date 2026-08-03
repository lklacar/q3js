package com.q3js.master.profile.mapper;

import com.q3js.master.profile.domain.PlayerProfile;
import com.q3js.master.profile.domain.ProfileRivalStats;
import com.q3js.master.profile.domain.ProfileWeaponStats;
import com.q3js.master.profile.dto.ProfileMapResponse;
import com.q3js.master.profile.dto.ProfileResponse;
import com.q3js.master.profile.dto.ProfileRivalResponse;
import com.q3js.master.profile.dto.ProfileSummaryResponse;
import com.q3js.master.profile.dto.ProfileWeaponResponse;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class ProfileMapper {
    public List<ProfileSummaryResponse> summaries(List<String> playerNames) {
        return playerNames.stream().map(ProfileSummaryResponse::new).toList();
    }

    public ProfileResponse response(PlayerProfile profile) {
        return new ProfileResponse(
            profile.playerName(),
            profile.period(),
            profile.playtimeSeconds(),
            profile.lastOnline(),
            profile.rank(),
            profile.kills(),
            profile.deaths(),
            profile.killDeathRatio(),
            profile.favoriteMap() == null ? null : new ProfileMapResponse(
                profile.favoriteMap().mapName(),
                profile.favoriteMap().kills()
            ),
            weapon(profile.favoriteWeapon()),
            profile.weaponBreakdown().stream().map(this::weapon).toList(),
            rivals(profile.topVictims()),
            rivals(profile.topNemeses())
        );
    }

    private ProfileWeaponResponse weapon(ProfileWeaponStats weapon) {
        return weapon == null ? null : new ProfileWeaponResponse(
            weapon.meansOfDeath(),
            weapon.weaponName(),
            weapon.kills()
        );
    }

    private List<ProfileRivalResponse> rivals(List<ProfileRivalStats> rivals) {
        return rivals.stream()
            .map(rival -> new ProfileRivalResponse(rival.playerName(), rival.kills()))
            .toList();
    }
}
