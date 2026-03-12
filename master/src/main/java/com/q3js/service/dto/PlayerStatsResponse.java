package com.q3js.service.dto;

import com.q3js.service.ScoreboardPeriod;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class PlayerStatsResponse {

    @NotNull
    private String playerName;

    @NotNull
    private ScoreboardPeriod period;

    @NotNull
    private long playtimeSeconds;

    @NotNull
    @Schema(nullable = true)
    private Integer rank;

    @NotNull
    private int kills;

    @NotNull
    private int deaths;

    @NotNull
    @Schema(nullable = true)
    private Double killDeathRatio;

    @NotNull
    @Schema(nullable = true)
    private PlayerFavoriteMapResponse favoriteMap;

    @NotNull
    @Schema(nullable = true)
    private PlayerFavoriteWeaponResponse favoriteWeapon;

    @NotNull
    private List<PlayerWeaponBreakdownResponse> weaponBreakdown;

    @NotNull
    private List<PlayerVersusStatResponse> topVictims;

    @NotNull
    private List<PlayerVersusStatResponse> topNemeses;
}
