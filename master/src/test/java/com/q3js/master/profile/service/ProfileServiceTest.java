package com.q3js.master.profile.service;

import com.q3js.master.profile.domain.ProfileLifecycleEvent;
import com.q3js.master.profile.domain.ProfileMapStats;
import com.q3js.master.profile.domain.ProfilePeriod;
import com.q3js.master.profile.domain.ProfileRivalStats;
import com.q3js.master.profile.domain.ProfileSitemapEntry;
import com.q3js.master.profile.domain.ProfileWeaponKills;
import com.q3js.master.profile.repository.ProfileRepository;
import jakarta.ws.rs.NotFoundException;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProfileServiceTest {
    private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-08-05T12:00:00Z");

    @Test
    void assemblesACompleteProfile() {
        var repository = populatedRepository();
        var service = new FixedTimeProfileService(repository, NOW);

        var profile = service.get("Ranger", ProfilePeriod.ALL_TIME, ZoneId.of("Z"));

        assertEquals("Ranger", profile.playerName());
        assertEquals(ProfilePeriod.ALL_TIME, profile.period());
        assertEquals(2400, profile.playtimeSeconds());
        assertEquals(2, profile.rank());
        assertEquals(12, profile.kills());
        assertEquals(5, profile.deaths());
        assertEquals(2.4, profile.killDeathRatio());
        assertEquals("q3dm17", profile.favoriteMap().mapName());
        assertEquals("Rocket Launcher", profile.favoriteWeapon().weaponName());
        assertEquals(5, profile.favoriteWeapon().kills());
        assertEquals("Railgun", profile.weaponBreakdown().get(1).weaponName());
        assertEquals("Slash", profile.topVictims().get(0).playerName());
        assertEquals("Visor", profile.topNemeses().get(0).playerName());
    }

    @Test
    void appliesTheRequestedPeriodAndClipsPlaytime() {
        var repository = populatedRepository();
        var service = new FixedTimeProfileService(repository, NOW);

        var profile = service.get("Ranger", ProfilePeriod.DAILY, ZoneId.of("Z"));

        assertEquals(NOW.minusHours(24), repository.lastPeriodStart);
        assertEquals(600, profile.playtimeSeconds());
    }

    @Test
    void returnsNullRatioWhenThePlayerHasKillsButNoDeaths() {
        var repository = populatedRepository();
        repository.deaths = 0;

        var profile = new FixedTimeProfileService(repository, NOW)
            .get("Ranger", ProfilePeriod.ALL_TIME, ZoneId.of("Z"));

        assertNull(profile.killDeathRatio());
    }

    @Test
    void rejectsUnknownProfiles() {
        var repository = new RecordingProfileRepository();
        var service = new FixedTimeProfileService(repository, NOW);

        assertThrows(
            NotFoundException.class,
            () -> service.get("Unknown", ProfilePeriod.ALL_TIME, ZoneId.of("Z"))
        );
    }

    @Test
    void mapsSearchResults() {
        var repository = new RecordingProfileRepository();
        repository.names = List.of("^1Ranger", "Rango");
        var service = new FixedTimeProfileService(repository, NOW);

        var profiles = service.search("ran", 2);

        assertEquals(List.of("^1Ranger", "Rango"), profiles);
        assertEquals("ran", repository.search);
        assertEquals(2, repository.limit);
    }

    @Test
    void returnsSitemapEntries() {
        var repository = new RecordingProfileRepository();
        repository.sitemapEntries = List.of(new ProfileSitemapEntry("Ranger", NOW));

        var entries = new FixedTimeProfileService(repository, NOW).sitemapEntries();

        assertEquals(repository.sitemapEntries, entries);
    }

    private static RecordingProfileRepository populatedRepository() {
        var repository = new RecordingProfileRepository();
        repository.lastOnline = NOW.minusMinutes(1);
        repository.kills = 12;
        repository.deaths = 5;
        repository.rank = 2;
        repository.favoriteMap = new ProfileMapStats("q3dm17", 7);
        repository.weapons = List.of(
            new ProfileWeaponKills(6, 3),
            new ProfileWeaponKills(7, 2),
            new ProfileWeaponKills(10, 4)
        );
        repository.victims = List.of(new ProfileRivalStats("Slash", 6));
        repository.nemeses = List.of(new ProfileRivalStats("Visor", 3));
        repository.lifecycleEvents = List.of(
            new ProfileLifecycleEvent("one", "join", NOW.minusDays(2).minusMinutes(30)),
            new ProfileLifecycleEvent("one", "leave", NOW.minusDays(2)),
            new ProfileLifecycleEvent("two", "join", NOW.minusMinutes(10))
        );
        return repository;
    }

    private static final class FixedTimeProfileService extends ProfileService {
        private final OffsetDateTime now;

        private FixedTimeProfileService(ProfileRepository repository, OffsetDateTime now) {
            super(repository);
            this.now = now;
        }

        @Override
        protected OffsetDateTime currentTime() {
            return now;
        }
    }

    private static final class RecordingProfileRepository extends ProfileRepository {
        private List<String> names = List.of();
        private String search;
        private int limit;
        private OffsetDateTime lastOnline;
        private OffsetDateTime lastPeriodStart;
        private int kills;
        private int deaths;
        private Integer rank;
        private ProfileMapStats favoriteMap;
        private List<ProfileWeaponKills> weapons = List.of();
        private List<ProfileRivalStats> victims = List.of();
        private List<ProfileRivalStats> nemeses = List.of();
        private List<ProfileLifecycleEvent> lifecycleEvents = List.of();
        private List<ProfileSitemapEntry> sitemapEntries = List.of();

        private RecordingProfileRepository() {
            super(null);
        }

        @Override
        public List<String> search(String search, int limit) {
            this.search = search;
            this.limit = limit;
            return names;
        }

        @Override
        public List<ProfileSitemapEntry> sitemapEntries() {
            return sitemapEntries;
        }

        @Override
        public OffsetDateTime findLastOnline(String playerName) {
            return lastOnline;
        }

        @Override
        public int countKills(String playerName, OffsetDateTime periodStart) {
            lastPeriodStart = periodStart;
            return kills;
        }

        @Override
        public int countDeaths(String playerName, OffsetDateTime periodStart) {
            lastPeriodStart = periodStart;
            return deaths;
        }

        @Override
        public Integer findRank(String playerName, OffsetDateTime periodStart, int kills) {
            lastPeriodStart = periodStart;
            return rank;
        }

        @Override
        public ProfileMapStats findFavoriteMap(String playerName, OffsetDateTime periodStart) {
            lastPeriodStart = periodStart;
            return favoriteMap;
        }

        @Override
        public List<ProfileWeaponKills> findWeaponStats(String playerName, OffsetDateTime periodStart) {
            lastPeriodStart = periodStart;
            return weapons;
        }

        @Override
        public List<ProfileRivalStats> findTopVictims(String playerName, OffsetDateTime periodStart) {
            lastPeriodStart = periodStart;
            return victims;
        }

        @Override
        public List<ProfileRivalStats> findTopNemeses(String playerName, OffsetDateTime periodStart) {
            lastPeriodStart = periodStart;
            return nemeses;
        }

        @Override
        public List<ProfileLifecycleEvent> findLifecycleEvents(String playerName) {
            return lifecycleEvents;
        }
    }
}
