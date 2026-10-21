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
  startDate: string;
  endDate: string;
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
  cleanSheets: number;
}

export interface Player {
  id: string;
  firstName: string;
  surname: string;
  displayName: string;
  nationality: Nationality;
  dateOfBirth: string;
  age: number;
  foot: Foot;
  heightCm: number;
  weightKg: number;
  primaryPosition: Position;
  secondaryPosition: Position | null;
  shirtNumber: number;
  personality: Personality;

  attributes: Attributes;
  potential: number;
  overall: number;

  fitness: number;
  fatigue: number;
  sharpness: number;
  morale: number;
  confidence: number;

  injury: Injury | null;

  clubId: string;
  contract: PlayerContract;
  status: PlayerStatus;
  form: number;

  seasonStats: PlayerSeasonStats[];

  careerAppearances: number;
  careerGoals: number;
  careerAssists: number;

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
  abbreviation: string;
  country: Nationality;
  stadium: string;
  reputation: number;
  finances: number;
  trainingFacilities: number;
  youthFacilities: number;
  primaryColor: string;
  secondaryColor: string;
  formation: string;
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
  season: string;
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
  date: string;
  played: boolean;
  homeGoals: number | null;
  awayGoals: number | null;
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
  secondaryPlayerId: string | null;
  secondaryPlayerName: string | null;
  description: string;
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
  rating: number;
  matchRatingRaw: number;
}

export interface TeamMatchStats {
  clubId: string;
  possession: number;
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
  manOfTheMatch: string | null;
  playedDate: string;
  competition: string;
}

// Add this near the other interfaces
export interface Email {
  id: string;
  date: string;
  sender: string;
  subject: string;
  body: string;
  read: boolean;
  type: 'Manager' | 'Agent' | 'Transfer' | 'News';
}

export interface CareerSave {
  // ... existing fields ...
  newsFeed: NewsItem[];
  emails: Email[];
  // ...
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
  startingClubId: string | null;
}

export interface GameDate {
  year: number;
  month: number;
  day: number;
}

export interface SeasonState {
  season: string;
  startDate: string;
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
  rngState: number;

  leagues: League[];
  clubs: Club[];
  players: Player[];
  fixtures: Fixture[];
  standings: Record<string, StandingRow[]>;
  matchReports: MatchReport[];

  userPlayerId: string;
  currentDate: string;
  currentSeason: string;
  seasonState: SeasonState;
  newsFeed: NewsItem[];

  pendingTraining: TrainingSession | null;
  lastTrainingResult: TrainingSession | null;
  trainingPlan?: { focus: TrainingFocus; intensity: TrainingIntensity } | null;

  activeMatchId: string | null;
}

export interface NewsItem {
  id: string;
  date: string;
  headline: string;
  body: string;
  category: 'Match' | 'Transfer' | 'Club' | 'Training' | 'Award' | 'Injury';
}
