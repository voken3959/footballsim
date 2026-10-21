// ============================================================
// LEAGUE / DAY-ADVANCE ORCHESTRATOR
// ============================================================

import type {
  CareerSave, Club, Fixture, Injury, MatchReport, Player,
  PlayerSeasonStats, StandingRow,
} from './types';
import { RNG, clamp, round } from './rng';
import { addDays, daysBetween, isAfter, isBefore } from './dates';
import { simulateMatch } from './matchEngine';
import { advancePlayerDay } from './training';
import { recomputeStandings } from './fixtures';

// ------------------------------------------------------------
// RESULT TYPE
// ------------------------------------------------------------

export interface DayAdvanceResult {
  state: CareerSave;
  userMatchReport: MatchReport | null;
  newsHeadlines: { headline: string; body: string }[];
  seasonComplete: boolean;
  wagePaid: number;
}

// ------------------------------------------------------------
// MAIN ENTRY
// ------------------------------------------------------------

export function advanceDay(state: CareerSave, userPlayerId: string): DayAdvanceResult {
  const rng = new RNG(state.seed, state.rngState);
  const userPlayer = state.players.find((p) => p.id === userPlayerId);
  if (!userPlayer) throw new Error(`User player ${userPlayerId} not found`);

  const userClubId = userPlayer.clubId;
  const newDate = addDays(state.currentDate, 1);
  const news: { headline: string; body: string }[] = [];

  // -------------------------------------------
  // 1. Daily recovery for user's club players
  // -------------------------------------------
  let players = state.players.map((p) => {
    if (p.clubId !== userClubId) return p;
    return advancePlayerDay(p, rng);
  });

  // -------------------------------------------
  // 2. Find fixtures on the new date
  // -------------------------------------------
  const dayFixtures = state.fixtures.filter((f) => f.date === newDate && !f.played);
  const userFixture = dayFixtures.find(
    (f) => f.homeClubId === userClubId || f.awayClubId === userClubId,
  );

  // -------------------------------------------
  // 3. Simulate all fixtures on the date
  // -------------------------------------------
  const updatedFixtures: Fixture[] = [...state.fixtures];
  const newReports: MatchReport[] = [];
  let userReport: MatchReport | null = null;

  for (const fixture of dayFixtures) {
    const homeClub = state.clubs.find((c) => c.id === fixture.homeClubId);
    const awayClub = state.clubs.find((c) => c.id === fixture.awayClubId);
    if (!homeClub || !awayClub) continue;

    const isUserMatch = fixture.id === userFixture?.id;

    let result: { homeGoals: number; awayGoals: number; report: MatchReport | null };
    let updatedMatchPlayers: Player[] = [];

    if (isUserMatch) {
      // Full engine simulation
      const homeSquad = players.filter((p) => p.clubId === homeClub.id);
      const awaySquad = players.filter((p) => p.clubId === awayClub.id);
      const sim = simulateMatch({
        homeClub,
        awayClub,
        homeSquad,
        awaySquad,
        rng,
        competition: 'League',
        fixtureId: fixture.id,
        playedDate: newDate,
        userPlayerId,
      });
      result = {
        homeGoals: sim.report.homeGoals,
        awayGoals: sim.report.awayGoals,
        report: sim.report,
      };
      updatedMatchPlayers = sim.updatedPlayers;
      userReport = sim.report;
      newReports.push(sim.report);

      // Apply post-match player condition to user's club
      const updatedById = new Map(updatedMatchPlayers.map((p) => [p.id, p]));
      players = players.map((p) => updatedById.get(p.id) ?? p);
    } else {
      // Lightweight sim
      const lg = lightweightMatch(rng, homeClub, awayClub);
      result = { homeGoals: lg.homeGoals, awayGoals: lg.awayGoals, report: null };
    }

    // Update fixture record
    const idx = updatedFixtures.findIndex((f) => f.id === fixture.id);
    if (idx >= 0) {
      updatedFixtures[idx] = {
        ...updatedFixtures[idx],
        played: true,
        homeGoals: result.homeGoals,
        awayGoals: result.awayGoals,
        matchReportId: result.report?.id ?? null,
      };
    }
  }

  // -------------------------------------------
  // 4. Apply user's match stats to their player
  // -------------------------------------------
  let wagePaid = 0;
  if (userReport) {
    const userStats = userReport.playerStats.find((s) => s.playerId === userPlayerId);
    if (userStats && userStats.minutesPlayed > 0) {
      players = players.map((p) => {
        if (p.id !== userPlayerId) return p;
        return applyMatchStatsToPlayer(p, userStats, state.currentSeason, userClubId);
      });
    }
    // Injury events → apply injuries to relevant players
    players = applyMatchInjuries(players, userReport, rng, newDate);

    // News headline for the match
    const homeClub = state.clubs.find((c) => c.id === userReport.homeClubId);
    const awayClub = state.clubs.find((c) => c.id === userReport.awayClubId);
    if (homeClub && awayClub) {
      news.push({
        headline: `${homeClub.shortName} ${userReport.homeGoals}-${userReport.awayGoals} ${awayClub.shortName}`,
        body: userStats && userStats.minutesPlayed > 0
          ? `${userPlayer.displayName} played ${userStats.minutesPlayed} minutes and rated ${userStats.rating.toFixed(1)}.`
          : `${userPlayer.displayName} did not feature.`,
      });
    }
  }

  // -------------------------------------------
  // 5. Recompute standings for affected leagues
  // -------------------------------------------
  const affectedLeagues = new Set(dayFixtures.map((f) => f.leagueId));
  const newStandings: Record<string, StandingRow[]> = { ...state.standings };
  for (const leagueId of affectedLeagues) {
    const league = state.leagues.find((l) => l.id === leagueId);
    if (!league) continue;
    newStandings[leagueId] = recomputeStandings(updatedFixtures, league, state.standings[leagueId] ?? []);
  }

  // -------------------------------------------
  // 6. Pay wages weekly (from career start)
  // -------------------------------------------
  const careerStart = state.createdAt.slice(0, 10);
  const daysSinceStart = daysBetween(careerStart, newDate);
  const isWageDay = daysSinceStart > 0 && daysSinceStart % 7 === 0;
  if (isWageDay && !userPlayer.injury?.daysRemaining) {
    wagePaid = userPlayer.contract.weeklyWage;
  } else if (isWageDay) {
    // Paid even if injured
    wagePaid = userPlayer.contract.weeklyWage;
  }

  // -------------------------------------------
  // 7. Season end detection
  // -------------------------------------------
  const seasonComplete = isAfter(newDate, state.seasonState.endDate);

  // -------------------------------------------
  // 8. Assemble new state
  // -------------------------------------------
  const newState: CareerSave = {
    ...state,
    players,
    fixtures: updatedFixtures,
    standings: newStandings,
    matchReports: [...state.matchReports, ...newReports],
    currentDate: newDate,
    rngState: rng.counter,
    updatedAt: new Date().toISOString(),
    newsFeed: [
      ...news.map((n, i) => ({
        id: `news_${newDate}_${i}`,
        date: newDate,
        headline: n.headline,
        body: n.body,
        category: 'Match' as const,
      })),
      ...state.newsFeed,
    ].slice(0, 100), // cap news history
    activeMatchId: userReport?.id ?? null,
  };

  return {
    state: newState,
    userMatchReport: userReport,
    newsHeadlines: news,
    seasonComplete,
    wagePaid,
  };
}

// ------------------------------------------------------------
// LIGHTWEIGHT AI-vs-AI SIMULATION
// ------------------------------------------------------------

interface LightweightResult {
  homeGoals: number;
  awayGoals: number;
}

function lightweightMatch(rng: RNG, home: Club, away: Club): LightweightResult {
  // Home advantage ≈ +3 reputation points
  const homeStr = home.reputation + 3;
  const awayStr = away.reputation;
  const diff = homeStr - awayStr;

  const homeXG = clamp(1.35 + diff * 0.012, 0.25, 4.2);
  const awayXG = clamp(1.10 - diff * 0.012, 0.25, 4.2);

  return {
    homeGoals: poisson(rng, homeXG),
    awayGoals: poisson(rng, awayXG),
  };
}

function poisson(rng: RNG, lambda: number): number {
  // Knuth's algorithm
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > L && k < 15);
  return k - 1;
}

// ------------------------------------------------------------
// USER MATCH STATS → PLAYER
// ------------------------------------------------------------

function applyMatchStatsToPlayer(
  player: Player,
  stats: { goals: number; assists: number; minutesPlayed: number; rating: number; yellowCards: number; redCards: number },
  season: string,
  clubId: string,
): Player {
  // Find or create current-season stats
  const existingIdx = player.seasonStats.findIndex(
    (s) => s.season === season && s.clubId === clubId,
  );
  const baseSeasonStats: PlayerSeasonStats = existingIdx >= 0
    ? player.seasonStats[existingIdx]
    : {
        season,
        clubId,
        appearances: 0,
        goals: 0,
        assists: 0,
        minutesPlayed: 0,
        averageRating: 0,
        yellowCards: 0,
        redCards: 0,
        cleanSheets: 0,
      };

  const newAppearances = baseSeasonStats.appearances + 1;
  const newAvgRating = round(
    (baseSeasonStats.averageRating * baseSeasonStats.appearances + stats.rating) / newAppearances,
    2,
  );

  const updatedSeasonStats: PlayerSeasonStats = {
    ...baseSeasonStats,
    appearances: newAppearances,
    goals: baseSeasonStats.goals + stats.goals,
    assists: baseSeasonStats.assists + stats.assists,
    minutesPlayed: baseSeasonStats.minutesPlayed + stats.minutesPlayed,
    averageRating: newAvgRating,
    yellowCards: baseSeasonStats.yellowCards + stats.yellowCards,
    redCards: baseSeasonStats.redCards + stats.redCards,
  };

  const newSeasonStats = [...player.seasonStats];
  if (existingIdx >= 0) newSeasonStats[existingIdx] = updatedSeasonStats;
  else newSeasonStats.push(updatedSeasonStats);

  return {
    ...player,
    seasonStats: newSeasonStats,
    careerAppearances: player.careerAppearances + 1,
    careerGoals: player.careerGoals + stats.goals,
    careerAssists: player.careerAssists + stats.assists,
  };
}

// ------------------------------------------------------------
// INJURIES FROM MATCH
// ------------------------------------------------------------

function applyMatchInjuries(
  players: Player[],
  report: MatchReport,
  rng: RNG,
  date: string,
): Player[] {
  const injuries = new Map<string, Injury>();

  for (const event of report.events) {
    if (event.type !== 'Injury' || !event.playerId) continue;
    if (injuries.has(event.playerId)) continue;

    const roll = rng.next();
    let severity: Injury['severity'];
    let daysRemaining: number;
    let type: string;

    if (roll < 0.65) {
      severity = 'Minor';
      daysRemaining = rng.int(3, 10);
      type = rng.pick(['Minor knock', 'Dead leg', 'Cramp', 'Ankle sprain']);
    } else if (roll < 0.92) {
      severity = 'Moderate';
      daysRemaining = rng.int(14, 42);
      type = rng.pick(['Hamstring strain', 'Groin strain', 'Calf strain', 'Ankle injury']);
    } else {
      severity = 'Severe';
      daysRemaining = rng.int(60, 180);
      type = rng.pick(['Knee ligament injury', 'Fractured metatarsal', 'Hip injury']);
    }

    injuries.set(event.playerId, {
      type,
      severity,
      daysRemaining,
      occurredDate: date,
    });
  }

  return players.map((p) => {
    const injury = injuries.get(p.id);
    return injury ? { ...p, injury } : p;
  });
}

// ------------------------------------------------------------
// ADVANCE UNTIL NEXT USER MATCH (fast-forward)
// ------------------------------------------------------------

/**
 * Advance day by day until the user has a match or the season ends.
 * Returns the state after the last advance. Stops BEFORE simulating
 * the match — the caller decides whether to play or simulate it.
 */
export function advanceToNextMatch(
  state: CareerSave,
  userPlayerId: string,
): { state: CareerSave; daysAdvanced: number } {
  let current = state;
  let days = 0;
  const userClubId = current.players.find((p) => p.id === userPlayerId)?.clubId;
  if (!userClubId) return { state, daysAdvanced: 0 };

  const maxDays = 400;
  while (days < maxDays) {
    const nextDate = addDays(current.currentDate, 1);
    const nextDayFixtures = current.fixtures.filter(
      (f) => f.date === nextDate && !f.played &&
        (f.homeClubId === userClubId || f.awayClubId === userClubId),
    );

    if (nextDayFixtures.length > 0) {
      // Don't simulate this day — leave for user
      break;
    }
    if (isAfter(nextDate, current.seasonState.endDate)) break;

    const result = advanceDay(current, userPlayerId);
    current = result.state;
    days++;
  }

  return { state: current, daysAdvanced: days };
}
