import { useCareerStore } from '../store/careerStore';
import { Crest } from '../components/Layout';
import { POSITION_LABEL } from '../game/positions';

const TECH_ATTRS: [string, string][] = [
  ['finishing', 'Finishing'], ['longShots', 'Long Shots'], ['shortPassing', 'Short Passing'],
  ['longPassing', 'Long Passing'], ['crossing', 'Crossing'], ['dribbling', 'Dribbling'],
  ['firstTouch', 'First Touch'], ['ballControl', 'Ball Control'], ['tackling', 'Tackling'],
  ['heading', 'Heading'], ['marking', 'Marking'], ['gkReflexes', 'GK Reflexes'],
  ['handling', 'Handling'], ['oneOnOnes', 'One-on-Ones'],
];

const PHYS_ATTRS: [string, string][] = [
  ['acceleration', 'Acceleration'], ['sprintSpeed', 'Sprint Speed'], ['agility', 'Agility'],
  ['balance', 'Balance'], ['strength', 'Strength'], ['jumping', 'Jumping'],
  ['stamina', 'Stamina'], ['naturalFitness', 'Natural Fitness'],
];

const MENT_ATTRS: [string, string][] = [
  ['positioning', 'Positioning'], ['vision', 'Vision'], ['decisions', 'Decisions'],
  ['composure', 'Composure'], ['anticipation', 'Anticipation'], ['concentration', 'Concentration'],
  ['workRate', 'Work Rate'], ['offTheBall', 'Off the Ball'], ['defensiveAwareness', 'Defensive Awareness'],
  ['leadership', 'Leadership'],
];

export default function ProfileScreen() {
  const save = useCareerStore((s) => s.save)!;
  const user = useCareerStore((s) => s.userPlayer())!;
  const club = useCareerStore((s) => s.userClub())!;
  
  const currentStats = user.seasonStats.find(s => s.season === save.currentSeason);

  return (
    <div className="space-y-6">
      <div className="panel p-5 md:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex items-start gap-5 flex-wrap relative z-10">
          <Crest club={club} size={64} />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-white tracking-tight truncate">{user.displayName}</h1>
            <div className="text-sm font-semibold text-txt-muted mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-accent-soft">{POSITION_LABEL[user.primaryPosition]}</span>
              {user.secondaryPosition && <span className="text-txt-dim">/ {user.secondaryPosition}</span>}
              <span className="text-txt-dim">·</span>
              <span>{user.age} yrs</span>
              <span className="text-txt-dim">·</span>
              <span>{user.nationality}</span>
            </div>
            <div className="text-xs font-medium text-txt-muted mt-1.5 bg-bg-card inline-block px-2 py-1 rounded border border-bg-border">
              {club.name} · {user.contract.squadRole}
            </div>
          </div>
          <div className="flex gap-6 pr-2">
            <div className="text-center">
              <div className="label mb-1">OVR</div>
              <div className="text-3xl font-black text-white tabular-nums tracking-tighter">{user.overall}</div>
            </div>
            <div className="text-center">
              <div className="label mb-1">POT</div>
              <div className="text-3xl font-black text-txt-muted tabular-nums tracking-tighter">{user.potential}</div>
            </div>
          </div>
        </div>
      </div>

      {currentStats && (
        <div className="panel p-5">
          <div className="label mb-4">Season {save.currentSeason} Performance</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
            <div>
              <div className="text-3xl font-black text-white tabular-nums tracking-tight">{currentStats.appearances}</div>
              <div className="label mt-1">Apps</div>
            </div>
            <div>
              <div className="text-3xl font-black text-white tabular-nums tracking-tight">{currentStats.goals}</div>
              <div className="label mt-1">Goals</div>
            </div>
            <div>
              <div className="text-3xl font-black text-white tabular-nums tracking-tight">{currentStats.assists}</div>
              <div className="label mt-1">Assists</div>
            </div>
            <div>
              <div className="text-3xl font-black text-accent-soft tabular-nums tracking-tight">{currentStats.averageRating.toFixed(2)}</div>
              <div className="label mt-1">Avg Rating</div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-bg-border grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
            <div className="flex justify-between items-center"><span className="text-txt-muted font-medium">Minutes</span> <span className="font-bold tabular-nums text-white">{currentStats.minutesPlayed}</span></div>
            <div className="flex justify-between items-center"><span className="text-txt-muted font-medium">Passes</span> <span className="font-bold tabular-nums text-white">{currentStats.passesCompleted}/{currentStats.passesAttempted}</span></div>
            <div className="flex justify-between items-center"><span className="text-txt-muted font-medium">Key Passes</span> <span className="font-bold tabular-nums text-white">{currentStats.keyPasses}</span></div>
            <div className="flex justify-between items-center"><span className="text-txt-muted font-medium">Shots</span> <span className="font-bold tabular-nums text-white">{currentStats.shots}</span></div>
            <div className="flex justify-between items-center"><span className="text-txt-muted font-medium">Tackles</span> <span className="font-bold tabular-nums text-white">{currentStats.tackles}</span></div>
            <div className="flex justify-between items-center"><span className="text-txt-muted font-medium">Intercepts</span> <span className="font-bold tabular-nums text-white">{currentStats.interceptions}</span></div>
            <div className="flex justify-between items-center"><span className="text-txt-muted font-medium">Dribbles</span> <span className="font-bold tabular-nums text-white">{currentStats.dribblesCompleted}</span></div>
            <div className="flex justify-between items-center"><span className="text-txt-muted font-medium">Saves</span> <span className="font-bold tabular-nums text-white">{currentStats.saves}</span></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <AttributeGroup title="Technical" attrs={TECH_ATTRS} attributes={user.attributes.technical as any} />
        <AttributeGroup title="Physical" attrs={PHYS_ATTRS} attributes={user.attributes.physical as any} />
        <AttributeGroup title="Mental" attrs={MENT_ATTRS} attributes={user.attributes.mental as any} />
      </div>

      {user.seasonStats.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="px-5 py-4 border-b border-bg-border bg-bg-panel/50">
            <div className="label">Season History</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left py-3 pl-5 font-bold">Season</th>
                  <th className="text-left py-3 font-bold">Club</th>
                  <th className="text-center py-3 w-16 font-bold">Apps</th>
                  <th className="text-center py-3 w-16 font-bold">Goals</th>
                  <th className="text-center py-3 w-16 font-bold">Assists</th>
                  <th className="text-center py-3 w-20 pr-5 font-bold">Avg</th>
                </tr>
              </thead>
              <tbody>
                {user.seasonStats.map((s, i) => {
                  const c = save.clubs.find((x) => x.id === s.clubId);
                  return (
                    <tr key={i} className="table-row">
                      <td className="py-3 pl-5 text-white font-semibold">{s.season}</td>
                      <td className="py-3 text-txt-muted font-medium text-xs">{c?.shortName ?? '—'}</td>
                      <td className="text-center text-txt-muted font-medium tabular-nums">{s.appearances}</td>
                      <td className="text-center text-txt-muted font-medium tabular-nums">{s.goals}</td>
                      <td className="text-center text-txt-muted font-medium tabular-nums">{s.assists}</td>
                      <td className="text-center text-accent-soft font-bold pr-5 tabular-nums">
                        {s.averageRating > 0 ? s.averageRating.toFixed(2) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="panel p-5">
        <div className="label mb-4">Career Totals</div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl font-black text-white tabular-nums tracking-tight">{user.careerAppearances}</div>
            <div className="label mt-1">Apps</div>
          </div>
          <div>
            <div className="text-3xl font-black text-white tabular-nums tracking-tight">{user.careerGoals}</div>
            <div className="label mt-1">Goals</div>
          </div>
          <div>
            <div className="text-3xl font-black text-white tabular-nums tracking-tight">{user.careerAssists}</div>
            <div className="label mt-1">Assists</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttributeGroup({
  title,
  attrs,
  attributes,
}: {
  title: string;
  attrs: [string, string][];
  attributes: Record<string, number>;
}) {
  return (
    <div className="panel p-5">
      <div className="label mb-4 border-b border-bg-border pb-2">{title}</div>
      <div className="space-y-2">
        {attrs.map(([key, label]) => {
          const value = attributes[key] ?? 0;
          return (
            <div key={key} className="flex items-center gap-3 text-xs">
              <span className="text-txt-muted font-medium flex-1 truncate">{label}</span>
              <div className="w-20 h-1.5 rounded-full bg-bg-border/50 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    value >= 80
                      ? 'bg-state-win'
                      : value >= 65
                      ? 'bg-accent'
                      : value >= 50
                      ? 'bg-state-warn'
                      : 'bg-state-loss'
                  }`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className="text-white font-bold tabular-nums w-6 text-right">
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}