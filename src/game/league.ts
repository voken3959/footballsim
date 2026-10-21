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

      // Apply full stats to ALL players in this match
      for (const pStat of sim.report.playerStats) {
        if (pStat.minutesPlayed > 0) {
          players = players.map((p) => {
            if (p.id !== pStat.playerId) return p;
            return applyMatchStatsToPlayer(p, pStat, state.currentSeason, p.clubId);
          });
        }
      }

    } else {
      // Lightweight sim
      const homeSquad = players.filter((p) => p.clubId === homeClub.id);
      const awaySquad = players.filter((p) => p.clubId === awayClub.id);
      
      const lg = lightweightMatch(rng, homeClub, awayClub);
      result = { homeGoals: lg.homeGoals, awayGoals: lg.awayGoals, report: null };

      // Assign goals/assists to AI players
      const aiStats = simulateAIMatchStats(rng, homeClub, awayClub, homeSquad, awaySquad, lg.homeGoals, lg.awayGoals, newDate);
      for (const pStat of aiStats) {
        players = players.map((p) => {
          if (p.id !== pStat.playerId) return p;
          return applyMatchStatsToPlayer(p, pStat, state.currentSeason, p.clubId);
        });
      }
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
  // 4. Handle user match news
  // -------------------------------------------
  let wagePaid = 0;
  if (userReport) {
    const userStats = userReport.playerStats.find((s) => s.playerId === userPlayerId);
    if (userStats && userStats.minutesPlayed > 0) {
      // Already applied in the loop above
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
  // 6. Pay wages weekly
  // -------------------------------------------
  const careerStart = state.createdAt.slice(0, 10);
  const daysSinceStart = daysBetween(careerStart, newDate);
  const isWageDay = daysSinceStart > 0 && daysSinceStart % 7 === 0;
  if (isWageDay) {
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
    ].slice(0, 100),
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
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > L && k < 15);
  return k - 1;
}

function simulateAIMatchStats(
  rng: RNG,
  homeClub: Club,
  awayClub: Club,
  homeSquad: Player[],
  awaySquad: Player[],
  homeGoals: number,
  awayGoals: number,
  date: string,
): any[] {
  const stats: any[] = [];
  
  const assignGoals = (squad: Player[], clubId: string, goals: number) => {
    if (goals === 0) return;
    // Weight by attacking positions
    const attackers = squad.filter(p => ['ST', 'RW', 'LW', 'AM'].includes(p.primaryPosition));
    const midfielders = squad.filter(p => ['CM', 'DM'].includes(p.primaryPosition));
    const defenders = squad.filter(p => ['CB', 'RB', 'LB'].includes(p.primaryPosition));
    
    for (let i = 0; i < goals; i++) {
      const scorer = rng.weighted(
        [...attackers, ...midfielders, ...defenders],
        [...attackers.map(() => 10), ...midfielders.map(() => 3), ...defenders.map(() => 1)]
      );
      const assister = rng.chance(0.7) ? rng.pick(squad.filter(p => p.id !== scorer.id)) : null;
      
      stats.push({
        playerId: scorer.id,
        clubId,
        goals: 1,
        assists: 0,
        minutesPlayed: 90,
        rating: rng.float(6.5, 8.5),
        yellowCards: rng.chance(0.1) ? 1 : 0,
        redCards: 0,
        shots: rng.int(2, 5),
        shotsOnTarget: rng.int(1, 3),
        passesAttempted: rng.int(20, 40),
        passesCompleted: rng.int(15, 35),
        keyPasses: rng.int(0, 3),
        dribblesAttempted: rng.int(0, 4),
        dribblesCompleted: rng.int(0, 3),
        tackles: rng.int(0, 3),
        interceptions: rng.int(0, 2),
        clearances: rng.int(0, 2),
        saves: 0,
      });
      
      if (assister) {
        stats.push({
          playerId: assister.id,
          clubId,
          goals: 0,
          assists: 1,
          minutesPlayed: 90,
          rating: rng.float(6.5, 8.5),
          yellowCards: 0,
          redCards: 0,
          shots: rng.int(0, 2),
          shotsOnTarget: rng.int(0, 1),
          passesAttempted: rng.int(30, 60),
          passesCompleted: rng.int(25, 55),
          keyPasses: rng.int(1, 3),
          dribblesAttempted: rng.int(0, 3),
          dribblesCompleted: rng.int(0, 2),
          tackles: rng.int(0, 2),
          interceptions: rng.int(0, 2),
          clearances: rng.int(0, 1),
          saves: 0,
        });
      }
    }
  };

  assignGoals(homeSquad, homeClub.id, homeGoals);
  assignGoals(awaySquad, awayClub.id, awayGoals);

  // Goalkeeper clean sheet logic
  if (awayGoals === 0) {
    const gk = homeSquad.find(p => p.primaryPosition === 'GK');
    if (gk) stats.push({ playerId: gk.id, clubId: homeClub.id, cleanSheets: 1, minutesPlayed: 90 });
  }
  if (homeGoals === 0) {
    const gk = awaySquad.find(p => p.primaryPosition === 'GK');
    if (gk) stats.push({ playerId: gk.id, clubId: awayClub.id, cleanSheets: 1, minutesPlayed: 90 });
  }

  return stats;
}

// ------------------------------------------------------------
// USER MATCH STATS → PLAYER
// ------------------------------------------------------------

function applyMatchStatsToPlayer(
  player: Player,
  stats: any,
  season: string,
  clubId: string,
): Player {
  const existingIdx = player.seasonStats.findIndex(
    (s) => s.season === season && s.clubId === clubId,
  );
  
  const base: PlayerSeasonStats = existingIdx >= 0
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
        shots: 0, shotsOnTarget: 0,
        passesAttempted: 0, passesCompleted: 0, keyPasses: 0,
        dribblesAttempted: 0, dribblesCompleted: 0,
        tackles: 0, interceptions: 0, clearances: 0, saves: 0,
      };

  const newAppearances = base.appearances + (stats.minutesPlayed > 0 ? 1 : 0);
  const newAvgRating = newAppearances > 0
    ? round(
        (base.averageRating * base.appearances + (stats.rating || 6.0)) / newAppearances,
        2,
      )
    : 0;

  const updated: PlayerSeasonStats = {
    ...base,
    appearances: newAppearances,
    goals: base.goals + (stats.goals || 0),
    assists: base.assists + (stats.assists || 0),
    minutesPlayed: base.minutesPlayed + (stats.minutesPlayed || 0),
    averageRating: newAvgRating,
    yellowCards: base.yellowCards + (stats.yellowCards || 0),
    redCards: base.redCards + (stats.redCards || 0),
    cleanSheets: base.cleanSheets + (stats.cleanSheets || 0),
    
    shots: base.shots + (stats.shots || 0),
    shotsOnTarget: base.shotsOnTarget + (stats.shotsOnTarget || 0),
    passesAttempted: base.passesAttempted + (stats.passesAttempted || 0),
    passesCompleted: base.passesCompleted + (stats.passesCompleted || 0),
    keyPasses: base.keyPasses + (stats.keyPasses || 0),
    dribblesAttempted: base.dribblesAttempted + (stats.dribblesAttempted || 0),
    dribblesCompleted: base.dribblesCompleted + (stats.dribblesCompleted || 0),
    tackles: base.tackles + (stats.tackles || 0),
    interceptions: base.interceptions + (stats.interceptions || 0),
    clearances: base.clearances + (stats.clearances || 0),
    saves: base.saves + (stats.saves || 0),
  };

  const newSeasonStats = [...player.seasonStats];
  if (existingIdx >= 0) newSeasonStats[existingIdx] = updated;
  else newSeasonStats.push(updated);

  return {
    ...player,
    seasonStats: newSeasonStats,
    careerAppearances: player.careerAppearances + (stats.minutesPlayed > 0 ? 1 : 0),
    careerGoals: player.careerGoals + (stats.goals || 0),
    careerAssists: player.careerAssists + (stats.assists || 0),
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

    if (nextDayFixtures.length > 0) break;
    if (isAfter(nextDate, current.seasonState.endDate)) break;

    const result = advanceDay(current, userPlayerId);
    current = result.state;
    days++;
  }

  return { state: current, daysAdvanced: days };
}
