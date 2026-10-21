import { useState, useMemo } from 'react';
import { useCareerStore } from '../store/careerStore';
import { previewTraining } from '../game/training';
import type { TrainingFocus, TrainingIntensity, Player } from '../game/types';

const FOCUSES: { key: TrainingFocus; label: string; description: string }[] = [
  { key: 'Finishing', label: 'Finishing', description: 'Shooting, composure, movement' },
  { key: 'Passing', label: 'Passing', description: 'Short/long passing, vision' },
  { key: 'Dribbling', label: 'Dribbling', description: 'Ball control, agility' },
  { key: 'Defending', label: 'Defending', description: 'Tackling, marking, positioning' },
  { key: 'Physical', label: 'Physical', description: 'Strength, stamina, pace' },
  { key: 'Tactical', label: 'Tactical', description: 'Decisions, anticipation' },
  { key: 'PositionSpecific', label: 'Position-Specific', description: 'Role-focused attributes' },
  { key: 'Recovery', label: 'Recovery', description: 'Fatigue reduction, no attribute gains' },
];

const INTENSITIES: { key: TrainingIntensity; label: string; cost: string }[] = [
  { key: 'Rest', label: 'Rest', cost: 'Fatigue −20 · no gains' },
  { key: 'Light', label: 'Light', cost: 'Fatigue −5 · slow gains' },
  { key: 'Normal', label: 'Normal', cost: 'Fatigue +8 · steady gains' },
  { key: 'Intensive', label: 'Intensive', cost: 'Fatigue +20 · fast gains, higher injury risk' },
];

export default function TrainingScreen() {
  const save = useCareerStore((s) => s.save);
  const user = useCareerStore((s) => s.userPlayer());
  const club = useCareerStore((s) => s.userClub());
  const setTrainingPlan = useCareerStore((s) => s.setTrainingPlan);
  const lastDeltas = useCareerStore((s) => s.lastTrainingDeltas);

  const [focus, setFocus] = useState<TrainingFocus>(
    save?.trainingPlan?.focus ?? 'PositionSpecific',
  );
  const [intensity, setIntensity] = useState<TrainingIntensity>(
    save?.trainingPlan?.intensity ?? 'Normal',
  );

  if (!save || !user || !club) {
    return <div className="panel p-6 text-txt-muted">No active career.</div>;
  }

  const preview = useMemo(
    () => previewTraining(user, focus, intensity, club.trainingFacilities),
    [user, focus, intensity, club.trainingFacilities],
  );

  const savedMatches =
    save.trainingPlan?.focus === focus && save.trainingPlan?.intensity === intensity;

  return (
    <div className="space-y-4">
      <div>
        <div className="label text-accent-soft">Training</div>
        <h1 className="text-xl font-bold mt-1">Plan your development</h1>
      </div>

      {/* Player condition card */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-txt">{user.displayName}</div>
          <div className="text-xs text-txt-muted">
            OVR {user.overall} / POT {user.potential}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <ConditionChip label="Fitness" value={user.fitness} />
          <ConditionChip label="Fatigue" value={user.fatigue} inverted />
          <ConditionChip label="Sharpness" value={user.sharpness} />
        </div>
        <div className="mt-2 text-[11px] text-txt-dim">
          Development headroom: {Math.max(0, user.potential - user.overall)} points ·
          Facilities: {club.trainingFacilities}/100
        </div>
      </div>

      {/* Last training result */}
      {lastDeltas && lastDeltas.length > 0 && (
        <div className="panel p-3 border-accent/30">
          <div className="label mb-2">Last session</div>
          <div className="flex flex-wrap gap-2 text-xs">
            {lastDeltas.map((d) => (
              <span
                key={d.key}
                className="pill bg-accent/20 text-accent-soft"
              >
                {formatAttrKey(d.key)} +{(d.to - d.from).toFixed(2)} → {d.to.toFixed(0)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Focus picker */}
      <div className="panel p-4">
        <div className="label mb-2">Training focus</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {FOCUSES.map((f) => (
            <button
              key={f.key}
              onClick={() => setFocus(f.key)}
              className={`text-left p-3 rounded-md border transition-colors ${
                focus === f.key
                  ? 'border-accent bg-accent/10'
                  : 'border-bg-border bg-bg-card hover:border-txt-dim'
              }`}
            >
              <div className="text-sm font-semibold text-txt">{f.label}</div>
              <div className="text-[10px] text-txt-muted mt-0.5">
                {f.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Intensity picker */}
      <div className="panel p-4">
        <div className="label mb-2">Intensity</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {INTENSITIES.map((i) => (
            <button
              key={i.key}
              onClick={() => setIntensity(i.key)}
              className={`text-left p-3 rounded-md border transition-colors ${
                intensity === i.key
                  ? 'border-accent bg-accent/10'
                  : 'border-bg-border bg-bg-card hover:border-txt-dim'
              }`}
            >
              <div className="text-sm font-semibold text-txt">{i.label}</div>
              <div className="text-[10px] text-txt-muted mt-0.5">{i.cost}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="panel p-4">
        <div className="label mb-2">Session preview</div>
        <div className="text-xs text-txt-muted mb-3">{preview.description}</div>

        {Object.keys(preview.attributeGains).length > 0 ? (
          <div className="space-y-1.5">
            {Object.entries(preview.attributeGains)
              .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
              .map(([key, gain]) => {
                const current = getAttr(user, key);
                return (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="text-txt-muted w-32 truncate">
                      {formatAttrKey(key)}
                    </span>
                    <span className="text-txt-dim tabular-nums w-10 text-right">
                      {current.toFixed(0)}
                    </span>
                    <span className="text-txt-dim">→</span>
                    <span className="text-accent-soft font-semibold tabular-nums w-12">
                      +{(gain ?? 0).toFixed(2)}
                    </span>
                    <div className="flex-1 h-1 rounded bg-bg-border overflow-hidden">
                      <div
                        className="h-full bg-accent rounded"
                        style={{
                          width: `${Math.min(100, ((gain ?? 0) / 0.5) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-sm text-txt-muted">
            No attribute gains expected at this intensity or focus.
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-bg-border grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-txt-dim">Fatigue</div>
            <div className={preview.fatigueCost > 0 ? 'text-state-loss' : 'text-state-win'}>
              {preview.fatigueCost > 0 ? '+' : ''}
              {preview.fatigueCost}
            </div>
          </div>
          <div>
            <div className="text-txt-dim">Injury risk</div>
            <div className={preview.injuryRisk > 0.03 ? 'text-state-loss' : 'text-txt'}>
              {(preview.injuryRisk * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex gap-2">
        <button
          className="btn btn-primary flex-1"
          onClick={() => setTrainingPlan(focus, intensity)}
          disabled={savedMatches}
        >
          {savedMatches ? 'Plan active' : 'Apply training plan'}
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function ConditionChip({
  label,
  value,
  inverted,
}: {
  label: string;
  value: number;
  inverted?: boolean;
}) {
  const display = inverted ? 100 - value : value;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wider text-txt-dim">
          {label}
        </span>
        <span className="text-xs font-semibold tabular-nums">{value}</span>
      </div>
      <div className="h-1 mt-1 rounded-full bg-bg-border overflow-hidden">
        <div
          className={`h-full rounded-full ${
            display > 66
              ? 'bg-state-win'
              : display > 33
              ? 'bg-state-warn'
              : 'bg-state-loss'
          }`}
          style={{ width: `${display}%` }}
        />
      </div>
    </div>
  );
}

function getAttr(player: Player, key: string): number {
  const t = player.attributes.technical as any;
  const p = player.attributes.physical as any;
  const m = player.attributes.mental as any;
  return t[key] ?? p[key] ?? m[key] ?? 50;
}

function formatAttrKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
