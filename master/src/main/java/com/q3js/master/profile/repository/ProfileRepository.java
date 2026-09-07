package com.q3js.master.profile.repository;

import com.q3js.master.profile.domain.ProfileLifecycleEvent;
import com.q3js.master.profile.domain.ProfileMapStats;
import com.q3js.master.profile.domain.ProfileRivalStats;
import com.q3js.master.profile.domain.ProfileSitemapEntry;
import com.q3js.master.profile.domain.ProfileWeaponKills;
import jakarta.enterprise.context.ApplicationScoped;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.SortField;
import org.jooq.Table;
import org.jooq.impl.DSL;
import org.jooq.impl.SQLDataType;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static com.q3js.master.database.generated.Tables.EVENTS;

@ApplicationScoped
public class ProfileRepository {
    private static final String Q3_COLOR_CODE_REGEX = "\\^\\d";

    private final DSLContext dsl;

    public ProfileRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<String> search(String search, int limit) {
        Field<String> playerName = DSL.field(DSL.name("players", "player_name"), String.class);
        Field<String> normalizedPlayerName = normalizedPlayerName(playerName);
        Table<?> players = dsl.select(EVENTS.KILLER_NAME.as("player_name"))
            .from(EVENTS)
            .where(EVENTS.KILLER_NAME.isNotNull())
            .union(
                dsl.select(EVENTS.VICTIM_NAME.as("player_name"))
                    .from(EVENTS)
                    .where(EVENTS.VICTIM_NAME.isNotNull())
            )
            .asTable("players");
        String normalizedSearch = normalizeSearch(search);
        Condition condition = DSL.trim(playerName).ne("");
        List<SortField<?>> order = new ArrayList<>();

        if (!normalizedSearch.isBlank()) {
            condition = condition.and(normalizedPlayerName.contains(normalizedSearch));
            order.add(DSL.case_()
                .when(normalizedPlayerName.eq(normalizedSearch), 0)
                .when(normalizedPlayerName.startsWith(normalizedSearch), 1)
                .otherwise(2)
                .asc());
        }
        order.add(normalizedPlayerName.asc());
        order.add(playerName.asc());

        return dsl.select(playerName)
            .from(players)
            .where(condition)
            .orderBy(order)
            .limit(limit)
            .fetch(playerName);
    }

    public List<ProfileSitemapEntry> sitemapEntries() {
        Table<?> activity = dsl.select(
                EVENTS.KILLER_NAME.as("player_name"),
                EVENTS.RECEIVED_AT.as("last_modified")
            )
            .from(EVENTS)
            .where(EVENTS.KILLER_NAME.isNotNull())
            .unionAll(
                dsl.select(
                        EVENTS.VICTIM_NAME.as("player_name"),
                        EVENTS.RECEIVED_AT.as("last_modified")
                    )
                    .from(EVENTS)
                    .where(EVENTS.VICTIM_NAME.isNotNull())
            )
            .asTable("player_activity");
        Field<String> playerName = DSL.field(DSL.name("player_activity", "player_name"), String.class);
        Field<OffsetDateTime> activityTime = DSL.field(
            DSL.name("player_activity", "last_modified"),
            OffsetDateTime.class
        );
        Field<OffsetDateTime> lastModified = DSL.max(activityTime).as("last_modified");

        return dsl.select(playerName, lastModified)
            .from(activity)
            .where(DSL.trim(playerName).ne(""))
            .groupBy(playerName)
            .orderBy(playerName.asc())
            .fetch(record -> new ProfileSitemapEntry(
                record.get(playerName),
                record.get(lastModified)
            ));
    }

    public OffsetDateTime findLastOnline(String playerName) {
        Field<OffsetDateTime> lastKillerEvent = dsl.select(DSL.max(EVENTS.RECEIVED_AT))
            .from(EVENTS)
            .where(EVENTS.KILLER_NAME.eq(playerName))
            .asField();
        Field<OffsetDateTime> lastVictimEvent = dsl.select(DSL.max(EVENTS.RECEIVED_AT))
            .from(EVENTS)
            .where(EVENTS.VICTIM_NAME.eq(playerName))
            .asField();

        // Separate lookups use the player/time indexes. PostgreSQL GREATEST ignores
        // a missing side and returns null only when neither side has any events.
        return dsl.select(DSL.greatest(lastKillerEvent, lastVictimEvent))
            .fetchOne(0, OffsetDateTime.class);
    }

    public int countKills(String playerName) {
        return count(killCondition().and(EVENTS.KILLER_NAME.eq(playerName)));
    }

    public int countDeaths(String playerName) {
        return count(killCondition().and(EVENTS.VICTIM_NAME.eq(playerName)));
    }

    public Integer findRank(String playerName, int kills) {
        if (kills == 0) {
            return null;
        }

        Field<Integer> groupedKills = DSL.count().as("kills");
        Table<?> leaderboard = dsl.select(EVENTS.KILLER_NAME.as("player_name"), groupedKills)
            .from(EVENTS)
            .where(killCondition())
            .groupBy(EVENTS.KILLER_NAME)
            .asTable("leaderboard");
        Field<String> leaderboardPlayer = DSL.field(DSL.name("leaderboard", "player_name"), String.class);
        Field<Integer> leaderboardKills = DSL.field(DSL.name("leaderboard", "kills"), Integer.class);
        Integer playersAhead = dsl.selectCount()
            .from(leaderboard)
            .where(leaderboardKills.gt(kills)
                .or(leaderboardKills.eq(kills).and(leaderboardPlayer.lt(playerName))))
            .fetchOne(0, Integer.class);

        return valueOrZero(playersAhead) + 1;
    }

    public ProfileMapStats findFavoriteMap(String playerName) {
        Field<Integer> kills = DSL.count().as("kills");
        return dsl.select(EVENTS.MAP_NAME, kills)
            .from(EVENTS)
            .where(killCondition().and(EVENTS.KILLER_NAME.eq(playerName)))
            .groupBy(EVENTS.MAP_NAME)
            .orderBy(kills.desc(), EVENTS.MAP_NAME.asc())
            .limit(1)
            .fetchOne(record -> new ProfileMapStats(
                record.get(EVENTS.MAP_NAME),
                valueOrZero(record.get(kills))
            ));
    }

    public List<ProfileWeaponKills> findWeaponStats(String playerName) {
        Field<Integer> kills = DSL.count().as("kills");
        return dsl.select(EVENTS.MEANS_OF_DEATH, kills)
            .from(EVENTS)
            .where(killCondition().and(EVENTS.KILLER_NAME.eq(playerName)))
            .groupBy(EVENTS.MEANS_OF_DEATH)
            .fetch(record -> new ProfileWeaponKills(
                record.get(EVENTS.MEANS_OF_DEATH),
                valueOrZero(record.get(kills))
            ));
    }

    public List<ProfileRivalStats> findTopVictims(String playerName) {
        Field<Integer> kills = DSL.count().as("kills");
        return dsl.select(EVENTS.VICTIM_NAME, kills)
            .from(EVENTS)
            .where(killCondition()
                .and(EVENTS.KILLER_NAME.eq(playerName))
                .and(EVENTS.VICTIM_NAME.isNotNull())
                .and(EVENTS.VICTIM_NAME.ne(playerName)))
            .groupBy(EVENTS.VICTIM_NAME)
            .orderBy(kills.desc(), EVENTS.VICTIM_NAME.asc())
            .limit(5)
            .fetch(record -> new ProfileRivalStats(
                record.get(EVENTS.VICTIM_NAME),
                valueOrZero(record.get(kills))
            ));
    }

    public List<ProfileRivalStats> findTopNemeses(String playerName) {
        Field<Integer> kills = DSL.count().as("kills");
        return dsl.select(EVENTS.KILLER_NAME, kills)
            .from(EVENTS)
            .where(killCondition()
                .and(EVENTS.VICTIM_NAME.eq(playerName))
                .and(EVENTS.KILLER_NAME.isNotNull())
                .and(EVENTS.KILLER_NAME.ne(playerName)))
            .groupBy(EVENTS.KILLER_NAME)
            .orderBy(kills.desc(), EVENTS.KILLER_NAME.asc())
            .limit(5)
            .fetch(record -> new ProfileRivalStats(
                record.get(EVENTS.KILLER_NAME),
                valueOrZero(record.get(kills))
            ));
    }

    public List<ProfileLifecycleEvent> findLifecycleEvents(String playerName) {
        return dsl.select(EVENTS.SOURCE_IP, EVENTS.EVENT_TYPE, EVENTS.RECEIVED_AT)
            .from(EVENTS)
            .where(EVENTS.KILLER_NAME.eq(playerName).and(EVENTS.EVENT_TYPE.in("join", "leave")))
            .orderBy(EVENTS.RECEIVED_AT.asc(), EVENTS.ID.asc())
            .fetch(record -> new ProfileLifecycleEvent(
                record.get(EVENTS.SOURCE_IP),
                record.get(EVENTS.EVENT_TYPE),
                record.get(EVENTS.RECEIVED_AT)
            ));
    }

    public Map<Integer, Long> hourlyKillDistribution(
        String playerName,
        OffsetDateTime periodStart,
        OffsetDateTime periodEnd
    ) {
        Field<Integer> bucket = DSL.field(
            "floor(extract(epoch from ({0} - {1})) / 3600)::int",
            SQLDataType.INTEGER,
            EVENTS.RECEIVED_AT,
            DSL.val(periodStart)
        ).as("bucket");
        Field<Long> kills = DSL.count().cast(SQLDataType.BIGINT).as("kills");
        Map<Integer, Long> distribution = new LinkedHashMap<>();
        dsl.select(bucket, kills)
            .from(EVENTS)
            .where(playerKillCondition(playerName, periodStart, periodEnd))
            .groupBy(bucket)
            .orderBy(bucket.asc())
            .fetch()
            .forEach(record -> distribution.put(record.get(bucket), valueOrZero(record.get(kills))));
        return distribution;
    }

    public Map<LocalDate, Long> dailyKillDistribution(
        String playerName,
        OffsetDateTime periodStart,
        OffsetDateTime periodEnd,
        ZoneId timeZone
    ) {
        Field<LocalDate> bucket = DSL.field(
            "timezone({0}, {1})::date",
            SQLDataType.LOCALDATE,
            DSL.inline(timeZone.getId()),
            EVENTS.RECEIVED_AT
        ).as("bucket");
        Field<Long> kills = DSL.count().cast(SQLDataType.BIGINT).as("kills");
        Map<LocalDate, Long> distribution = new LinkedHashMap<>();
        dsl.select(bucket, kills)
            .from(EVENTS)
            .where(playerKillCondition(playerName, periodStart, periodEnd))
            .groupBy(bucket)
            .orderBy(bucket.asc())
            .fetch()
            .forEach(record -> distribution.put(record.get(bucket), valueOrZero(record.get(kills))));
        return distribution;
    }

    private int count(Condition condition) {
        Integer count = dsl.selectCount()
            .from(EVENTS)
            .where(condition)
            .fetchOne(0, Integer.class);
        return valueOrZero(count);
    }

    private Condition killCondition() {
        return EVENTS.EVENT_TYPE.eq("kill");
    }

    private Condition playerKillCondition(
        String playerName,
        OffsetDateTime periodStart,
        OffsetDateTime periodEnd
    ) {
        Condition condition = killCondition().and(EVENTS.KILLER_NAME.eq(playerName));
        if (periodStart != null) {
            condition = condition.and(EVENTS.RECEIVED_AT.ge(periodStart));
        }
        if (periodEnd != null) {
            condition = condition.and(EVENTS.RECEIVED_AT.lt(periodEnd));
        }
        return condition;
    }

    private static Field<String> normalizedPlayerName(Field<String> playerName) {
        return DSL.lower(DSL.trim(DSL.field(
            "regexp_replace({0}, {1}, '', 'g')",
            SQLDataType.VARCHAR,
            playerName,
            DSL.inline(Q3_COLOR_CODE_REGEX)
        )));
    }

    private static String normalizeSearch(String search) {
        return search == null
            ? ""
            : search.replaceAll(Q3_COLOR_CODE_REGEX, "").trim().toLowerCase(Locale.ROOT);
    }

    private static int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private static long valueOrZero(Long value) {
        return value == null ? 0 : value;
    }
}
