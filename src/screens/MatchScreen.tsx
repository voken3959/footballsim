import { useState, useEffect, useRef } from 'react';
import { useCareerStore } from '../store/careerStore';
import { Crest } from '../components/Layout';
import { formatDate, formatShort } from '../game/dates';
import { selectMatchdaySquad } from '../game/squadSelection';
import { MatchSimulation } from '../game/matchEngine';
import { RNG } from '../game/rng';
import type { MatchReport, MatchEvent, Player, MatchSimOptions } from '../game/types';

export default function MatchScreen() {
  const lastReport = useCareerStore((s) => s.lastMatchReport);
  const clearResults = useCareerStore((s) => s.clearResults);
  const [isLive, setIsLive] = useState(false);
  const [liveReport, setLiveReport] = useState<MatchReport | null>(null);

  if (lastReport) {
    return <MatchReportView report={lastReport} onContinue={clearResults} />;
  }
  
  if (isLive && liveReport) {
    return <LiveMatchView report={liveReport} onClose={() => { setIsLive(false); setLiveReport(null); clearResults(); }} />;
  }

  return <MatchdayView onStartLive={(report) => { setIsLive(true); setLiveReport(report); }} />;
}

// ------------------------------------------------------------
// LIVE MATCH VIEW
// ------------------------------------------------------------

function LiveMatchView({ report, onClose }: { report: MatchReport, onClose: () => void }) {
  const save = useCareerStore((s) => s.save)!;
  const user = useCareerStore((s) => s.userPlayer())!;
  const [activeTab, setActiveTab] = useState<'pitch' | 'stats'>('pitch');
  
  const homeClub = save.clubs.find(c => c.id === report.homeClubId)!;
  const awayClub = save.clubs.find(c => c.id === report.awayClubId)!;
  const userStats = report.playerStats.find(s => s.playerId === user.id);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Scoreboard */}
      <div className="panel p-4 flex items-center justify-between sticky top-0 z-10 bg-bg-panel/90 backdrop-blur-md">
        <div className="flex items-center gap-3 flex-1 justify-end">
          <span className="font-bold text-lg text-white truncate">{homeClub.shortName}</span>
          <Crest club={homeClub} size={40} />
        </div>
        <div className="text-center px-6">
          <div className="text-3xl font-black text-white tabular-nums">
            {report.homeGoals} - {report.awayGoals}
          </div>
          <div className="text-xs font-bold text-accent mt-1 animate-pulse">LIVE</div>
        </div>
        <div className="flex items-center gap-3 flex-1">
          <Crest club={awayClub} size={40} />
          <span className="font-bold text-lg text-white truncate">{awayClub.shortName}</span>
        </div>
      </div>

      <div className="flex gap-2 border-b border-bg-border pb-2">
        <button onClick={() => setActiveTab('pitch')} className={`btn text-sm ${activeTab === 'pitch' ? 'btn-primary' : 'btn-ghost'}`}>Pitch View</button>
        <button onClick={() => setActiveTab('stats')} className={`btn text-sm ${activeTab === 'stats' ? 'btn-primary' : 'btn-ghost'}`}>Live Stats</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-4">
          {activeTab === 'pitch' && <PitchVisualisation report={report} user={user} />}
          {activeTab === 'stats' && (
            <div className="panel p-5 space-y-6">
              <div className="label">Match Statistics</div>
              <StatRow label="Possession" home={`${report.homeTeamStats.possession}%`} away={`${report.awayTeamStats.possession}%`} homeNum={report.homeTeamStats.possession} awayNum={report.awayTeamStats.possession} />
              <StatRow label="Shots" home={report.homeTeamStats.shots} away={report.awayTeamStats.shots} homeNum={report.homeTeamStats.shots} awayNum={report.awayTeamStats.shots} />
              <StatRow label="Shots on Target" home={report.homeTeamStats.shotsOnTarget} away={report.awayTeamStats.shotsOnTarget} homeNum={report.homeTeamStats.shotsOnTarget} awayNum={report.awayTeamStats.shotsOnTarget} />
              <StatRow label="xG" home={report.homeTeamStats.expectedGoals.toFixed(2)} away={report.awayTeamStats.expectedGoals.toFixed(2)} homeNum={report.homeTeamStats.expectedGoals} awayNum={report.awayTeamStats.expectedGoals} />
            </div>
          )}
        </div>

        <div className="space-y-4">
          {userStats && (
            <div className="panel p-4 border-accent/30 bg-accent/5">
              <div className="label mb-2 text-accent-soft">Your Performance</div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-white">Rating</span>
                <span className="text-2xl font-black text-accent-soft">{userStats.rating.toFixed(1)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between"><span className="text-txt-muted">Passes</span><span className="text-white font-bold">{userStats.passesCompleted}/{userStats.passesAttempted}</span></div>
                <div className="flex justify-between"><span className="text-txt-muted">Shots</span><span className="text-white font-bold">{userStats.shots}</span></div>
                <div className="flex justify-between"><span className="text-txt-muted">Tackles</span><span className="text-white font-bold">{userStats.tackles}</span></div>
                <div className="flex justify-between"><span className="text-txt-muted">Dribbles</span><span className="text-white font-bold">{userStats.dribblesCompleted}</span></div>
              </div>
            </div>
          )}

          <div className="panel p-4 flex-1">
            <div className="label mb-3">Live Commentary</div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {[...report.events].reverse().map((e, i) => (
                <div key={i} className="text-xs flex gap-2">
                  <span className="text-txt-dim font-bold w-6">{e.minute}'</span>
                  <span className={e.type === 'Goal' ? 'text-accent-soft font-bold' : 'text-txt'}>{e.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <button className="btn btn-primary w-full py-3" onClick={onClose}>Finish Match</button>
    </div>
  );
}

function PitchVisualisation({ report, user }: { report: MatchReport, user: Player }) {
  // This is a simplified representation. In a real 2D engine we'd have x/y coordinates.
  // Here we just assign players to static formation slots and highlight the one with the ball.
  const save = useCareerStore(s => s.save)!;
  const homeClub = save.clubs.find(c => c.id === report.homeClubId)!;
  const awayClub = save.clubs.find(c => c.id === report.awayClubId)!;
  
  // Fake positions for visualisation
  const homeFormation = ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CAM', 'LW', 'ST', 'RW'];
  const awayFormation = ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CDM', 'CAM', 'RW', 'ST', 'LW'];

  return (
    <div className="panel p-4 bg-[#1b5e20] border-4 border-[#2e7d32] rounded-xl relative overflow-hidden aspect-[3/4] md:aspect-video">
      {/* Pitch Markings */}
      <div className="absolute inset-4 border-2 border-white/20 rounded-sm" />
      <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/20 rounded-full" />
      
      {/* Home Team (Left) */}
      <div className="absolute inset-y-0 left-0 w-1/2 p-2">
        <div className="relative w-full h-full">
          {homeFormation.map((pos, i) => (
             <div key={`h-${i}`} className={`absolute w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md ${pos === 'GK' ? 'bg-yellow-400 text-black' : 'bg-blue-600 text-white'}`}
               style={{
                 top: `${10 + (i % 5) * 20}%`,
                 left: `${15 + Math.floor(i / 5) * 30}%`,
               }}
             >
               {pos}
             </div>
          ))}
        </div>
      </div>

      {/* Away Team (Right) */}
      <div className="absolute inset-y-0 right-0 w-1/2 p-2">
        <div className="relative w-full h-full">
          {awayFormation.map((pos, i) => (
             <div key={`a-${i}`} className={`absolute w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md ${pos === 'GK' ? 'bg-yellow-400 text-black' : 'bg-red-600 text-white'}`}
               style={{
                 top: `${10 + (i % 5) * 20}%`,
                 right: `${15 + Math.floor(i / 5) * 30}%`,
               }}
             >
               {pos}
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// MATCHDAY VIEW
// ------------------------------------------------------------

function MatchdayView({ onStartLive }: { onStartLive: (report: MatchReport) => void }) {
  const save = useCareerStore((s) => s.save)!;
  const user = useCareerStore((s) => s.userPlayer())!;
  const club = useCareerStore((s) => s.userClub())!;
  const next = useCareerStore((s) => s.nextFixture());
  const advanceToNextMatch = useCareerStore((s) => s.advanceToNextMatch);
  const loading = useCareerStore((s) => s.loading);
  const [phase, setPhase] = useState<'idle' | 'fast-forward' | 'simulating'>('idle');
  const [showLineup, setShowLineup] = useState(false);

  const playNextMatch = async () => {
    setPhase('fast-forward');
    await advanceToNextMatch(); // Get to the day before the match
    
    // We need to simulate this specific match live
    setPhase('simulating');
    
    // The game state hasn't been saved with the match result yet, we simulate it now.
    const oppId = next?.homeClubId === club.id ? next?.awayClubId : next?.homeClubId;
    const oppClub = save.clubs.find(c => c.id === oppId)!;
    
    const opts = {
      homeClub: next?.homeClubId === club.id ? club : oppClub,
      awayClub: next?.homeClubId === club.id ? oppClub : club,
      homeSquad: save.players.filter(p => p.clubId === (next?.homeClubId === club.id ? club.id : oppClub.id)),
      awaySquad: save.players.filter(p => p.clubId === (next?.homeClubId === club.id ? oppClub.id : club.id)),
      rng: new RNG(save.seed, save.rngState),
      competition: 'League',
      fixtureId: next!.id,
      playedDate: next!.date,
      userPlayerId: user.id
    };

    const sim = new MatchSimulation(opts);
    
    // Step through the match minute by minute
    const interval = setInterval(() => {
      const finished = sim.tick();
      
      // Build a partial report for the UI to render
      const currentReport = sim.buildReport(opts).report;
      onStartLive(currentReport);
      
      if (finished) {
        clearInterval(interval);
      }
    }, 150); // 150ms per minute = ~15 seconds per match
  };

  const opponent = next ? save.clubs.find((c) => c.id === (next.homeClubId === club.id ? next.awayClubId : next.homeClubId)) : null;
  const isHome = next ? next.homeClubId === club.id : false;

  const recentReports = save.matchReports.filter((r) => r.homeClubId === club.id || r.awayClubId === club.id).slice(-8).reverse();

  const matchRng = new RNG(save.seed, save.rngState);
  const selection = selectMatchdaySquad({ club, squad: save.players.filter(p => p.clubId === club.id), userPlayerId: user.id, matchImportance: 0.6, rng: matchRng });
  const groupedLineup = { GK: [] as Player[], DEF: [] as Player[], MID: [] as Player[], ATT: [] as Player[] };
  selection.starters.forEach(p => { groupedLineup[posGroup(selection.slots.get(p) ?? p.primaryPosition)].push(p); });

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
            <button className="btn flex-1" onClick={() => setShowLineup(!showLineup)}>
              {showLineup ? 'Hide Expected Lineup' : 'View Expected Lineup'}
            </button>
            <button className="btn btn-primary flex-1" onClick={playNextMatch} disabled={loading || phase !== 'idle'}>
              {user.injury ? `Watch Match (Injured)` : phase === 'fast-forward' ? 'Preparing…' : phase === 'simulating' ? 'Simulating…' : 'Watch Next Match Live'}
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

// Keep MatchReportView as it was for the final summary
function MatchReportView({ report, onContinue }: { report: MatchReport; onContinue: () => void }) {
  const save = useCareerStore((s) => s.save)!;
  const user = useCareerStore((s) => s.userPlayer())!;
  const homeClub = save.clubs.find((c) => c.id === report.homeClubId)!;
  const awayClub = save.clubs.find((c) => c.id === report.awayClubId)!;
  const userStats = report.playerStats.find((s) => s.playerId === user.id);
  const motm = report.manOfTheMatch ? report.playerStats.find((s) => s.playerId === report.manOfTheMatch) : null;
  const motmPlayer = motm ? save.players.find((p) => p.id === motm.playerId) : null;
  const motmClub = motmPlayer ? save.clubs.find((c) => c.id === motmPlayer.clubId) : null;

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
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4 border-b border-accent/20 pb-3">
            <div>
              <div className="label text-accent-soft">Your Performance</div>
              <div className="text-sm font-semibold text-txt mt-1">
                {userStats.minutesPlayed}' played
              </div>
            </div>
            <div className="text-center bg-bg-panel rounded-lg px-4 py-2 border border-bg-border">
              <div className="label mb-1">Rating</div>
              <div className={`text-2xl font-black tabular-nums tracking-tighter ${userStats.rating >= 8 ? 'text-state-win' : userStats.rating >= 7 ? 'text-accent-soft' : userStats.rating >= 6 ? 'text-txt' : 'text-state-loss'}`}>
                {userStats.rating.toFixed(1)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="flex justify-between"><span className="text-txt-muted">Passes</span><span className="text-white font-bold">{userStats.passesCompleted}/{userStats.passesAttempted}</span></div>
            <div className="flex justify-between"><span className="text-txt-muted">Shots</span><span className="text-white font-bold">{userStats.shots} ({userStats.shotsOnTarget} on target)</span></div>
            <div className="flex justify-between"><span className="text-txt-muted">Tackles</span><span className="text-white font-bold">{userStats.tackles}</span></div>
            <div className="flex justify-between"><span className="text-txt-muted">Dribbles</span><span className="text-white font-bold">{userStats.dribblesCompleted}</span></div>
            <div className="flex justify-between"><span className="text-txt-muted">Interceptions</span><span className="text-white font-bold">{userStats.interceptions}</span></div>
            <div className="flex justify-between"><span className="text-txt-muted">Clearances</span><span className="text-white font-bold">{userStats.clearances}</span></div>
            <div className="flex justify-between"><span className="text-txt-muted">Key Passes</span><span className="text-white font-bold">{userStats.keyPasses}</span></div>
            <div className="flex justify-between"><span className="text-txt-muted">Saves</span><span className="text-white font-bold">{userStats.saves}</span></div>
          </div>
        </div>
      )}

      <div className="panel p-4">
        <div className="label mb-3">Full Match Events</div>
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {report.events.filter((e) => e.type !== 'KickOff' && e.type !== 'HalfTime').map((e, i) => (
            <div key={i} className={`flex items-start gap-3 text-xs p-2 rounded-lg bg-bg-card/50 ${e.type === 'Goal' ? 'border border-accent/30' : ''}`}>
              <span className="text-txt-dim font-bold tabular-nums w-8">{e.minute}'</span>
              <span className={e.type === 'Goal' ? 'text-accent-soft font-bold' : e.type === 'RedCard' ? 'text-state-loss font-bold' : 'text-txt'}>{e.description}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-primary w-full py-3" onClick={onContinue}>Continue</button>
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

function posGroup(pos: string): 'GK' | 'DEF' | 'MID' | 'ATT' {
  if (pos === 'GK') return 'GK';
  if (['RB', 'LB', 'CB'].includes(pos)) return 'DEF';
  if (['DM', 'CM', 'AM'].includes(pos)) return 'MID';
  return 'ATT';
}