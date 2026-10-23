// ============================================================
// MATCH ENGINE — realistic event-driven simulation
// ============================================================

import type {
  Club, Player, MatchEvent, MatchReport, PlayerMatchStats,
  TeamMatchStats, Position, TacticStyle,
} from './types';
import { RNG, clamp, round } from './rng';
import { positionFamiliarity } from './positions';
import { selectMatchdaySquad } from './squadSelection';

// ------------------------------------------------------------
// PUBLIC API
// ------------------------------------------------------------

export interface MatchSimOptions {
  homeClub: Club;
  awayClub: Club;
  homeSquad: Player[];
  awaySquad: Player[];
  rng: RNG;
  competition: string;
  fixtureId: string;
  playedDate: string;
  userPlayerId?: string;
}

export interface MatchSimResult {
  report: MatchReport;
  updatedPlayers: Player[];
}

// ------------------------------------------------------------
// TACTICAL MODIFIERS
// ------------------------------------------------------------

interface TacticalProfile {
  possessionBias: number;
  directness: number;
  pressIntensity: number;
  defensiveLine: number;
}

function tacticProfile(tactic: TacticStyle): TacticalProfile {
  switch (tactic) {
    case 'Possession':
      return { possessionBias: 0.8, directness: 0.25, pressIntensity: 0.55, defensiveLine: 0.6 };
    case 'Direct':
      return { possessionBias: 0.2, directness: 0.85, pressIntensity: 0.45, defensiveLine: 0.55 };
    case 'Counter':
      return { possessionBias: 0.25, directness: 0.7, pressIntensity: 0.3, defensiveLine: 0.3 };
    case 'HighPress':
      return { possessionBias: 0.5, directness: 0.4, pressIntensity: 0.9, defensiveLine: 0.85 };
    case 'LowBlock':
      return { possessionBias: 0.2, directness: 0.55, pressIntensity: 0.3, defensiveLine: 0.15 };
    case 'Balanced':
    default:
      return { possessionBias: 0.5, directness: 0.5, pressIntensity: 0.55, defensiveLine: 0.5 };
  }
}

// ------------------------------------------------------------
// STATE
// ------------------------------------------------------------

type Zone = 'defence' | 'midfield' | 'attack';
type Phase = 'buildUp' | 'progression' | 'attack' | 'transition' | 'counter';

interface TeamState {
  club: Club;
  starters: Player[];
  bench: Player[];
  slots: Map<Player, Position>;
  tactic: TacticalProfile;
  stats: TeamMatchStats;
  playerStats: Map<string, PlayerMatchStats>;
  goals: number;
  isHome: boolean;
  subsUsed: number;
  redCards: number;
}

interface MatchState {
  minute: number;
  half: 1 | 2;
  home: TeamState;
  away: TeamState;
  possession: 'home' | 'away';
  zone: Record<'home' | 'away', Zone>;
  phase: Phase;
  counterTeam: 'home' | 'away' | null;
  events: MatchEvent[];
  // Assist tracking
  lastPasser: { clubId: string; player: Player; minute: number } | null;
  rng: RNG;
}

// ------------------------------------------------------------
// ENTRY
// ------------------------------------------------------------

export function simulateMatch(opts: MatchSimOptions): MatchSimResult {
  const { homeClub, awayClub, homeSquad, awaySquad, rng, competition, fixtureId, playedDate, userPlayerId } = opts;

  const homeSel = selectMatchdaySquad({
    club: homeClub, squad: homeSquad,
    userPlayerId: userPlayerId ?? '__none__',
    matchImportance: 0.6, rng,
  });
  const awaySel = selectMatchdaySquad({
    club: awayClub, squad: awaySquad,
    userPlayerId: userPlayerId ?? '__none__',
    matchImportance: 0.6, rng,
  });

  const home = createTeamState(homeClub, homeSel, true);
  const away = createTeamState(awayClub, awaySel, false);

  const state: MatchState = {
    minute: 0,
    half: 1,
    home,
    away,
    possession: 'home',
    zone: { home: 'midfield', away: 'midfield' },
    phase: 'buildUp',
    counterTeam: null,
    events: [],
    lastPasser: null,
    rng,
  };

  pushEvent(state, 0, 'KickOff', homeClub.id, null, null, null, null, 'Kick-off.');

  runHalf(state, 1, 45 + rng.int(1, 4));
  pushEvent(state, state.minute, 'HalfTime', homeClub.id, null, null, null, null,
    `Half-time: ${homeClub.shortName} ${home.goals}-${away.goals} ${awayClub.shortName}.`);

  applyHalfTimeAdjustments(home);
  applyHalfTimeAdjustments(away);
  adjustTacticsForScoreline(home, away);
  adjustTacticsForScoreline(away, home);

  state.half = 2;
  state.possession = 'away';
  state.zone = { home: 'midfield', away: 'midfield' };
  state.phase = 'buildUp';
  state.lastPasser = null;

  runHalf(state, 46, 90 + rng.int(2, 6));
  pushEvent(state, state.minute, 'FullTime', homeClub.id, null, null, null, null,
    `Full-time: ${homeClub.shortName} ${home.goals}-${away.goals} ${awayClub.shortName}.`);

  const report = buildReport(state, fixtureId, playedDate, competition);
  const updatedPlayers = [...home.starters, ...home.bench, ...away.starters, ...away.bench]
    .map((p) => applyPostMatchCondition(p, state));

  return { report, updatedPlayers };
}

// ------------------------------------------------------------
// HALF SIMULATION
// ------------------------------------------------------------

function runHalf(state: MatchState, startMinute: number, endMinute: number): void {
  state.minute = startMinute;

  while (state.minute <= endMinute) {
    advanceMinute(state, endMinute);
    if (state.minute > endMinute) break;

    // Real football has roughly 3-5 "meaningful" actions per minute (passes, dribbles, shots)
    // Combined with the 90 minute clock, this creates the natural pacing.
    const actions = state.rng.int(3, 6);
    for (let i = 0; i < actions; i++) {
      simulateAction(state);
      if (state.home.redCards >= 5 || state.away.redCards >= 5) return;
    }
  }
}

function advanceMinute(state: MatchState, limit: number): void {
  state.minute++;
  if (state.minute > limit) return;

  if (state.rng.chance(0.018)) {
    const team = state.rng.chance(0.5) ? state.home : state.away;
    const victim = state.rng.pick(team.starters);
    if (victim && !victim.injury) {
      pushEvent(state, state.minute, 'Injury', team.club.id, victim.id, victim.displayName,
        null, null, `${victim.displayName} is down and needs treatment.`);
      trySubstitute(state, team, victim, 'injury');
    }
  }

  if (state.minute >= 55 && state.minute <= 85 && state.rng.chance(0.07)) {
    tryTacticalSub(state);
  }
}

// ------------------------------------------------------------
// CORE ACTION RESOLUTION
// ------------------------------------------------------------

function simulateAction(state: MatchState): void {
  const attacking = state.possession === 'home' ? state.home : state.away;
  const defending = state.possession === 'home' ? state.away : state.home;
  const attackingKey = state.possession;

  if (state.counterTeam === attackingKey && state.phase === 'counter') {
    resolveCounter(state, attacking, defending, attackingKey);
    return;
  }

  const zone = state.zone[attackingKey];
  const carrier = pickCarrier(state, attacking, zone);
  if (!carrier) return;

  const action = chooseAction(state, attacking, carrier, zone);

  switch (action) {
    case 'shoot':
      resolveShot(state, attacking, defending, carrier, attackingKey);
      break;
    case 'throughBall':
      resolveThroughBall(state, attacking, defending, carrier, attackingKey);
      break;
    case 'pass':
      resolvePass(state, attacking, defending, carrier, attackingKey);
      break;
    case 'cross':
      resolveCross(state, attacking, defending, carrier, attackingKey);
      break;
    case 'dribble':
      resolveDribble(state, attacking, defending, carrier, attackingKey);
      break;
    case 'clear':
      pushEvent(state, state.minute, 'Clearance', defending.club.id,
        null, null, null, null, `${defending.club.shortName} clears their lines.`);
      flipPossession(state);
      break;
  }
}

// ------------------------------------------------------------
// ACTION CHOICE
// ------------------------------------------------------------

type ActionType = 'shoot' | 'throughBall' | 'pass' | 'cross' | 'dribble' | 'clear';

function chooseAction(
  state: MatchState,
  attacking: TeamState,
  carrier: Player,
  zone: Zone,
): ActionType {
  const tactic = attacking.tactic;
  const fat = fatigueModifier(carrier);

  const weights: Record<ActionType, number> = {
    shoot: 0, throughBall: 0, pass: 0, cross: 0, dribble: 0, clear: 0,
  };

  if (zone === 'defence') {
    weights.clear = 0.15;
    weights.pass = 0.75 * (1 - tactic.directness * 0.3);
    weights.throughBall = 0.05 + tactic.directness * 0.15;
    weights.dribble = 0.05 * fat;
  } else if (zone === 'midfield') {
    weights.pass = 0.55;
    weights.throughBall = 0.10 + tactic.directness * 0.15;
    weights.dribble = 0.15 * fat;
    weights.shoot = 0.03 + shotBiasFromAttributes(carrier) * 0.02;
    weights.cross = 0.10;
  } else {
    weights.shoot = 0.35 + shotBiasFromAttributes(carrier) * 0.15;
    weights.cross = 0.20;
    weights.pass = 0.20;
    weights.throughBall = 0.10 * tactic.directness;
    weights.dribble = 0.15 * fat;
  }

  if (tactic.possessionBias > 0.6) {
    weights.shoot *= 0.9;
    weights.pass *= 1.15;
  }

  return pickWeighted(state.rng, weights);
}

function shotBiasFromAttributes(p: Player): number {
  const finishing = p.attributes.technical.finishing;
  const longShots = p.attributes.technical.longShots;
  return (finishing * 0.7 + longShots * 0.3 - 50) / 50;
}

function pickWeighted(rng: RNG, weights: Record<ActionType, number>): ActionType {
  const entries = Object.entries(weights) as [ActionType, number][];
  const filtered = entries.filter(([, w]) => w > 0);
  if (filtered.length === 0) return 'pass';
  const total = filtered.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [action, w] of filtered) {
    r -= w;
    if (r <= 0) return action;
  }
  return filtered[filtered.length - 1][0];
}

// ------------------------------------------------------------
// PASS & ASSIST TRACKING
// ------------------------------------------------------------

function resolvePass(
  state: MatchState,
  attacking: TeamState,
  defending: TeamState,
  carrier: Player,
  attackingKey: 'home' | 'away',
): void {
  const teammates = attacking.starters.filter((p) => p.id !== carrier.id && !p.injury);
  if (teammates.length === 0) return;

  const recipient = weightedPick(
    state.rng,
    teammates.map((t) => ({ player: t, weight: advanceWeight(t, attacking.slots) })),
  );

  const fatigue = fatigueModifier(carrier);
  const passSkill = (carrier.attributes.technical.shortPassing
    + carrier.attributes.technical.longPassing * 0.3
    + carrier.attributes.mental.vision * 0.4) * fatigue;
  const pressure = computePressure(state, defending, carrier);

  let success = 0.75 + (passSkill - 60) * 0.006 - pressure * 0.28;
  success = clamp(success, 0.3, 0.96);

  attacking.stats.passes++;
  const carrierStats = getPlayerStats(attacking, carrier);
  if (carrierStats) carrierStats.passesAttempted++;

  if (!state.rng.chance(success)) {
    state.lastPasser = null;
    const interceptor = pickInterceptor(state, defending);
    if (interceptor) {
      const intStats = getPlayerStats(defending, interceptor);
      if (intStats) intStats.interceptions++;
      pushEvent(state, state.minute, 'Interception', defending.club.id,
        interceptor.id, interceptor.displayName, carrier.id, carrier.displayName,
        `${interceptor.displayName} intercepts ${carrier.displayName}'s pass.`);
    }
    flipPossession(state);
    return;
  }

  if (carrierStats) carrierStats.passesCompleted++;
  attacking.stats.passesCompleted++;

  // Assist tracking
  state.lastPasser = { clubId: attacking.club.id, player: carrier, minute: state.minute };

  state.zone[attackingKey] = advanceZone(state.zone[attackingKey]);
  state.phase = state.zone[attackingKey] === 'attack' ? 'attack' : 'progression';
}

// ------------------------------------------------------------
// THROUGH BALL
// ------------------------------------------------------------

function resolveThroughBall(
  state: MatchState,
  attacking: TeamState,
  defending: TeamState,
  carrier: Player,
  attackingKey: 'home' | 'away',
): void {
  const attackers = attacking.starters.filter(
    (p) => p.id !== carrier.id && !p.injury && isAttacker(p, attacking.slots),
  );
  if (attackers.length === 0) {
    resolvePass(state, attacking, defending, carrier, attackingKey);
    return;
  }

  const target = state.rng.pick(attackers);
  const fatigue = fatigueModifier(carrier);

  const vision = carrier.attributes.mental.vision * fatigue;
  const passing = carrier.attributes.technical.longPassing * fatigue;
  const pressure = computePressure(state, defending, carrier);

  let success = 0.55 + (vision + passing - 110) * 0.005 - pressure * 0.30;
  success = clamp(success, 0.15, 0.85);

  if (!state.rng.chance(success)) {
    state.lastPasser = null;
    const interceptor = pickInterceptor(state, defending);
    if (interceptor) {
      const intStats = getPlayerStats(defending, interceptor);
      if (intStats) intStats.interceptions++;
      pushEvent(state, state.minute, 'Interception', defending.club.id,
        interceptor.id, interceptor.displayName, carrier.id, carrier.displayName,
        `${interceptor.displayName} reads ${carrier.displayName}'s through ball.`);
    }
    flipPossession(state);
    return;
  }

  const offsideChance = computeOffsideChance(state, attacking, defending, target);
  if (state.rng.chance(offsideChance)) {
    pushEvent(state, state.minute, 'Offside', attacking.club.id,
      target.id, target.displayName, null, null,
      `${target.displayName} is caught offside.`);
    state.lastPasser = null;
    flipPossession(state);
    return;
  }

  const targetStats = getPlayerStats(attacking, target);
  if (targetStats) targetStats.keyPasses++;

  // Assist tracking
  state.lastPasser = { clubId: attacking.club.id, player: carrier, minute: state.minute };

  state.zone[attackingKey] = 'attack';
  state.phase = 'attack';

  resolveShot(state, attacking, defending, target, attackingKey);
}

// ------------------------------------------------------------
// CROSS
// ------------------------------------------------------------

function resolveCross(
  state: MatchState,
  attacking: TeamState,
  defending: TeamState,
  carrier: Player,
  attackingKey: 'home' | 'away',
): void {
  const headers = attacking.starters.filter(
    (p) => p.id !== carrier.id && !p.injury && p.attributes.technical.heading > 50,
  );
  if (headers.length === 0) {
    resolvePass(state, attacking, defending, carrier, attackingKey);
    return;
  }

  const target = state.rng.pick(headers);
  const fatigue = fatigueModifier(carrier);
  const crossing = carrier.attributes.technical.crossing * fatigue;
  const pressure = computePressure(state, defending, carrier);

  let success = 0.55 + (crossing - 60) * 0.007 - pressure * 0.25;
  success = clamp(success, 0.2, 0.9);

  if (!state.rng.chance(success)) {
    state.lastPasser = null;
    const interceptor = pickInterceptor(state, defending);
    if (interceptor) {
      const intStats = getPlayerStats(defending, interceptor);
      if (intStats) intStats.clearances++;
      pushEvent(state, state.minute, 'Clearance', defending.club.id,
        interceptor.id, interceptor.displayName, carrier.id, carrier.displayName,
        `${interceptor.displayName} heads clear ${carrier.displayName}'s cross.`);
    }
    flipPossession(state);
    return;
  }

  // Assist tracking
  state.lastPasser = { clubId: attacking.club.id, player: carrier, minute: state.minute };

  state.zone[attackingKey] = 'attack';
  state.phase = 'attack';

  resolveShot(state, attacking, defending, target, attackingKey, { fromCross: true });
}

// ------------------------------------------------------------
// DRIBBLE
// ------------------------------------------------------------

function resolveDribble(
  state: MatchState,
  attacking: TeamState,
  defending: TeamState,
  carrier: Player,
  attackingKey: 'home' | 'away',
): void {
  const carrierStats = getPlayerStats(attacking, carrier);
  if (carrierStats) carrierStats.dribblesAttempted++;

  const defender = pickDefender(state, defending, carrier);
  if (!defender) {
    if (carrierStats) carrierStats.dribblesCompleted++;
    state.zone[attackingKey] = advanceZone(state.zone[attackingKey]);
    state.lastPasser = null; // Dribbling breaks an assist chain
    return;
  }

  const fatigue = fatigueModifier(carrier);
  const defFatigue = fatigueModifier(defender);

  const attackerSkill = (carrier.attributes.technical.dribbling * 1.2
    + carrier.attributes.physical.agility * 0.8
    + carrier.attributes.physical.acceleration * 0.6
    + carrier.attributes.mental.composure * 0.4) * fatigue;

  const defenderSkill = (defender.attributes.technical.tackling * 1.0
    + defender.attributes.mental.anticipation * 0.8
    + defender.attributes.mental.defensiveAwareness * 0.8
    + defender.attributes.physical.strength * 0.4) * defFatigue;

  const diff = attackerSkill - defenderSkill;
  const success = clamp(0.5 + diff * 0.007, 0.15, 0.9);

  if (state.rng.chance(success)) {
    if (carrierStats) carrierStats.dribblesCompleted++;
    state.zone[attackingKey] = advanceZone(state.zone[attackingKey]);
    state.lastPasser = null;
  } else {
    const defStats = getPlayerStats(defending, defender);
    if (defStats) defStats.tackles++;

    const foulChance = 0.05 + defending.tactic.pressIntensity * 0.05;
    if (state.rng.chance(foulChance)) {
      resolveFoul(state, defending, defender, carrier);
    } else {
      pushEvent(state, state.minute, 'Tackle', defending.club.id,
        defender.id, defender.displayName, carrier.id, carrier.displayName,
        `${defender.displayName} wins the ball from ${carrier.displayName}.`);
    }
    state.lastPasser = null;
    flipPossession(state);
  }
}

// ------------------------------------------------------------
// SHOT & xG
// ------------------------------------------------------------

interface ShotOptions {
  fromCross?: boolean;
}

function resolveShot(
  state: MatchState,
  attacking: TeamState,
  defending: TeamState,
  shooter: Player,
  attackingKey: 'home' | 'away',
  opts: ShotOptions = {},
): void {
  const shooterStats = getPlayerStats(attacking, shooter);
  if (shooterStats) shooterStats.shots++;
  attacking.stats.shots++;

  const gk = findGK(defending);
  if (!gk) {
    // No keeper — immediate goal
    scoreGoal(state, attacking, defending, shooter, null);
    return;
  }

  const fatigue = fatigueModifier(shooter);
  const zone = state.zone[attackingKey];
  const pressure = computePressure(state, defending, shooter);

  const longShot = zone === 'midfield' || (zone === 'attack' && state.rng.chance(0.15));
  const distance = longShot ? state.rng.float(20, 30) : state.rng.float(6, 18);
  const angle = state.rng.float(0, 1); // 0 = central, 1 = tight angle

  const finishing = shooter.attributes.technical.finishing * fatigue;
  const longShots = shooter.attributes.technical.longShots * fatigue;
  const composure = shooter.attributes.mental.composure * fatigue;
  const heading = shooter.attributes.technical.heading * fatigue;

  const shotSkill = opts.fromCross
    ? (heading * 0.7 + composure * 0.3)
    : longShot
      ? (longShots * 0.7 + finishing * 0.3)
      : (finishing * 0.7 + composure * 0.3);

  // xG Calculation (Event-driven)
  let xg = 0.25;
  xg -= Math.max(0, distance - 8) * 0.012;
  xg -= angle * 0.15;
  xg -= pressure * 0.20;
  xg += (shotSkill - 60) * 0.004;
  xg = clamp(xg, 0.01, 0.75);

  // Add to total xG
  attacking.stats.expectedGoals += xg;

  const gkFatigue = fatigueModifier(gk);
  const saveSkill = ((gk.attributes.technical.gkReflexes * 1.2
    + gk.attributes.technical.oneOnOnes * 1.0
    + gk.attributes.mental.positioning * 0.8) * gkFatigue) / 3;

  const saveMod = (saveSkill - 60) * 0.003;
  const goalChance = clamp(xg - saveMod, 0.02, 0.60);

  const roll = state.rng.next();
  if (roll < goalChance) {
    if (shooterStats) shooterStats.shotsOnTarget++;
    attacking.stats.shotsOnTarget++;

    // Determine assist
    let assist: { player: Player } | null = null;
    if (state.lastPasser
      && state.lastPasser.clubId === attacking.club.id
      && state.lastPasser.player.id !== shooter.id
      && state.minute - state.lastPasser.minute <= 1) {
      assist = { player: state.lastPasser.player };
    }

    scoreGoal(state, attacking, defending, shooter, assist);
  } else if (roll < goalChance + 0.30) {
    // Saved
    if (shooterStats) shooterStats.shotsOnTarget++;
    attacking.stats.shotsOnTarget++;

    const gkStats = getPlayerStats(defending, gk);
    if (gkStats) gkStats.saves++;
    pushEvent(state, state.minute, 'Save', defending.club.id,
      gk.id, gk.displayName, shooter.id, shooter.displayName,
      `${gk.displayName} saves ${shooter.displayName}'s effort.`);

    if (state.rng.chance(0.4)) {
      attacking.stats.corners++;
      pushEvent(state, state.minute, 'Corner', attacking.club.id,
        null, null, null, null, `Corner for ${attacking.club.shortName}.`);
      if (state.rng.chance(0.3)) {
        const header = pickHeaderThreat(state.rng, attacking);
        if (header) {
          resolveShot(state, attacking, defending, header, attackingKey, { fromCross: true });
        }
      }
    }
    state.lastPasser = null;
    flipPossession(state);
  } else if (roll < goalChance + 0.65) {
    // Off target
    pushEvent(state, state.minute, 'ShotOffTarget', attacking.club.id,
      shooter.id, shooter.displayName, null, null,
      `${shooter.displayName} drags it wide.`);
    state.lastPasser = null;
    flipPossession(state);
  } else {
    // Blocked
    const blocker = pickDefender(state, defending, shooter);
    if (blocker) {
      const bStats = getPlayerStats(defending, blocker);
      if (bStats) bStats.clearances++;
      pushEvent(state, state.minute, 'ShotBlocked', defending.club.id,
        blocker.id, blocker.displayName, shooter.id, shooter.displayName,
        `${blocker.displayName} blocks ${shooter.displayName}'s shot.`);
    }
    state.lastPasser = null;
    flipPossession(state);
  }
}

// ------------------------------------------------------------
// COUNTER ATTACK
// ------------------------------------------------------------

function resolveCounter(
  state: MatchState,
  attacking: TeamState,
  defending: TeamState,
  attackingKey: 'home' | 'away',
): void {
  const counterers = attacking.starters.filter(
    (p) => !p.injury && isAttacker(p, attacking.slots),
  );
  if (counterers.length === 0) {
    state.phase = 'buildUp';
    state.counterTeam = null;
    return;
  }

  const fastest = counterers.reduce((best, p) => {
    const speed = p.attributes.physical.acceleration + p.attributes.physical.sprintSpeed;
    const bestSpeed = best.attributes.physical.acceleration + best.attributes.physical.sprintSpeed;
    return speed > bestSpeed ? p : best;
  });

  const defenders = defending.starters.filter(
    (p) => !p.injury && (p.primaryPosition === 'CB' || p.primaryPosition === 'RB' || p.primaryPosition === 'LB'),
  );
  const fastestDefender = defenders.length > 0
    ? defenders.reduce((best, p) => {
        const speed = p.attributes.physical.acceleration + p.attributes.physical.sprintSpeed;
        const bestSpeed = best.attributes.physical.acceleration + best.attributes.physical.sprintSpeed;
        return speed > bestSpeed ? p : best;
      })
    : null;

  const counterChance = clamp(0.4 + state.rng.float(0, 0.3), 0.3, 0.75);

  if (state.rng.chance(counterChance)) {
    pushEvent(state, state.minute, 'Chance', attacking.club.id,
      fastest.id, fastest.displayName, null, null,
      `COUNTER! ${fastest.displayName} breaks forward.`);
    state.zone[attackingKey] = 'attack';
    state.phase = 'attack';
    resolveShot(state, attacking, defending, fastest, attackingKey);
  } else {
    if (fastestDefender) {
      pushEvent(state, state.minute, 'Tackle', defending.club.id,
        fastestDefender.id, fastestDefender.displayName, fastest.id, fastest.displayName,
        `${fastestDefender.displayName} catches ${fastest.displayName} on the counter.`);
    }
    state.counterTeam = null;
    state.phase = 'buildUp';
    flipPossession(state);
  }
}

function maybeStartCounter(state: MatchState, newPossession: TeamState): void {
  if (newPossession.tactic.defensiveLine > 0.5 && state.rng.chance(0.35)) {
    state.counterTeam = newPossession.isHome ? 'home' : 'away';
    state.phase = 'counter';
    state.zone[newPossession.isHome ? 'home' : 'away'] = 'attack';
  }
}

// ------------------------------------------------------------
// FOULS & CARDS
// ------------------------------------------------------------

function resolveFoul(
  state: MatchState,
  defending: TeamState,
  defender: Player,
  victim: Player,
): void {
  defending.stats.fouls++;
  const defStats = getPlayerStats(defending, defender);
  if (defStats) defStats.foulsCommitted++;

  const severity = state.rng.next();
  if (severity < 0.88) {
    pushEvent(state, state.minute, 'Foul', defending.club.id,
      defender.id, defender.displayName, victim.id, victim.displayName,
      `Foul by ${defender.displayName} on ${victim.displayName}.`);
  } else if (severity < 0.985) {
    if (defStats) defStats.yellowCards++;
    defending.stats.yellowCards++;
    if (defStats && defStats.yellowCards >= 2) {
      if (defStats) defStats.redCards++;
      defending.stats.redCards++;
      defending.redCards++;
      pushEvent(state, state.minute, 'RedCard', defending.club.id,
        defender.id, defender.displayName, victim.id, victim.displayName,
        `SECOND YELLOW! ${defender.displayName} is sent off!`);
      removePlayer(state, defending, defender);
    } else {
      pushEvent(state, state.minute, 'YellowCard', defending.club.id,
        defender.id, defender.displayName, victim.id, victim.displayName,
        `Yellow card for ${defender.displayName}.`);
    }
  } else {
    if (defStats) defStats.redCards++;
    defending.stats.redCards++;
    defending.redCards++;
    pushEvent(state, state.minute, 'RedCard', defending.club.id,
      defender.id, defender.displayName, victim.id, victim.displayName,
      `STRAIGHT RED CARD! ${defender.displayName} is sent off!`);
    removePlayer(state, defending, defender);
  }

  flipPossession(state);
  state.lastPasser = null;
  state.phase = 'buildUp';
}

// ------------------------------------------------------------
// GOAL
// ------------------------------------------------------------

function scoreGoal(
  state: MatchState,
  attacking: TeamState,
  defending: TeamState,
  scorer: Player,
  assist: { player: Player } | null,
): void {
  attacking.goals++;
  const scorerStats = getPlayerStats(attacking, scorer);
  if (scorerStats) scorerStats.goals++;

  if (assist) {
    const assistStats = getPlayerStats(attacking, assist.player);
    if (assistStats) assistStats.assists++;
  }

  pushEvent(state, state.minute, 'Goal', attacking.club.id,
    scorer.id, scorer.displayName,
    assist?.player.id ?? null, assist?.player.displayName ?? null,
    assist
      ? `GOAL! ${scorer.displayName} finishes from ${assist.player.displayName}'s pass.`
      : `GOAL! ${scorer.displayName} scores!`);

  state.lastPasser = null;
  state.counterTeam = null;
  state.possession = defending.isHome ? 'home' : 'away';
  state.zone = { home: 'midfield', away: 'midfield' };
  state.phase = 'buildUp';
}

// ------------------------------------------------------------
// PRESSURE & PLAYER SELECTION
// ------------------------------------------------------------

function computePressure(
  state: MatchState,
  defending: TeamState,
  attacker: Player,
): number {
  const defendersNear = defending.starters.filter(
    (p) => !p.injury && p.id !== attacker.id,
  );
  const defendersInZone = defendersNear.filter((d) => {
    const pos = defending.slots.get(d) ?? d.primaryPosition;
    const attackerZone = state.zone[state.possession];
    if (attackerZone === 'attack') {
      return pos === 'GK' || pos === 'CB' || pos === 'RB' || pos === 'LB';
    }
    if (attackerZone === 'midfield') {
      return pos === 'DM' || pos === 'CM';
    }
    return pos === 'DM' || pos === 'CM';
  }).length;

  const pressBoost = defending.tactic.pressIntensity * 0.3;
  const raw = defendersInZone * 0.15 + pressBoost + state.rng.float(0, 0.15);
  return clamp(raw, 0.1, 1.0);
}

function pickDefender(
  state: MatchState,
  defending: TeamState,
  attacker: Player,
): Player | null {
  const candidates = defending.starters.filter(
    (p) => !p.injury && p.id !== attacker.id,
  );
  if (candidates.length === 0) return null;

  const zone = state.zone[state.possession];
  const zoned = candidates.filter((p) => {
    const pos = defending.slots.get(p) ?? p.primaryPosition;
    if (zone === 'attack') return pos === 'CB' || pos === 'RB' || pos === 'LB' || pos === 'DM';
    return pos === 'DM' || pos === 'CM' || pos === 'CB';
  });

  const pool = zoned.length > 0 ? zoned : candidates;
  return state.rng.weighted(
    pool,
    pool.map((p) => p.attributes.technical.tackling * 0.5
      + p.attributes.mental.anticipation * 0.5),
  );
}

function pickInterceptor(state: MatchState, defending: TeamState): Player | null {
  const candidates = defending.starters.filter((p) => !p.injury);
  if (candidates.length === 0) return null;
  return state.rng.weighted(
    candidates,
    candidates.map((p) => p.attributes.mental.anticipation * 0.6
      + p.attributes.mental.defensiveAwareness * 0.4),
  );
}

function pickCarrier(state: MatchState, team: TeamState, zone: Zone): Player | null {
  const candidates = team.starters.filter((p) => {
    if (p.injury) return false;
    const pos = team.slots.get(p) ?? p.primaryPosition;
    if (zone === 'defence') return pos === 'GK' || pos === 'CB' || pos === 'RB' || pos === 'LB';
    if (zone === 'midfield') return pos === 'DM' || pos === 'CM' || pos === 'AM';
    return pos === 'RW' || pos === 'LW' || pos === 'ST' || pos === 'AM';
  });
  if (candidates.length === 0) return null;
  return state.rng.weighted(
    candidates,
    candidates.map((p) => {
      const attack = p.attributes.technical.dribbling * 0.3
        + p.attributes.technical.ballControl * 0.3
        + p.attributes.mental.vision * 0.2
        + p.attributes.technical.shortPassing * 0.2;
      return attack + (zone === 'attack' ? p.attributes.technical.finishing * 0.2 : 0);
    }),
  );
}

function pickHeaderThreat(rng: RNG, team: TeamState): Player | null {
  const candidates = team.starters.filter((p) => !p.injury && p.attributes.technical.heading > 55);
  if (candidates.length === 0) return null;
  return rng.weighted(candidates, candidates.map((p) => p.attributes.technical.heading));
}

// ------------------------------------------------------------
// OFF-SIDE
// ------------------------------------------------------------

function computeOffsideChance(
  state: MatchState,
  attacking: TeamState,
  defending: TeamState,
  attacker: Player,
): number {
  const attackerAwareness = (attacker.attributes.mental.offTheBall * 0.5
    + attacker.attributes.mental.anticipation * 0.5);
  const defenderLine = defending.starters
    .filter((p) => !p.injury && (p.primaryPosition === 'CB' || p.primaryPosition === 'RB' || p.primaryPosition === 'LB'))
    .reduce((sum, p) => sum + p.attributes.mental.anticipation + p.attributes.mental.positioning, 0);

  const defenderIQ = defenderLine / 4;
  const base = 0.15 + (defenderIQ - attackerAwareness) * 0.003;
  return clamp(base, 0.03, 0.30);
}

// ------------------------------------------------------------
// SUBSTITUTIONS
// ------------------------------------------------------------

function tryTacticalSub(state: MatchState): void {
  for (const team of [state.home, state.away]) {
    if (team.subsUsed >= 5) continue;
    const tired = team.starters
      .filter((p) => !p.injury && p.fitness < 65 && team.slots.get(p) !== 'GK')
      .sort((a, b) => a.fitness - b.fitness)[0];
    if (!tired) continue;
    const replacement = pickBenchReplacement(team, tired);
    if (!replacement) continue;
    performSub(state, team, tired, replacement, 'tactical');
  }
}

function trySubstitute(
  state: MatchState,
  team: TeamState,
  player: Player,
  reason: 'injury' | 'tactical',
): void {
  if (team.subsUsed >= 5) return;
  const replacement = pickBenchReplacement(team, player);
  if (!replacement) return;
  performSub(state, team, player, replacement, reason);
}

function pickBenchReplacement(team: TeamState, outPlayer: Player): Player | null {
  const outPos = team.slots.get(outPlayer) ?? outPlayer.primaryPosition;
  const candidates = team.bench
    .filter((p) => !p.injury && !team.starters.includes(p))
    .map((p) => ({
      player: p,
      score: p.overall * positionFamiliarity(p.primaryPosition, p.secondaryPosition, outPos),
    }))
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.player ?? null;
}

function performSub(
  state: MatchState,
  team: TeamState,
  outPlayer: Player,
  inPlayer: Player,
  reason: 'injury' | 'tactical',
): void {
  const idx = team.starters.indexOf(outPlayer);
  if (idx < 0) return;

  const outPos = team.slots.get(outPlayer) ?? outPlayer.primaryPosition;
  team.starters[idx] = inPlayer;
  team.slots.set(inPlayer, outPos);
  team.bench = team.bench.filter((p) => p.id !== inPlayer.id);
  team.bench.push(outPlayer);
  team.subsUsed++;

  const outStats = getPlayerStats(team, outPlayer);
  if (outStats) outStats.minutesPlayed = state.minute;

  const inStats = getPlayerStats(team, inPlayer);
  if (inStats) inStats.minutesPlayed = 0;

  pushEvent(state, state.minute, 'Substitution', team.club.id,
    inPlayer.id, inPlayer.displayName, outPlayer.id, outPlayer.displayName,
    reason === 'injury'
      ? `${inPlayer.displayName} replaces the injured ${outPlayer.displayName}.`
      : `${inPlayer.displayName} comes on for ${outPlayer.displayName}.`);
}

function removePlayer(state: MatchState, team: TeamState, player: Player): void {
  const idx = team.starters.indexOf(player);
  if (idx >= 0) team.starters.splice(idx, 1);
  const stats = getPlayerStats(team, player);
  if (stats) stats.minutesPlayed = state.minute;
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function createTeamState(
  club: Club,
  sel: { starters: Player[]; bench: Player[]; slots: Map<Player, Position> },
  isHome: boolean,
): TeamState {
  const stats: TeamMatchStats = {
    clubId: club.id, possession: 0, shots: 0, shotsOnTarget: 0,
    passes: 0, passesCompleted: 0, corners: 0, fouls: 0,
    yellowCards: 0, redCards: 0, offsides: 0, expectedGoals: 0,
  };

  const playerStats = new Map<string, PlayerMatchStats>();
  for (const p of [...sel.starters, ...sel.bench]) {
    playerStats.set(p.id, {
      playerId: p.id, playerName: p.displayName, clubId: club.id,
      position: sel.slots.get(p) ?? p.primaryPosition,
      minutesPlayed: 0, goals: 0, assists: 0, shots: 0, shotsOnTarget: 0,
      passesAttempted: 0, passesCompleted: 0, keyPasses: 0,
      dribblesAttempted: 0, dribblesCompleted: 0,
      tackles: 0, interceptions: 0, clearances: 0,
      foulsCommitted: 0, yellowCards: 0, redCards: 0,
      saves: 0, rating: 6.0, matchRatingRaw: 0,
    });
  }

  return {
    club, starters: sel.starters, bench: sel.bench, slots: sel.slots,
    tactic: tacticProfile(club.tactic), stats, playerStats,
    goals: 0, isHome, subsUsed: 0, redCards: 0,
  };
}

function fatigueModifier(p: Player): number {
  return 0.7 + (p.fitness / 100) * 0.3;
}

function isAttacker(p: Player, slots: Map<Player, Position>): boolean {
  const pos = slots.get(p) ?? p.primaryPosition;
  return pos === 'RW' || pos === 'LW' || pos === 'ST' || pos === 'AM';
}

function advanceZone(zone: Zone): Zone {
  if (zone === 'defence') return 'midfield';
  if (zone === 'midfield') return 'attack';
  return 'attack';
}

function advanceWeight(p: Player, slots: Map<Player, Position>): number {
  const pos = slots.get(p) ?? p.primaryPosition;
  if (pos === 'ST' || pos === 'AM') return 3;
  if (pos === 'RW' || pos === 'LW') return 2.5;
  if (pos === 'CM') return 2;
  if (pos === 'DM') return 1;
  if (pos === 'CB') return 0.5;
  if (pos === 'RB' || pos === 'LB') return 0.8;
  return 0.2;
}

function weightedPick<T>(rng: RNG, items: { player: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng.next() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.player;
  }
  return items[items.length - 1].player;
}

function getPlayerStats(team: TeamState, player: Player): PlayerMatchStats | undefined {
  return team.playerStats.get(player.id);
}

function findGK(team: TeamState): Player | null {
  for (const p of team.starters) {
    const pos = team.slots.get(p) ?? p.primaryPosition;
    if (pos === 'GK') return p;
  }
  return null;
}

function flipPossession(state: MatchState): void {
  state.possession = state.possession === 'home' ? 'away' : 'home';
  state.zone = { ...state.zone };
  state.phase = 'buildUp';
}

function pushEvent(
  state: MatchState,
  minute: number,
  type: MatchEvent['type'],
  clubId: string,
  playerId: string | null,
  playerName: string | null,
  secondaryPlayerId: string | null,
  secondaryPlayerName: string | null,
  description: string,
): void {
  state.events.push({
    minute, type, clubId,
    playerId, playerName,
    secondaryPlayerId, secondaryPlayerName,
    description,
  });
}

function applyHalfTimeAdjustments(team: TeamState): void {
  for (const p of [...team.starters, ...team.bench]) {
    p.fitness = clamp(p.fitness + 3, 0, 100);
  }
}

function adjustTacticsForScoreline(team: TeamState, opponent: TeamState): void {
  if (team.goals < opponent.goals) {
    team.tactic.pressIntensity = Math.min(1, team.tactic.pressIntensity + 0.15);
    team.tactic.directness = Math.min(1, team.tactic.directness + 0.1);
    team.tactic.defensiveLine = Math.min(1, team.tactic.defensiveLine + 0.1);
  } else if (team.goals > opponent.goals) {
    team.tactic.pressIntensity = Math.max(0.15, team.tactic.pressIntensity - 0.1);
    team.tactic.defensiveLine = Math.max(0.15, team.tactic.defensiveLine - 0.15);
  }
}

// ------------------------------------------------------------
// POST-MATCH CONDITION
// ------------------------------------------------------------

function applyPostMatchCondition(p: Player, state: MatchState): Player {
  const team = p.clubId === state.home.club.id ? state.home : state.away;
  const s = team.playerStats.get(p.id);
  const minutes = s?.minutesPlayed ?? 0;

  const newFitness = clamp(p.fitness - minutes * 0.25, 0, 100);
  const newFatigue = clamp(p.fatigue + minutes * 0.3, 0, 100);
  const newSharpness = clamp(p.sharpness + minutes * 0.15, 0, 100);

  const rating = s?.rating ?? 6.0;
  const formDelta = (rating - 6.5) * 0.4;
  const newForm = clamp(p.form + formDelta, -5, 5);
  const confDelta = rating > 7.0 ? 2 : rating < 5.5 ? -2 : 0;
  const newConfidence = clamp(p.confidence + confDelta, 0, 100);

  return {
    ...p,
    fitness: Math.round(newFitness),
    fatigue: Math.round(newFatigue),
    sharpness: Math.round(newSharpness),
    form: round(newForm, 2),
    confidence: Math.round(newConfidence),
  };
}

// ------------------------------------------------------------
// REPORT
// ------------------------------------------------------------

function buildReport(
  state: MatchState,
  fixtureId: string,
  playedDate: string,
  competition: string,
): MatchReport {
  const totalPasses = state.home.stats.passes + state.away.stats.passes || 1;
  state.home.stats.possession = Math.round((state.home.stats.passes / totalPasses) * 100);
  state.away.stats.possession = 100 - state.home.stats.possession;

  for (const team of [state.home, state.away]) {
    for (const p of team.starters) {
      const s = team.playerStats.get(p.id);
      if (s && s.minutesPlayed === 0) s.minutesPlayed = state.minute;
    }
  }

  for (const team of [state.home, state.away]) {
    const isHome = team.isHome;
    const teamGoals = isHome ? state.home.goals : state.away.goals;
    const oppGoals = isHome ? state.away.goals : state.home.goals;
    for (const s of team.playerStats.values()) {
      s.rating = computeRating(s, teamGoals, oppGoals);
    }
  }

  const allStats = [
    ...Array.from(state.home.playerStats.values()),
    ...Array.from(state.away.playerStats.values()),
  ].filter((s) => s.minutesPlayed > 0);
  const motm = allStats.sort((a, b) => b.rating - a.rating)[0];

  return {
    id: `report_${fixtureId}`,
    fixtureId,
    homeClubId: state.home.club.id,
    awayClubId: state.away.club.id,
    homeGoals: state.home.goals,
    awayGoals: state.away.goals,
    events: [...state.events],
    playerStats: allStats,
    homeTeamStats: { ...state.home.stats },
    awayTeamStats: { ...state.away.stats },
    manOfTheMatch: motm?.playerId ?? null,
    playedDate,
    competition,
  };
}

function computeRating(
  s: PlayerMatchStats,
  teamGoals: number,
  oppGoals: number,
): number {
  let rating = 6.0;

  if (teamGoals > oppGoals) rating += 0.3;
  else if (teamGoals < oppGoals) {
    rating -= 0.3;
    if (oppGoals - teamGoals >= 3) rating -= 0.4;
  }

  const minsFactor = Math.min(1, s.minutesPlayed / 60);
  rating += (s.goals * 1.2 + s.assists * 0.8) * minsFactor;

  const involvement = (s.passesAttempted * 0.02
    + s.shots * 0.3
    + s.tackles * 0.1
    + s.interceptions * 0.08
    + s.saves * 0.2) * minsFactor;

  rating += Math.min(involvement, 1.2);

  const isDefender = ['GK', 'CB', 'RB', 'LB'].includes(s.position);
  if (isDefender) {
    if (oppGoals === 0 && s.minutesPlayed >= 60) rating += 0.5;
    rating -= oppGoals * 0.15 * minsFactor;
  }

  if (s.passesAttempted >= 10) {
    const acc = s.passesCompleted / s.passesAttempted;
    rating += (acc - 0.75) * minsFactor;
  }

  rating -= s.foulsCommitted * 0.03;
  rating -= s.yellowCards * 0.15;
  rating -= s.redCards * 1.5;

  return clamp(round(rating, 1), 1.0, 9.9);
}