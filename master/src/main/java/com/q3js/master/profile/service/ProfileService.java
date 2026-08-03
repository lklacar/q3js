package com.q3js.master.profile.service;

import com.q3js.master.profile.domain.PlayerProfile;
import com.q3js.master.profile.domain.ProfileLifecycleEvent;
import com.q3js.master.profile.domain.ProfilePeriod;
import com.q3js.master.profile.domain.ProfileRivalStats;
import com.q3js.master.profile.domain.ProfileSitemapEntry;
import com.q3js.master.profile.domain.ProfileWeaponKills;
import com.q3js.master.profile.domain.ProfileWeaponStats;
import com.q3js.master.profile.repository.ProfileRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.NotFoundException;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayDeque;
import java.util.Comparator;
import java.util.Deque;
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

    public PlayerProfile get(String playerName, ProfilePeriod period, ZoneId timeZone) {
        OffsetDateTime now = currentTime();
        OffsetDateTime lastOnline = repository.findLastOnline(playerName);
        if (lastOnline == null) {
            throw new NotFoundException("Player profile not found.");
        }

        OffsetDateTime periodStart = period.startsAt(now, timeZone).orElse(null);
        int kills = repository.countKills(playerName, periodStart);
        int deaths = repository.countDeaths(playerName, periodStart);
        List<ProfileWeaponStats> weaponBreakdown = weapons(
            repository.findWeaponStats(playerName, periodStart)
        );
        return new PlayerProfile(
            playerName,
            period,
            playtimeSeconds(repository.findLifecycleEvents(playerName), periodStart, now),
            lastOnline,
            repository.findRank(playerName, periodStart, kills),
            kills,
            deaths,
            killDeathRatio(kills, deaths),
            repository.findFavoriteMap(playerName, periodStart),
            weaponBreakdown.isEmpty() ? null : weaponBreakdown.get(0),
            weaponBreakdown,
            repository.findTopVictims(playerName, periodStart),
            repository.findTopNemeses(playerName, periodStart)
        );
    }

    protected OffsetDateTime currentTime() {
        return OffsetDateTime.now();
    }

    private static long playtimeSeconds(
        List<ProfileLifecycleEvent> events,
        OffsetDateTime periodStart,
        OffsetDateTime now
    ) {
        Map<String, Deque<OffsetDateTime>> openSessions = new HashMap<>();
        long totalSeconds = 0;

        for (ProfileLifecycleEvent event : events) {
            String source = event.sourceIp() == null ? "" : event.sourceIp();
            Deque<OffsetDateTime> sourceSessions = openSessions.computeIfAbsent(source, ignored -> new ArrayDeque<>());
            if ("join".equalsIgnoreCase(event.type())) {
                sourceSessions.addLast(event.receivedAt());
            } else if ("leave".equalsIgnoreCase(event.type())) {
                OffsetDateTime joinedAt = sourceSessions.pollFirst();
                if (joinedAt != null) {
                    totalSeconds += overlapSeconds(joinedAt, event.receivedAt(), periodStart, now);
                }
            }
        }

        for (Deque<OffsetDateTime> sourceSessions : openSessions.values()) {
            for (OffsetDateTime joinedAt : sourceSessions) {
                totalSeconds += overlapSeconds(joinedAt, now, periodStart, now);
            }
        }
        return totalSeconds;
    }

    private static long overlapSeconds(
        OffsetDateTime sessionStart,
        OffsetDateTime sessionEnd,
        OffsetDateTime periodStart,
        OffsetDateTime periodEnd
    ) {
        OffsetDateTime overlapStart = periodStart != null && sessionStart.isBefore(periodStart)
            ? periodStart
            : sessionStart;
        OffsetDateTime overlapEnd = sessionEnd.isAfter(periodEnd) ? periodEnd : sessionEnd;
        return overlapEnd.isAfter(overlapStart) ? Duration.between(overlapStart, overlapEnd).getSeconds() : 0;
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
