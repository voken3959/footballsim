import { useState, useEffect } from 'react';
import { useCareerStore } from '../store/careerStore';
import { Crest } from '../components/Layout';
import { formatDate, formatShort } from '../game/dates';
import { selectMatchdaySquad } from '../game/squadSelection';
import { MatchSimulation } from '../game/matchEngine';
import { RNG } from '../game/rng';
import type { MatchReport, MatchEvent, Player, Position } from '../game/types';

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
    <div className="space-y-4 max-w-5xl mx-auto pb-20 md:pb-0">
      {/* Scoreboard */}
      <div className="panel p-3 md:p-4 flex items-center justify-between sticky top-0 z-20 bg-bg-panel/95 backdrop-blur-md shadow-md">
        <div className="flex items-center gap-2 md:gap-3 flex-1 justify-end">
          <span className="font-bold text-sm md:text-lg text-white truncate">{homeClub.shortName}</span>
          <Crest club={homeClub} size={32} />
        </div>
        <div className="text-center px-4 md:px-6">
          <div className="text-2xl md:text-3xl font-black text-white tabular-nums">
            {report.homeGoals} - {report.awayGoals}
          </div>
          <div className="text-[10px] font-bold text-accent mt-0.5 animate-pulse">LIVE</div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-1">
          <Crest club={awayClub} size={32} />
          <span className="font-bold text-sm md:text-lg text-white truncate">{awayClub.shortName}</span>
        </div>
      </div>

      <div className="flex gap-2 border-b border-bg-border pb-2 px-2">
        <button onClick={() => setActiveTab('pitch')} className={`btn text-xs py-1.5 flex-1 md:flex-none ${activeTab === 'pitch' ? 'btn-primary' : 'btn-ghost'}`}>Pitch View</button>
        <button onClick={() => setActiveTab('stats')} className={`btn text-xs py-1.5 flex-1 md:flex-none ${activeTab === 'stats' ? 'btn-primary' : 'btn-ghost'}`}>Live Stats</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 px-2 md:px-0">
        <div className="md:col-span-2 space-y-4">
          {activeTab === 'pitch' && <PitchVisualisation report={report} user={user} />}
          {activeTab === 'stats' && (
            <div className="panel p-4 md:p-5 space-y-4">
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
            <div className="space-y-2 max-h-[300px] md:max-h-[500px] overflow-y-auto pr-2">
              {[...report.events].reverse().map((e, i) => (
                <div key={i} className="text-xs flex gap-2">
                  <span className="text-txt-dim font-bold w-6 shrink-0">{e.minute}'</span>
                  <span className={e.type === 'Goal' ? 'text-accent-soft font-bold' : 'text-txt'}>{e.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-2 md:px-0">
        <button className="btn btn-primary w-full py-3" onClick={onClose}>Finish Match</button>
      </div>
    </div>
  );
}

function PitchVisualisation({ report, user }: { report: MatchReport, user: Player }) {
  const save = useCareerStore(s => s.save)!;
  const homeClub = save.clubs.find(c => c.id === report.homeClubId)!;
  const awayClub = save.clubs.find(c => c.id === report.awayClubId)!;
  
  // Hardcoded formations for visualisation, using a 4-3-3 style
  const homeFormation = [
    { pos: 'ST', row: 0, col: 1 },
    { pos: 'LW', row: 0, col: 0 },
    { pos: 'RW', row: 0, col: 2 },
    { pos: 'CM', row: 1, col: 0 },
    { pos: 'CM', row: 1, col: 1 },
    { pos: 'CM', row: 1, col: 2 },
    { pos: 'LB', row: 2, col: 0 },
    { pos: 'CB', row: 2, col: 1 },
    { pos: 'CB', row: 2, col: 2 },
    { pos: 'RB', row: 2, col: 3 },
    { pos: 'GK', row: 3, col: 1.5 },
  ];

  const awayFormation = [
    { pos: 'GK', row: 0, col: 1.5 },
    { pos: 'LB', row: 1, col: 0 },
    { pos: 'CB', row: 1, col: 1 },
    { pos: 'CB', row: 1, col: 2 },
    { pos: 'RB', row: 1, col: 3 },
    { pos: 'CM', row: 2, col: 0 },
    { pos: 'CM', row: 2, col: 1 },
    { pos: 'CM', row: 2, col: 2 },
    { pos: 'LW', row: 3, col: 0 },
    { pos: 'ST', row: 3, col: 1 },
    { pos: 'RW', row: 3, col: 2 },
  ];

  // Get starting XI for both teams (using the same logic as the engine)
  const userSquad = save.players.filter(p => p.clubId === homeClub.id);
  const oppSquad = save.players.filter(p => p.clubId === awayClub.id);
  
  const homeXI = selectMatchdaySquad({ club: homeClub, squad: userSquad, userPlayerId: user.id, matchImportance: 0.6, rng: new RNG() }).starters;
  const awayXI = selectMatchdaySquad({ club: awayClub, squad: oppSquad, userPlayerId: '__none__', matchImportance: 0.6, rng: new RNG() }).starters;

  const getKitStyle = (club: typeof homeClub) => ({
    backgroundColor: club.primaryColor,
    borderColor: club.secondaryColor,
  });

  const renderPlayer = (p: Player | undefined, isUser: boolean, kit: any) => {
    if (!p) return null;
    return (
      <div className="flex flex-col items-center gap-1 md:gap-1.5 z-10">
        <div 
          className="w-8 h-8 md:w-10 md:h-10 rounded-t-md rounded-b-sm relative shadow-lg border-b-4"
          style={kit}
        >
          {/* Sleeves */}
          <div className="absolute top-0 -left-1.5 w-3 h-4 rounded-sm border-b-2" style={{ backgroundColor: kit.backgroundColor, borderColor: kit.borderColor }} />
          <div className="absolute top-0 -right-1.5 w-3 h-4 rounded-sm border-b-2" style={{ backgroundColor: kit.backgroundColor, borderColor: kit.borderColor }} />
        </div>
        <div className={`px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-bold whitespace-nowrap shadow-md ${isUser ? 'bg-accent text-white' : 'bg-[#1a1a1a]/90 text-white'}`}>
          {p.surname || p.displayName.split(' ')[1] || p.displayName}
        </div>
      </div>
    );
  };

  return (
    <div className="panel p-2 md:p-4 bg-[#1b5e20] border-4 md:border-[6px] border-[#2e7d32] rounded-xl relative overflow-hidden w-full aspect-[2/3] md:aspect-[4/5]">
      
      {/* Pitch Markings */}
      <div className="absolute inset-2 md:inset-4 border-2 border-white/20 rounded-sm" />
      <div className="absolute top-1/2 left-2 right-2 md:left-4 md:right-4 h-0.5 bg-white/20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 md:w-32 md:h-32 border-2 border-white/20 rounded-full" />
      
      {/* Penalty Areas */}
      <div className="absolute top-2 md:top-4 left-1/2 -translate-x-1/2 w-32 md:w-48 h-16 md:h-24 border-2 border-t-0 border-white/20" />
      <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 w-32 md:w-48 h-16 md:h-24 border-2 border-b-0 border-white/20" />

      {/* Home Team (Top Half) */}
      <div className="absolute top-4 md:top-8 left-0 right-0 h-1/2 px-4 md:px-8">
        <div className="grid grid-cols-4 grid-rows-4 w-full h-full">
          {homeFormation.map((slot, i) => (
            <div key={`h-${i}`} className="flex items-center justify-center" style={{ gridRow: slot.row + 1, gridColumn: slot.col + 1 }}>
              {renderPlayer(homeXI[i], homeXI[i]?.id === user.id, getKitStyle(homeClub))}
            </div>
          ))}
        </div>
      </div>

      {/* Away Team (Bottom Half) */}
      <div className="absolute bottom-4 md:bottom-8 left-0 right-0 h-1/2 px-4 md:px-8">
        <div className="grid grid-cols-4 grid-rows-4 w-full h-full">
          {awayFormation.map((slot, i) => (
            <div key={`a-${i}`} className="flex items-center justify-center" style={{ gridRow: slot.row + 1, gridColumn: slot.col + 1 }}>
              {renderPlayer(awayXI[i], false, getKitStyle(awayClub))}
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
    await advanceToNextMatch(); 
    
    setPhase('simulating');
    
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
    
    const interval = setInterval(() => {
      const finished = sim.tick();
      const currentReport = sim.buildReport(opts).report;
      onStartLive(currentReport);
      
      if (finished) {
        clearInterval(interval);
      }
    }, 150); 
  };

  const opponent = next ? save.clubs.find((c) => c.id === (next.homeClubId === club.id ? next.awayClubId : next.homeClubId)) : null;
  const isHome = next ? next.homeClubId === club.id : false;

  const recentReports = save.matchReports.filter((r) => r.homeClubId === club.id || r.awayClubId === club.id).slice(-8).reverse();

  const matchRng = new RNG(save.seed, save.rngState);
  const selection = selectMatchdaySquad({ club, squad: save.players.filter(p => p.clubId === club.id), userPlayerId: user.id, matchImportance: 0.6, rng: matchRng });
  
  const groupedLineup = { GK: [] as Player[], DEF: [] as Player[], MID: [] as Player[], ATT: [] as Player[] };
  selection.starters.forEach(p => { groupedLineup[posGroup(selection.slots.get(p) ?? p.primaryPosition)].push(p); });

  // Build a pitch view for the Matchday lineup preview
  const startingXI = selection.starters;
  const homeFormation = [
    { pos: 'ST', row: 0, col: 1 },
    { pos: 'LW', row: 0, col: 0 },
    { pos: 'RW', row: 0, col: 2 },
    { pos: 'CM', row: 1, col: 0 },
    { pos: 'CM', row: 1, col: 1 },
    { pos: 'CM', row: 1, col: 2 },
    { pos: 'LB', row: 2, col: 0 },
    { pos: 'CB', row: 2, col: 1 },
    { pos: 'CB', row: 2, col: 2 },
    { pos: 'RB', row: 2, col: 3 },
    { pos: 'GK', row: 3, col: 1.5 },
  ];

  const getKitStyle = (c: any) => ({ backgroundColor: c.primaryColor, borderColor: c.secondaryColor });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 md:pb-0 px-2 md:px-0">
      <div>
        <div className="label text-accent">Matches</div>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Matchday</h1>
      </div>

      {next && opponent ? (
        <div className="panel p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="label">Next Match</div>
            <div className="text-[10px] md:text-xs font-bold bg-bg-hover px-2.5 py-1 rounded-md text-txt-muted">{formatDate(next.date)}</div>
          </div>
          
          <div className="flex items-center justify-between gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0 justify-end">
              <div className="text-right">
                <div className="text-sm md:text-base font-bold text-white truncate">{club.shortName}</div>
                <div className="text-[9px] md:text-[11px] font-medium text-txt-muted uppercase tracking-wider mt-0.5">{isHome ? 'Home' : 'Away'}</div>
              </div>
              <Crest club={club} size={40} />
            </div>
            
            <div className="text-sm md:text-xl font-black text-txt-dim px-2">VS</div>
            
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              <Crest club={opponent} size={40} />
              <div className="text-left">
                <div className="text-sm md:text-base font-bold text-white truncate">{opponent.shortName}</div>
                <div className="text-[9px] md:text-[11px] font-medium text-txt-muted truncate mt-0.5">{opponent.managerName}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 md:mt-6 grid grid-cols-3 gap-2 md:gap-3">
            <div className="bg-bg-card rounded-lg p-2 md:p-3 border border-bg-border text-center">
              <div className="label text-[8px] md:text-[10px] mb-0.5 md:mb-1">Fitness</div>
              <div className={`text-sm md:text-lg font-black tabular-nums ${user.fitness > 70 ? 'text-state-win' : user.fitness > 40 ? 'text-state-warn' : 'text-state-loss'}`}>{user.fitness}</div>
            </div>
            <div className="bg-bg-card rounded-lg p-2 md:p-3 border border-bg-border text-center">
              <div className="label text-[8px] md:text-[10px] mb-0.5 md:mb-1">Opp Rep</div>
              <div className="text-sm md:text-lg font-black text-txt tabular-nums">{opponent.reputation}</div>
            </div>
            <div className="bg-bg-card rounded-lg p-2 md:p-3 border border-bg-border text-center">
              <div className="label text-[8px] md:text-[10px] mb-0.5 md:mb-1">Form</div>
              <div className="text-sm md:text-lg font-black text-txt">{user.form > 1 ? 'Good' : user.form < -1 ? 'Poor' : 'Avg'}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mt-4 md:mt-6">
            <button className="btn text-xs md:text-sm py-2 flex-1" onClick={() => setShowLineup(!showLineup)}>
              {showLineup ? 'Hide Lineup' : 'View Lineup'}
            </button>
            <button className="btn btn-primary text-xs md:text-sm py-2 flex-1" onClick={playNextMatch} disabled={loading || phase !== 'idle'}>
              {user.injury ? `Simulate (Injured)` : phase === 'fast-forward' ? 'Preparing…' : phase === 'simulating' ? 'Simulating…' : 'Play Live Match'}
            </button>
          </div>

          {showLineup && (
            <div className="mt-6 pt-6 border-t border-bg-border">
              <div className="label mb-3 text-center">Expected Starting XI</div>
              
              {/* 2D Pitch View */}
              <div className="bg-[#1b5e20] border-4 md:border-[6px] border-[#2e7d32] rounded-xl relative overflow-hidden w-full aspect-[2/3] md:aspect-[4/5] mb-6">
                <div className="absolute inset-2 md:inset-4 border-2 border-white/20 rounded-sm" />
                <div className="absolute top-1/2 left-2 right-2 md:left-4 md:right-4 h-0.5 bg-white/20" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 md:w-32 md:h-32 border-2 border-white/20 rounded-full" />
                <div className="absolute top-2 md:top-4 left-1/2 -translate-x-1/2 w-32 md:w-48 h-16 md:h-24 border-2 border-t-0 border-white/20" />
                <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 w-32 md:w-48 h-16 md:h-24 border-2 border-b-0 border-white/20" />

                <div className="absolute inset-0 top-4 md:top-8 px-2 md:px-8 pb-8 h-full">
                  <div className="grid grid-cols-4 grid-rows-4 w-full h-full">
                    {homeFormation.map((slot, i) => {
                      const p = startingXI[i];
                      if (!p) return null;
                      const isUser = p.id === user.id;
                      return (
                        <div key={`h-${i}`} className="flex items-center justify-center" style={{ gridRow: slot.row + 1, gridColumn: slot.col + 1 }}>
                          <div className="flex flex-col items-center gap-1 md:gap-1.5 z-10 scale-90 md:scale-100">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-t-md rounded-b-sm relative shadow-lg border-b-4" style={getKitStyle(club)}>
                              <div className="absolute top-0 -left-1.5 w-3 h-4 rounded-sm border-b-2" style={{ backgroundColor: club.primaryColor, borderColor: club.secondaryColor }} />
                              <div className="absolute top-0 -right-1.5 w-3 h-4 rounded-sm border-b-2" style={{ backgroundColor: club.primaryColor, borderColor: club.secondaryColor }} />
                            </div>
                            <div className={`px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-bold whitespace-nowrap shadow-md ${isUser ? 'bg-accent text-white' : 'bg-[#1a1a1a]/90 text-white'}`}>
                              {p.surname || p.displayName.split(' ')[1] || p.displayName}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="label mb-3">Bench</div>
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
        <div className="px-4 py-3 border-b border-bg-border bg-bg-panel/50">
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
              <div key={r.id} className="table-row flex items-center gap-2 md:gap-3 px-4 py-2.5 text-xs md:text-sm">
                <span className={`w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded font-black text-[9px] md:text-[11px] ${result === 'W' ? 'bg-accent/20 text-accent-soft' : result === 'D' ? 'bg-txt-dim/20 text-txt-muted' : 'bg-state-loss/20 text-state-loss'}`}>
                  {result}
                </span>
                <span className="text-txt-muted text-[9px] md:text-xs font-semibold w-10 md:w-12">{formatShort(r.playedDate)}</span>
                <span className="text-txt-dim text-[9px] md:text-xs font-bold w-4">{isUserHome ? 'H' : 'A'}</span>
                <span className="text-txt font-semibold flex-1 truncate">{opp.shortName}</span>
                <span className="text-white font-black tabular-nums">{userGoals}–{oppGoals}</span>
                {stats && stats.minutesPlayed > 0 && (
                  <span className="text-[10px] md:text-xs font-bold text-txt-muted tabular-nums w-8 md:w-10 text-right bg-bg-hover px-1 md:px-1.5 py-0.5 rounded">{stats.rating.toFixed(1)}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
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

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-20 md:pb-0 px-2 md:px-0">
      <div className="text-center">
        <div className="label text-accent mb-1 md:mb-2">Match Report</div>
        <h1 className="text-lg md:text-2xl font-bold text-white tracking-tight">{report.competition} · {formatDate(report.playedDate)}</h1>
      </div>

      <div className="panel p-4 md:p-8">
        <div className="flex items-center justify-between gap-2 md:gap-4">
          <div className="flex flex-col items-center gap-2 md:gap-3 flex-1">
            <Crest club={homeClub} size={48} />
            <span className="text-xs md:text-base font-bold text-txt text-center">{homeClub.shortName}</span>
          </div>
          <div className="text-3xl md:text-6xl font-black text-white tracking-tighter tabular-nums px-2 md:px-4">
            {report.homeGoals} – {report.awayGoals}
          </div>
          <div className="flex flex-col items-center gap-2 md:gap-3 flex-1">
            <Crest club={awayClub} size={48} />
            <span className="text-xs md:text-base font-bold text-txt text-center">{awayClub.shortName}</span>
          </div>
        </div>
      </div>

      {userStats && userStats.minutesPlayed > 0 && (
        <div className="panel p-3 md:p-4 border-accent/30 bg-accent/5">
          <div className="flex items-center justify-between flex-wrap gap-2 md:gap-3 mb-3 md:mb-4 border-b border-accent/20 pb-2 md:pb-3">
            <div>
              <div className="label text-accent-soft text-[8px] md:text-[10px]">Your Performance</div>
              <div className="text-xs md:text-sm font-semibold text-txt mt-0.5 md:mt-1">
                {userStats.minutesPlayed}' played
              </div>
            </div>
            <div className="text-center bg-bg-panel rounded-lg px-3 py-1.5 md:px-4 md:py-2 border border-bg-border">
              <div className="label mb-0.5 md:mb-1 text-[8px] md:text-[10px]">Rating</div>
              <div className={`text-xl md:text-2xl font-black tabular-nums tracking-tighter ${userStats.rating >= 8 ? 'text-state-win' : userStats.rating >= 7 ? 'text-accent-soft' : userStats.rating >= 6 ? 'text-txt' : 'text-state-loss'}`}>
                {userStats.rating.toFixed(1)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2 md:gap-4 text-[10px] md:text-xs">
            <div className="flex justify-between"><span className="text-txt-muted">Passes</span><span className="text-white font-bold">{userStats.passesCompleted}/{userStats.passesAttempted}</span></div>
            <div className="flex justify-between"><span className="text-txt-muted">Shots</span><span className="text-white font-bold">{userStats.shots} ({userStats.shotsOnTarget} on)</span></div>
            <div className="flex justify-between"><span className="text-txt-muted">Tackles</span><span className="text-white font-bold">{userStats.tackles}</span></div>
            <div className="flex justify-between"><span className="text-txt-muted">Dribbles</span><span className="text-white font-bold">{userStats.dribblesCompleted}</span></div>
            <div className="flex justify-between"><span className="text-txt-muted">Intercepts</span><span className="text-white font-bold">{userStats.interceptions}</span></div>
            <div className="flex justify-between"><span className="text-txt-muted">Clearances</span><span className="text-white font-bold">{userStats.clearances}</span></div>
            <div className="flex justify-between"><span className="text-txt-muted">Key Passes</span><span className="text-white font-bold">{userStats.keyPasses}</span></div>
            <div className="flex justify-between"><span className="text-txt-muted">Saves</span><span className="text-white font-bold">{userStats.saves}</span></div>
          </div>
        </div>
      )}

      <div className="panel p-3 md:p-4">
        <div className="label mb-2 md:mb-3">Full Match Events</div>
        <div className="space-y-1.5 md:space-y-2 max-h-96 overflow-y-auto pr-1 md:pr-2">
          {report.events.filter((e) => e.type !== 'KickOff' && e.type !== 'HalfTime').map((e, i) => (
            <div key={i} className={`flex items-start gap-2 md:gap-3 text-[10px] md:text-xs p-1.5 md:p-2 rounded-lg bg-bg-card/50 ${e.type === 'Goal' ? 'border border-accent/30' : ''}`}>
              <span className="text-txt-dim font-bold tabular-nums w-6 md:w-8 shrink-0">{e.minute}'</span>
              <span className={e.type === 'Goal' ? 'text-accent-soft font-bold' : e.type === 'RedCard' ? 'text-state-loss font-bold' : 'text-txt'}>{e.description}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-primary w-full py-2.5 md:py-3 text-sm" onClick={onContinue}>Continue</button>
    </div>
  );
}

function LineupRow({ p, isUser }: { p: Player; isUser: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 border-b border-bg-border/50 last:border-0 ${isUser ? 'text-accent-soft' : 'text-txt'}`}>
      <span className="truncate flex items-center gap-2 text-xs md:text-sm font-semibold">
        <span className="text-[8px] md:text-[10px] font-black text-txt-dim w-5 md:w-6 bg-bg-card px-1 py-0.5 rounded text-center">{p.primaryPosition}</span>
        {p.displayName} {isUser && <span className="text-[8px] md:text-[9px] font-black bg-accent/20 px-1 md:px-1.5 py-0.5 rounded uppercase tracking-wider">You</span>}
      </span>
      <span className="text-[10px] md:text-xs font-black tabular-nums">{p.overall}</span>
    </div>
  );
}

function StatRow({ label, home, away, homeNum, awayNum }: { label: string; home: any; away: any; homeNum: number; awayNum: number }) {
  const total = homeNum + awayNum;
  const homePct = total > 0 ? (homeNum / total) * 100 : 50;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] md:text-xs mb-1 md:mb-1.5">
        <span className="text-white font-bold tabular-nums">{home}</span>
        <span className="text-txt-muted font-medium">{label}</span>
        <span className="text-white font-bold tabular-nums">{away}</span>
      </div>
      <div className="flex h-1 md:h-1.5 rounded-full bg-bg-border/50 overflow-hidden">
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