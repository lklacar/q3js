package com.q3js.master.profile.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(requiredProperties = {"meansOfDeath", "weaponName", "kills"})
public record ProfileWeaponResponse(int meansOfDeath, String weaponName, int kills) {
}
