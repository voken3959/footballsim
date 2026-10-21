// ============================================================
// CAREER STORE — Zustand + IndexedDB persistence
// ============================================================

import { create } from 'zustand';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  CareerSave, CareerCreation, Club, League, MatchReport,
  Player, TrainingFocus, TrainingIntensity, Fixture,
} from '../game/types';
import { RNG, clamp } from '../game/rng';
import { addDays, seasonForDate } from '../game/dates';
import { generateWorld, WorldData, getClubById } from '../game/world';
import { generateLeagueFixtures, seasonStartDate, seasonEndDate } from '../game/fixtures';
import { generateAttributes, generatePotential } from '../game/attributes';
import { computeOverall } from '../game/positions';
import { advanceDay as leagueAdvanceDay, advanceToNextMatch as leagueAdvanceToNextMatch } from '../game/league';
import { previewTraining, applyTraining } from '../game/training';
import { finaliseSeason, isSeasonComplete, SeasonSummary } from '../game/season';

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

const SCHEMA_VERSION = 1;
const START_YEAR = 2026;
const START_DATE = `${START_YEAR}-08-10`;
const DB_NAME = 'football_career_db';
const STORE_NAME = 'careers';

// ------------------------------------------------------------
// INDEXEDDB
// ------------------------------------------------------------

interface CareerDB extends DBSchema {
  careers: {
    key: string;
    value: CareerSave;
    indexes: { 'by-updated': string };
  };
}

let dbPromise: Promise<IDBPDatabase<CareerDB>> | null = null;

function getDB(): Promise<IDBPDatabase<CareerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CareerDB>(DB_NAME, 1, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by-updated', 'updatedAt');
      },
    });
  }
  return dbPromise;
}

// ------------------------------------------------------------
// STARTING CLUB OFFERS
// ------------------------------------------------------------

export function generateStartingOffers(
  world: WorldData,
  player: Player,
  pathway: 'Youth' | 'LowerLeague' | 'Established' | 'Custom',
  customClubId: string | null,
  rng: RNG,
): string[] {
  if (pathway === 'Custom' && customClubId) {
    return [customClubId];
  }

  const overall = player.overall;
  let tierPrefs: number[];
  if (overall >= 68) tierPrefs = [2, 3, 1];
  else if (overall >= 62) tierPrefs = [3, 2, 4];
  else if (overall >= 55) tierPrefs = [4, 3];
  else tierPrefs = [4];

  if (pathway === 'Youth') tierPrefs = tierPrefs.map((t) => Math.min(4, t + 1));
  if (pathway === 'Established') tierPrefs = tierPrefs.map((t) => Math.max(1, t - 1));

  const candidates: { clubId: string; score: number }[] = [];
  for (const tier of tierPrefs) {
    const league = world.leagues.find((l) => l.tier === tier);
    if (!league) continue;
    for (const club of world.clubs.filter((c) => c.leagueId === league.id)) {
      const idealRating = 35 + club.reputation * 0.55;
      const diff = Math.abs(idealRating - player.overall);
      if (diff < 18) {
        const score = 100 - diff * 4 + rng.next() * 15;
        candidates.push({ clubId: club.id, score });
      }
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((c) => c.clubId);
}

// ------------------------------------------------------------
// USER PLAYER GENERATION
// ------------------------------------------------------------

function baseRatingForPathway(
  pathway: CareerCreation['pathway'],
  rng: RNG,
): number {
  switch (pathway) {
    case 'Youth': return rng.int(50, 57);
    case 'LowerLeague': return rng.int(54, 60);
    case 'Established': return rng.int(60, 67);
    case 'Custom': return rng.int(54, 68);
    default: return 55;
  }
}

function buildUserPlayer(
  creation: CareerCreation,
  startingClub: Club,
  rng: RNG,
): Player {
  const base = baseRatingForPathway(creation.pathway, rng);
  const isYouth = creation.age <= 19;
  const attributes = generateAttributes(
    rng, base, creation.primaryPosition, creation.personality, isYouth,
  );
  const overall = computeOverall(attributes, creation.primaryPosition);
  const potential = generatePotential(rng, overall, creation.age, startingClub.youthFacilities);

  const wage = creation.pathway === 'Youth'
    ? 600
    : Math.round(
        Math.pow(Math.max(1, overall - 40), 2.0) * 6
        * (0.6 + startingClub.finances / 100)
        / 100,
      ) * 100;

  const birthYear = START_YEAR - creation.age;
  const dateOfBirth = `${birthYear}-${String(rng.int(1, 12)).padStart(2, '0')}-${String(rng.int(1, 28)).padStart(2, '0')}`;

  return {
    id: 'user_player',
    firstName: creation.firstName,
    surname: creation.surname,
    displayName: creation.displayName,
    nationality: creation.nationality,
    dateOfBirth,
    age: creation.age,
    foot: creation.foot,
    heightCm: creation.heightCm,
    weightKg: creation.weightKg,
    primaryPosition: creation.primaryPosition,
    secondaryPosition: creation.secondaryPosition,
    shirtNumber: creation.shirtNumber,
    personality: creation.personality,
    attributes,
    potential,
    overall,
    fitness: 92,
    fatigue: 8,
    sharpness: 68,
    morale: 82,
    confidence: 68,
    injury: null,
    clubId: startingClub.id,
    contract: {
      clubId: startingClub.id,
      weeklyWage: Math.max(400, wage),
      startDate: START_DATE,
      endDate: `${START_YEAR + 3}-06-30`,
      squadRole: creation.pathway === 'Youth' ? 'Academy'
        : creation.pathway === 'Established' ? 'Rotation'
        : 'Fringe',
      signingBonus: 0,
      appearanceBonus: 0,
      goalBonus: 0,
      releaseClause: null,
    },
    status: creation.pathway === 'Youth' ? 'Academy' : 'Fringe',
    form: 0,
    seasonStats: [],
    careerAppearances: 0,
    careerGoals: 0,
    careerAssists: 0,
    developmentPoints: 0,
    trainingFocus: null,
  };
}

// ------------------------------------------------------------
// STORE TYPE
// ------------------------------------------------------------

interface CareerStore {
  save: CareerSave | null;
  loading: boolean;
  error: string | null;

  lastMatchReport: MatchReport | null;
  lastTrainingDeltas: { key: string; from: number; to: number }[] | null;
  lastAdvanceNews: { headline: string; body: string }[];
  lastWagePaid: number;
  lastSeasonSummary: SeasonSummary | null;

  newCareer: (creation: CareerCreation, startingClubId: string, seed?: number) => Promise<void>;
  advanceOneDay: () => Promise<void>;
  advanceToNextMatch: () => Promise<void>;
  setTrainingPlan: (focus: TrainingFocus, intensity: TrainingIntensity) => void;
  finaliseSeason: () => Promise<SeasonSummary | null>;
  saveCareer: () => Promise<void>;
  loadCareer: (id: string) => Promise<void>;
  listCareers: () => Promise<CareerSave[]>;
  deleteCareer: (id: string) => Promise<void>;
  clearResults: () => void;

  userPlayer: () => Player | null;
  userClub: () => Club | null;
  userLeague: () => League | null;
  nextFixture: () => Fixture | null;
}

// ------------------------------------------------------------
// STORE
// ------------------------------------------------------------

export const useCareerStore = create<CareerStore>((set, get) => ({
  save: null,
  loading: false,
  error: null,
  lastMatchReport: null,
  lastTrainingDeltas: null,
  lastAdvanceNews: [],
  lastWagePaid: 0,
  lastSeasonSummary: null,

  newCareer: async (creation, startingClubId, seed) => {
    set({ loading: true, error: null });
    try {
      const rngSeed = seed ?? Math.floor(Math.random() * 1_000_000_000);
      const rng = new RNG(rngSeed);

      const world = generateWorld(rng, START_DATE);

      const fixtures: Fixture[] = [];
      for (const league of world.leagues) {
        fixtures.push(...generateLeagueFixtures(league, START_DATE, rng));
      }

      const startingClub = world.clubs.find((c) => c.id === startingClubId);
      if (!startingClub) throw new Error(`Club ${startingClubId} not found`);
      const userPlayer = buildUserPlayer(creation, startingClub, rng);

      world.players.push(userPlayer);

      const save: CareerSave = {
        schemaVersion: SCHEMA_VERSION,
        id: `career_${Date.now()}_${rngSeed}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        seed: rngSeed,
        rngState: rng.counter,
        leagues: world.leagues,
        clubs: world.clubs,
        players: world.players,
        fixtures,
        standings: world.standings,
        matchReports: [],
        userPlayerId: userPlayer.id,
        currentDate: START_DATE,
        currentSeason: seasonForDate(START_DATE),
        seasonState: {
          season: seasonForDate(START_DATE),
          startDate: START_DATE,
          endDate: seasonEndDate(START_DATE),
          currentMatchday: 0,
          totalMatchdays: 38,
        },
        newsFeed: [{
          id: `news_welcome_${Date.now()}`,
          date: START_DATE,
          headline: `${userPlayer.displayName} signs for ${startingClub.name}`,
          body: `${creation.age}-year-old ${creation.primaryPosition} ${userPlayer.displayName} has joined ${startingClub.name}. Manager ${startingClub.managerName} said: "We're excited to have this young talent at the club."`,
          category: 'Transfer',
        }],
        pendingTraining: null,
        lastTrainingResult: null,
        activeMatchId: null,
        trainingPlan: { focus: 'PositionSpecific', intensity: 'Normal' },
      };

      const db = await getDB();
      await db.put(STORE_NAME, save);

      set({ save, loading: false, lastMatchReport: null, lastTrainingDeltas: null });
    } catch (e: any) {
      set({ loading: false, error: e.message ?? String(e) });
    }
  },

  advanceOneDay: async () => {
    const save = get().save;
    if (!save) return;
    set({ loading: true, error: null });

    try {
      const userPlayer = save.players.find((p) => p.id === save.userPlayerId);
      if (!userPlayer) throw new Error('User player missing');

      const nextDate = addDays(save.currentDate, 1);
      const hasMatchTomorrow = save.fixtures.some(
        (f) =>
          f.date === nextDate &&
          !f.played &&
          (f.homeClubId === userPlayer.clubId || f.awayClubId === userPlayer.clubId),
      );

      let workingSave = save;
      let trainingDeltas: { key: string; from: number; to: number }[] = [];

      if (!hasMatchTomorrow && save.trainingPlan) {
        const club = save.clubs.find((c) => c.id === userPlayer.clubId);
        if (club) {
          const rng = new RNG(save.seed, save.rngState);
          const session = previewTraining(
            userPlayer,
            save.trainingPlan.focus,
            save.trainingPlan.intensity,
            club.trainingFacilities,
          );
          const result = applyTraining(userPlayer, session, club.trainingFacilities, rng);
          trainingDeltas = result.deltas;

          workingSave = {
            ...save,
            players: save.players.map((p) => (p.id === userPlayer.id ? result.player : p)),
            rngState: rng.counter,
            lastTrainingResult: session,
          };
        }
      }

      const result = leagueAdvanceDay(workingSave, save.userPlayerId);

      const db = await getDB();
      await db.put(STORE_NAME, result.state);

      set({
        save: result.state,
        lastMatchReport: result.userMatchReport,
        lastTrainingDeltas: trainingDeltas.length > 0 ? trainingDeltas : null,
        lastAdvanceNews: result.newsHeadlines,
        lastWagePaid: result.wagePaid,
        loading: false,
      });
    } catch (e: any) {
      set({ loading: false, error: e.message ?? String(e) });
    }
  },

  advanceToNextMatch: async () => {
    const save = get().save;
    if (!save) return;
    set({ loading: true, error: null });

    try {
      const userPlayer = save.players.find((p) => p.id === save.userPlayerId);
      if (!userPlayer) throw new Error('User player missing');

      let current = save;
      let daysAdvanced = 0;
      const maxDays = 400;

      while (daysAdvanced < maxDays) {
        const nextDate = addDays(current.currentDate, 1);
        const hasMatch = current.fixtures.some(
          (f) =>
            f.date === nextDate &&
            !f.played &&
            (f.homeClubId === userPlayer.clubId || f.awayClubId === userPlayer.clubId),
        );
        if (hasMatch) break;

        const userNow = current.players.find((p) => p.id === current.userPlayerId);
        if (userNow && current.trainingPlan) {
          const club = current.clubs.find((c) => c.id === userNow.clubId);
          if (club) {
            const rng = new RNG(current.seed, current.rngState);
            const session = previewTraining(
              userNow,
              current.trainingPlan.focus,
              current.trainingPlan.intensity,
              club.trainingFacilities,
            );
            const result = applyTraining(userNow, session, club.trainingFacilities, rng);
            current = {
              ...current,
              players: current.players.map((p) =>
                p.id === userNow.id ? result.player : p,
              ),
              rngState: rng.counter,
            };
          }
        }

        const result = leagueAdvanceDay(current, current.userPlayerId);
        current = result.state;
        daysAdvanced++;
      }

      const db = await getDB();
      await db.put(STORE_NAME, current);

      set({ save: current, lastMatchReport: null, lastTrainingDeltas: null, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e.message ?? String(e) });
    }
  },

  setTrainingPlan: (focus, intensity) => {
    const save = get().save;
    if (!save) return;
    const updated: CareerSave = {
      ...save,
      trainingPlan: { focus, intensity },
      updatedAt: new Date().toISOString(),
    };
    set({ save: updated });
    getDB().then((db) => db.put(STORE_NAME, updated)).catch(() => {});
  },

  finaliseSeason: async () => {
    const save = get().save;
    if (!save) return null;
    if (!isSeasonComplete(save)) return null;

    set({ loading: true });
    try {
      const result = finaliseSeason(save);
      const db = await getDB();
      await db.put(STORE_NAME, result.state);
      set({
        save: result.state,
        lastSeasonSummary: result.summary,
        lastMatchReport: null,
        lastTrainingDeltas: null,
        loading: false,
      });
      return result.summary;
    } catch (e: any) {
      set({ loading: false, error: e.message ?? String(e) });
      return null;
    }
  },

  saveCareer: async () => {
    const save = get().save;
    if (!save) return;
    const updated: CareerSave = { ...save, updatedAt: new Date().toISOString() };
    const db = await getDB();
    await db.put(STORE_NAME, updated);
    set({ save: updated });
  },

  loadCareer: async (id) => {
    set({ loading: true });
    try {
      const db = await getDB();
      const save = await db.get(STORE_NAME, id);
      if (!save) throw new Error('Career not found');
      set({ save, loading: false, lastMatchReport: null, lastTrainingDeltas: null });
    } catch (e: any) {
      set({ loading: false, error: e.message });
    }
  },

  listCareers: async () => {
    const db = await getDB();
    const all = await db.getAllFromIndex(STORE_NAME, 'by-updated');
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  deleteCareer: async (id) => {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
    if (get().save?.id === id) set({ save: null });
  },

  clearResults: () => set({ lastMatchReport: null, lastTrainingDeltas: null }),

  userPlayer: () => {
    const save = get().save;
    if (!save) return null;
    return save.players.find((p) => p.id === save.userPlayerId) ?? null;
  },

  userClub: () => {
    const save = get().save;
    if (!save) return null;
    const user = save.players.find((p) => p.id === save.userPlayerId);
    if (!user) return null;
    return save.clubs.find((c) => c.id === user.clubId) ?? null;
  },

  userLeague: () => {
    const save = get().save;
    if (!save) return null;
    const user = save.players.find((p) => p.id === save.userPlayerId);
    if (!user) return null;
    const club = save.clubs.find((c) => c.id === user.clubId);
    if (!club) return null;
    return save.leagues.find((l) => l.id === club.leagueId) ?? null;
  },

  nextFixture: () => {
    const save = get().save;
    if (!save) return null;
    const user = save.players.find((p) => p.id === save.userPlayerId);
    if (!user) return null;
    const upcoming = save.fixtures
      .filter(
        (f) =>
          !f.played &&
          f.date >= save.currentDate &&
          (f.homeClubId === user.clubId || f.awayClubId === user.clubId),
      )
      .sort((a, b) => a.date.localeCompare(b.date));
    return upcoming[0] ?? null;
  },
}));
