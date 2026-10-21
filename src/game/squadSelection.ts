// ============================================================
// SQUAD SELECTION — shared by match engine and UI preview
// ============================================================

import type { Club, Player, Position } from './types';
import { RNG } from './rng';
import { positionFamiliarity } from './positions';

export type UserSelectionStatus = 'starting' | 'bench' | 'left_out' | 'injured';

export interface SelectionResult {
  starters: Player[];
  bench: Player[];
  slots: Map<Player, Position>;
  userStatus: UserSelectionStatus;
  userSlot: Position | null;
  reasons: string[];
}

export interface SelectionContext {
  club: Club;
  squad: Player[];
  userPlayerId: string;
  matchImportance: number; // 0..1
  rng: RNG;
}

export function selectMatchdaySquad(ctx: SelectionContext): SelectionResult {
  const { club, squad, userPlayerId, matchImportance, rng } = ctx;
  const user = squad.find((p) => p.id === userPlayerId);
  const roles = formationRoles(club.formation);

  const injuredUser = user?.injury != null;

  const available = squad.filter((p) => !p.injury);
  const scored = available.map((p) => ({
    player: p,
    score: scoreForSelection(p, matchImportance, userPlayerId, rng),
  }));

  const starters: Player[] = [];
  const slots = new Map<Player, Position>();
  const used = new Set<string>();

  for (const role of roles) {
    const candidates = scored
      .filter((s) => !used.has(s.player.id))
      .map((s) => {
        const fam = positionFamiliarity(
          s.player.primaryPosition,
          s.player.secondaryPosition,
          role.pos,
        );
        return { player: s.player, adjusted: s.score * fam };
      })
      .sort((a, b) => b.adjusted - a.adjusted);

    if (candidates.length === 0) continue;
    const pick = candidates[0];
    starters.push(pick.player);
    slots.set(pick.player, role.pos);
    used.add(pick.player.id);
  }

  // Bench: best remaining, one per position group to keep the bench balanced
  const benchCandidates = scored
    .filter((s) => !used.has(s.player.id))
    .sort((a, b) => b.score - a.score);
  const bench: Player[] = [];
  const seenGroups = new Set<string>();
  for (const c of benchCandidates) {
    const group = groupOf(c.player.primaryPosition);
    if (bench.length < 7 && (!seenGroups.has(group) || bench.length >= 4)) {
      bench.push(c.player);
      seenGroups.add(group);
    }
    if (bench.length >= 7) break;
  }
  // Fill remaining bench slots if still under 7
  for (const c of benchCandidates) {
    if (bench.length >= 7) break;
    if (!bench.includes(c.player)) bench.push(c.player);
  }

  // Determine user status
  let userStatus: UserSelectionStatus;
  let userSlot: Position | null = null;
  if (injuredUser) {
    userStatus = 'injured';
  } else if (user && starters.includes(user)) {
    userStatus = 'starting';
    userSlot = slots.get(user) ?? user.primaryPosition;
  } else if (user && bench.includes(user)) {
    userStatus = 'bench';
  } else {
    userStatus = 'left_out';
  }

  const reasons = explainSelection(
    user ?? null,
    userStatus,
    starters,
    slots,
    matchImportance,
  );

  return { starters, bench, slots, userStatus, userSlot, reasons };
}

// ------------------------------------------------------------
// SCORING
// ------------------------------------------------------------

function scoreForSelection(
  p: Player,
  matchImportance: number,
  userPlayerId: string,
  rng: RNG,
): number {
  let score = p.overall;

  // Fitness: more important in big matches
  const fitnessWeight = 0.4 + matchImportance * 0.3;
  score *= 0.4 + (p.fitness / 100) * fitnessWeight;

  // Form: -5..+5 → ±15%
  score *= 1 + (p.form / 5) * 0.15;

  // Sharpness: match-ready gets a boost
  score *= 0.8 + (p.sharpness / 100) * 0.2;

  // Very low morale slightly reduces selection odds
  if (p.morale < 30) score *= 0.88;

  // Squad role preference — Key players and starters get preferred
  const roleBonus: Record<Player['contract']['squadRole'], number> = {
    Key: 1.15,
    Starter: 1.08,
    Important: 1.06,
    Rotation: 1.0,
    Fringe: 0.92,
    Academy: 0.85,
  };
  score *= roleBonus[p.contract.squadRole] ?? 1.0;

  // Slight user bias in big matches only — enough to reduce frustration,
  // not enough to guarantee selection
  if (p.id === userPlayerId && matchImportance > 0.65) {
    score *= 1.05;
  }

  // Randomness — managers have hunches
  score *= 0.95 + rng.next() * 0.1;

  return score;
}

// ------------------------------------------------------------
// EXPLANATION
// ------------------------------------------------------------

function explainSelection(
  user: Player | null,
  status: UserSelectionStatus,
  starters: Player[],
  slots: Map<Player, Position>,
  matchImportance: number,
): string[] {
  if (!user) return ['You are not registered with this club.'];
  const reasons: string[] = [];

  if (status === 'injured') {
    reasons.push(`Injured — ${user.injury?.type ?? 'unavailable'}.`);
    return reasons;
  }

  if (status === 'starting') {
    reasons.push(`Selected to start at ${user.primaryPosition}.`);
    if (user.form > 1.5) reasons.push('Excellent recent form.');
    if (user.fitness < 60) reasons.push('Playing despite low fitness.');
    if (matchImportance > 0.8) reasons.push('Big match — manager trusts you.');
    return reasons;
  }

  if (status === 'bench') {
    reasons.push('Named as a substitute.');
    const comp = starters
      .filter((p) => (slots.get(p) ?? p.primaryPosition) === user.primaryPosition)
      .map((p) => p.displayName);
    if (comp.length > 0) reasons.push(`Competing with ${comp.join(', ')}.`);
    if (user.fitness < 70) reasons.push('Still working back to full fitness.');
    if (user.form < -1) reasons.push('Recent form has been poor.');
    return reasons;
  }

  // left_out
  reasons.push('Not selected for the matchday squad.');
  const comp = starters
    .filter((p) => (slots.get(p) ?? p.primaryPosition) === user.primaryPosition)
    .map((p) => p.displayName);
  if (comp.length > 0) reasons.push(`Currently behind ${comp.join(', ')} in the pecking order.`);
  if (user.contract.squadRole === 'Academy' || user.contract.squadRole === 'Fringe') {
    reasons.push('Still establishing yourself at the club.');
  }
  return reasons;
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function groupOf(pos: Position): 'GK' | 'DEF' | 'MID' | 'ATT' {
  if (pos === 'GK') return 'GK';
  if (pos === 'RB' || pos === 'LB' || pos === 'CB') return 'DEF';
  if (pos === 'DM' || pos === 'CM' || pos === 'AM') return 'MID';
  return 'ATT';
}

export function formationRoles(formation: string): { pos: Position; count: number }[] {
  switch (formation) {
    case '4-3-3':
      return [
        { pos: 'GK', count: 1 },
        { pos: 'RB', count: 1 }, { pos: 'CB', count: 2 }, { pos: 'LB', count: 1 },
        { pos: 'DM', count: 1 }, { pos: 'CM', count: 2 },
        { pos: 'RW', count: 1 }, { pos: 'ST', count: 1 }, { pos: 'LW', count: 1 },
      ];
    case '4-2-3-1':
      return [
        { pos: 'GK', count: 1 },
        { pos: 'RB', count: 1 }, { pos: 'CB', count: 2 }, { pos: 'LB', count: 1 },
        { pos: 'DM', count: 2 },
        { pos: 'RW', count: 1 }, { pos: 'AM', count: 1 }, { pos: 'LW', count: 1 },
        { pos: 'ST', count: 1 },
      ];
    case '4-4-2':
      return [
        { pos: 'GK', count: 1 },
        { pos: 'RB', count: 1 }, { pos: 'CB', count: 2 }, { pos: 'LB', count: 1 },
        { pos: 'RW', count: 1 }, { pos: 'CM', count: 2 }, { pos: 'LW', count: 1 },
        { pos: 'ST', count: 2 },
      ];
    case '3-4-2-1':
      return [
        { pos: 'GK', count: 1 },
        { pos: 'CB', count: 3 },
        { pos: 'RB', count: 1 }, { pos: 'CM', count: 2 }, { pos: 'LB', count: 1 },
        { pos: 'AM', count: 2 },
        { pos: 'ST', count: 1 },
      ];
    case '5-3-2':
      return [
        { pos: 'GK', count: 1 },
        { pos: 'RB', count: 1 }, { pos: 'CB', count: 3 }, { pos: 'LB', count: 1 },
        { pos: 'DM', count: 1 }, { pos: 'CM', count: 2 },
        { pos: 'ST', count: 2 },
      ];
    case '5-4-1':
      return [
        { pos: 'GK', count: 1 },
        { pos: 'RB', count: 1 }, { pos: 'CB', count: 3 }, { pos: 'LB', count: 1 },
        { pos: 'RW', count: 1 }, { pos: 'CM', count: 2 }, { pos: 'LW', count: 1 },
        { pos: 'ST', count: 1 },
      ];
    default:
      return formationRoles('4-4-2');
  }
}
