// ============================================================
// CORE PRIMITIVE TYPES
// ============================================================

export type Nationality =
  | 'England' | 'France' | 'Germany' | 'Spain' | 'Italy'
  | 'Portugal' | 'Netherlands' | 'Brazil' | 'Argentina' | 'Belgium';

export type Position =
  | 'GK' | 'RB' | 'LB' | 'CB' | 'DM' | 'CM' | 'AM' | 'RW' | 'LW' | 'ST';

export type Foot = 'Left' | 'Right' | 'Both';

export type Personality =
  | 'Ambitious' | 'Loyal' | 'Professional' | 'Competitive'
  | 'Reserved' | 'Charismatic' | 'RiskTaker';

export type PlayerStatus =
  | 'Academy' | 'Fringe' | 'Rotation' | 'Important' | 'Starter' | 'Key';

// ============================================================
// ATTRIBUTES
// ============================================================

export interface TechnicalAttributes {
  finishing: number;
  longShots: number;
  shortPassing: number;
  longPassing: number;
  crossing: number;
  dribbling: number;
  firstTouch: number;
  ballControl: number;
  tackling: number;
  heading: number;
  marking: number;
  gkReflexes: number;
  handling: number;
  oneOnOnes: number;
}

export interface PhysicalAttributes {
  acceleration: number;
  sprintSpeed: number;
  agility: number;
  balance: number;
  strength: number;
  jumping: number;
  stamina: number;
  naturalFitness: number;
}

export interface MentalAttributes {
  positioning: number;
  vision: number;
  decisions: number;
  composure: number;
  anticipation: number;
  concentration: number;
  workRate: number;
  offTheBall: number;
  defensiveAwareness: number;
  leadership: number;
}

export interface Attributes {
  technical: TechnicalAttributes;
  physical: PhysicalAttributes;
  mental: MentalAttributes;
}

// ============================================================
// PLAYER
// ============================================================

export interface PlayerContract {
  clubId: string;
  weeklyWage: number;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  squadRole: PlayerStatus;
  signingBonus: number;
  appearanceBonus: number;
  goalBonus: number;
  releaseClause: number | null;
}

export interface PlayerSeasonStats {
  season: string;
  clubId: string;
  appearances: number;
  goals: number;
  assists: number;
  minutesPlayed: number;
  averageRating: number;
  yellowCards: number;
  redCards: number;
  cleanSheets: number; // for GK/DEF
}

export interface Player {
  id: string;
  firstName: string;
  surname: string;
  displayName: string;
  nationality: Nationality;
  dateOfBirth: string; // ISO date
  age: number;
  foot: Foot;
  heightCm: number;
  weightKg: number;
  primaryPosition: Position;
  secondaryPosition: Position | null;
  shirtNumber: number;
  personality: Personality;

  attributes: Attributes;
  potential: number;   // 1-100 hidden cap
  overall: number;     // computed from attributes + position

  // Condition
  fitness: number;     // 0-100 (match fitness)
  fatigue: number;     // 0-100 (accumulated tiredness)
  sharpness: number;   // 0-100 (match readiness)
  morale: number;      // 0-100
  confidence: number;  // 0-100

  // Injury
  injury: Injury | null;

  // Career
  clubId: string;
  contract: PlayerContract;
  status: PlayerStatus;
  form: number; // -5 to +5 rolling

  // Season history
  seasonStats: PlayerSeasonStats[];

  // Career totals (derived but persisted for history)
  careerAppearances: number;
  careerGoals: number;
  careerAssists: number;

  // Development
  developmentPoints: number;
  trainingFocus: TrainingFocus | null;
}

export interface Injury {
  type: string;
  severity: 'Minor' | 'Moderate' | 'Severe';
  daysRemaining: number;
  occurredDate: string;
}

// ============================================================
// CLUB
// ============================================================

export interface Club {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string; // 3 letters
  country: Nationality;
  stadium: string;
  reputation: number;   // 1-100
  finances: number;     // abstract, 1-100
  trainingFacilities: number; // 1-100
  youthFacilities: number;    // 1-100
  primaryColor: string;  // hex
  secondaryColor: string; // hex
  formation: string; // e.g. '4-3-3'
  tactic: TacticStyle;
  managerName: string;
  leagueId: string;
}

export type TacticStyle =
  | 'Possession' | 'Direct' | 'Counter' | 'HighPress' | 'LowBlock' | 'Balanced';

// ============================================================
// LEAGUE & FIXTURES
// ============================================================

export interface League {
  id: string;
  name: string;
  country: Nationality;
  tier: number;
  clubIds: string[];
  season: string; // e.g. '2025/26'
}

export interface StandingRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export interface Fixture {
  id: string;
  leagueId: string;
  season: string;
  matchday: number;
  homeClubId: string;
  awayClubId: string;
  date: string; // ISO date
  played: boolean;
  homeGoals: number | null;
  awayGoals: number | null;
  // If user's club is involved, store match report id
  matchReportId: string | null;
}

// ============================================================
// MATCH ENGINE
// ============================================================

export type MatchEventType =
  | 'KickOff' | 'HalfTime' | 'FullTime'
  | 'Goal' | 'OwnGoal' | 'PenaltyGoal' | 'PenaltyMiss'
  | 'Shot' | 'ShotOnTarget' | 'ShotOffTarget' | 'ShotBlocked'
  | 'Save' | 'Corner' | 'Foul' | 'YellowCard' | 'RedCard'
  | 'Substitution' | 'Offside' | 'Injury'
  | 'Chance' | 'Tackle' | 'Interception' | 'Clearance';

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  clubId: string;
  playerId: string | null;
  playerName: string | null;
  secondaryPlayerId: string | null; // assist, subbed player, etc.
  secondaryPlayerName: string | null;
  description: string; // human-readable commentary
}

export interface PlayerMatchStats {
  playerId: string;
  playerName: string;
  clubId: string;
  position: Position;
  minutesPlayed: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  passesAttempted: number;
  passesCompleted: number;
  keyPasses: number;
  dribblesAttempted: number;
  dribblesCompleted: number;
  tackles: number;
  interceptions: number;
  clearances: number;
  foulsCommitted: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  rating: number; // 1.0 - 10.0
  matchRatingRaw: number; // internal accumulator
}

export interface TeamMatchStats {
  clubId: string;
  possession: number; // percentage
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passesCompleted: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  offsides: number;
  expectedGoals: number;
}

export interface MatchReport {
  id: string;
  fixtureId: string;
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
  events: MatchEvent[];
  playerStats: PlayerMatchStats[];
  homeTeamStats: TeamMatchStats;
  awayTeamStats: TeamMatchStats;
  manOfTheMatch: string | null; // playerId
  playedDate: string;
  competition: string;
}

// ============================================================
// TRAINING
// ============================================================

export type TrainingFocus =
  | 'Finishing' | 'Passing' | 'Dribbling' | 'Defending'
  | 'Physical' | 'Tactical' | 'Recovery' | 'PositionSpecific';

export type TrainingIntensity = 'Rest' | 'Light' | 'Normal' | 'Intensive';

export interface TrainingSession {
  focus: TrainingFocus;
  intensity: TrainingIntensity;
  attributeGains: Partial<Record<keyof Attributes['technical'] | keyof Attributes['physical'] | keyof Attributes['mental'], number>>;
  fatigueCost: number;
  injuryRisk: number;
  description: string;
}

// ============================================================
// CAREER / SAVE STATE
// ============================================================

export interface CareerCreation {
  firstName: string;
  surname: string;
  displayName: string;
  nationality: Nationality;
  age: number;
  foot: Foot;
  heightCm: number;
  weightKg: number;
  primaryPosition: Position;
  secondaryPosition: Position | null;
  shirtNumber: number;
  personality: Personality;
  pathway: 'Youth' | 'LowerLeague' | 'Established' | 'Custom';
  startingClubId: string | null; // for Custom
}

export interface GameDate {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

export interface SeasonState {
  season: string;
  startDate: string; // ISO
  endDate: string;
  currentMatchday: number;
  totalMatchdays: number;
}

export interface CareerSave {
  schemaVersion: number;
  id: string;
  createdAt: string;
  updatedAt: string;
  seed: number;
  rngState: number; // persisted RNG counter

  // World
  leagues: League[];
  clubs: Club[];
  players: Player[]; // ALL players including user
  fixtures: Fixture[];
  standings: Record<string, StandingRow[]>; // leagueId -> rows
  matchReports: MatchReport[];

  // User
  userPlayerId: string;
  currentDate: string; // ISO
  currentSeason: string;
  seasonState: SeasonState;
  newsFeed: NewsItem[];

  // Pending user decisions
  pendingTraining: TrainingSession | null;
  lastTrainingResult: TrainingSession | null;

  // Match in progress (if user is watching live)
  activeMatchId: string | null;
}

export interface NewsItem {
  id: string;
  date: string;
  headline: string;
  body: string;
  category: 'Match' | 'Transfer' | 'Club' | 'Training' | 'Award' | 'Injury';
}
