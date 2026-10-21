// ============================================================
// SEASON ROLLOVER
// ============================================================

import type { CareerSave, Player, StandingRow } from './types';
import { RNG } from './rng';
import {
  seasonStartDate, seasonEndDate, generateLeagueFixtures,
} from './fixtures';
import { applySeasonEndAgeing } from './training';
import { seasonForDate } from './dates';

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

export interface SeasonAward {
  playerId: string;
  playerName: string;
  clubId: string;
  value: number;
  label: string;
}

export interface SeasonSummary {
  season: string;
  champions: { leagueId: string; clubId: string; points: number }[];
  promoted: { clubId: string; fromLeagueId: string; toLeagueId: string }[];
  relegated: { clubId: string; fromLeagueId: string; toLeagueId: string }[];
  topScorer: SeasonAward | null;
  topAssister: SeasonAward | null;
  playerOfSeason: SeasonAward | null;
  youngPlayerOfSeason: SeasonAward | null;
  userSeason: {
    appearances: number;
    goals: number;
    assists: number;
    avgRating: number;
    trophies: string[];
    clubId: string;
    leagueId: string;
  } | null;
}

// ------------------------------------------------------------
// DETECTION
// ------------------------------------------------------------

/**
 * Season is complete when the user's league has no unplayed fixtures
 * and the current date has passed the season end date.
 */
export function isSeasonComplete(state: CareerSave): boolean {
  if (state.currentDate < state.seasonState.endDate) return false;
  const user = state.players.find((p) => p.id === state.userPlayerId);
  if (!user) return false;
  const userLeague = state.leagues.find((l) => {
    const club = state.clubs.find((c) => c.id === user.clubId);
    return club && l.id === club.leagueId;
  });
  if (!userLeague) return false;
  const remaining = state.fixtures.filter(
    (f) => f.leagueId === userLeague.id && !f.played,
  );
  return remaining.length === 0;
}

// ------------------------------------------------------------
// ROLLOVER
// ------------------------------------------------------------

export function finaliseSeason(state: CareerSave): {
  state: CareerSave;
  summary: SeasonSummary;
  news: { headline: string; body: string }[];
} {
  const rng = new RNG(state.seed, state.rngState);
  const currentSeason = state.currentSeason;
  const news: { headline: string; body: string }[] = [];

  // ---- 1. Champions per league ----
  const champions = state.leagues
    .map((l) => {
      const rows = state.standings[l.id] ?? [];
      return rows[0]
        ? { leagueId: l.id, clubId: rows[0].clubId, points: rows[0].points }
        : null;
    })
    .filter((c): c is { leagueId: string; clubId: string; points: number } => c !== null);

  // ---- 2. Promotion / relegation ----
  const promotions: SeasonSummary['promoted'] = [];
  const relegations: SeasonSummary['relegated'] = [];

  for (const league of state.leagues) {
    if (league.tier === 1) continue;
    const rows = state.standings[league.id] ?? [];
    if (rows.length === 0) continue;

    const higher = state.leagues.find((l) => l.tier === league.tier - 1);
    const lower = state.leagues.find((l) => l.tier === league.tier + 1);
    if (!higher || !lower) continue;

    const promoteCount = league.tier === 2 ? 2 : 3;
    const relegateCount = 3;

    for (let i = 0; i < promoteCount; i++) {
      if (rows[i]) {
        promotions.push({
          clubId: rows[i].clubId,
          fromLeagueId: league.id,
          toLeagueId: higher.id,
        });
      }
    }
    for (let i = rows.length - relegateCount; i < rows.length; i++) {
      if (rows[i]) {
        relegations.push({
          clubId: rows[i].clubId,
          fromLeagueId: league.id,
          toLeagueId: lower.id,
        });
      }
    }
  }

  // ---- 3. Apply league changes ----
  const newClubs = state.clubs.map((c) => {
    const p = promotions.find((x) => x.clubId === c.id);
    if (p) return { ...c, leagueId: p.toLeagueId };
    const r = relegations.find((x) => x.clubId === c.id);
    if (r) return { ...c, leagueId: r.toLeagueId };
    return c;
  });

  const newLeagues = state.leagues.map((league) => {
    const leaving = new Set<string>([
      ...promotions.filter((p) => p.fromLeagueId === league.id).map((p) => p.clubId),
      ...relegations.filter((r) => r.fromLeagueId === league.id).map((r) => r.clubId),
    ]);
    const incoming = [
      ...promotions.filter((p) => p.toLeagueId === league.id).map((p) => p.clubId),
      ...relegations.filter((r) => r.toLeagueId === league.id).map((r) => r.clubId),
    ];
    return {
      ...league,
      clubIds: [...league.clubIds.filter((id) => !leaving.has(id)), ...incoming],
    };
  });

  // ---- 4. Awards ----
  const topScorer = computeTopScorer(state);
  const topAssister = computeTopAssister(state);
  const playerOfSeason = computePlayerOfSeason(state);
  const youngPlayerOfSeason = computeYoungPlayerOfSeason(state);

  // ---- 5. User snapshot ----
  const user = state.players.find((p) => p.id === state.userPlayerId);
  const userClub = user ? state.clubs.find((c) => c.id === user.clubId) : null;
  const userLeague = userClub
    ? state.leagues.find((l) => l.id === userClub.leagueId)
    : null;
  const userStats = user?.seasonStats.find(
    (s) => s.season === currentSeason,
  );

  const userTrophies: string[] = [];
  if (userClub && userLeague) {
    const champ = champions.find((c) => c.leagueId === userLeague.id);
    if (champ && champ.clubId === userClub.id) {
      userTrophies.push(`${userLeague.name} Champion`);
    }
  }

  // ---- 6. Age players ----
  const agedPlayers = state.players.map((p) => {
    const { player } = applySeasonEndAgeing(p, p.age + 1, rng);
    return player;
  });

  // ---- 7. Contract handling ----
  const nextSeasonYear = parseInt(currentSeason.split('/')[0]) + 1;
  const nextSeasonStart = seasonStartDate(`${nextSeasonYear}-07-01`);
  const nextSeasonEnd = seasonEndDate(`${nextSeasonYear}-07-01`);
  const nextSeason = seasonForDate(nextSeasonStart);

  const playersWithContracts = agedPlayers.map((p) => {
    if (p.contract.endDate < nextSeasonStart) {
      if (p.id === state.userPlayerId) {
        // User: auto-offer one-year extension at same wage for now.
        // Phase 2 will make this a real negotiation.
        return {
          ...p,
          contract: {
            ...p.contract,
            startDate: nextSeasonStart,
            endDate: `${nextSeasonYear + 1}-06-30`,
          },
        };
      }
      // AI players: auto-renew to keep squads intact
      return {
        ...p,
        contract: {
          ...p.contract,
          startDate: nextSeasonStart,
          endDate: `${nextSeasonYear + 2}-06-30`,
        },
      };
    }
    return p;
  });

  // ---- 8. New fixtures ----
  const newFixtures = newLeagues.flatMap((league) =>
    generateLeagueFixtures({ ...league, season: nextSeason }, nextSeasonStart, rng),
  );

  // ---- 9. Reset standings ----
  const newStandings: Record<string, StandingRow[]> = {};
  for (const league of newLeagues) {
    newStandings[league.id] = league.clubIds.map((clubId) => ({
      clubId,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
      points: 0, form: [],
    }));
  }

  // ---- 10. News ----
  for (const c of champions) {
    const club = newClubs.find((x) => x.id === c.clubId);
    const league = state.leagues.find((x) => x.id === c.leagueId);
    if (club && league) {
      news.push({
        headline: `${club.name} win the ${league.name}`,
        body: `${club.name} finish top of the ${league.name} with ${c.points} points.`,
      });
    }
  }
  for (const p of promotions) {
    const club = newClubs.find((x) => x.id === p.clubId);
    if (club) {
      const to = state.leagues.find((x) => x.id === p.toLeagueId);
      news.push({
        headline: `${club.name} promoted`,
        body: `${club.name} are promoted to the ${to?.name}.`,
      });
    }
  }
  for (const r of relegations) {
    const club = newClubs.find((x) => x.id === r.clubId);
    if (club) {
      const to = state.leagues.find((x) => x.id === r.toLeagueId);
      news.push({
        headline: `${club.name} relegated`,
        body: `${club.name} are relegated to the ${to?.name}.`,
      });
    }
  }
  if (topScorer) {
    news.push({
      headline: `${topScorer.playerName} wins the Golden Boot`,
      body: `${topScorer.playerName} finishes as top scorer with ${topScorer.value} goals.`,
    });
  }
  if (playerOfSeason) {
    news.push({
      headline: `${playerOfSeason.playerName} is Player of the Season`,
      body: `${playerOfSeason.playerName} earns the award with an average rating of ${playerOfSeason.value.toFixed(2)}.`,
    });
  }
  if (userTrophies.length > 0 && userClub) {
    news.push({
      headline: `${userClub.name} crowned ${userLeague?.name} champions!`,
      body: `${userClub.name} have won the ${userLeague?.name}.`,
    });
  }

  // ---- 11. Assemble summary ----
  const summary: SeasonSummary = {
    season: currentSeason,
    champions,
    promoted: promotions,
    relegated: relegations,
    topScorer,
    topAssister,
    playerOfSeason,
    youngPlayerOfSeason,
    userSeason: user && userClub && userLeague
      ? {
          appearances: userStats?.appearances ?? 0,
          goals: userStats?.goals ?? 0,
          assists: userStats?.assists ?? 0,
          avgRating: userStats?.averageRating ?? 0,
          trophies: userTrophies,
          clubId: userClub.id,
          leagueId: userLeague.id,
        }
      : null,
  };

  // ---- 12. New state ----
  const newState: CareerSave = {
    ...state,
    clubs: newClubs,
    leagues: newLeagues,
    players: playersWithContracts,
    fixtures: newFixtures,
    standings: newStandings,
    currentDate: nextSeasonStart,
    currentSeason: nextSeason,
    seasonState: {
      season: nextSeason,
      startDate: nextSeasonStart,
      endDate: nextSeasonEnd,
      currentMatchday: 0,
      totalMatchdays: 38,
    },
    rngState: rng.counter,
    newsFeed: [
      ...news.map((n, i) => ({
        id: `news_season_${Date.now()}_${i}`,
        date: state.currentDate,
        headline: n.headline,
        body: n.body,
        category: 'Award' as const,
      })),
      ...state.newsFeed,
    ].slice(0, 100),
    updatedAt: new Date().toISOString(),
  };

  return { state: newState, summary, news };
}

// ------------------------------------------------------------
// AWARD HELPERS
// ------------------------------------------------------------

function seasonStatsFor(state: CareerSave, player: Player) {
  const stats = player.seasonStats.filter((s) => s.season === state.currentSeason);
  const apps = stats.reduce((sum, s) => sum + s.appearances, 0);
  const goals = stats.reduce((sum, s) => sum + s.goals, 0);
  const assists = stats.reduce((sum, s) => sum + s.assists, 0);
  const ratingSum = stats.reduce((sum, s) => sum + s.averageRating * s.appearances, 0);
  const avgRating = apps > 0 ? ratingSum / apps : 0;
  return { apps, goals, assists, avgRating };
}

function buildAward(
  state: CareerSave,
  player: Player,
  value: number,
  label: string,
): SeasonAward {
  return {
    playerId: player.id,
    playerName: player.displayName,
    clubId: player.clubId,
    value,
    label,
  };
}

function computeTopScorer(state: CareerSave): SeasonAward | null {
  let best: { player: Player; value: number } | null = null;
  for (const p of state.players) {
    const s = seasonStatsFor(state, p);
    if (s.goals === 0) continue;
    if (!best || s.goals > best.value) best = { player: p, value: s.goals };
  }
  return best ? buildAward(state, best.player, best.value, 'Top scorer') : null;
}

function computeTopAssister(state: CareerSave): SeasonAward | null {
  let best: { player: Player; value: number } | null = null;
  for (const p of state.players) {
    const s = seasonStatsFor(state, p);
    if (s.assists === 0) continue;
    if (!best || s.assists > best.value) best = { player: p, value: s.assists };
  }
  return best ? buildAward(state, best.player, best.value, 'Top assister') : null;
}

function computePlayerOfSeason(state: CareerSave): SeasonAward | null {
  let best: { player: Player; value: number } | null = null;
  for (const p of state.players) {
    const s = seasonStatsFor(state, p);
    if (s.apps < 10) continue;
    if (!best || s.avgRating > best.value) best = { player: p, value: s.avgRating };
  }
  return best ? buildAward(state, best.player, best.value, 'Player of the Season') : null;
}

function computeYoungPlayerOfSeason(state: CareerSave): SeasonAward | null {
  let best: { player: Player; value: number } | null = null;
  for (const p of state.players) {
    if (p.age > 21) continue;
    const s = seasonStatsFor(state, p);
    if (s.apps < 8) continue;
    if (!best || s.avgRating > best.value) best = { player: p, value: s.avgRating };
  }
  return best ? buildAward(state, best.player, best.value, 'Young Player of the Season') : null;
}
