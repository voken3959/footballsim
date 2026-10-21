import type {
  Attributes,
  Position,
  Personality,
  TechnicalAttributes,
  PhysicalAttributes,
  MentalAttributes,
} from './types';
import { RNG, clampAttribute, clamp, normal, round } from './rng';
import { POSITION_GROUP, computeOverall } from './positions';

// ============================================================
// ATTRIBUTE GENERATION
// ============================================================

/**
 * Position priority weights for GENERATION.
 * Higher = attribute starts stronger for that position.
 */
const POSITION_GEN_BIAS: Record<Position, Partial<Record<string, number>>> = {
  GK: {
    gkReflexes: 1.35, handling: 1.30, oneOnOnes: 1.25, positioning: 1.15,
    concentration: 1.10, longPassing: 1.05, finishing: 0.4, dribbling: 0.35,
    tackling: 0.4, crossing: 0.4, offTheBall: 0.4, acceleration: 0.75,
  },
  CB: {
    tackling: 1.30, marking: 1.30, heading: 1.25, strength: 1.25,
    jumping: 1.20, positioning: 1.15, anticipation: 1.15, defensiveAwareness: 1.20,
    finishing: 0.55, dribbling: 0.6, crossing: 0.5, gkReflexes: 0.2,
    longShots: 0.5, agility: 0.85,
  },
  RB: {
    tackling: 1.20, crossing: 1.25, marking: 1.10, stamina: 1.30,
    acceleration: 1.20, sprintSpeed: 1.20, workRate: 1.20, positioning: 1.05,
    finishing: 0.65, heading: 0.8, gkReflexes: 0.2, longShots: 0.65,
    strength: 0.95,
  },
  LB: {
    tackling: 1.20, crossing: 1.25, marking: 1.10, stamina: 1.30,
    acceleration: 1.20, sprintSpeed: 1.20, workRate: 1.20, positioning: 1.05,
    finishing: 0.65, heading: 0.8, gkReflexes: 0.2, longShots: 0.65,
    strength: 0.95,
  },
  DM: {
    tackling: 1.20, marking: 1.10, shortPassing: 1.20, positioning: 1.20,
    anticipation: 1.20, defensiveAwareness: 1.20, stamina: 1.15, strength: 1.10,
    finishing: 0.6, dribbling: 0.8, gkReflexes: 0.2, crossing: 0.7,
  },
  CM: {
    shortPassing: 1.30, longPassing: 1.20, ballControl: 1.25, firstTouch: 1.20,
    vision: 1.25, stamina: 1.20, decisions: 1.15, composure: 1.10,
    finishing: 0.8, gkReflexes: 0.2, heading: 0.8, tackling: 0.95,
  },
  AM: {
    shortPassing: 1.25, dribbling: 1.25, ballControl: 1.30, vision: 1.25,
    firstTouch: 1.20, finishing: 1.10, offTheBall: 1.15, agility: 1.10,
    gkReflexes: 0.2, tackling: 0.7, heading: 0.85,
  },
  RW: {
    dribbling: 1.30, acceleration: 1.25, sprintSpeed: 1.25, crossing: 1.20,
    ballControl: 1.15, agility: 1.20, finishing: 1.05, offTheBall: 1.10,
    gkReflexes: 0.2, tackling: 0.7, heading: 0.85, marking: 0.65,
  },
  LW: {
    dribbling: 1.30, acceleration: 1.25, sprintSpeed: 1.25, crossing: 1.20,
    ballControl: 1.15, agility: 1.20, finishing: 1.05, offTheBall: 1.10,
    gkReflexes: 0.2, tackling: 0.7, heading: 0.85, marking: 0.65,
  },
  ST: {
    finishing: 1.35, firstTouch: 1.25, offTheBall: 1.25, composure: 1.20,
    heading: 1.15, acceleration: 1.10, ballControl: 1.10, strength: 1.05,
    gkReflexes: 0.2, tackling: 0.55, marking: 0.5, crossing: 0.75,
    longPassing: 0.75, defensiveAwareness: 0.6,
  },
};

const PERSONALITY_BIAS: Record<Personality, Partial<Record<string, number>>> = {
  Ambitious: { composure: 1.05, decisions: 1.05, workRate: 1.05 },
  Loyal: { concentration: 1.05, leadership: 1.10 },
  Professional: { workRate: 1.15, decisions: 1.10, concentration: 1.10, naturalFitness: 1.10 },
  Competitive: { workRate: 1.10, anticipation: 1.05, tackling: 1.05 },
  Reserved: { composure: 1.05, positioning: 1.05 },
  Charismatic: { leadership: 1.15, composure: 1.05 },
  RiskTaker: { dribbling: 1.08, longShots: 1.08, decisions: 0.95, anticipation: 1.05 },
};

/** Flatten an Attributes object into a keyed record for bias application */
function flattenAttributes(a: Attributes): Record<string, number> {
  return {
    ...a.technical,
    ...a.physical,
    ...a.mental,
  };
}

/** Convert a flat record back into an Attributes object */
function unflattenAttributes(flat: Record<string, number>): Attributes {
  return {
    technical: {
      finishing: flat.finishing,
      longShots: flat.longShots,
      shortPassing: flat.shortPassing,
      longPassing: flat.longPassing,
      crossing: flat.crossing,
      dribbling: flat.dribbling,
      firstTouch: flat.firstTouch,
      ballControl: flat.ballControl,
      tackling: flat.tackling,
      heading: flat.heading,
      marking: flat.marking,
      gkReflexes: flat.gkReflexes,
      handling: flat.handling,
      oneOnOnes: flat.oneOnOnes,
    },
    physical: {
      acceleration: flat.acceleration,
      sprintSpeed: flat.sprintSpeed,
      agility: flat.agility,
      balance: flat.balance,
      strength: flat.strength,
      jumping: flat.jumping,
      stamina: flat.stamina,
      naturalFitness: flat.naturalFitness,
    },
    mental: {
      positioning: flat.positioning,
      vision: flat.vision,
      decisions: flat.decisions,
      composure: flat.composure,
      anticipation: flat.anticipation,
      concentration: flat.concentration,
      workRate: flat.workRate,
      offTheBall: flat.offTheBall,
      defensiveAwareness: flat.defensiveAwareness,
      leadership: flat.leadership,
    },
  };
}

/**
 * Generate a full attribute set for a player.
 * @param base - target overall baseline (1-100)
 * @param position - determines bias
 * @param personality - subtle personality bias
 * @param isYouth - whether the player is 16-19 (adds growth headroom)
 */
export function generateAttributes(
  rng: RNG,
  base: number,
  position: Position,
  personality: Personality,
  isYouth: boolean,
): Attributes {
  const bias = { ...POSITION_GEN_BIAS[position] };
  const pBias = PERSONALITY_BIAS[personality];
  for (const k of Object.keys(pBias)) {
    bias[k] = (bias[k] ?? 1) * (pBias[k] as number);
  }

  const flat: Record<string, number> = {};
  const keys = [
    'finishing', 'longShots', 'shortPassing', 'longPassing', 'crossing',
    'dribbling', 'firstTouch', 'ballControl', 'tackling', 'heading',
    'marking', 'gkReflexes', 'handling', 'oneOnOnes',
    'acceleration', 'sprintSpeed', 'agility', 'balance', 'strength',
    'jumping', 'stamina', 'naturalFitness',
    'positioning', 'vision', 'decisions', 'composure', 'anticipation',
    'concentration', 'workRate', 'offTheBall', 'defensiveAwareness', 'leadership',
  ];

  for (const key of keys) {
    const posBias = bias[key] ?? 1.0;
    // Base value around `base` scaled by positional bias
    let value = base * posBias;
    // Youth players have lower physical ceiling but similar technical spread
    if (isYouth && ['acceleration', 'sprintSpeed', 'strength', 'jumping', 'stamina'].includes(key)) {
      value *= 0.88;
    }
    // Add variance (±8)
    value = normal(rng, value, 7);
    flat[key] = clampAttribute(value);
  }

  return unflattenAttributes(flat);
}

// ============================================================
// POTENTIAL
// ============================================================

/**
 * Generate potential based on base rating and age.
 * Young players can have high ceilings; older players are near their limit.
 */
export function generatePotential(
  rng: RNG,
  currentOverall: number,
  age: number,
  facilityQuality: number, // 1-100 (youth facilities of starting club)
): number {
  if (age >= 30) {
    // At the limit
    return clampAttribute(currentOverall + rng.int(0, 2));
  }
  if (age >= 27) {
    // Slight headroom
    return clampAttribute(currentOverall + rng.int(1, 4));
  }

  // Youth range: base headroom grows with lower age and better facilities
  const youthFactor = clamp((25 - age) / 8, 0, 1); // 1.0 at 17, ~0.14 at 24
  const facilityFactor = facilityQuality / 100;

  // Headroom from 5 to 40, scaled by youthFactor and facilityFactor
  const minHeadroom = Math.round(3 + youthFactor * 8);
  const maxHeadroom = Math.round(10 + youthFactor * 25 + facilityFactor * 15);
  const headroom = rng.int(minHeadroom, Math.max(minHeadroom + 1, maxHeadroom));

  return clampAttribute(currentOverall + headroom);
}

// ============================================================
// PROGRESSION
// ============================================================

/**
 * Apply training progression to a player's attributes.
 * Growth slows as the attribute approaches potential ceiling.
 *
 * @param attributes  current attributes
 * @param potential   hidden potential cap
 * @param focus       which attribute group is being trained
 * @param intensity   training intensity multiplier
 * @param coaching    coaching quality (1-100)
 * @param age         player age
 * @param rng         deterministic RNG
 * @returns           new attributes + list of actual deltas for UI
 */
export function applyTrainingProgression(
  attributes: Attributes,
  potential: number,
  focus: string,
  intensityMult: number,
  coaching: number,
  age: number,
  rng: RNG,
): { attributes: Attributes; deltas: { key: string; from: number; to: number }[] } {
  const flat = flattenAttributes(attributes);
  const deltas: { key: string; from: number; to: number }[] = [];

  const targetKeys = trainingTargetKeys(focus);
  const coachFactor = clamp(coaching / 80, 0.5, 1.5);
  const ageFactor = age <= 21 ? 1.4 : age <= 24 ? 1.1 : age <= 27 ? 0.7 : age <= 30 ? 0.4 : 0.15;

  for (const key of targetKeys) {
    const current = flat[key] ?? 0;

    // Distance to potential ceiling — larger gap = faster growth
    const headroom = Math.max(0, potential - current);
    if (headroom <= 0) continue;

    // Growth rate: lower base attributes grow faster (diminishing returns)
    const baseRate = 0.18 + (100 - current) * 0.006;
    // Potential headroom factor (0..1)
    const headroomFactor = Math.min(1, headroom / 20);
    // Random variance per session
    const variance = 0.6 + rng.next() * 0.8;

    const gain = baseRate * intensityMult * coachFactor * ageFactor * headroomFactor * variance;
    if (gain < 0.02) continue;

    const newValue = clampAttribute(current + gain);
    if (newValue > current) {
      flat[key] = newValue;
      deltas.push({ key, from: current, to: newValue });
    }
  }

  return { attributes: unflattenAttributes(flat), deltas };
}

/**
 * Which attribute keys receive growth from each training focus.
 */
export function trainingTargetKeys(focus: string): string[] {
  switch (focus) {
    case 'Finishing':
      return ['finishing', 'longShots', 'composure', 'offTheBall'];
    case 'Passing':
      return ['shortPassing', 'longPassing', 'vision', 'firstTouch'];
    case 'Dribbling':
      return ['dribbling', 'ballControl', 'agility', 'balance'];
    case 'Defending':
      return ['tackling', 'marking', 'positioning', 'defensiveAwareness'];
    case 'Physical':
      return ['strength', 'stamina', 'acceleration', 'sprintSpeed', 'jumping'];
    case 'Tactical':
      return ['decisions', 'anticipation', 'concentration', 'positioning'];
    case 'Recovery':
      return []; // no growth; reduces fatigue
    case 'PositionSpecific':
      // Placeholder — later we can pass the player position to select keys
      return ['firstTouch', 'ballControl', 'decisions'];
    default:
      return [];
  }
}

/**
 * Age-based decline (called once per season end).
 * Physical attributes decline first, then mental/technical slowly.
 */
export function applyAgeDecline(
  attributes: Attributes,
  age: number,
  rng: RNG,
): { attributes: Attributes; deltas: { key: string; from: number; to: number }[] } {
  const flat = flattenAttributes(attributes);
  const deltas: { key: string; from: number; to: number }[] = [];

  if (age < 30) return { attributes, deltas };

  const physicalKeys = ['acceleration', 'sprintSpeed', 'agility', 'jumping', 'strength', 'stamina', 'balance'];
  const technicalKeys = ['finishing', 'dribbling', 'firstTouch', 'ballControl', 'crossing', 'longShots'];
  const mentalKeys = ['positioning', 'anticipation', 'composure', 'decisions', 'concentration'];

  const agePenalty = age - 29; // 1 at 30, growing
  const physicalDecline = 0.3 * agePenalty;
  const technicalDecline = 0.1 * agePenalty;
  const mentalDecline = -0.05 * agePenalty; // mental can still improve slightly

  for (const key of physicalKeys) {
    const current = flat[key];
    const decline = physicalDecline * (0.6 + rng.next() * 0.8);
    const next = clampAttribute(current - decline);
    if (next < current) {
      flat[key] = next;
      deltas.push({ key, from: current, to: next });
    }
  }
  for (const key of technicalKeys) {
    const current = flat[key];
    const decline = technicalDecline * (0.6 + rng.next() * 0.8);
    const next = clampAttribute(current - decline);
    if (next < current) {
      flat[key] = next;
      deltas.push({ key, from: current, to: next });
    }
  }
  for (const key of mentalKeys) {
    const current = flat[key];
    const change = -mentalDecline * rng.next(); // + or 0
    const next = clampAttribute(current + change);
    if (next !== current) {
      flat[key] = next;
      deltas.push({ key, from: current, to: next });
    }
  }

  return { attributes: unflattenAttributes(flat), deltas };
}

// ============================================================
// STAR RATING (for UI)
// ============================================================

/** Convert overall (1-100) to a 1-5 star display rating */
export function overallToStars(overall: number): number {
  return clamp(Math.round(overall / 20), 1, 5);
}

/** Short classification label for scouting / news */
export function abilityLabel(overall: number): string {
  if (overall >= 88) return 'World Class';
  if (overall >= 82) return 'Elite';
  if (overall >= 76) return 'Excellent';
  if (overall >= 70) return 'Good';
  if (overall >= 64) return 'Solid';
  if (overall >= 58) return 'Developing';
  return 'Raw';
}
