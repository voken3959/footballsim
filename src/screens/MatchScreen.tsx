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
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="text-center">
        <div className="label text-accent mb-2">Match Report</div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{report.competition} · {formatDate(report.playedDate)}</h1>
      </div>

      <div className="panel p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center gap-3 flex-1">
            <Crest club={homeClub} size={64} />
            <span className="text-sm md:text-base font-bold text-txt text-center">{homeClub.shortName}</span>
          </div>
          <div className="text-5xl md:text-6xl font-black text-white tracking-tighter tabular-nums px-4">
            {report.homeGoals} – {report.awayGoals}
          </div>
          <div className="flex flex-col items-center gap-3 flex-1">
            <Crest club={awayClub} size={64} />
            <span className="text-sm md:text-base font-bold text-txt text-center">{awayClub.shortName}</span>
          </div>
        </div>
      </div>

      {userStats && userStats.minutesPlayed > 0 && (
        <div className="panel p-4 border-accent/30 bg-accent/5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="label text-accent-soft">Your Performance</div>
              <div className="text-sm font-semibold text-txt mt-1">
                {userStats.minutesPlayed}' played
                {userStats.goals > 0 && ` · ${userStats.goals} goal${userStats.goals > 1 ? 's' : ''}`}
                {userStats.assists > 0 && ` · ${userStats.assists} assist${userStats.assists > 1 ? 's' : ''}`}
              </div>
            </div>
            <div className="text-center bg-bg-panel rounded-lg px-4 py-2 border border-bg-border">
              <div className="label mb-1">Rating</div>
              <div className={`text-2xl font-black tabular-nums tracking-tighter ${userStats.rating >= 8 ? 'text-state-win' : userStats.rating >= 7 ? 'text-accent-soft' : userStats.rating >= 6 ? 'text-txt' : 'text-state-loss'}`}>
                {userStats.rating.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      )}
      {userStats && userStats.minutesPlayed === 0 && (
        <div className="panel p-4 text-sm font-medium text-txt-muted text-center">You did not feature in this match.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="panel p-5">
          <div className="label mb-4">Match Stats</div>
          <div className="space-y-4">
            <StatRow label="Possession" home={`${report.homeTeamStats.possession}%`} away={`${report.awayTeamStats.possession}%`} homeNum={report.homeTeamStats.possession} awayNum={report.awayTeamStats.possession} />
            <StatRow label="Shots" home={report.homeTeamStats.shots} away={report.awayTeamStats.shots} homeNum={report.homeTeamStats.shots} awayNum={report.awayTeamStats.shots} />
            <StatRow label="Shots on target" home={report.homeTeamStats.shotsOnTarget} away={report.awayTeamStats.shotsOnTarget} homeNum={report.homeTeamStats.shotsOnTarget} awayNum={report.awayTeamStats.shotsOnTarget} />
            <StatRow label="xG" home={report.homeTeamStats.expectedGoals.toFixed(2)} away={report.awayTeamStats.expectedGoals.toFixed(2)} homeNum={report.homeTeamStats.expectedGoals} awayNum={report.awayTeamStats.expectedGoals} />
            <StatRow label="Corners" home={report.homeTeamStats.corners} away={report.awayTeamStats.corners} homeNum={report.homeTeamStats.corners} awayNum={report.awayTeamStats.corners} />
            <StatRow label="Fouls" home={report.homeTeamStats.fouls} away={report.awayTeamStats.fouls} homeNum={report.homeTeamStats.fouls} awayNum={report.awayTeamStats.fouls} />
          </div>
        </div>

        <div className="panel p-5">
          <div className="label mb-4">Key Events</div>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {report.events.filter((e) => ['Goal', 'PenaltyGoal', 'RedCard', 'YellowCard', 'Substitution', 'Injury'].includes(e.type)).map((e, i) => (
              <EventRow key={i} event={e} homeClubId={report.homeClubId} />
            ))}
          </div>
        </div>
      </div>

      {motmPlayer && motmClub && (
        <div className="panel p-5">
          <div className="label mb-3">Man of the Match</div>
          <div className="flex items-center gap-4">
            <Crest club={motmClub} size={40} />
            <div className="flex-1">
              <div className="text-sm font-bold text-white">{motmPlayer.displayName}</div>
              <div className="text-xs font-medium text-txt-muted">{motmClub.shortName}</div>
            </div>
            <div className="text-3xl font-black text-accent-soft tabular-nums tracking-tighter">{motm!.rating.toFixed(1)}</div>
          </div>
        </div>
      )}

      <button className="btn btn-primary w-full py-3" onClick={onContinue}>Continue</button>
    </div>
  );
}

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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <div className="label text-accent">Matches</div>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Matchday</h1>
      </div>

      {next && opponent ? (
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="label">Next Match</div>
            <div className="text-xs font-bold bg-bg-hover px-2.5 py-1 rounded-md text-txt-muted">{formatDate(next.date)}</div>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0 justify-end">
              <div className="text-right">
                <div className="text-base font-bold text-white truncate">{club.shortName}</div>
                <div className="text-[11px] font-medium text-txt-muted uppercase tracking-wider mt-0.5">{isHome ? 'Home' : 'Away'}</div>
              </div>
              <Crest club={club} size={56} />
            </div>
            
            <div className="text-xl font-black text-txt-dim px-2">VS</div>
            
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Crest club={opponent} size={56} />
              <div className="text-left">
                <div className="text-base font-bold text-white truncate">{opponent.shortName}</div>
                <div className="text-[11px] font-medium text-txt-muted truncate mt-0.5">{opponent.managerName}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="bg-bg-card rounded-lg p-3 border border-bg-border text-center">
              <div className="label mb-1">Your Fitness</div>
              <div className={`text-lg font-black tabular-nums ${user.fitness > 70 ? 'text-state-win' : user.fitness > 40 ? 'text-state-warn' : 'text-state-loss'}`}>{user.fitness}</div>
            </div>
            <div className="bg-bg-card rounded-lg p-3 border border-bg-border text-center">
              <div className="label mb-1">Opponent Rep</div>
              <div className="text-lg font-black text-txt tabular-nums">{opponent.reputation}</div>
            </div>
            <div className="bg-bg-card rounded-lg p-3 border border-bg-border text-center">
              <div className="label mb-1">Your Form</div>
              <div className="text-lg font-black text-txt">{user.form > 1 ? 'Good' : user.form < -1 ? 'Poor' : 'Avg'}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
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
            <div className="mt-6 pt-6 border-t border-bg-border">
              <div className="label mb-3">Expected Starting XI ({club.formation})</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                {(['GK', 'DEF', 'MID', 'ATT'] as const).map(group => (
                  groupedLineup[group].map(p => <LineupRow key={p.id} p={p} isUser={p.id === user.id} />)
                ))}
              </div>
              
              <div className="label mt-6 mb-3">Bench</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                {selection.bench.map(p => <LineupRow key={p.id} p={p} isUser={p.id === user.id} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="panel p-8 text-center text-txt-muted font-medium">No upcoming fixtures this season.</div>
      )}

      <div className="panel overflow-hidden">
        <div className="px-5 py-3.5 border-b border-bg-border bg-bg-panel/50">
          <div className="label">Recent Results</div>
        </div>
        {recentReports.length === 0 ? (
          <div className="p-6 text-sm text-txt-muted text-center">No matches played yet.</div>
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
              <div key={r.id} className="table-row flex items-center gap-3 px-5 py-3 text-sm">
                <span className={`w-6 h-6 flex items-center justify-center rounded font-black text-[11px] ${result === 'W' ? 'bg-accent/20 text-accent-soft' : result === 'D' ? 'bg-txt-dim/20 text-txt-muted' : 'bg-state-loss/20 text-state-loss'}`}>
                  {result}
                </span>
                <span className="text-txt-muted text-xs font-semibold w-12">{formatShort(r.playedDate)}</span>
                <span className="text-txt-dim text-xs font-bold w-4">{isUserHome ? 'H' : 'A'}</span>
                <span className="text-txt font-semibold flex-1 truncate">{opp.shortName}</span>
                <span className="text-white font-black tabular-nums">{userGoals}–{oppGoals}</span>
                {stats && stats.minutesPlayed > 0 && (
                  <span className="text-xs font-bold text-txt-muted tabular-nums w-10 text-right bg-bg-hover px-1.5 py-0.5 rounded">{stats.rating.toFixed(1)}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function LineupRow({ p, isUser }: { p: Player; isUser: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 border-b border-bg-border/50 last:border-0 ${isUser ? 'text-accent-soft' : 'text-txt'}`}>
      <span className="truncate flex items-center gap-2 text-sm font-semibold">
        <span className="text-[10px] font-black text-txt-dim w-6 bg-bg-card px-1 py-0.5 rounded text-center">{p.primaryPosition}</span>
        {p.displayName} {isUser && <span className="text-[9px] font-black bg-accent/20 px-1.5 py-0.5 rounded uppercase tracking-wider">You</span>}
      </span>
      <span className="text-xs font-black tabular-nums">{p.overall}</span>
    </div>
  );
}

function StatRow({ label, home, away, homeNum, awayNum }: { label: string; home: any; away: any; homeNum: number; awayNum: number }) {
  const total = homeNum + awayNum;
  const homePct = total > 0 ? (homeNum / total) * 100 : 50;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-white font-bold tabular-nums">{home}</span>
        <span className="text-txt-muted font-medium">{label}</span>
        <span className="text-white font-bold tabular-nums">{away}</span>
      </div>
      <div className="flex h-1.5 rounded-full bg-bg-border/50 overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${homePct}%` }} />
        <div className="h-full bg-txt-dim/50" style={{ width: `${100 - homePct}%` }} />
      </div>
    </div>
  );
}

function EventRow({ event, homeClubId }: { event: MatchEvent; homeClubId: string }) {
  const isHome = event.clubId === homeClubId;
  const isGoal = event.type === 'Goal' || event.type === 'PenaltyGoal';
  const isRed = event.type === 'RedCard';
  const isYellow = event.type === 'YellowCard';
  
  return (
    <div className={`flex items-start gap-3 text-xs ${isHome ? '' : 'flex-row-reverse text-right'}`}>
      <span className="text-txt-dim font-bold tabular-nums w-8 shrink-0 bg-bg-card px-1 py-0.5 rounded text-center">{event.minute}'</span>
      <div className={`flex-1 ${isGoal ? 'text-accent-soft font-bold' : isRed ? 'text-state-loss font-semibold' : isYellow ? 'text-state-warn font-medium' : 'text-txt-muted'}`}>
        {event.description}
      </div>
    </div>
  );
}

function posGroup(pos: string): 'GK' | 'DEF' | 'MID' | 'ATT' {
  if (pos === 'GK') return 'GK';
  if (['RB', 'LB', 'CB'].includes(pos)) return 'DEF';
  if (['DM', 'CM', 'AM'].includes(pos)) return 'MID';
  return 'ATT';
}