// ============================================================
// FIXTURE GENERATOR + SEASON CALENDAR
// ============================================================

import type { League, Fixture, StandingRow } from './types';
import { RNG } from './rng';
import { addDays, nextSaturday, parseDate, toISODate } from './dates';

// ------------------------------------------------------------
// ROUND-ROBIN GENERATION (circle method)
// ------------------------------------------------------------

/**
 * Generate a full double round-robin fixture list for a league.
 * Every club plays every other club home and away.
 *
 * For N clubs (even), produces (N-1) matchdays per half,
 * then a mirrored second half with home/away swapped.
 */
export function generateLeagueFixtures(
  league: League,
  seasonStartISO: string,
  rng: RNG,
): Fixture[] {
  const clubIds = [...league.clubIds];
  if (clubIds.length % 2 !== 0) {
    throw new Error(`League ${league.id} has odd number of clubs (${clubIds.length})`);
  }

  // Shuffle seeding so fixtures aren't always the same order
  rng.shuffle(clubIds);

  const n = clubIds.length;
  const rounds = n - 1;
  const half = n / 2;
  const fixtures: Fixture[] = [];

  // Standard circle method: fix club[0], rotate the rest
  const homeTeam: string[] = clubIds.slice(0, half);
  const awayTeam: string[] = clubIds.slice(half).reverse();

  const firstHalf: { home: string; away: string }[][] = [];
  const rotated = [...clubIds];
  // Circle method uses a rotating array of the teams after the fixed one
  const fixed = rotated[0];
  const rest = rotated.slice(1);

  for (let round = 0; round < rounds; round++) {
    const roundMatches: { home: string; away: string }[] = [];
    // Pair fixed with the first of rest
    const opponent = rest[round % rest.length];
    if (round % 2 === 0) {
      roundMatches.push({ home: fixed, away: opponent });
    } else {
      roundMatches.push({ home: opponent, away: fixed });
    }
    // Pair up the rest
    for (let i = 1; i < half; i++) {
      const idx1 = (round + i) % rest.length;
      const idx2 = (round - i + rest.length * 2) % rest.length;
      if (idx1 === idx2) continue;
      const a = rest[idx1];
      const b = rest[idx2];
      if (round % 2 === 0) {
        roundMatches.push({ home: a, away: b });
      } else {
        roundMatches.push({ home: b, away: a });
      }
    }
    // Trim to correct size (dedupe any accidental pairs)
    firstHalf.push(roundMatches.slice(0, half));
  }

  // Second half = mirrored home/away
  const secondHalf: { home: string; away: string }[][] = firstHalf.map((round) =>
    round.map((m) => ({ home: m.away, away: m.home })),
  );

  const totalRounds = firstHalf.length + secondHalf.length;

  // Assign dates: matchdays on Saturdays, 7 days apart
  const baseSaturday = nextSaturday(seasonStartISO);
  const matchdayDates: string[] = [];
  for (let i = 0; i < totalRounds; i++) {
    matchdayDates.push(addDays(baseSaturday, i * 7));
  }

  // Build fixtures
  const allRounds = [...firstHalf, ...secondHalf];
  allRounds.forEach((round, roundIdx) => {
    const date = matchdayDates[roundIdx];
    round.forEach((m, matchIdx) => {
      fixtures.push({
        id: `fix_${league.id}_${roundIdx}_${matchIdx}`,
        leagueId: league.id,
        season: league.season,
        matchday: roundIdx + 1,
        homeClubId: m.home,
        awayClubId: m.away,
        date,
        played: false,
        homeGoals: null,
        awayGoals: null,
        matchReportId: null,
      });
    });
  });

  return fixtures;
}

// ------------------------------------------------------------
// SEASON START / END
// ------------------------------------------------------------

/** Compute the season's start Saturday for the current year. */
export function seasonStartDate(referenceISO: string): string {
  const d = parseDate(referenceISO);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  // Seasons start in August
  const year = m >= 7 ? y : y - 1;
  return `${year}-08-10`;
}

/** Approximate season end (last Saturday of May). */
export function seasonEndDate(referenceISO: string): string {
  const d = parseDate(referenceISO);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const year = m >= 7 ? y + 1 : y;
  return `${year}-05-24`;
}

// ------------------------------------------------------------
// CALENDAR VIEW HELPERS
// ------------------------------------------------------------

/** Get the next scheduled fixture for a club from a given date. */
export function getNextFixture(
  fixtures: Fixture[],
  clubId: string,
  fromDateISO: string,
): Fixture | null {
  const upcoming = fixtures
    .filter(
      (f) =>
        !f.played &&
        f.date >= fromDateISO &&
        (f.homeClubId === clubId || f.awayClubId === clubId),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}

/** Get all fixtures on a given date (across all leagues). */
export function fixturesOnDate(fixtures: Fixture[], iso: string): Fixture[] {
  return fixtures.filter((f) => f.date === iso);
}

/** Get fixtures for a specific matchday in a league. */
export function fixturesForMatchday(
  fixtures: Fixture[],
  leagueId: string,
  matchday: number,
): Fixture[] {
  return fixtures.filter((f) => f.leagueId === leagueId && f.matchday === matchday);
}

/** Get all fixtures for a club, sorted by date. */
export function clubFixtures(fixtures: Fixture[], clubId: string): Fixture[] {
  return fixtures
    .filter((f) => f.homeClubId === clubId || f.awayClubId === clubId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ------------------------------------------------------------
// STANDINGS
// ------------------------------------------------------------

/** Recompute standings from played fixtures. Used after each matchday. */
export function recomputeStandings(
  fixtures: Fixture[],
  league: League,
  previous: StandingRow[],
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const clubId of league.clubIds) {
    rows.set(clubId, {
      clubId,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
      points: 0, form: [],
    });
  }

  // Reset form before recomputing
  for (const row of rows.values()) row.form = [];

  const leagueFixtures = fixtures
    .filter((f) => f.leagueId === league.id && f.played)
    .sort((a, b) => a.date.localeCompare(b.date) || a.matchday - b.matchday);

  for (const f of leagueFixtures) {
    if (f.homeGoals === null || f.awayGoals === null) continue;
    const home = rows.get(f.homeClubId);
    const away = rows.get(f.awayClubId);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += f.homeGoals;
    home.goalsAgainst += f.awayGoals;
    away.goalsFor += f.awayGoals;
    away.goalsAgainst += f.homeGoals;

    let homeResult: 'W' | 'D' | 'L';
    let awayResult: 'W' | 'D' | 'L';
    if (f.homeGoals > f.awayGoals) {
      home.won++; away.lost++;
      home.points += 3;
      homeResult = 'W'; awayResult = 'L';
    } else if (f.homeGoals < f.awayGoals) {
      away.won++; home.lost++;
      away.points += 3;
      homeResult = 'L'; awayResult = 'W';
    } else {
      home.drawn++; away.drawn++;
      home.points += 1; away.points += 1;
      homeResult = 'D'; awayResult = 'D';
    }

    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;

    home.form.push(homeResult);
    away.form.push(awayResult);
    // Keep last 5 form entries
    if (home.form.length > 5) home.form = home.form.slice(-5);
    if (away.form.length > 5) away.form = away.form.slice(-5);
  }

  // Sort: points desc, GD desc, GF desc, club name asc (tiebreaker)
  const sorted = Array.from(rows.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.clubId.localeCompare(b.clubId);
  });

  return sorted;
}

// ------------------------------------------------------------
// CALENDAR EVENT
// ------------------------------------------------------------

export type CalendarEventType =
  | 'Training'
  | 'Match'
  | 'Recovery'
  | 'Rest'
  | 'SeasonEnd'
  | 'SeasonStart';

export interface CalendarEvent {
  date: string;
  type: CalendarEventType;
  label: string;
  fixtureId?: string;
}

/**
 * Build the day-by-day calendar for the user between now and the season end.
 * Match days are pulled from fixtures; other days default to training.
 */
export function buildCareerCalendar(
  fixtures: Fixture[],
  userClubId: string,
  startDateISO: string,
  endDateISO: string,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const clubMatches = clubFixtures(fixtures, userClubId).filter(
    (f) => f.date >= startDateISO && f.date <= endDateISO,
  );
  const byDate = new Map<string, Fixture>();
  for (const f of clubMatches) byDate.set(f.date, f);

  let cursor = startDateISO;
  let safety = 0;
  while (cursor <= endDateISO && safety < 400) {
    const match = byDate.get(cursor);
    if (match) {
      events.push({
        date: cursor,
        type: 'Match',
        label: 'Matchday',
        fixtureId: match.id,
      });
    } else {
      events.push({ date: cursor, type: 'Training', label: 'Training' });
    }
    cursor = addDays(cursor, 1);
    safety++;
  }

  return events;
}

/**
 * Skip forward until the next day that has a match for the user's club.
 * Returns the ISO date. If no match remains, returns the season end date.
 */
export function skipToNextMatch(
  fixtures: Fixture[],
  userClubId: string,
  fromDateISO: string,
  seasonEndISO: string,
): string {
  const next = getNextFixture(fixtures, userClubId, fromDateISO);
  if (!next) return seasonEndISO;
  return next.date;
}
