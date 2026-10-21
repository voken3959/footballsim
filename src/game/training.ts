// ============================================================
// TRAINING SYSTEM
// ============================================================

import type { Player, TrainingSession, TrainingFocus, TrainingIntensity } from './types';
import { RNG, clamp } from './rng';
import { applyTrainingProgression, applyAgeDecline } from './attributes';
import { computeOverall } from './positions';

// ------------------------------------------------------------
// INTENSITY MODIFIERS
// ------------------------------------------------------------

const INTENSITY_MULT: Record<TrainingIntensity, number> = {
  Rest: 0,
  Light: 0.5,
  Normal: 1.0,
  Intensive: 1.6,
};

const INTENSITY_FATIGUE: Record<TrainingIntensity, number> = {
  Rest: -30,
  Light: -10,
  Normal: 2,
  Intensive: 12,
};

const INTENSITY_INJURY: Record<TrainingIntensity, number> = {
  Rest: 0,
  Light: 0.005,
  Normal: 0.02,
  Intensive: 0.06,
};

// ------------------------------------------------------------
// PREVIEW
// ------------------------------------------------------------

export function previewTraining(
  player: Player,
  focus: TrainingFocus,
  intensity: TrainingIntensity,
  coachingQuality: number,
): TrainingSession {
  const gains = estimateGains(player, focus, intensity, coachingQuality);
  const fatigueCost = INTENSITY_FATIGUE[intensity];
  const injuryRisk = INTENSITY_INJURY[intensity] * injuryRiskMultiplier(player);

  return {
    focus,
    intensity,
    attributeGains: gains,
    fatigueCost,
    injuryRisk,
    description: describeSession(focus, intensity, gains, fatigueCost, injuryRisk),
  };
}

function estimateGains(
  player: Player,
  focus: TrainingFocus,
  intensity: TrainingIntensity,
  coaching: number,
): TrainingSession['attributeGains'] {
  const mult = INTENSITY_MULT[intensity];
  if (mult === 0) return {};

  const ageFactor = player.age <= 21 ? 1.4 : player.age <= 24 ? 1.1 : player.age <= 27 ? 0.7 : player.age <= 30 ? 0.4 : 0.15;
  const coachFactor = clamp(coaching / 80, 0.5, 1.5);
  const headroom = Math.max(0, player.potential - player.overall);
  const headroomFactor = Math.min(1, headroom / 20);

  const gains: TrainingSession['attributeGains'] = {};

  for (const [attr, weight] of Object.entries(focusWeights(focus, player.primaryPosition))) {
    if (weight <= 0) continue;
    const current = getAttributeValue(player, attr);
    if (current >= 99) continue;
    const baseRate = 0.18 + (100 - current) * 0.006;
    const expected = baseRate * mult * coachFactor * ageFactor * headroomFactor * weight;
    if (expected > 0.01) {
      gains[attr as keyof TrainingSession['attributeGains']] = Math.round(expected * 100) / 100;
    }
  }

  return gains;
}

// ------------------------------------------------------------
// APPLY
// ------------------------------------------------------------

export function applyTraining(
  player: Player,
  session: TrainingSession,
  coachingQuality: number,
  rng: RNG,
): { player: Player; deltas: { key: string; from: number; to: number }[]; injured: boolean } {
  const riskMult = injuryRiskMultiplier(player);
  const finalRisk = clamp(INTENSITY_INJURY[session.intensity] * riskMult, 0, 0.2);
  const injured = rng.chance(finalRisk);

  let attributes = player.attributes;
  let deltas: { key: string; from: number; to: number }[] = [];

  if (!injured && session.intensity !== 'Rest') {
    const result = applyTrainingProgression(
      player.attributes,
      player.potential,
      session.focus,
      INTENSITY_MULT[session.intensity],
      coachingQuality,
      player.age,
      rng,
    );
    attributes = result.attributes;
    deltas = result.deltas;
  }

  const fatigueDelta = INTENSITY_FATIGUE[session.intensity];
  const fitnessDelta = session.intensity === 'Rest' ? 20
    : session.intensity === 'Light' ? 10
    : session.intensity === 'Normal' ? 1
    : -10;
  const sharpnessDelta = session.intensity === 'Rest' ? -2
    : session.intensity === 'Light' ? 1
    : session.intensity === 'Normal' ? 4
    : 7;

  const newFatigue = clamp(player.fatigue + fatigueDelta, 0, 100);
  const newFitness = clamp(player.fitness + fitnessDelta, 0, 100);
  const newSharpness = clamp(player.sharpness + sharpnessDelta, 0, 100);
  const newOverall = computeOverall(attributes, player.primaryPosition);

  let injury = player.injury;
  if (injured && !injury) {
    injury = rollInjury(rng, session.intensity);
  }

  const updated: Player = {
    ...player,
    attributes,
    overall: newOverall,
    fitness: Math.round(newFitness),
    fatigue: Math.round(newFatigue),
    sharpness: Math.round(newSharpness),
    injury,
    trainingFocus: session.focus,
  };

  return { player: updated, deltas, injured };
}

// ------------------------------------------------------------
// INJURY SYSTEM
// ------------------------------------------------------------

function injuryRiskMultiplier(player: Player): number {
  const fatigueFactor = 1 + (player.fatigue / 100) * 1.5;
  const fitnessFactor = 1 + (100 - player.attributes.physical.naturalFitness) * 0.01;
  const priorInjury = player.injury ? 1.3 : 1.0;
  return fatigueFactor * fitnessFactor * priorInjury;
}

function rollInjury(rng: RNG, intensity: TrainingIntensity): Player['injury'] {
  const severityRoll = rng.next();
  const baseSeverity = intensity === 'Intensive' ? 0.15 : 0.5;

  let type: string;
  let severity: 'Minor' | 'Moderate' | 'Severe';
  let daysRemaining: number;

  if (severityRoll < baseSeverity) {
    const types = ['Minor knock', 'Muscle tightness', 'Dead leg', 'Ankle sprain'];
    type = rng.pick(types);
    severity = 'Minor';
    daysRemaining = rng.int(2, 7);
  } else if (severityRoll < baseSeverity + 0.55) {
    const types = ['Hamstring strain', 'Groin strain', 'Calf strain', 'Ankle injury'];
    type = rng.pick(types);
    severity = 'Moderate';
    daysRemaining = rng.int(14, 35);
  } else {
    const types = ['Knee ligament injury', 'Broken foot', 'Fractured metatarsal', 'Hip injury'];
    type = rng.pick(types);
    severity = 'Severe';
    daysRemaining = rng.int(60, 180);
  }

  return {
    type,
    severity,
    daysRemaining,
    occurredDate: new Date().toISOString().slice(0, 10),
  };
}

// ------------------------------------------------------------
// DAILY TICK
// ------------------------------------------------------------

export function advancePlayerDay(player: Player, rng: RNG): Player {
  let injury = player.injury;
  let fitness = player.fitness;
  let fatigue = player.fatigue;
  let sharpness = player.sharpness;

  if (injury) {
    const newDays = injury.daysRemaining - 1;
    if (newDays <= 0) {
      injury = null;
      sharpness = clamp(sharpness - 15, 0, 100);
      fitness = clamp(fitness - 10, 0, 100);
    } else {
      injury = { ...injury, daysRemaining: newDays };
      fatigue = clamp(fatigue - 3, 0, 100);
      fitness = clamp(fitness - 0.5, 0, 100);
    }
  } else {
    // Natural daily recovery
    fatigue = clamp(fatigue - 6, 0, 100);
    fitness = clamp(fitness + 5, 0, 100);
    sharpness = clamp(sharpness - 0.5, 0, 100);
  }

  return {
    ...player,
    injury,
    fitness: Math.round(fitness),
    fatigue: Math.round(fatigue),
    sharpness: Math.round(sharpness),
  };
}

// ------------------------------------------------------------
// SEASON-END AGEING
// ------------------------------------------------------------

export function applySeasonEndAgeing(
  player: Player,
  newAge: number,
  rng: RNG,
): { player: Player; deltas: { key: string; from: number; to: number }[] } {
  const { attributes, deltas } = applyAgeDecline(player.attributes, newAge, rng);
  const newOverall = computeOverall(attributes, player.primaryPosition);

  return {
    player: {
      ...player,
      age: newAge,
      attributes,
      overall: newOverall,
    },
    deltas,
  };
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function focusWeights(
  focus: TrainingFocus,
  position: Player['primaryPosition'],
): Record<string, number> {
  switch (focus) {
    case 'Finishing':
      return { finishing: 1, longShots: 0.7, composure: 0.5, offTheBall: 0.6 };
    case 'Passing':
      return { shortPassing: 1, longPassing: 0.8, vision: 0.7, firstTouch: 0.6 };
    case 'Dribbling':
      return { dribbling: 1, ballControl: 0.8, agility: 0.6, balance: 0.5 };
    case 'Defending':
      return { tackling: 1, marking: 0.9, positioning: 0.6, defensiveAwareness: 0.8 };
    case 'Physical':
      return { strength: 0.8, stamina: 0.9, acceleration: 0.6, sprintSpeed: 0.6, jumping: 0.5 };
    case 'Tactical':
      return { decisions: 0.9, anticipation: 0.8, concentration: 0.6, positioning: 0.7 };
    case 'PositionSpecific': {
      const group = positionGroup(position);
      if (group === 'GK') return { gkReflexes: 1, handling: 0.9, oneOnOnes: 0.7, positioning: 0.6 };
      if (group === 'DEF') return { tackling: 0.8, marking: 0.9, heading: 0.7, defensiveAwareness: 0.8 };
      if (group === 'MID') return { shortPassing: 0.9, vision: 0.8, ballControl: 0.7, decisions: 0.6 };
      return { finishing: 0.9, offTheBall: 0.9, dribbling: 0.6, composure: 0.6 };
    }
    case 'Recovery':
      return {};
    default:
      return {};
  }
}

function positionGroup(pos: Player['primaryPosition']): 'GK' | 'DEF' | 'MID' | 'ATT' {
  if (pos === 'GK') return 'GK';
  if (pos === 'RB' || pos === 'LB' || pos === 'CB') return 'DEF';
  if (pos === 'DM' || pos === 'CM' || pos === 'AM') return 'MID';
  return 'ATT';
}

function getAttributeValue(player: Player, key: string): number {
  const t = player.attributes.technical as any;
  const p = player.attributes.physical as any;
  const m = player.attributes.mental as any;
  return t[key] ?? p[key] ?? m[key] ?? 50;
}

function describeSession(
  focus: TrainingFocus,
  intensity: TrainingIntensity,
  gains: TrainingSession['attributeGains'],
  fatigueCost: number,
  injuryRisk: number,
): string {
  const parts: string[] = [];
  parts.push(`${intensity} ${focus.toLowerCase()} session`);
  const entries = Object.entries(gains).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  if (entries.length > 0) {
    const top = entries.slice(0, 3).map(([k, v]) => `${formatAttr(k)} +${(v ?? 0).toFixed(2)}`);
    parts.push(`Expected gains: ${top.join(', ')}`);
  }
  parts.push(fatigueCost > 0 ? `Fatigue +${fatigueCost}` : `Fatigue ${fatigueCost}`);
  parts.push(`Injury risk ${(injuryRisk * 100).toFixed(1)}%`);
  return parts.join(' · ');
}

function formatAttr(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
}
