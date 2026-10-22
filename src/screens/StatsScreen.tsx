import { useState, useMemo } from 'react';
import { useCareerStore } from '../store/careerStore';
import { Crest } from '../components/Layout';
import type { Player, PlayerSeasonStats } from '../game/types';

type StatCategory = 'Overview' | 'Attacking' | 'Passing' | 'Defending' | 'Goalkeeping';

interface PlayerRow {
  player: Player;
  stats: PlayerSeasonStats;
}

export default function StatsScreen() {
  const save = useCareerStore((s) => s.save)!;
  const userClub = useCareerStore((s) => s.userClub())!;
  const userLeague = useCareerStore((s) => s.userLeague())!;

  const [category, setCategory] = useState<StatCategory>('Overview');
  const [leagueFilter, setLeagueFilter] = useState<string>(userLeague.id);
  const [clubFilter, setClubFilter] = useState<string>('all');

  const clubMap = useMemo(() => new Map(save.clubs.map(c => [c.id, c])), [save.clubs]);

  const rows: PlayerRow[] = useMemo(() => {
    return save.players
      .filter(p => {
        if (leagueFilter !== 'all') {
          const club = clubMap.get(p.clubId);
          if (!club || club.leagueId !== leagueFilter) return false;
        }
        if (clubFilter !== 'all' && p.clubId !== clubFilter) return false;
        return true;
      })
      .map(p => {
        const stats = p.seasonStats.find(s => s.season === save.currentSeason);
        return { player: p, stats };
      })
      .filter((r): r is PlayerRow => r.stats !== undefined && r.stats.appearances > 0);
  }, [save.players, save.currentSeason, leagueFilter, clubFilter, clubMap]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const sa = a.stats;
      const sb = b.stats;
      if (category === 'Overview') {
        if (sb.averageRating !== sa.averageRating) return sb.averageRating - sa.averageRating;
        return sb.goals - sa.goals;
      }
      if (category === 'Attacking') {
        if (sb.goals !== sa.goals) return sb.goals - sa.goals;
        return sb.assists - sa.assists;
      }
      if (category === 'Passing') return sb.passesCompleted - sa.passesCompleted;
      if (category === 'Defending') return sb.tackles - sa.tackles;
      if (category === 'Goalkeeping') return sb.cleanSheets - sa.cleanSheets;
      return 0;
    });
  }, [rows, category]);

  return (
    <div className="space-y-6">
      <div>
        <div className="label text-accent">Database</div>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Player Statistics</h1>
      </div>

      <div className="panel p-2 flex flex-wrap gap-2 items-center bg-bg-panel/80 backdrop-blur">
        <select 
          className="select w-auto bg-bg-card text-xs font-semibold py-2 pl-3 pr-8"
          value={leagueFilter}
          onChange={(e) => { setLeagueFilter(e.target.value); setClubFilter('all'); }}
        >
          <option value="all">All Leagues</option>
          {save.leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        <select 
          className="select w-auto bg-bg-card text-xs font-semibold py-2 pl-3 pr-8"
          value={clubFilter}
          onChange={(e) => setClubFilter(e.target.value)}
        >
          <option value="all">All Clubs</option>
          {save.clubs.filter(c => leagueFilter === 'all' || c.leagueId === leagueFilter).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-1 border-b border-bg-border overflow-x-auto">
        {(['Overview', 'Attacking', 'Passing', 'Defending', 'Goalkeeping'] as StatCategory[]).map(tab => (
          <button
            key={tab}
            onClick={() => setCategory(tab)}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              category === tab ? 'border-accent text-accent-soft bg-accent/5' : 'border-transparent text-txt-muted hover:text-txt hover:bg-bg-hover/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="table-header">
                <th className="py-3 pl-4 pr-2 w-10">#</th>
                <th className="py-3 px-2">Player</th>
                <th className="py-3 px-2 text-center">Club</th>
                <th className="py-3 px-2 text-center">Pos</th>
                <th className="py-3 px-2 text-center">Apps</th>
                
                {category === 'Overview' && (
                  <>
                    <th className="py-3 px-2 text-center text-white">Rating</th>
                    <th className="py-3 px-2 text-center">G</th>
                    <th className="py-3 px-2 text-center">A</th>
                  </>
                )}
                {category === 'Attacking' && (
                  <>
                    <th className="py-3 px-2 text-center text-white">Goals</th>
                    <th className="py-3 px-2 text-center">Assists</th>
                    <th className="py-3 px-2 text-center">Shots</th>
                    <th className="py-3 px-2 text-center">On Tgt</th>
                    <th className="py-3 px-2 text-center">Dribbles</th>
                  </>
                )}
                {category === 'Passing' && (
                  <>
                    <th className="py-3 px-2 text-center text-white">Passes</th>
                    <th className="py-3 px-2 text-center">Key</th>
                    <th className="py-3 px-2 text-center">Acc %</th>
                  </>
                )}
                {category === 'Defending' && (
                  <>
                    <th className="py-3 px-2 text-center text-white">Tackles</th>
                    <th className="py-3 px-2 text-center">Intercepts</th>
                    <th className="py-3 px-2 text-center">Clearances</th>
                  </>
                )}
                {category === 'Goalkeeping' && (
                  <>
                    <th className="py-3 px-2 text-center text-white">Clean Sheets</th>
                    <th className="py-3 px-2 text-center">Saves</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, idx) => {
                const { player, stats } = row;
                const club = clubMap.get(player.clubId);
                if (!club) return null;

                const isUser = player.id === save.userPlayerId;
                
                return (
                  <tr key={player.id} className={`table-row ${isUser ? 'bg-accent/5' : ''}`}>
                    <td className="py-3 pl-4 pr-2 text-xs font-bold text-txt-muted tabular-nums">{idx + 1}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {isUser && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                        <span className={`truncate ${isUser ? 'font-bold text-accent-soft' : 'font-semibold text-txt'}`}>{player.displayName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex justify-center"><Crest club={club} size={18} /></div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="text-[10px] font-bold bg-bg-hover px-1.5 py-0.5 rounded text-txt-muted">{player.primaryPosition}</span>
                    </td>
                    <td className="py-3 px-2 text-center text-txt-muted font-medium tabular-nums">{stats.appearances}</td>
                    
                    {category === 'Overview' && (
                      <>
                        <td className="py-3 px-2 text-center font-black text-accent-soft tabular-nums">{stats.averageRating.toFixed(2)}</td>
                        <td className="py-3 px-2 text-center text-txt-muted tabular-nums">{stats.goals}</td>
                        <td className="py-3 px-2 text-center text-txt-muted tabular-nums">{stats.assists}</td>
                      </>
                    )}
                    {category === 'Attacking' && (
                      <>
                        <td className="py-3 px-2 text-center font-black text-white tabular-nums">{stats.goals}</td>
                        <td className="py-3 px-2 text-center text-txt-muted tabular-nums">{stats.assists}</td>
                        <td className="py-3 px-2 text-center text-txt-muted tabular-nums">{stats.shots}</td>
                        <td className="py-3 px-2 text-center text-txt-muted tabular-nums">{stats.shotsOnTarget}</td>
                        <td className="py-3 px-2 text-center text-txt-muted tabular-nums">{stats.dribblesCompleted}</td>
                      </>
                    )}
                    {category === 'Passing' && (
                      <>
                        <td className="py-3 px-2 text-center font-black text-white tabular-nums">{stats.passesCompleted}</td>
                        <td className="py-3 px-2 text-center text-txt-muted tabular-nums">{stats.keyPasses}</td>
                        <td className="py-3 px-2 text-center text-txt-muted tabular-nums font-medium">
                          {stats.passesAttempted > 0 ? Math.round((stats.passesCompleted / stats.passesAttempted) * 100) : 0}%
                        </td>
                      </>
                    )}
                    {category === 'Defending' && (
                      <>
                        <td className="py-3 px-2 text-center font-black text-white tabular-nums">{stats.tackles}</td>
                        <td className="py-3 px-2 text-center text-txt-muted tabular-nums">{stats.interceptions}</td>
                        <td className="py-3 px-2 text-center text-txt-muted tabular-nums">{stats.clearances}</td>
                      </>
                    )}
                    {category === 'Goalkeeping' && (
                      <>
                        <td className="py-3 px-2 text-center font-black text-white tabular-nums">{stats.cleanSheets}</td>
                        <td className="py-3 px-2 text-center text-txt-muted tabular-nums">{stats.saves}</td>
                      </>
                    )}
                  </tr>
                );
              })}
              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-txt-muted font-medium">No stats available for this selection.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}