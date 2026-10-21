// ============================================================
// MATCH ENGINE — event-driven football simulation
// ============================================================

import type {
  Club, Player, MatchEvent, MatchReport, PlayerMatchStats,
  TeamMatchStats, Position, TacticStyle,
} from './types';
import { RNG, clamp, round } from './rng';
import { computeOverall, positionFamiliarity, effectiveAttribute } from './positions';
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
      return { possessionBias: 0.7, directness: 0.25, pressIntensity: 0.55, defensiveLine: 0.6 };
    case 'Direct':
      return { possessionBias: -0.5, directness: 0.8, pressIntensity: 0.45, defensiveLine: 0.55 };
    case 'Counter':
      return { possessionBias: -0.4, directness: 0.65, pressIntensity: 0.35, defensiveLine: 0.3 };
    case 'HighPress':
      return { possessionBias: 0.15, directness: 0.4, pressIntensity: 0.85, defensiveLine: 0.8 };
    case 'LowBlock':
      return { possessionBias: -0.35, directness: 0.5, pressIntensity: 0.3, defensiveLine: 0.2 };
    case 'Balanced':
    default:
      return { possessionBias: 0.05, directness: 0.5, pressIntensity: 0.55, defensiveLine: 0.5 };
  }
}

// ------------------------------------------------------------
// TEAM EFFECTIVE STRENGTH
// ------------------------------------------------------------

interface TeamStrength {
  attack: number;
  midfield: number;
  defence: number;
  overall: number;
}

function calculateTeamStrength(
  starters: Player[],
  slots: Map<Player, Position>,
): TeamStrength {
  const byPos: Record<string, number[]> = {};
  for (const p of starters) {
    const pos = slots.get(p) ?? p.primaryPosition;
    const group = positionGroup(pos);
    if (!byPos[group]) byPos[group] = [];
    byPos[group].push(p.overall);
  }
  const avg = (arr: number[] | undefined) =>
    arr && arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 50;

  const attack = avg(byPos.ATT) * 0.7 + avg(byPos.MID) * 0.3;
  const midfield = avg(byPos.MID);
  const defence = avg(byPos.DEF) * 0.6 + avg(byPos.GK) * 0.4;
  const overall = attack * 0.33 + midfield * 0.34 + defence * 0.33;

  return { attack, midfield, defence, overall };
}

function positionGroup(pos: Position): 'GK' | 'DEF' | 'MID' | 'ATT' {
  if (pos === 'GK') return 'GK';
  if (pos === 'RB' || pos === 'LB' || pos === 'CB') return 'DEF';
  if (pos === 'DM' || pos === 'CM' || pos === 'AM') return 'MID';
  return 'ATT';
}

// ------------------------------------------------------------
// IN-MATCH STATE
// ------------------------------------------------------------

interface TeamState {
  club: Club;
  starters: Player[];
  bench: Player[];
  slots: Map<Player, Position>;
  strength: TeamStrength;
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
  home: TeamState;
  away: TeamState;
  possession: 'home' | 'away';
  possessionZone: 'defence' | 'midfield' | 'attack';
  events: MatchEvent[];
  rng: RNG;
}

// ------------------------------------------------------------
// MAIN SIMULATION ENTRY
// ------------------------------------------------------------

export function simulateMatch(opts: MatchSimOptions): MatchSimResult {
  const { homeClub, awayClub, homeSquad, awaySquad, rng, competition, fixtureId, playedDate, userPlayerId } = opts;

  const homeSel = selectMatchdaySquad({
    club: homeClub,
    squad: homeSquad,
    userPlayerId: userPlayerId ?? '__none__',
    matchImportance: 0.6,
    rng,
  });
  const awaySel = selectMatchdaySquad({
    club: awayClub,
    squad: awaySquad,
    userPlayerId: userPlayerId ?? '__none__',
    matchImportance: 0.6,
    rng,
  });
  const homeXI = { starters: homeSel.starters, bench: homeSel.bench, slots: homeSel.slots };
  const awayXI = { starters: awaySel.starters, bench: awaySel.bench, slots: awaySel.slots };

  const home = createTeamState(homeClub, homeXI, homeClub.formation, true);
  const away = createTeamState(awayClub, awayXI, awayClub.formation, false);

  const state: MatchState = {
    minute: 0,
    home,
    away,
    possession: 'home',
    possessionZone: 'midfield',
    events: [],
    rng,
  };

  pushEvent(state, 0, 'KickOff', homeClub.id, null, null, null, null, 'Kick-off.');

  runHalf(state, 1, 45 + rng.int(1, 4));
  pushEvent(state, state.minute, 'HalfTime', homeClub.id, null, null, null, null,
    `Half-time: ${homeClub.shortName} ${home.goals}-${away.goals} ${awayClub.shortName}.`);

  applyHalfTimeRecovery(home);
  applyHalfTimeRecovery(away);
  adjustForScoreline(home, away);
  adjustForScoreline(away, home);

  state.possession = 'away';
  state.possessionZone = 'midfield';
  runHalf(state, 46, 90 + rng.int(2, 6));
  pushEvent(state, state.minute, 'FullTime', homeClub.id, null, null, null, null,
    `Full-time: ${homeClub.shortName} ${home.goals}-${away.goals} ${awayClub.shortName}.`);

  const report = buildReport(state, fixtureId, playedDate, competition);

  const updatedPlayers: Player[] = [];
  for (const p of [...home.starters, ...home.bench, ...away.starters, ...away.bench]) {
    updatedPlayers.push(applyPostMatchCondition(p, state, home, away));
  }

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

    const actions = state.rng.int(8, 14);
    for (let i = 0; i < actions; i++) {
      simulatePossessionAction(state);
      if (state.home.redCards >= 3 || state.away.redCards >= 3) return;
    }
  }
}

function advanceMinute(state: MatchState, limit: number): void {
  state.minute++;
  if (state.minute > limit) return;

  if (state.rng.chance(0.02)) {
    const team = state.rng.chance(0.5) ? state.home : state.away;
    const victim = state.rng.pick(team.starters);
    if (victim && !victim.injury) {
      pushEvent(state, state.minute, 'Injury', team.club.id, victim.id, victim.displayName, null, null,
        `${victim.displayName} is down and needs treatment.`);
      trySubstitute(state, team, victim, 'injury');
    }
  }

  if (state.minute >= 55 && state.minute <= 85) {
    if (state.rng.chance(0.08)) tryTacticalSub(state);
  }
}

function simulatePossessionAction(state: MatchState): void {
  const attacking = state.possession === 'home' ? state.home : state.away;
  const defending = state.possession === 'home' ? state.away : state.home;
  const attackSlots = attacking.slots;
  const defendSlots = defending.slots;

  const zone = state.possessionZone;
  const candidates = attacking.starters.filter((p) => {
    if (p.injury) return false;
    const pos = attackSlots.get(p) ?? p.primaryPosition;
    const grp = positionGroup(pos);
    if (zone === 'defence') return grp === 'GK' || grp === 'DEF';
    if (zone === 'midfield') return grp === 'DEF' || grp === 'MID';
    return grp === 'MID' || grp === 'ATT';
  });
  const carrier = pickCarrier(state.rng, candidates);
  if (!carrier) return;

  const roll = state.rng.next();
  const inAttack = zone === 'attack';
  const inMid = zone === 'midfield';

  const shotThreshold = inAttack ? 0.32 : inMid ? 0.08 : 0.02;
  const passThreshold = 0.55;

  if (roll < shotThreshold) {
    resolveShot(state, attacking, defending, carrier, attackSlots, defendSlots);
    return;
  }
  if (roll < shotThreshold + passThreshold) {
    resolvePass(state, attacking, defending, carrier, attackSlots, defendSlots);
    return;
  }
  resolveDribble(state, attacking, defending, carrier, attackSlots, defendSlots);
}

function pickCarrier(rng: RNG, candidates: Player[]): Player | null {
  if (candidates.length === 0) return null;
  const weights = candidates.map((p) => Math.pow(p.overall / 60, 1.3));
  return rng.weighted(candidates, weights);
}

// ------------------------------------------------------------
// ACTION RESOLUTION
// ------------------------------------------------------------

function resolvePass(
  state: MatchState,
  attacking: TeamState,
  defending: TeamState,
  carrier: Player,
  attackSlots: Map<Player, Position>,
  defendSlots: Map<Player, Position>,
): void {
  const carrierPos = attackSlots.get(carrier) ?? carrier.primaryPosition;
  const carrierGroup = positionGroup(carrierPos);

  const teammates = attacking.starters.filter((p) => p.id !== carrier.id && !p.injury);
  if (teammates.length === 0) return;

  const tactical = attacking.tactic;
  const wantsThroughBall = tactical.directness > 0.5 && carrierGroup !== 'DEF' && state.rng.chance(tactical.directness * 0.5);
  const targetGroup = wantsThroughBall ? 'ATT' : null;

  const recipients = teammates.filter((p) => {
    if (!targetGroup) return true;
    const rPos = attackSlots.get(p) ?? p.primaryPosition;
    return positionGroup(rPos) === targetGroup;
  });
  const recipient = state.rng.pick(recipients.length > 0 ? recipients : teammates);

  const passer = carrier;
  const passSkill = wantsThroughBall
    ? (passer.attributes.technical.longPassing + passer.attributes.mental.vision) / 2
    : (passer.attributes.technical.shortPassing + passer.attributes.mental.vision) / 2;

  const pressure = computePressure(defending, defendSlots, carrier, carrierPos, state.rng);
  const distance = wantsThroughBall ? 0.8 : 0.5;

  let successChance = 0.55
    + (passSkill - 55) * 0.007
    - pressure * 0.25
    - distance * 0.15
    + (carrier.attributes.mental.composure - 50) * 0.003;
  successChance = clamp(successChance, 0.2, 0.95);

  attacking.stats.passes++;
  const carrierStats = getPlayerStats(attacking, carrier);
  if (carrierStats) carrierStats.passesAttempted++;

  if (!state.rng.chance(successChance)) {
    const interceptor = pickDefensiveActor(defending, defendSlots, 'midfield');
    if (interceptor) {
      const intStats = getPlayerStats(defending, interceptor);
      if (intStats) intStats.interceptions++;
      pushEvent(state, state.minute, 'Interception', defending.club.id,
        interceptor.id, interceptor.displayName, carrier.id, carrier.displayName,
        `${interceptor.displayName} intercepts ${carrier.displayName}'s pass.`);
    }
    state.possession = defending.isHome ? 'home' : 'away';
    state.possessionZone = wantsThroughBall ? 'defence' : 'midfield';
    return;
  }

  if (carrierStats) carrierStats.passesCompleted++;
  attacking.stats.passesCompleted++;
  if (wantsThroughBall) {
    const targetStats = getPlayerStats(attacking, recipient);
    if (targetStats) targetStats.keyPasses++;
  }

  const progression = wantsThroughBall ? 2 : 1;
  state.possessionZone = advanceZone(state.possessionZone, progression);
  if (state.possessionZone === 'attack' && wantsThroughBall && state.rng.chance(0.4)) {
    resolveShot(state, attacking, defending, recipient, attackSlots, defendSlots);
  }
}

function resolveDribble(
  state: MatchState,
  attacking: TeamState,
  defending: TeamState,
  carrier: Player,
  attackSlots: Map<Player, Position>,
  defendSlots: Map<Player, Position>,
): void {
  const carrierPos = attackSlots.get(carrier) ?? carrier.primaryPosition;
  const carrierStats = getPlayerStats(attacking, carrier);
  if (carrierStats) carrierStats.dribblesAttempted++;

  const defender = pickDefensiveActor(defending, defendSlots, state.possessionZone);
  if (!defender) {
    if (carrierStats) carrierStats.dribblesCompleted++;
    state.possessionZone = advanceZone(state.possessionZone, 1);
    return;
  }

  const attackerSkill = (carrier.attributes.technical.dribbling
    + carrier.attributes.physical.agility
    + carrier.attributes.physical.acceleration
    + carrier.attributes.mental.composure) / 4;

  const defPos = defendSlots.get(defender) ?? defender.primaryPosition;
  const defenderSkill = (defender.attributes.technical.tackling
    + defender.attributes.mental.anticipation
    + defender.attributes.mental.defensiveAwareness
    + defender.attributes.physical.strength) / 4;

  const fitnessMod = carrier.fitness / 100;
  const defFitnessMod = defender.fitness / 100;

  const successChance = clamp(
    0.5 + (attackerSkill * fitnessMod - defenderSkill * defFitnessMod) * 0.008,
    0.15, 0.9,
  );

  if (state.rng.chance(successChance)) {
    if (carrierStats) carrierStats.dribblesCompleted++;
    state.possessionZone = advanceZone(state.possessionZone, 1);
  } else {
    const defStats = getPlayerStats(defending, defender);
    if (defStats) defStats.tackles++;
    const foulChance = 0.2 + defending.tactic.pressIntensity * 0.15;
    if (state.rng.chance(foulChance)) {
      resolveFoul(state, defending, defender, carrier);
    } else {
      pushEvent(state, state.minute, 'Tackle', defending.club.id,
        defender.id, defender.displayName, carrier.id, carrier.displayName,
        `${defender.displayName} wins the ball from ${carrier.displayName}.`);
    }
    state.possession = defending.isHome ? 'home' : 'away';
    state.possessionZone = state.possessionZone === 'attack' ? 'midfield' : 'defence';
  }
}

function resolveShot(
  state: MatchState,
  attacking: TeamState,
  defending: TeamState,
  shooter: Player,
  attackSlots: Map<Player, Position>,
  defendSlots: Map<Player, Position>,
): void {
  const shooterStats = getPlayerStats(attacking, shooter);
  if (shooterStats) {
    shooterStats.shots++;
  }
  attacking.stats.shots++;

  const zone = state.possessionZone;
  const longShot = zone === 'midfield' || state.rng.chance(0.3);

  const gk = findGK(defending, defendSlots);
  if (!gk) {
    scoreGoal(state, attacking, defending, shooter, null);
    return;
  }

  const shotSkill = longShot
    ? (shooter.attributes.technical.longShots + shooter.attributes.technical.finishing) / 2
    : shooter.attributes.technical.finishing;

  const pressure = computePressure(defending, defendSlots, shooter, attackSlots.get(shooter) ?? shooter.primaryPosition, state.rng);

  const baseXG = longShot ? 0.06 : zone === 'attack' ? 0.22 : 0.12;
  const skillMod = (shotSkill - 55) * 0.004;
  const pressureMod = -pressure * 0.12;
  const xg = clamp(baseXG + skillMod + pressureMod, 0.02, 0.65);

  const saveSkill = (gk.attributes.technical.gkReflexes
    + gk.attributes.technical.oneOnOnes
    + gk.attributes.mental.positioning) / 3;
  const saveMod = (saveSkill - 55) * 0.004;

  const goalChance = clamp(xg - saveMod, 0.02, 0.72);

  attacking.stats.expectedGoals += xg;

  const roll = state.rng.next();
  if (roll < goalChance) {
    if (shooterStats) shooterStats.shotsOnTarget++;
    attacking.stats.shotsOnTarget++;
    const assistInfo = findRecentAssist(state, attacking.club.id);
    scoreGoal(state, attacking, defending, shooter, assistInfo);
  } else if (roll < goalChance + 0.35) {
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
      if (state.rng.chance(0.35)) {
        const header = pickHeaderThreat(state.rng, attacking);
        if (header) {
          resolveShot(state, attacking, defending, header, attackSlots, defendSlots);
        }
      }
    }
  } else if (roll < goalChance + 0.7) {
    pushEvent(state, state.minute, 'ShotOffTarget', attacking.club.id,
      shooter.id, shooter.displayName, null, null,
      `${shooter.displayName} drags it wide.`);
  } else {
    const blocker = pickDefensiveActor(defending, defendSlots, 'defence');
    if (blocker) {
      const bStats = getPlayerStats(defending, blocker);
      if (bStats) bStats.clearances++;
      pushEvent(state, state.minute, 'ShotBlocked', defending.club.id,
        blocker.id, blocker.displayName, shooter.id, shooter.displayName,
        `${blocker.displayName} blocks ${shooter.displayName}'s shot.`);
    }
  }

  if (state.rng.chance(0.55)) {
    state.possession = defending.isHome ? 'home' : 'away';
    state.possessionZone = 'defence';
  } else {
    state.possessionZone = 'midfield';
  }
}

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
  if (severity < 0.65) {
    pushEvent(state, state.minute, 'Foul', defending.club.id,
      defender.id, defender.displayName, victim.id, victim.displayName,
      `Foul by ${defender.displayName} on ${victim.displayName}.`);
  } else if (severity < 0.92) {
    if (defStats) defStats.yellowCards++;
    defending.stats.yellowCards++;
    pushEvent(state, state.minute, 'YellowCard', defending.club.id,
      defender.id, defender.displayName, victim.id, victim.displayName,
      `Yellow card for ${defender.displayName}.`);
  } else {
    if (defStats) defStats.redCards++;
    defending.stats.redCards++;
    defending.redCards++;
    pushEvent(state, state.minute, 'RedCard', defending.club.id,
      defender.id, defender.displayName, victim.id, victim.displayName,
      `RED CARD! ${defender.displayName} is sent off!`);
    removeSentOffPlayer(state, defending, defender);
  }

  state.possession = defending.isHome ? 'away' : 'home';
  state.possessionZone = 'midfield';
}

function scoreGoal(
  state: MatchState,
  attacking: TeamState,
  defending: TeamState,
  scorer: Player,
  assistInfo: { player: Player } | null,
): void {
  attacking.goals++;
  const stats = getPlayerStats(attacking, scorer);
  if (stats) stats.goals++;
  if (assistInfo) {
    const astats = getPlayerStats(attacking, assistInfo.player);
    if (astats) astats.assists++;
  }
  pushEvent(state, state.minute, 'Goal', attacking.club.id,
    scorer.id, scorer.displayName,
    assistInfo?.player.id ?? null, assistInfo?.player.displayName ?? null,
    assistInfo
      ? `GOAL! ${scorer.displayName} finishes from ${assistInfo.player.displayName}'s pass.`
      : `GOAL! ${scorer.displayName} scores!`);

  state.possession = defending.isHome ? 'home' : 'away';
  state.possessionZone = 'midfield';
}

// ------------------------------------------------------------
// SUBSTITUTIONS
// ------------------------------------------------------------

function tryTacticalSub(state: MatchState): void {
  const teams = [state.home, state.away];
  for (const team of teams) {
    if (team.subsUsed >= 5) continue;
    const tired = team.starters.find((p) => p.fitness < 60 && !p.injury);
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
      score:
        p.overall * positionFamiliarity(p.primaryPosition, p.secondaryPosition, outPos) *
        (0.7 + p.fitness / 300),
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

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function createTeamState(
  club: Club,
  xi: { starters: Player[]; bench: Player[]; slots: Map<Player, Position> },
  _formation: string,
  isHome: boolean,
): TeamState {
  const stats: TeamMatchStats = {
    clubId: club.id,
    possession: 0,
    shots: 0,
    shotsOnTarget: 0,
    passes: 0,
    passesCompleted: 0,
    corners: 0,
    fouls: 0,
    yellowCards: 0,
    redCards: 0,
    offsides: 0,
    expectedGoals: 0,
  };

  const playerStats = new Map<string, PlayerMatchStats>();
  for (const p of [...xi.starters, ...xi.bench]) {
    playerStats.set(p.id, {
      playerId: p.id,
      playerName: p.displayName,
      clubId: club.id,
      position: xi.slots.get(p) ?? p.primaryPosition,
      minutesPlayed: xi.starters.includes(p) ? 0 : 0,
      goals: 0, assists: 0,
      shots: 0, shotsOnTarget: 0,
      passesAttempted: 0, passesCompleted: 0, keyPasses: 0,
      dribblesAttempted: 0, dribblesCompleted: 0,
      tackles: 0, interceptions: 0, clearances: 0,
      foulsCommitted: 0, yellowCards: 0, redCards: 0,
      saves: 0, rating: 6.0, matchRatingRaw: 0,
    });
  }

  return {
    club,
    starters: xi.starters,
    bench: xi.bench,
    slots: xi.slots,
    strength: calculateTeamStrength(xi.starters, xi.slots),
    tactic: tacticProfile(club.tactic),
    stats,
    playerStats,
    goals: 0,
    isHome,
    subsUsed: 0,
    redCards: 0,
  };
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
    minute,
    type,
    clubId,
    playerId,
    playerName,
    secondaryPlayerId,
    secondaryPlayerName,
    description,
  });
}

function getPlayerStats(team: TeamState, player: Player): PlayerMatchStats | undefined {
  return team.playerStats.get(player.id);
}

function findGK(team: TeamState, slots: Map<Player, Position>): Player | null {
  for (const p of team.starters) {
    const pos = slots.get(p) ?? p.primaryPosition;
    if (pos === 'GK') return p;
  }
  return null;
}

function pickDefensiveActor(
  team: TeamState,
  slots: Map<Player, Position>,
  zone: 'defence' | 'midfield' | 'attack',
): Player | null {
  const candidates = team.starters.filter((p) => !p.injury).filter((p) => {
    const pos = slots.get(p) ?? p.primaryPosition;
    const grp = positionGroup(pos);
    if (zone === 'attack') return grp === 'DEF' || grp === 'GK';
    if (zone === 'midfield') return grp === 'MID' || grp === 'DEF';
    return grp === 'DEF';
  });
  if (candidates.length === 0) return null;
  return candidates.reduce((best, p) =>
    p.attributes.mental.anticipation + p.attributes.technical.tackling >
    best.attributes.mental.anticipation + best.attributes.technical.tackling
      ? p : best
  );
}

function pickHeaderThreat(rng: RNG, team: TeamState): Player | null {
  const candidates = team.starters.filter((p) => !p.injury && p.attributes.technical.heading > 55);
  return candidates.length > 0 ? rng.pick(candidates) : null;
}

function computePressure(
  defending: TeamState,
  defendSlots: Map<Player, Position>,
  attacker: Player,
  attackerPos: Position,
  rng: RNG,
): number {
  const group = positionGroup(attackerPos);
  const nearby = defending.starters.filter((p) => {
    if (p.injury) return false;
    const pos = defendSlots.get(p) ?? p.primaryPosition;
    const defGroup = positionGroup(pos);
    if (group === 'ATT') return defGroup === 'DEF' || defGroup === 'GK';
    if (group === 'MID') return defGroup === 'MID';
    return false;
  });
  const base = nearby.length * 0.15;
  const noise = rng.next() * 0.2;
  return clamp(base + noise + defending.tactic.pressIntensity * 0.1, 0, 1);
}

function advanceZone(current: string, steps: number): 'defence' | 'midfield' | 'attack' {
  const order = ['defence', 'midfield', 'attack'] as const;
  const idx = order.indexOf(current as any);
  return order[clamp(idx + steps, 0, 2)];
}

function findRecentAssist(
  state: MatchState,
  clubId: string,
): { player: Player } | null {
  const team = state.home.club.id === clubId ? state.home : state.away;
  for (let i = state.events.length - 1; i >= Math.max(0, state.events.length - 3); i--) {
    const ev = state.events[i];
    if (ev.type === 'Goal' && ev.clubId !== clubId) break;
    if (ev.type === 'Interception' || ev.type === 'Tackle') return null;
    if (ev.type === 'Chance' || ev.type === 'Shot' || ev.type === 'ShotOnTarget') continue;
  }
  const candidates = team.starters.filter(
    (p) => !p.injury && (p.attributes.mental.vision + p.attributes.technical.shortPassing) > 110,
  );
  if (candidates.length === 0) return null;
  if (state.rng.chance(0.6)) return { player: state.rng.pick(candidates) };
  return null;
}

function removeSentOffPlayer(state: MatchState, team: TeamState, player: Player): void {
  const idx = team.starters.indexOf(player);
  if (idx >= 0) team.starters.splice(idx, 1);
  const stats = getPlayerStats(team, player);
  if (stats) stats.minutesPlayed = state.minute;
}

function applyHalfTimeRecovery(team: TeamState): void {
  for (const p of [...team.starters, ...team.bench]) {
    p.fitness = clamp(p.fitness + 4, 0, 100);
  }
}

function adjustForScoreline(team: TeamState, opponent: TeamState): void {
  if (team.goals < opponent.goals) {
    team.tactic.pressIntensity = Math.min(1, team.tactic.pressIntensity + 0.15);
    team.tactic.directness = Math.min(1, team.tactic.directness + 0.1);
  } else if (team.goals > opponent.goals) {
    team.tactic.pressIntensity = Math.max(0.2, team.tactic.pressIntensity - 0.1);
    team.tactic.defensiveLine = Math.max(0.2, team.tactic.defensiveLine - 0.1);
  }
}

// ------------------------------------------------------------
// POST-MATCH CONDITION
// ------------------------------------------------------------

function applyPostMatchCondition(
  p: Player,
  state: MatchState,
  home: TeamState,
  away: TeamState,
): Player {
  const team = p.clubId === home.club.id ? home : away;
  const stats = team.playerStats.get(p.id);
  const minutes = stats?.minutesPlayed ?? 0;

  const newFitness = clamp(p.fitness - minutes * 0.35, 0, 100);
  const newFatigue = clamp(p.fatigue + minutes * 0.4, 0, 100);
  const newSharpness = clamp(p.sharpness + minutes * 0.15, 0, 100);

  const rating = stats?.rating ?? 6.0;
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
// REPORT BUILDER
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
    for (const p of team.bench) {
      const s = team.playerStats.get(p.id);
      if (s && s.minutesPlayed === 0) s.minutesPlayed = 0;
    }
  }

  for (const team of [state.home, state.away]) {
    for (const s of team.playerStats.values()) {
      s.rating = computeRating(s);
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

function computeRating(s: PlayerMatchStats): number {
  const base = 6.0;
  let rating = base;
  rating += s.goals * 1.2;
  rating += s.assists * 0.7;
  rating += s.keyPasses * 0.15;
  rating += s.tackles * 0.1;
  rating += s.interceptions * 0.08;
  rating += s.saves * 0.15;
  rating += s.dribblesCompleted * 0.05;
  rating -= s.foulsCommitted * 0.1;
  rating -= s.yellowCards * 0.2;
  rating -= s.redCards * 1.5;
  if (s.passesAttempted > 5) {
    const acc = s.passesCompleted / s.passesAttempted;
    rating += (acc - 0.7) * 1.0;
  }
  return clamp(round(rating, 1), 1.0, 10.0);
}
