import type {
  Club, League, Player, PlayerContract, Position, StandingRow, TacticStyle, Nationality,
} from './types';
import { RNG, clampAttribute } from './rng';
import { generateAttributes, generatePotential } from './attributes';
import { computeOverall } from './positions';

// ============================================================
// FICTIONAL CLUB DEFINITIONS
// ============================================================

interface ClubTemplate {
  name: string;
  shortName: string;
  abbreviation: string;
  stadium: string;
  reputation: number;       // 1-100
  finances: number;         // 1-100
  trainingFacilities: number;
  youthFacilities: number;
  primaryColor: string;
  secondaryColor: string;
  tactic: TacticStyle;
  formation: string;
  managerName: string;
}

const CLUB_TEMPLATES: ClubTemplate[] = [
  {
    name: 'Kingsford United', shortName: 'Kingsford', abbreviation: 'KFD',
    stadium: 'The Crown Ground', reputation: 90, finances: 92,
    trainingFacilities: 90, youthFacilities: 88,
    primaryColor: '#8b1e2b', secondaryColor: '#f0e6d2',
    tactic: 'Possession', formation: '4-3-3', managerName: 'Elias Warren',
  },
  {
    name: 'Ashbury Rovers', shortName: 'Ashbury', abbreviation: 'ASH',
    stadium: 'Riverside Park', reputation: 85, finances: 84,
    trainingFacilities: 84, youthFacilities: 80,
    primaryColor: '#1d5fb4', secondaryColor: '#ffffff',
    tactic: 'HighPress', formation: '4-2-3-1', managerName: 'Marco Ellison',
  },
  {
    name: 'Vale City', shortName: 'Vale', abbreviation: 'VLC',
    stadium: 'Central Stadium', reputation: 82, finances: 80,
    trainingFacilities: 82, youthFacilities: 78,
    primaryColor: '#1f7a4a', secondaryColor: '#f2d04b',
    tactic: 'Balanced', formation: '4-3-3', managerName: 'Theo Barrow',
  },
  {
    name: 'Northbridge FC', shortName: 'Northbridge', abbreviation: 'NBR',
    stadium: 'The Bridge', reputation: 78, finances: 76,
    trainingFacilities: 78, youthFacilities: 82,
    primaryColor: '#0f172a', secondaryColor: '#d4af37',
    tactic: 'Direct', formation: '4-4-2', managerName: 'Patrick Holloway',
  },
  {
    name: 'Thornbury Wanderers', shortName: 'Thornbury', abbreviation: 'THB',
    stadium: 'Wanderer Field', reputation: 72, finances: 70,
    trainingFacilities: 72, youthFacilities: 74,
    primaryColor: '#7c3aed', secondaryColor: '#f5f5f5',
    tactic: 'Counter', formation: '5-3-2', managerName: 'Sam Ricci',
  },
  {
    name: 'Carrow Athletic', shortName: 'Carrow', abbreviation: 'CRW',
    stadium: 'Carrow Lane', reputation: 70, finances: 66,
    trainingFacilities: 70, youthFacilities: 72,
    primaryColor: '#dc2626', secondaryColor: '#111827',
    tactic: 'HighPress', formation: '4-2-3-1', managerName: 'Dean Fletcher',
  },
  {
    name: 'Redwick Town', shortName: 'Redwick', abbreviation: 'RDW',
    stadium: 'Town Field', reputation: 65, finances: 62,
    trainingFacilities: 66, youthFacilities: 68,
    primaryColor: '#b91c1c', secondaryColor: '#fbbf24',
    tactic: 'Balanced', formation: '4-4-2', managerName: 'Aaron Voss',
  },
  {
    name: 'Halewood Rangers', shortName: 'Halewood', abbreviation: 'HLW',
    stadium: 'Halewood Arena', reputation: 62, finances: 58,
    trainingFacilities: 62, youthFacilities: 66,
    primaryColor: '#f59e0b', secondaryColor: '#0f172a',
    tactic: 'Direct', formation: '4-4-2', managerName: 'Gary Wilkes',
  },
  {
    name: 'Ellisford Albion', shortName: 'Ellisford', abbreviation: 'ELS',
    stadium: 'Albion Park', reputation: 58, finances: 54,
    trainingFacilities: 58, youthFacilities: 62,
    primaryColor: '#0ea5e9', secondaryColor: '#f5f5f5',
    tactic: 'LowBlock', formation: '5-4-1', managerName: 'Lewis Crane',
  },
  {
    name: 'Bramford FC', shortName: 'Bramford', abbreviation: 'BRM',
    stadium: 'Bramford Ground', reputation: 54, finances: 50,
    trainingFacilities: 55, youthFacilities: 58,
    primaryColor: '#059669', secondaryColor: '#f5f5f5',
    tactic: 'Balanced', formation: '4-2-3-1', managerName: 'Kyle Bassett',
  },
  {
    name: 'Pentridge Town', shortName: 'Pentridge', abbreviation: 'PEN',
    stadium: 'Pentridge Common', reputation: 48, finances: 44,
    trainingFacilities: 48, youthFacilities: 54,
    tactic: 'Counter', formation: '4-3-3', managerName: 'Owen Slater',
  },
  {
    name: 'Milbrook Rangers', shortName: 'Milbrook', abbreviation: 'MLB',
    stadium: 'Milbrook Park', reputation: 44, finances: 40,
    trainingFacilities: 44, youthFacilities: 50,
    tactic: 'LowBlock', formation: '5-3-2', managerName: 'Nathan Pryce',
  },
];

// ============================================================
// NAME POOLS
// ============================================================

const FIRST_NAMES = [
  'Alex', 'Ben', 'Carl', 'Daniel', 'Elliot', 'Felix', 'Gabriel', 'Harry', 'Isaac', 'Jack',
  'Kai', 'Liam', 'Mason', 'Noah', 'Oscar', 'Paul', 'Quinn', 'Rhys', 'Sam', 'Theo',
  'Umar', 'Victor', 'Will', 'Xavier', 'Yusuf', 'Zach', 'Adrian', 'Bruno', 'Cole', 'Dario',
  'Ethan', 'Finn', 'George', 'Hugo', 'Ian', 'Jonah', 'Kieron', 'Leo', 'Marcus', 'Nico',
];

const SURNAMES = [
  'Adams', 'Baker', 'Clarke', 'Davies', 'Evans', 'Foster', 'Grant', 'Hill', 'Irving',
  'Jones', 'Kerr', 'Lewis', 'Moore', 'Nash', 'Owen', 'Parker', 'Quinn', 'Reed', 'Smith',
  'Taylor', 'Underwood', 'Vaughn', 'Walker', 'Young', 'Zimmerman', 'Ashworth', 'Beckett',
  'Carter', 'Doyle', 'Ellison', 'Fletcher', 'Grayson', 'Hughes', 'Ingram', 'Jarvis',
  'Kingsley', 'Lawson', 'Mitchell', 'Newman', 'Ortiz', 'Pierce', 'Reeves', 'Sinclair',
];

// ============================================================
// SQUAD COMPOSITION
// ============================================================

/**
 * Standard squad composition targets.
 * Ensures every club has cover in every position.
 */
const SQUAD_COMPOSITION: { pos: Position; count: number }[] = [
  { pos: 'GK', count: 2 },
  { pos: 'RB', count: 2 },
  { pos: 'LB', count: 2 },
  { pos: 'CB', count: 3 },
  { pos: 'DM', count: 2 },
  { pos: 'CM', count: 2 },
  { pos: 'AM', count: 1 },
  { pos: 'RW', count: 1 },
  { pos: 'LW', count: 1 },
  { pos: 'ST', count: 2 },
];

/** Reputation-adjusted squad strength: better clubs have higher ratings */
function squadBaseRating(clubReputation: number, rng: RNG): number {
  // Map reputation (1-100) → base overall (48-82)
  const base = 46 + (clubReputation / 100) * 36;
  return base + rng.float(-2.5, 2.5);
}

/** Compute wage for a player based on rating, age, and club finances */
function computeWage(overall: number, age: number, clubFinances: number): number {
  const base = Math.pow(Math.max(1, overall - 40), 2.4) * 12;
  const ageMult = age < 21 ? 0.55 : age < 24 ? 0.8 : age < 29 ? 1.0 : age < 33 ? 0.95 : 0.7;
  const financeMult = 0.6 + (clubFinances / 100) * 1.0;
  return Math.max(500, Math.round((base * ageMult * financeMult) / 100) * 100);
}

// ============================================================
// WORLD GENERATION
// ============================================================

export interface WorldData {
  clubs: Club[];
  league: League;
  players: Player[];
  standings: Record<string, StandingRow[]>;
}

/**
 * Generate the entire initial game world.
 * Deterministic given the RNG.
 */
export function generateWorld(rng: RNG, startingDate: string): WorldData {
  const clubs: Club[] = [];
  const players: Player[] = [];

  // Create clubs
  CLUB_TEMPLATES.forEach((tmpl, idx) => {
    const club: Club = {
      id: `club_${idx}`,
      name: tmpl.name,
      shortName: tmpl.shortName,
      abbreviation: tmpl.abbreviation,
      country: 'England',
      stadium: tmpl.stadium,
      reputation: tmpl.reputation,
      finances: tmpl.finances,
      trainingFacilities: tmpl.trainingFacilities,
      youthFacilities: tmpl.youthFacilities,
      primaryColor: tmpl.primaryColor,
      secondaryColor: tmpl.secondaryColor,
      formation: tmpl.formation,
      tactic: tmpl.tactic,
      managerName: tmpl.managerName,
      leagueId: 'league_0',
    };
    clubs.push(club);
  });

  // Generate squads
  clubs.forEach((club) => {
    const baseRating = squadBaseRating(club.reputation, rng);
    let shirt = 1;
    const usedShirt = new Set<number>();

    SQUAD_COMPOSITION.forEach(({ pos, count }) => {
      for (let i = 0; i < count; i++) {
        // First player of each position is starter-quality; others are backups
        const isStarter = i === 0;
        const offset = isStarter ? 0 : rng.float(-8, -3);
        const targetOverall = clampAttribute(baseRating + offset);
        const age = rng.int(19, 34);
        const isYouth = age <= 20;
        const personality = rng.pick([
          'Ambitious', 'Loyal', 'Professional', 'Competitive',
          'Reserved', 'Charismatic', 'RiskTaker',
        ] as const);

        const attributes = generateAttributes(rng, targetOverall, pos, personality, isYouth);
        const overall = computeOverall(attributes, pos);
        const potential = generatePotential(rng, overall, age, club.youthFacilities);

        // Find unused shirt number
        while (usedShirt.has(shirt)) shirt++;
        usedShirt.add(shirt);
        const number = shirt++;

        const first = rng.pick(FIRST_NAMES);
        const last = rng.pick(SURNAMES);
        const wage = computeWage(overall, age, club.finances);

        const contract: PlayerContract = {
          clubId: club.id,
          weeklyWage: wage,
          startDate: startingDate,
          endDate: `${new Date().getFullYear() + 2 + rng.int(0, 2)}-06-30`,
          squadRole: isStarter ? 'Starter' : 'Rotation',
          signingBonus: 0,
          appearanceBonus: 0,
          goalBonus: 0,
          releaseClause: null,
        };

        const player: Player = {
          id: `player_${club.id}_${pos}_${i}`,
          firstName: first,
          surname: last,
          displayName: `${first} ${last}`,
          nationality: rng.pick([
            'England', 'France', 'Germany', 'Spain', 'Italy',
            'Portugal', 'Netherlands', 'Brazil', 'Argentina', 'Belgium',
          ] as const) as Nationality,
          dateOfBirth: birthDateForAge(age, startingDate),
          age,
          foot: rng.weighted(['Right', 'Left', 'Both'] as const, [0.75, 0.22, 0.03]),
          heightCm: rng.int(168, 195),
          weightKg: rng.int(65, 92),
          primaryPosition: pos,
          secondaryPosition: rng.chance(0.35) ? rng.pick(adjacentPositions(pos)) : null,
          shirtNumber: number,
          personality,
          attributes,
          potential,
          overall,
          fitness: 90 + rng.int(0, 10),
          fatigue: 5,
          sharpness: 70,
          morale: 70 + rng.int(0, 20),
          confidence: 60 + rng.int(0, 30),
          injury: null,
          clubId: club.id,
          contract,
          status: isStarter ? 'Starter' : 'Rotation',
          form: 0,
          seasonStats: [],
          careerAppearances: rng.int(0, 60),
          careerGoals: 0,
          careerAssists: 0,
          developmentPoints: 0,
          trainingFocus: null,
        };

        players.push(player);
      }
    });
  });

  // Create the league
  const league: League = {
    id: 'league_0',
    name: 'The Premier Division',
    country: 'England',
    tier: 1,
    clubIds: clubs.map((c) => c.id),
    season: seasonFromDate(startingDate),
  };

  // Initialise empty standings
  const standings: Record<string, StandingRow[]> = {
    [league.id]: clubs.map((c) => ({
      clubId: c.id,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
      points: 0, form: [],
    })),
  };

  return { clubs, league, players, standings };
}

// ============================================================
// HELPERS
// ============================================================

function adjacentPositions(pos: Position): Position[] {
  switch (pos) {
    case 'GK': return ['GK'];
    case 'RB': return ['LB', 'CB', 'RW', 'DM'];
    case 'LB': return ['RB', 'CB', 'LW', 'DM'];
    case 'CB': return ['RB', 'LB', 'DM'];
    case 'DM': return ['CM', 'CB', 'RB', 'LB'];
    case 'CM': return ['DM', 'AM', 'RW', 'LW'];
    case 'AM': return ['CM', 'RW', 'LW', 'ST'];
    case 'RW': return ['LW', 'AM', 'ST', 'RB'];
    case 'LW': return ['RW', 'AM', 'ST', 'LB'];
    case 'ST': return ['AM', 'RW', 'LW'];
  }
}

function birthDateForAge(age: number, refDate: string): string {
  const [y] = refDate.split('-').map(Number);
  const birthYear = y - age;
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
  return `${birthYear}-${month}-${day}`;
}

function seasonFromDate(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  if (m >= 7) return `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
  return `${y - 1}/${String(y % 100).padStart(2, '0')}`;
}

// ============================================================
// LOOKUP HELPERS
// ============================================================

export function getClubById(clubs: Club[], id: string): Club {
  const c = clubs.find((x) => x.id === id);
  if (!c) throw new Error(`Club not found: ${id}`);
  return c;
}

export function getPlayerById(players: Player[], id: string): Player {
  const p = players.find((x) => x.id === id);
  if (!p) throw new Error(`Player not found: ${id}`);
  return p;
}

export function getSquad(players: Player[], clubId: string): Player[] {
  return players.filter((p) => p.clubId === clubId);
}

/** Sort squad by position group
