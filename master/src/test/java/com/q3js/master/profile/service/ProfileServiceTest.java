package com.q3js.master.profile.service;

import com.q3js.master.profile.domain.ProfileLifecycleEvent;
import com.q3js.master.profile.domain.ProfileMapStats;
import com.q3js.master.profile.domain.ProfileRivalStats;
import com.q3js.master.profile.domain.ProfileSitemapEntry;
import com.q3js.master.profile.domain.ProfileWeaponKills;
import com.q3js.master.profile.repository.ProfileRepository;
import jakarta.ws.rs.NotFoundException;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
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

        var profile = service.get("Ranger");

        assertEquals("Ranger", profile.playerName());
        assertEquals(1800, profile.playtimeSeconds());
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
    void returnsNullRatioWhenThePlayerHasKillsButNoDeaths() {
        var repository = populatedRepository();
        repository.deaths = 0;

        var profile = new FixedTimeProfileService(repository, NOW)
            .get("Ranger");

        assertNull(profile.killDeathRatio());
    }

    @Test
    void rejectsUnknownProfiles() {
        var repository = new RecordingProfileRepository();
        var service = new FixedTimeProfileService(repository, NOW);

        assertThrows(
            NotFoundException.class,
            () -> service.get("Unknown")
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

    @Test
    void ignoresOrphanedJoinsAndPairsReconnectsWithTheLatestJoin() {
        var repository = populatedRepository();
        repository.lifecycleEvents = List.of(
            new ProfileLifecycleEvent("server", "join", NOW.minusDays(10)),
            new ProfileLifecycleEvent("server", "join", NOW.minusMinutes(20)),
            new ProfileLifecycleEvent("server", "leave", NOW.minusMinutes(5))
        );

        var profile = new FixedTimeProfileService(repository, NOW).get("Ranger");

        assertEquals(900, profile.playtimeSeconds());
    }

    @Test
    void doesNotPairLifecycleEventsFromDifferentServers() {
        var repository = populatedRepository();
        repository.lifecycleEvents = List.of(
            new ProfileLifecycleEvent("one", "join", NOW.minusMinutes(30)),
            new ProfileLifecycleEvent("two", "join", NOW.minusMinutes(20)),
            new ProfileLifecycleEvent("one", "leave", NOW.minusMinutes(10))
        );

        var profile = new FixedTimeProfileService(repository, NOW).get("Ranger");

        assertEquals(1200, profile.playtimeSeconds());
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
        public int countKills(String playerName) {
            return kills;
        }

        @Override
        public int countDeaths(String playerName) {
            return deaths;
        }

        @Override
        public Integer findRank(String playerName, int kills) {
            return rank;
        }

        @Override
        public ProfileMapStats findFavoriteMap(String playerName) {
            return favoriteMap;
        }

        @Override
        public List<ProfileWeaponKills> findWeaponStats(String playerName) {
            return weapons;
        }

        @Override
        public List<ProfileRivalStats> findTopVictims(String playerName) {
            return victims;
        }

        @Override
        public List<ProfileRivalStats> findTopNemeses(String playerName) {
            return nemeses;
        }

        @Override
        public List<ProfileLifecycleEvent> findLifecycleEvents(String playerName) {
            return lifecycleEvents;
        }
    }
}
