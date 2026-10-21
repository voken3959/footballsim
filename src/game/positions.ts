import type { Attributes, Position } from './types';
import { clampAttribute } from './rng';

// ============================================================
// POSITION GROUPS
// ============================================================

export const POSITION_GROUP: Record<Position, 'GK' | 'DEF' | 'MID' | 'ATT'> = {
  GK: 'GK',
  RB: 'DEF', LB: 'DEF', CB: 'DEF',
  DM: 'MID', CM: 'MID', AM: 'MID',
  RW: 'ATT', LW: 'ATT', ST: 'ATT',
};

export const ALL_POSITIONS: Position[] = [
  'GK', 'RB', 'LB', 'CB', 'DM', 'CM', 'AM', 'RW', 'LW', 'ST',
];

export const POSITION_LABEL: Record<Position, string> = {
  GK: 'Goalkeeper',
  RB: 'Right-Back',
  LB: 'Left-Back',
  CB: 'Centre-Back',
  DM: 'Defensive Midfielder',
  CM: 'Central Midfielder',
  AM: 'Attacking Midfielder',
  RW: 'Right Winger',
  LW: 'Left Winger',
  ST: 'Striker',
};

// ============================================================
// OVERALL RATING WEIGHTS (must sum to 1.0 per position)
// ============================================================

type AttrKey =
  | keyof Attributes['technical']
  | keyof Attributes['physical']
  | keyof Attributes['mental'];

interface WeightMap {
  technical: Partial<Record<keyof Attributes['technical'], number>>;
  physical: Partial<Record<keyof Attributes['physical'], number>>;
  mental: Partial<Record<keyof Attributes['mental'], number>>;
}

export const OVERALL_WEIGHTS: Record<Position, WeightMap> = {
  GK: {
    technical: {
      gkReflexes: 0.28,
      handling: 0.24,
      oneOnOnes: 0.18,
      longPassing: 0.06,
      shortPassing: 0.06,
    },
    physical: { agility: 0.08, jumping: 0.04, strength: 0.03, balance: 0.03 },
    mental: { positioning: 0.09, concentration: 0.06, decisions: 0.05, composure: 0.04 },
  },
  RB: {
    technical: { tackling: 0.14, marking: 0.10, crossing: 0.14, shortPassing: 0.10, dribbling: 0.06, heading: 0.04 },
    physical: { acceleration: 0.10, sprintSpeed: 0.10, stamina: 0.08, agility: 0.03, strength: 0.03 },
    mental: { positioning: 0.06, anticipation: 0.06, workRate: 0.06, decisions: 0.05, offTheBall: 0.03, defensiveAwareness: 0.06 },
  },
  LB: {
    technical: { tackling: 0.14, marking: 0.10, crossing: 0.14, shortPassing: 0.10, dribbling: 0.06, heading: 0.04 },
    physical: { acceleration: 0.10, sprintSpeed: 0.10, stamina: 0.08, agility: 0.03, strength: 0.03 },
    mental: { positioning: 0.06, anticipation: 0.06, workRate: 0.06, decisions: 0.05, offTheBall: 0.03, defensiveAwareness: 0.06 },
  },
  CB: {
    technical: { tackling: 0.16, marking: 0.16, heading: 0.12, shortPassing: 0.08, ballControl: 0.04 },
    physical: { strength: 0.10, jumping: 0.08, sprintSpeed: 0.06, acceleration: 0.04, balance: 0.04 },
    mental: { positioning: 0.08, anticipation: 0.08, concentration: 0.04, decisions: 0.04, defensiveAwareness: 0.08, leadership: 0.02 },
  },
  DM: {
    technical: { tackling: 0.12, marking: 0.08, shortPassing: 0.16, longPassing: 0.08, ballControl: 0.06, firstTouch: 0.04 },
    physical: { stamina: 0.10, strength: 0.08, acceleration: 0.04, balance: 0.04 },
    mental: { positioning: 0.08, anticipation: 0.06, decisions: 0.06, concentration: 0.04, vision: 0.04, defensiveAwareness: 0.06 },
  },
  CM: {
    technical: { shortPassing: 0.18, longPassing: 0.10, ballControl: 0.12, firstTouch: 0.08, dribbling: 0.06, tackling: 0.06 },
    physical: { stamina: 0.10, acceleration: 0.04, agility: 0.04, balance: 0.04 },
    mental: { vision: 0.10, decisions: 0.08, composure: 0.04, workRate: 0.04, positioning: 0.02, offTheBall: 0.02, anticipation: 0.02 },
  },
  AM: {
    technical: { shortPassing: 0.14, dribbling: 0.14, ballControl: 0.12, firstTouch: 0.10, finishing: 0.08, longShots: 0.06, crossing: 0.04 },
    physical: { acceleration: 0.06, agility: 0.04, sprintSpeed: 0.04, balance: 0.02 },
    mental: { vision: 0.10, decisions: 0.06, composure: 0.04, offTheBall: 0.04, anticipation: 0.02, positioning: 0.02 },
  },
  RW: {
    technical: { dribbling: 0.18, ballControl: 0.10, firstTouch: 0.08, crossing: 0.12, finishing: 0.10, shortPassing: 0.08, longShots: 0.04 },
    physical: { acceleration: 0.10, sprintSpeed: 0.10, agility: 0.06, balance: 0.02 },
    mental: { offTheBall: 0.06, decisions: 0.04, composure: 0.02, anticipation: 0.02, vision: 0.02 },
  },
  LW: {
    technical: { dribbling: 0.18, ballControl: 0.10, firstTouch: 0.08, crossing: 0.12, finishing: 0.10, shortPassing: 0.08, longShots: 0.04 },
    physical: { acceleration: 0.10, sprintSpeed: 0.10, agility: 0.06, balance: 0.02 },
    mental: { offTheBall: 0.06, decisions: 0.04, composure: 0.02, anticipation: 0.02, vision: 0.02 },
  },
  ST: {
    technical: { finishing: 0.24, firstTouch: 0.12, heading: 0.10, dribbling: 0.08, ballControl: 0.06, longShots: 0.06, shortPassing: 0.04 },
    physical: { acceleration: 0.08, sprintSpeed: 0.06, strength: 0.04, agility: 0.02, jumping: 0.04 },
    mental: { offTheBall: 0.10, composure: 0.06, anticipation: 0.04, positioning: 0.04, decisions: 0.02, workRate: 0.02 },
  },
};

// ============================================================
// OVERALL CALCULATION
// ============================================================

export function computeOverall(attributes: Attributes, position: Position): number {
  const w = OVERALL_WEIGHTS[position];
  let total = 0;
  let sumWeights = 0;

  for (const [key, weight] of Object.entries(w.technical)) {
    const val = attributes.technical[key as keyof Attributes['technical']];
    total += val * weight;
    sumWeights += weight;
  }
  for (const [key, weight] of Object.entries(w.physical)) {
    const val = attributes.physical[key as keyof Attributes['physical']];
    total += val * weight;
    sumWeights += weight;
  }
  for (const [key, weight] of Object.entries(w.mental)) {
    const val = attributes.mental[key as keyof Attributes['mental']];
    total += val * weight;
    sumWeights += weight;
  }

  // Normalise in case weights don't sum to exactly 1.0
  const overall = sumWeights > 0 ? total / sumWeights : 50;
  return clampAttribute(overall);
}

/**
 * Position familiarity multiplier.
 * Playing out of position affects effective contribution.
 */
export function positionFamiliarity(
  naturalPos: Position,
  secondaryPos: Position | null,
  playingPos: Position,
): number {
  if (playingPos === naturalPos) return 1.0;
  if (secondaryPos && playingPos === secondaryPos) return 0.9;

  // Adjacent positions in the same line
  const natGroup = POSITION_GROUP[naturalPos];
  const playGroup = POSITION_GROUP[playingPos];
  if (natGroup === playGroup) return 0.8;

  // GK outfield swaps are catastrophic
  if (natGroup === 'GK' || playGroup === 'GK') return 0.35;

  // Nearby groups (DEF↔MID, MID↔ATT)
  const groupOrder = ['DEF', 'MID', 'ATT'];
  const distance = Math.abs(groupOrder.indexOf(natGroup) - groupOrder.indexOf(playGroup));
  if (distance === 1) return 0.7;

  return 0.55;
}

/**
 * Effective attribute value for a player at a specific position.
 */
export function effectiveAttribute(
  value: number,
  playerPos: Position,
  playerSecondaryPos: Position | null,
  playingPos: Position,
): number {
  return value * positionFamiliarity(playerPos, playerSecondaryPos, playingPos);
}
