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

  // Get all players with stats for the current season
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

  // Sort logic based on category
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
      if (category === 'Passing') {
        return sb.passesCompleted - sa.passesCompleted;
      }
      if (category === 'Defending') {
        return sb.tackles - sa.tackles;
      }
      if (category === 'Goalkeeping') {
        return sb.cleanSheets - sa.cleanSheets;
      }
      return 0;
    });
  }, [rows, category]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="label text-accent-soft">Database</div>
          <h1 className="text-xl font-bold mt-1">Player Statistics</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="panel p-3 flex flex-wrap gap-3 items-center">
        <select 
          className="select w-auto bg-bg-card text-sm py-1.5"
          value={leagueFilter}
          onChange={(e) => { setLeagueFilter(e.target.value); setClubFilter('all'); }}
        >
          <option value="all">All Leagues</option>
          {save.leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        <select 
          className="select w-auto bg-bg-card text-sm py-1.5"
          value={clubFilter}
          onChange={(e) => setClubFilter(e.target.value)}
        >
          <option value="all">All Clubs</option>
          {save.clubs.filter(c => leagueFilter === 'all' || c.leagueId === leagueFilter).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-bg-border overflow-x-auto">
        {(['Overview', 'Attacking', 'Passing', 'Defending', 'Goalkeeping'] as StatCategory[]).map(tab => (
          <button
            key={tab}
            onClick={() => setCategory(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              category === tab ? 'border-accent text-txt' : 'border-transparent text-txt-muted hover:text-txt'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-bg-border text-[10px] uppercase tracking-wider text-txt-dim">
                <th className="py-2 pl-3 pr-2 w-8">#</th>
                <th className="py-2 px-2">Player</th>
                <th className="py-2 px-2 text-center">Club</th>
                <th className="py-2 px-2 text-center">Pos</th>
                <th className="py-2 px-2 text-center">Apps</th>
                
                {category === 'Overview' && (
                  <>
                    <th className="py-2 px-2 text-center text-txt">Rating</th>
                    <th className="py-2 px-2 text-center">G</th>
                    <th className="py-2 px-2 text-center">A</th>
                  </>
                )}
                {category === 'Attacking' && (
                  <>
                    <th className="py-2 px-2 text-center text-txt">Goals</th>
                    <th className="py-2 px-2 text-center">Assists</th>
                    <th className="py-2 px-2 text-center">Shots</th>
                    <th className="py-2 px-2 text-center">On Tgt</th>
                    <th className="py-2 px-2 text-center">Dribbles</th>
                  </>
                )}
                {category === 'Passing' && (
                  <>
                    <th className="py-2 px-2 text-center text-txt">Passes</th>
                    <th className="py-2 px-2 text-center">Key</th>
                    <th className="py-2 px-2 text-center">Acc %</th>
                  </>
                )}
                {category === 'Defending' && (
                  <>
                    <th className="py-2 px-2 text-center text-txt">Tackles</th>
                    <th className="py-2 px-2 text-center">Intercepts</th>
                    <th className="py-2 px-2 text-center">Clearances</th>
                  </>
                )}
                {category === 'Goalkeeping' && (
                  <>
                    <th className="py-2 px-2 text-center text-txt">Clean Sheets</th>
                    <th className="py-2 px-2 text-center">Saves</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, idx) => {
                const { player, stats } = row;
                const club = clubMap.get(player.clubId);
                if (!club) return null; // Safeguard

                const isUser = player.id === save.userPlayerId;
                const pos = player.primaryPosition;
                
                return (
                  <tr key={player.id} className={`border-b border-bg-border last:border-b-0 ${isUser ? 'bg-accent/10' : 'hover:bg-bg-card'}`}>
                    <td className="py-2 pl-3 pr-2 text-txt-muted tabular-nums">{idx + 1}</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        {isUser && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                        <span className={`truncate ${isUser ? 'font-bold text-accent-soft' : 'text-txt'}`}>{player.displayName}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <div className="flex justify-center"><Crest club={club} size={16} /></div>
                    </td>
                    <td className="py-2 px-2 text-center text-xs text-txt-muted">{pos}</td>
                    <td className="py-2 px-2 text-center text-txt-muted tabular-nums">{stats.appearances}</td>
                    
                    {category === 'Overview' && (
                      <>
                        <td className="py-2 px-2 text-center font-bold text-txt tabular-nums">{stats.averageRating.toFixed(2)}</td>
                        <td className="py-2 px-2 text-center text-txt-muted tabular-nums">{stats.goals}</td>
                        <td className="py-2 px-2 text-center text-txt-muted tabular-nums">{stats.assists}</td>
                      </>
                    )}
                    {category === 'Attacking' && (
                      <>
                        <td className="py-2 px-2 text-center font-bold text-txt tabular-nums">{stats.goals}</td>
                        <td className="py-2 px-2 text-center text-txt-muted tabular-nums">{stats.assists}</td>
                        <td className="py-2 px-2 text-center text-txt-muted tabular-nums">{stats.shots}</td>
                        <td className="py-2 px-2 text-center text-txt-muted tabular-nums">{stats.shotsOnTarget}</td>
                        <td className="py-2 px-2 text-center text-txt-muted tabular-nums">{stats.dribblesCompleted}</td>
                      </>
                    )}
                    {category === 'Passing' && (
                      <>
                        <td className="py-2 px-2 text-center font-bold text-txt tabular-nums">{stats.passesCompleted}</td>
                        <td className="py-2 px-2 text-center text-txt-muted tabular-nums">{stats.keyPasses}</td>
                        <td className="py-2 px-2 text-center text-txt-muted tabular-nums">
                          {stats.passesAttempted > 0 ? Math.round((stats.passesCompleted / stats.passesAttempted) * 100) : 0}%
                        </td>
                      </>
                    )}
                    {category === 'Defending' && (
                      <>
                        <td className="py-2 px-2 text-center font-bold text-txt tabular-nums">{stats.tackles}</td>
                        <td className="py-2 px-2 text-center text-txt-muted tabular-nums">{stats.interceptions}</td>
                        <td className="py-2 px-2 text-center text-txt-muted tabular-nums">{stats.clearances}</td>
                      </>
                    )}
                    {category === 'Goalkeeping' && (
                      <>
                        <td className="py-2 px-2 text-center font-bold text-txt tabular-nums">{stats.cleanSheets}</td>
                        <td className="py-2 px-2 text-center text-txt-muted tabular-nums">{stats.saves}</td>
                      </>
                    )}
                  </tr>
                );
              })}
              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-txt-muted">No stats available for this selection.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
