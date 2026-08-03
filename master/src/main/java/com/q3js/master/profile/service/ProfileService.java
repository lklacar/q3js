package com.q3js.master.profile.service;

import com.q3js.master.profile.domain.PlayerProfile;
import com.q3js.master.profile.domain.ProfileLifecycleEvent;
import com.q3js.master.profile.domain.ProfileRivalStats;
import com.q3js.master.profile.domain.ProfileSitemapEntry;
import com.q3js.master.profile.domain.ProfileWeaponKills;
import com.q3js.master.profile.domain.ProfileWeaponStats;
import com.q3js.master.profile.repository.ProfileRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.NotFoundException;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class ProfileService {
    private final ProfileRepository repository;

    public ProfileService(ProfileRepository repository) {
        this.repository = repository;
    }

    public List<String> search(String search, int limit) {
        return repository.search(search, limit);
    }

    public List<ProfileSitemapEntry> sitemapEntries() {
        return repository.sitemapEntries();
    }

    public PlayerProfile get(String playerName) {
        OffsetDateTime now = currentTime();
        OffsetDateTime lastOnline = repository.findLastOnline(playerName);
        if (lastOnline == null) {
            throw new NotFoundException("Player profile not found.");
        }

        int kills = repository.countKills(playerName);
        int deaths = repository.countDeaths(playerName);
        List<ProfileWeaponStats> weaponBreakdown = weapons(
            repository.findWeaponStats(playerName)
        );
        return new PlayerProfile(
            playerName,
            playtimeSeconds(repository.findLifecycleEvents(playerName), now),
            lastOnline,
            repository.findRank(playerName, kills),
            kills,
            deaths,
            killDeathRatio(kills, deaths),
            repository.findFavoriteMap(playerName),
            weaponBreakdown.isEmpty() ? null : weaponBreakdown.get(0),
            weaponBreakdown,
            repository.findTopVictims(playerName),
            repository.findTopNemeses(playerName)
        );
    }

    protected OffsetDateTime currentTime() {
        return OffsetDateTime.now();
    }

    private static long playtimeSeconds(
        List<ProfileLifecycleEvent> events,
        OffsetDateTime now
    ) {
        Map<String, OffsetDateTime> openSessions = new HashMap<>();
        long totalSeconds = 0;

        for (ProfileLifecycleEvent event : events) {
            String source = event.sourceIp() == null ? "" : event.sourceIp();
            if ("join".equalsIgnoreCase(event.type())) {
                // A newer join supersedes an orphaned session left behind by a crashed server.
                openSessions.put(source, event.receivedAt());
            } else if ("leave".equalsIgnoreCase(event.type())) {
                OffsetDateTime joinedAt = openSessions.remove(source);
                if (joinedAt != null) {
                    totalSeconds += elapsedSeconds(joinedAt, event.receivedAt(), now);
                }
            }
        }

        // Open sessions have no reliable end time, so they must not contribute to historical playtime.
        return totalSeconds;
    }

    private static long elapsedSeconds(
        OffsetDateTime sessionStart,
        OffsetDateTime sessionEnd,
        OffsetDateTime now
    ) {
        OffsetDateTime effectiveEnd = sessionEnd.isAfter(now) ? now : sessionEnd;
        return effectiveEnd.isAfter(sessionStart) ? Duration.between(sessionStart, effectiveEnd).getSeconds() : 0;
    }

    private static List<ProfileWeaponStats> weapons(List<ProfileWeaponKills> rawWeapons) {
        Map<Integer, Integer> killsByWeapon = new HashMap<>();
        for (ProfileWeaponKills weapon : rawWeapons) {
            killsByWeapon.merge(normalizeMeansOfDeath(weapon.meansOfDeath()), weapon.kills(), Integer::sum);
        }
        return killsByWeapon.entrySet().stream()
            .map(entry -> new ProfileWeaponStats(entry.getKey(), weaponName(entry.getKey()), entry.getValue()))
            .sorted(Comparator.comparingInt(ProfileWeaponStats::kills)
                .reversed()
                .thenComparingInt(ProfileWeaponStats::meansOfDeath))
            .toList();
    }

    private static int normalizeMeansOfDeath(int meansOfDeath) {
        return switch (meansOfDeath) {
            case 5 -> 4;
            case 7 -> 6;
            case 9 -> 8;
            case 13 -> 12;
            default -> meansOfDeath;
        };
    }

    private static String weaponName(int meansOfDeath) {
        return switch (meansOfDeath) {
            case 1 -> "Shotgun";
            case 2 -> "Gauntlet";
            case 3 -> "Machinegun";
            case 4 -> "Grenade Launcher";
            case 6 -> "Rocket Launcher";
            case 8 -> "Plasma Gun";
            case 10 -> "Railgun";
            case 11 -> "Lightning Gun";
            case 12 -> "BFG10K";
            case 14 -> "Water";
            case 15 -> "Slime";
            case 16 -> "Lava";
            case 17 -> "Crush";
            case 18 -> "Telefrag";
            case 19 -> "Falling";
            case 20 -> "Suicide";
            case 21 -> "Target Laser";
            case 22 -> "Trigger Hurt";
            case 23 -> "Nailgun";
            case 24 -> "Chaingun";
            case 25 -> "Proximity Mine";
            case 26 -> "Kamikaze";
            case 27 -> "Juiced";
            case 28 -> "Grapple";
            default -> "Unknown (" + meansOfDeath + ")";
        };
    }

    private static Double killDeathRatio(int kills, int deaths) {
        if (kills == 0 && deaths == 0) {
            return 0.0;
        }
        if (deaths == 0) {
            return null;
        }
        return Math.round(((double) kills / deaths) * 100.0) / 100.0;
    }

}
