import { useCareerStore } from '../store/careerStore';
import { Crest } from '../components/Layout';

export default function LeagueScreen() {
  const save = useCareerStore((s) => s.save)!;
  const club = useCareerStore((s) => s.userClub())!;
  const league = useCareerStore((s) => s.userLeague())!;
  const rows = save.standings[league.id] ?? [];
  const clubMap = new Map(save.clubs.map((c) => [c.id, c]));

  // Relegation / promotion zones depend on tier
  const champions = league.tier === 1 ? 1 : league.tier === 2 ? 2 : 3;
  const promotion = league.tier === 1 ? 4 : league.tier === 2 ? 6 : 6;
  const relegationStart = rows.length - (league.tier === 1 ? 3 : 3);

  return (
    <div className="space-y-4">
      <div>
        <div className="label text-accent-soft">Competitions</div>
        <h1 className="text-xl font-bold mt-1">{league.name}</h1>
        <p className="text-xs text-txt-muted mt-1">Season {league.season}</p>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border text-[10px] uppercase tracking-wider text-txt-dim">
                <th className="text-left py-2.5 pl-3 pr-1 font-semibold">#</th>
                <th className="text-left py-2.5 font-semibold">Club</th>
                <th className="text-center py-2.5 w-8 font-semibold">P</th>
                <th className="text-center py-2.5 w-8 font-semibold">W</th>
                <th className="text-center py-2.5 w-8 font-semibold">D</th>
                <th className="text-center py-2.5 w-8 font-semibold">L</th>
                <th className="text-center py-2.5 w-12 font-semibold">GF</th>
                <th className="text-center py-2.5 w-12 font-semibold">GA</th>
                <th className="text-center py-2.5 w-10 font-semibold">GD</th>
                <th className="text-center py-2.5 w-10 font-semibold">Pts</th>
                <th className="text-center py-2.5 pr-3 w-24 font-semibold hidden md:table-cell">Form</th>
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
                    className={`border-b border-bg-border last:border-b-0 ${
                      isUser ? 'bg-accent/5' : ''
                    }`}
                  >
                    <td className="py-2 pl-3 pr-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-0.5 h-4 rounded-full ${
                            inChampion
                              ? 'bg-accent'
                              : inPromotion
                              ? 'bg-state-info'
                              : inRelegation
                              ? 'bg-state-loss'
                              : 'bg-transparent'
                          }`}
                        />
                        <span className="text-txt-muted tabular-nums text-xs">
                          {pos}
                        </span>
                      </div>
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Crest club={c} size={20} />
                        <span
                          className={`truncate ${
                            isUser ? 'text-txt font-semibold' : 'text-txt'
                          }`}
                        >
                          {c.shortName}
                        </span>
                      </div>
                    </td>
                    <td className="text-center text-txt-muted tabular-nums">{row.played}</td>
                    <td className="text-center text-txt-muted tabular-nums">{row.won}</td>
                    <td className="text-center text-txt-muted tabular-nums">{row.drawn}</td>
                    <td className="text-center text-txt-muted tabular-nums">{row.lost}</td>
                    <td className="text-center text-txt-muted tabular-nums">{row.goalsFor}</td>
                    <td className="text-center text-txt-muted tabular-nums">{row.goalsAgainst}</td>
                    <td className="text-center text-txt tabular-nums">
                      {row.goalDifference > 0 ? '+' : ''}
                      {row.goalDifference}
                    </td>
                    <td className="text-center text-txt font-bold tabular-nums">{row.points}</td>
                    <td className="text-center pr-3 hidden md:table-cell">
                      <div className="flex gap-0.5 justify-center">
                        {row.form.slice(-5).map((f, i) => (
                          <span
                            key={i}
                            className={`w-4 h-4 flex items-center justify-center rounded text-[9px] font-bold ${
                              f === 'W'
                                ? 'bg-state-win/20 text-state-win'
                                : f === 'D'
                                ? 'bg-bg-card text-txt-muted'
                                : 'bg-state-loss/20 text-state-loss'
                            }`}
                          >
                            {f}
                          </span>
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

      <div className="flex flex-wrap gap-3 text-[11px] text-txt-muted">
        <Legend color="bg-accent" label="Champion / auto promotion" />
        <Legend color="bg-state-info" label="Promotion playoff" />
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
