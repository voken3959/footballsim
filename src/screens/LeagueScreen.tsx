import { useCareerStore } from '../store/careerStore';
import { Crest } from '../components/Layout';

export default function LeagueScreen() {
  const save = useCareerStore((s) => s.save)!;
  const club = useCareerStore((s) => s.userClub())!;
  const league = useCareerStore((s) => s.userLeague())!;
  const rows = save.standings[league.id] ?? [];
  const clubMap = new Map(save.clubs.map((c) => [c.id, c]));

  const champions = league.tier === 1 ? 1 : league.tier === 2 ? 2 : 3;
  const promotion = league.tier === 1 ? 4 : league.tier === 2 ? 6 : 6;
  const relegationStart = rows.length - (league.tier === 1 ? 3 : 3);

  return (
    <div className="space-y-6">
      <div>
        <div className="label text-accent">Competitions</div>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-1">{league.name}</h1>
        <p className="text-sm font-medium text-txt-muted mt-0.5">Season {league.season}</p>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left py-3 pl-4 pr-2 w-12 font-bold">Pos</th>
                <th className="text-left py-3 font-bold">Club</th>
                <th className="text-center py-3 w-10 font-bold">P</th>
                <th className="text-center py-3 w-10 font-bold text-txt-muted">W</th>
                <th className="text-center py-3 w-10 font-bold text-txt-muted">D</th>
                <th className="text-center py-3 w-10 font-bold text-txt-muted">L</th>
                <th className="text-center py-3 w-14 font-bold text-txt-muted">GF</th>
                <th className="text-center py-3 w-14 font-bold text-txt-muted">GA</th>
                <th className="text-center py-3 w-12 font-bold">GD</th>
                <th className="text-center py-3 w-14 font-bold text-accent">Pts</th>
                <th className="text-center py-3 pr-4 w-28 font-bold hidden md:table-cell">Form</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const c = clubMap.get(row.clubId);
                if (!c) return null;
                const isUser = c.id === club.id;
                const pos = idx + 1;
                const inChampion = pos <= champions;
                const inPromotion = pos <= promotion && !inChampion;
                const inRelegation = pos > relegationStart;
                
                return (
                  <tr
                    key={row.clubId}
                    className={`table-row ${isUser ? 'bg-accent/5' : ''}`}
                  >
                    <td className="py-3 pl-4 pr-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-1 h-5 rounded-full ${
                            inChampion
                              ? 'bg-accent'
                              : inPromotion
                              ? 'bg-state-info'
                              : inRelegation
                              ? 'bg-state-loss'
                              : 'bg-transparent'
                          }`}
                        />
                        <span className={`text-xs font-bold tabular-nums ${isUser ? 'text-txt' : 'text-txt-muted'}`}>
                          {pos}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Crest club={c} size={22} />
                        <span className={`truncate text-sm font-semibold ${isUser ? 'text-accent-soft' : 'text-txt'}`}>
                          {c.shortName}
                        </span>
                      </div>
                    </td>
                    <td className="text-center text-txt-muted font-medium tabular-nums">{row.played}</td>
                    <td className="text-center text-txt-muted tabular-nums">{row.won}</td>
                    <td className="text-center text-txt-muted tabular-nums">{row.drawn}</td>
                    <td className="text-center text-txt-muted tabular-nums">{row.lost}</td>
                    <td className="text-center text-txt-muted tabular-nums">{row.goalsFor}</td>
                    <td className="text-center text-txt-muted tabular-nums">{row.goalsAgainst}</td>
                    <td className="text-center text-txt font-semibold tabular-nums">
                      {row.goalDifference > 0 ? '+' : ''}
                      {row.goalDifference}
                    </td>
                    <td className="text-center text-white font-black tabular-nums text-base">{row.points}</td>
                    <td className="text-center pr-4 hidden md:table-cell">
                      <div className="flex gap-1 justify-center">
                        {row.form.slice(-5).map((f, i) => (
                          <div
                            key={i}
                            className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-black ${
                              f === 'W'
                                ? 'bg-accent/20 text-accent-soft'
                                : f === 'D'
                                ? 'bg-txt-dim/20 text-txt-muted'
                                : 'bg-state-loss/20 text-state-loss'
                            }`}
                          >
                            {f}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-[11px] font-semibold text-txt-muted bg-bg-panel/50 p-3 rounded-lg border border-bg-border">
        <Legend color="bg-accent" label="Champion / Auto Promotion" />
        <Legend color="bg-state-info" label="Promotion Playoff" />
        <Legend color="bg-state-loss" label="Relegation" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}