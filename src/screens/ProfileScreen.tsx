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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="panel p-4 md:p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <Crest club={club} size={56} />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-txt truncate">{user.displayName}</h1>
            <div className="text-sm text-txt-muted mt-1">
              {POSITION_LABEL[user.primaryPosition]}
              {user.secondaryPosition && ` / ${user.secondaryPosition}`}
              {' · '}
              {user.age} yrs · {user.nationality}
            </div>
            <div className="text-xs text-txt-dim mt-1">
              {club.name} · {user.contract.squadRole}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-txt-dim">OVR</div>
              <div className="text-3xl font-black text-txt tabular-nums">{user.overall}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-txt-dim">POT</div>
              <div className="text-3xl font-black text-txt-muted tabular-nums">{user.potential}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AttributeGroup title="Technical" attrs={TECH_ATTRS} attributes={user.attributes.technical as unknown as Record<string, number>} />
        <AttributeGroup title="Physical" attrs={PHYS_ATTRS} attributes={user.attributes.physical as unknown as Record<string, number>} />
        <AttributeGroup title="Mental" attrs={MENT_ATTRS} attributes={user.attributes.mental as unknown as Record<string, number>} />
      </div>

      {/* Season history */}
      {user.seasonStats.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="px-4 py-3 border-b border-bg-border">
            <div className="label">Season history</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bg-border text-[10px] uppercase tracking-wider text-txt-dim">
                  <th className="text-left py-2 pl-4 font-semibold">Season</th>
                  <th className="text-left py-2 font-semibold">Club</th>
                  <th className="text-center py-2 w-12 font-semibold">Apps</th>
                  <th className="text-center py-2 w-12 font-semibold">G</th>
                  <th className="text-center py-2 w-12 font-semibold">A</th>
                  <th className="text-center py-2 w-16 pr-4 font-semibold">Avg</th>
                </tr>
              </thead>
              <tbody>
                {user.seasonStats.map((s, i) => {
                  const c = save.clubs.find((x) => x.id === s.clubId);
                  return (
                    <tr key={i} className="border-b border-bg-border last:border-b-0">
                      <td className="py-2 pl-4 text-txt">{s.season}</td>
                      <td className="py-2 text-txt-muted text-xs">{c?.shortName ?? '—'}</td>
                      <td className="text-center text-txt-muted tabular-nums">{s.appearances}</td>
                      <td className="text-center text-txt-muted tabular-nums">{s.goals}</td>
                      <td className="text-center text-txt-muted tabular-nums">{s.assists}</td>
                      <td className="text-center text-txt pr-4 tabular-nums">
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

      {/* Career totals */}
      <div className="panel p-4">
        <div className="label mb-3">Career totals</div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-black text-txt tabular-nums">{user.careerAppearances}</div>
            <div className="text-[10px] uppercase tracking-wider text-txt-dim mt-0.5">Apps</div>
          </div>
          <div>
            <div className="text-2xl font-black text-txt tabular-nums">{user.careerGoals}</div>
            <div className="text-[10px] uppercase tracking-wider text-txt-dim mt-0.5">Goals</div>
          </div>
          <div>
            <div className="text-2xl font-black text-txt tabular-nums">{user.careerAssists}</div>
            <div className="text-[10px] uppercase tracking-wider text-txt-dim mt-0.5">Assists</div>
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
    <div className="panel p-4">
      <div className="label mb-3">{title}</div>
      <div className="space-y-1.5">
        {attrs.map(([key, label]) => {
          const value = attributes[key] ?? 0;
          return (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className="text-txt-muted flex-1 truncate">{label}</span>
              <div className="w-16 h-1.5 rounded-full bg-bg-border overflow-hidden">
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
              <span className="text-txt font-semibold tabular-nums w-7 text-right">
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
