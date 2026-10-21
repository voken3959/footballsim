import { useState } from 'react';
import { useCareerStore } from '../store/careerStore';
import { Crest } from '../components/Layout';
import { formatDate, formatShort } from '../game/dates';
import { selectMatchdaySquad } from '../game/squadSelection';
import { RNG } from '../game/rng';
import type { MatchReport, MatchEvent, Player } from '../game/types';

export default function MatchScreen() {
  const lastReport = useCareerStore((s) => s.lastMatchReport);
  const clearResults = useCareerStore((s) => s.clearResults);

  if (lastReport) {
    return <MatchReportView report={lastReport} onContinue={clearResults} />;
  }
  return <MatchdayView />;
}

// ------------------------------------------------------------
// MATCH REPORT VIEW
// ------------------------------------------------------------

function MatchReportView({ report, onContinue }: { report: MatchReport; onContinue: () => void }) {
  const save = useCareerStore((s) => s.save)!;
  const user = useCareerStore((s) => s.userPlayer())!;
  const homeClub = save.clubs.find((c) => c.id === report.homeClubId)!;
  const awayClub = save.clubs.find((c) => c.id === report.awayClubId)!;
  const userStats = report.playerStats.find((s) => s.playerId === user.id);
  const motm = report.manOfTheMatch ? report.playerStats.find((s) => s.playerId === report.manOfTheMatch) : null;
  const motmPlayer = motm ? save.players.find((p) => p.id === motm.playerId) : null;
  const motmClub = motmPlayer ? save.clubs.find((c) => c.id === motmPlayer.clubId) : null;

  const homeGoals = report.events.filter((e) => (e.type === 'Goal' || e.type === 'PenaltyGoal') && e.clubId === report.homeClubId);
  const awayGoals = report.events.filter((e) => (e.type === 'Goal' || e.type === 'PenaltyGoal') && e.clubId === report.awayClubId);

  return (
    <div className="space-y-4">
      <div>
        <div className="label text-accent-soft">Match report</div>
        <h1 className="text-xl font-bold mt-1">{homeClub.shortName} {report.homeGoals}–{report.awayGoals} {awayClub.shortName}</h1>
        <div className="text-xs text-txt-muted mt-1">{report.competition} · {formatDate(report.playedDate)}</div>
      </div>

      <div className="panel p-4">
        <div className="flex items-center justify-around gap-3">
          <TeamHeader club={homeClub} />
          <div className="text-4xl md:text-5xl font-black tabular-nums text-txt">{report.homeGoals}–{report.awayGoals}</div>
          <TeamHeader club={awayClub} align="right" />
        </div>
      </div>

      {userStats && userStats.minutesPlayed > 0 && (
        <div className="panel p-4 border-accent/30">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="label">Your performance</div>
              <div className="text-sm text-txt mt-1">
                {userStats.minutesPlayed}' played
                {userStats.goals > 0 && ` · ${userStats.goals} goal${userStats.goals > 1 ? 's' : ''}`}
                {userStats.assists > 0 && ` · ${userStats.assists} assist${userStats.assists > 1 ? 's' : ''}`}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-txt-dim">Rating</div>
              <div className={`text-2xl font-black tabular-nums ${userStats.rating >= 8 ? 'text-state-win' : userStats.rating >= 7 ? 'text-accent-soft' : userStats.rating >= 6 ? 'text-txt' : 'text-state-loss'}`}>
                {userStats.rating.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      )}
      {userStats && userStats.minutesPlayed === 0 && (
        <div className="panel p-3 text-sm text-txt-muted">You did not feature in this match.</div>
      )}

      {(homeGoals.length > 0 || awayGoals.length > 0) && (
        <div className="panel p-4">
          <div className="label mb-3">Goals</div>
          <div className="space-y-1.5">
            {[...homeGoals, ...awayGoals].sort((a, b) => a.minute - b.minute).map((g, i) => {
              const club = g.clubId === report.homeClubId ? homeClub : awayClub;
              const isHome = g.clubId === report.homeClubId;
              return (
                <div key={i} className={`flex items-center gap-2 text-sm ${isHome ? '' : 'flex-row-reverse text-right'}`}>
                  <span className="text-txt-dim tabular-nums w-9">{g.minute}'</span>
                  <Crest club={club} size={16} />
                  <span className="text-txt">
                    <strong>{g.playerName}</strong>
                    {g.secondaryPlayerName && <span className="text-txt-muted"> (assist: {g.secondaryPlayerName})</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="panel p-4">
        <div className="label mb-3">Team stats</div>
        <StatRow label="Possession" home={`${report.homeTeamStats.possession}%`} away={`${report.awayTeamStats.possession}%`} homeNum={report.homeTeamStats.possession} awayNum={report.awayTeamStats.possession} />
        <StatRow label="Shots" home={report.homeTeamStats.shots} away={report.awayTeamStats.shots} homeNum={report.homeTeamStats.shots} awayNum={report.awayTeamStats.shots} />
        <StatRow label="Shots on target" home={report.homeTeamStats.shotsOnTarget} away={report.awayTeamStats.shotsOnTarget} homeNum={report.homeTeamStats.shotsOnTarget} awayNum={report.awayTeamStats.shotsOnTarget} />
        <StatRow label="xG" home={report.homeTeamStats.expectedGoals.toFixed(2)} away={report.awayTeamStats.expectedGoals.toFixed(2)} homeNum={report.homeTeamStats.expectedGoals} awayNum={report.awayTeamStats.expectedGoals} />
        <StatRow label="Corners" home={report.homeTeamStats.corners} away={report.awayTeamStats.corners} homeNum={report.homeTeamStats.corners} awayNum={report.awayTeamStats.corners} />
        <StatRow label="Fouls" home={report.homeTeamStats.fouls} away={report.awayTeamStats.fouls} homeNum={report.homeTeamStats.fouls} awayNum={report.awayTeamStats.fouls} />
        <StatRow label="Yellow cards" home={report.homeTeamStats.yellowCards} away={report.awayTeamStats.yellowCards} homeNum={report.homeTeamStats.yellowCards} awayNum={report.awayTeamStats.yellowCards} />
      </div>

      {motmPlayer && motmClub && (
        <div className="panel p-4">
          <div className="label mb-2">Man of the match</div>
          <div className="flex items-center gap-3">
            <Crest club={motmClub} size={28} />
            <div className="flex-1">
              <div className="text-sm font-semibold text-txt">{motmPlayer.displayName}</div>
              <div className="text-xs text-txt-muted">{motmClub.shortName}</div>
            </div>
            <div className="text-2xl font-black text-accent-soft tabular-nums">{motm!.rating.toFixed(1)}</div>
          </div>
        </div>
      )}

      <div className="panel p-4">
        <div className="label mb-2">Key events</div>
        <div className="space-y-1 max-h-72 overflow-y-auto pr-2">
          {report.events.filter((e) => ['Goal', 'PenaltyGoal', 'RedCard', 'YellowCard', 'Substitution', 'Injury'].includes(e.type)).map((e, i) => (
            <EventRow key={i} event={e} homeClubId={report.homeClubId} />
          ))}
        </div>
      </div>

      <button className="btn btn-primary w-full" onClick={onContinue}>Continue</button>
    </div>
  );
}

// ------------------------------------------------------------
// MATCHDAY VIEW
// ------------------------------------------------------------

function MatchdayView() {
  const save = useCareerStore((s) => s.save)!;
  const user = useCareerStore((s) => s.userPlayer())!;
  const club = useCareerStore((s) => s.userClub())!;
  const next = useCareerStore((s) => s.nextFixture());
  const advanceToNextMatch = useCareerStore((s) => s.advanceToNextMatch);
  const advanceOneDay = useCareerStore((s) => s.advanceOneDay);
  const loading = useCareerStore((s) => s.loading);
  const [phase, setPhase] = useState<'idle' | 'fast-forward' | 'match'>('idle');
  const [showLineup, setShowLineup] = useState(false);

  const playNextMatch = async () => {
    setPhase('fast-forward');
    await advanceToNextMatch();
    setPhase('match');
    await advanceOneDay();
    setPhase('idle');
  };

  const opponent = next ? save.clubs.find((c) => c.id === (next.homeClubId === club.id ? next.awayClubId : next.homeClubId)) : null;
  const isHome = next ? next.homeClubId === club.id : false;

  const recentReports = save.matchReports.filter((r) => r.homeClubId === club.id || r.awayClubId === club.id).slice(-8).reverse();

  const matchRng = new RNG(save.seed, save.rngState);
  const selection = selectMatchdaySquad({
    club,
    squad: save.players.filter((p) => p.clubId === club.id),
    userPlayerId: user.id,
    matchImportance: 0.6,
    rng: matchRng,
  });

  const groupedLineup = { GK: [] as Player[], DEF: [] as Player[], MID: [] as Player[], ATT: [] as Player[] };
  selection.starters.forEach(p => {
    const slot = selection.slots.get(p) ?? p.primaryPosition;
    const grp = posGroup(slot);
    groupedLineup[grp].push(p);
  });

  return (
    <div className="space-y-4">
      <div>
        <div className="label text-accent-soft">Matches</div>
        <h1 className="text-xl font-bold mt-1">Matchday</h1>
      </div>

      {next && opponent ? (
        <div className="panel p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="label">Next match</div>
            <div className="text-xs text-txt-muted">{formatDate(next.date)}</div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Crest club={club} size={40} />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-txt truncate">{club.shortName}</div>
                <div className="text-[11px] text-txt-muted">{isHome ? 'Home' : 'Away'}</div>
              </div>
            </div>
            <div className="text-txt-dim text-xs px-3">vs</div>
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <div className="min-w-0 text-right">
                <div className="text-sm font-semibold text-txt truncate">{opponent.shortName}</div>
                <div className="text-[11px] text-txt-muted truncate">{opponent.managerName}</div>
              </div>
              <Crest club={opponent} size={40} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="panel-card p-2">
              <div className="text-[10px] uppercase tracking-wider text-txt-dim">Your fitness</div>
              <div className="text-sm font-semibold text-txt mt-0.5">{user.fitness}</div>
            </div>
            <div className="panel-card p-2">
              <div className="text-[10px] uppercase tracking-wider text-txt-dim">Opponent rep</div>
              <div className="text-sm font-semibold text-txt mt-0.5">{opponent.reputation}</div>
            </div>
            <div className="panel-card p-2">
              <div className="text-[10px] uppercase tracking-wider text-txt-dim">Your form</div>
              <div className="text-sm font-semibold text-txt mt-0.5">{user.form > 1 ? 'Good' : user.form < -1 ? 'Poor' : 'Avg'}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button
              className="btn flex-1"
              onClick={() => setShowLineup(!showLineup)}
            >
              {showLineup ? 'Hide Expected Lineup' : 'View Expected Lineup'}
            </button>
            <button
              className="btn btn-primary flex-1"
              onClick={playNextMatch}
              disabled={loading || phase !== 'idle'}
            >
              {user.injury
                ? `Simulate Match (Injured)`
                : phase === 'fast-forward'
                ? 'Preparing…'
                : phase === 'match'
                ? 'Simulating match…'
                : 'Play next match'}
            </button>
          </div>

          {showLineup && (
            <div className="mt-4 pt-4 border-t border-bg-border">
              <div className="label mb-2">Expected Starting XI ({club.formation})</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {groupedLineup.GK.map(p => <LineupRow key={p.id} p={p} isUser={p.id === user.id} />)}
                {groupedLineup.DEF.map(p => <LineupRow key={p.id} p={p} isUser={p.id === user.id} />)}
                {groupedLineup.MID.map(p => <LineupRow key={p.id} p={p} isUser={p.id === user.id} />)}
                {groupedLineup.ATT.map(p => <LineupRow key={p.id} p={p} isUser={p.id === user.id} />)}
              </div>
              
              <div className="label mt-4 mb-2">Bench</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm text-txt-muted">
                {selection.bench.map(p => <LineupRow key={p.id} p={p} isUser={p.id === user.id} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="panel p-6 text-center text-txt-muted">No upcoming fixtures this season.</div>
      )}

      <div className="panel overflow-hidden">
        <div className="px-4 py-3 border-b border-bg-border">
          <div className="label">Recent results</div>
        </div>
        {recentReports.length === 0 ? (
          <div className="p-4 text-sm text-txt-muted">No matches played yet.</div>
        ) : (
          recentReports.map((r) => {
            const isUserHome = r.homeClubId === club.id;
            const oppId = isUserHome ? r.awayClubId : r.homeClubId;
            const opp = save.clubs.find((c) => c.id === oppId)!;
            const userGoals = isUserHome ? r.homeGoals : r.awayGoals;
            const oppGoals = isUserHome ? r.awayGoals : r.homeGoals;
            const result = userGoals > oppGoals ? 'W' : userGoals < oppGoals ? 'L' : 'D';
            const stats = r.playerStats.find((s) => s.playerId === user.id);
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-bg-border last:border-b-0 text-sm">
                <span className={`w-6 h-6 flex items-center justify-center rounded font-bold text-[11px] ${result === 'W' ? 'bg-state-win/20 text-state-win' : result === 'D' ? 'bg-bg-card text-txt-muted' : 'bg-state-loss/20 text-state-loss'}`}>
                  {result}
                </span>
                <span className="text-txt-dim text-xs tabular-nums w-10">{formatShort(r.playedDate)}</span>
                <span className="text-txt-muted text-xs w-4">{isUserHome ? 'H' : 'A'}</span>
                <span className="text-txt-muted flex-1 truncate">{opp.shortName}</span>
                <span className="text-txt font-medium tabular-nums">{userGoals}–{oppGoals}</span>
                {stats && stats.minutesPlayed > 0 && (
                  <span className="text-xs text-txt-dim tabular-nums w-10 text-right">{stats.rating.toFixed(1)}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// SUBCOMPONENTS
// ------------------------------------------------------------

function LineupRow({ p, isUser }: { p: Player; isUser: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 border-b border-bg-border/50 last:border-0 ${isUser ? 'text-accent-soft font-semibold' : ''}`}>
      <span className="truncate flex items-center gap-1.5">
        <span className="text-[10px] text-txt-dim w-6 text-center">{p.primaryPosition}</span>
        {p.displayName} {isUser && <span className="text-[9px] bg-accent/20 px-1 rounded">YOU</span>}
      </span>
      <span className="text-xs font-semibold tabular-nums">{p.overall}</span>
    </div>
  );
}

function TeamHeader({ club, align }: { club: any; align?: 'right' }) {
  return (
    <div className={`flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <Crest club={club} size={48} />
      <div className={align === 'right' ? 'text-right' : ''}>
        <div className="text-sm font-semibold text-txt">{club.shortName}</div>
      </div>
    </div>
  );
}

function StatRow({ label, home, away, homeNum, awayNum }: { label: string; home: any; away: any; homeNum: number; awayNum: number }) {
  const total = homeNum + awayNum;
  const homePct = total > 0 ? (homeNum / total) * 100 : 50;
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-txt font-semibold tabular-nums">{home}</span>
        <span className="text-txt-dim">{label}</span>
        <span className="text-txt font-semibold tabular-nums">{away}</span>
      </div>
      <div className="flex h-1 rounded bg-bg-border overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${homePct}%` }} />
        <div className="h-full bg-txt-dim" style={{ width: `${100 - homePct}%` }} />
      </div>
    </div>
  );
}

function EventRow({ event, homeClubId }: { event: MatchEvent; homeClubId: string }) {
  const isHome = event.clubId === homeClubId;
  const color = event.type === 'Goal' || event.type === 'PenaltyGoal' ? 'text-state-win' : event.type === 'RedCard' ? 'text-state-loss' : event.type === 'YellowCard' ? 'text-state-warn' : 'text-txt-muted';
  return (
    <div className={`flex items-start gap-2 text-xs ${isHome ? '' : 'flex-row-reverse text-right'}`}>
      <span className="text-txt-dim tabular-nums w-8 shrink-0">{event.minute}'</span>
      <span className={`${color} flex-1`}>{event.description}</span>
    </div>
  );
}

function posGroup(pos: string): 'GK' | 'DEF' | 'MID' | 'ATT' {
  if (pos === 'GK') return 'GK';
  if (['RB', 'LB', 'CB'].includes(pos)) return 'DEF';
  if (['DM', 'CM', 'AM'].includes(pos)) return 'MID';
  return 'ATT';
}
