import { useCareerStore } from '../store/careerStore';
import { Crest } from '../components/Layout';
import { formatDate, formatShort } from '../game/dates';
import { POSITION_LABEL } from '../game/positions';
import { isSeasonComplete } from '../game/season';
import type { NavKey } from '../components/Layout';
import type { PlayerSeasonStats } from '../game/types';

interface Props {
  onNavigate: (s: NavKey) => void;
}

export default function Dashboard({ onNavigate }: Props) {
  const save = useCareerStore((s) => s.save);
  const user = useCareerStore((s) => s.userPlayer());
  const club = useCareerStore((s) => s.userClub());
  const league = useCareerStore((s) => s.userLeague());
  const next = useCareerStore((s) => s.nextFixture());
  const advanceOneDay = useCareerStore((s) => s.advanceOneDay);
  const advanceToNextMatch = useCareerStore((s) => s.advanceToNextMatch);
  const finaliseSeason = useCareerStore((s) => s.finaliseSeason);
  const loading = useCareerStore((s) => s.loading);

  if (!save || !user || !club || !league) {
    return <div className="panel p-6 text-txt-muted">No active career.</div>;
  }

  const standings = save.standings[league.id] ?? [];
  const userRowIdx = standings.findIndex((r) => r.clubId === club.id);
  const userRow = standings[userRowIdx];
  const seasonStats = user.seasonStats.find(
    (s) => s.season === save.currentSeason && s.clubId === club.id,
  );

  let opponentClub = null;
  let isHome = false;
  if (next) {
    isHome = next.homeClubId === club.id;
    const oppId = isHome ? next.awayClubId : next.homeClubId;
    opponentClub = save.clubs.find((c) => c.id === oppId) ?? null;
  }

  const recentReports = save.matchReports
    .filter(
      (r) => r.homeClubId === club.id || r.awayClubId === club.id,
    )
    .slice(-5)
    .reverse();

  const daysToFixture = next
    ? Math.max(
        0,
        Math.round(
          (new Date(next.date).getTime() - new Date(save.currentDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  const seasonComplete = isSeasonComplete(save);

  return (
    <div className="space-y-4">
      {seasonComplete && (
        <div className="panel p-4 border-accent/50">
          <div className="label text-accent-soft">Season complete</div>
          <p className="text-sm text-txt mt-2">
            Your {save.currentSeason} season is finished. Finalise the season to see
            awards, promotions, and start the next campaign.
          </p>
          <button
            className="btn btn-primary mt-3"
            onClick={() => finaliseSeason()}
            disabled={loading}
          >
            {loading ? 'Finalising…' : 'Finalise season →'}
          </button>
        </div>
      )}

      <div className="panel p-4 md:p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <PlayerAvatar player={user} club={club} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-txt truncate">
                {user.displayName}
              </h1>
              <span className="pill bg-accent/20 text-accent-soft">
                {POSITION_LABEL[user.primaryPosition]}
              </span>
              {user.secondaryPosition && (
                <span className="pill bg-bg-card text-txt-muted border border-bg-border">
                  / {user.secondaryPosition}
                </span>
              )}
            </div>
            <div className="text-sm text-txt-muted mt-1 flex items-center gap-2 flex-wrap">
              <Crest club={club} size={18} />
              <span className="text-txt">{club.name}</span>
              <span>·</span>
              <span>{user.age} yrs</span>
              <span>·</span>
              <span>{user.nationality}</span>
              <span>·</span>
              <span>{user.foot}-footed</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BigRating label="OVR" value={user.overall} />
            <BigRating label="POT" value={user.potential} muted />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <ConditionBar label="Fitness" value={user.fitness} color="text-state-win" />
          <ConditionBar label="Fatigue" value={user.fatigue} color="text-state-loss" inverted />
          <ConditionBar label="Sharpness" value={user.sharpness} color="text-state-info" />
          <ConditionBar label="Morale" value={user.morale} color="text-accent-soft" />
          <ConditionBar label="Confidence" value={user.confidence} color="text-state-warn" />
        </div>

        {user.injury && (
          <div className="mt-3 p-2.5 rounded-md bg-state-loss/10 border border-state-loss/30 text-sm">
            <span className="text-state-loss font-semibold">{user.injury.type}</span>
            <span className="text-txt-muted"> · {user.injury.severity} · {user.injury.daysRemaining} days out</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Weekly wage" value={`£${user.contract.weeklyWage.toLocaleString()}`} />
        <MiniStat label="Contract until" value={user.contract.endDate.slice(0, 7)} />
        <MiniStat label="Squad role" value={user.contract.squadRole} />
        <MiniStat label="Form" value={formatForm(user.form)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="panel p-4">
          <div className="label mb-2">Next fixture</div>
          {next && opponentClub ? (
            <>
              <div className="text-xs text-txt-muted mb-3">
                {formatDate(next.date)} · {isHome ? 'Home' : 'Away'} ·{' '}
                {daysToFixture === 0 ? 'Today' : `In ${daysToFixture} day${daysToFixture === 1 ? '' : 's'}`}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Crest club={club} size={32} />
                  <span className="text-sm font-medium truncate">{club.shortName}</span>
                </div>
                <span className="text-txt-dim text-xs px-2">vs</span>
                <div className="flex items-center gap-2 min-w-0 justify-end">
                  <span className="text-sm font-medium truncate text-right">{opponentClub.shortName}</span>
                  <Crest club={opponentClub} size={32} />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  className="btn btn-primary flex-1"
                  onClick={() => onNavigate('match')}
                  disabled={loading}
                >
                  Prepare for match
                </button>
              </div>
            </>
          ) : (
            <div className="text-sm text-txt-muted">
              {seasonComplete ? 'Season finished.' : 'Season complete.'}
            </div>
          )}
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="label">League position</div>
            <button
              className="text-xs text-txt-muted hover:text-txt"
              onClick={() => onNavigate('league')}
            >
              Table →
            </button>
          </div>
          <div className="text-xs text-txt-muted mb-3">
            {league.name} · Matchday {userRow?.played ?? 0}
          </div>
          {userRow && (
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-txt">#{userRowIdx + 1}</span>
              <div className="flex-1 text-sm">
                <div className="text-txt">
                  {userRow.won}W · {userRow.drawn}D · {userRow.lost}L
                </div>
                <div className="text-txt-muted text-xs">
                  {userRow.points} pts · GD {userRow.goalDifference >= 0 ? '+' : ''}
                  {userRow.goalDifference}
                </div>
              </div>
            </div>
          )}
          {userRow && (
            <div className="mt-3 flex gap-1">
              {userRow.form.map((f, i) => (
                <span
                  key={i}
                  className={`w-6 h-6 flex items-center justify-center rounded text-[11px] font-bold ${
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
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="panel p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="label">This season</div>
            <button
              className="text-xs text-txt-muted hover:text-txt"
              onClick={() => onNavigate('profile')}
            >
              Profile →
            </button>
          </div>
          {seasonStats ? (
            <div className="grid grid-cols-4 gap-3 text-center">
              <StatSmall value={seasonStats.appearances} label="Apps" />
              <StatSmall value={seasonStats.goals} label="Goals" />
              <StatSmall value={seasonStats.assists} label="Assists" />
              <StatSmall value={seasonStats.averageRating.toFixed(1)} label="Rating" />
            </div>
          ) : (
            <div className="text-sm text-txt-muted">No appearances yet.</div>
          )}
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="label">Recent results</div>
            <button
              className="text-xs text-txt-muted hover:text-txt"
              onClick={() => onNavigate('match')}
            >
              All matches →
            </button>
          </div>
          {recentReports.length === 0 ? (
            <div className="text-sm text-txt-muted">No matches played yet.</div>
          ) : (
            <div className="space-y-1.5">
              {recentReports.map((r) => {
                const isUserHome = r.homeClubId === club.id;
                const oppId = isUserHome ? r.awayClubId : r.homeClubId;
                const opp = save.clubs.find((c) => c.id === oppId);
                const userGoals = isUserHome ? r.homeGoals : r.awayGoals;
                const oppGoals = isUserHome ? r.awayGoals : r.homeGoals;
                const result =
                  userGoals > oppGoals ? 'W' : userGoals < oppGoals ? 'L' : 'D';
                return (
                  <div key={r.id} className="flex items-center gap-2 text-xs">
                    <span
                      className={`w-5 h-5 flex items-center justify-center rounded font-bold ${
                        result === 'W'
                          ? 'bg-state-win/20 text-state-win'
                          : result === 'D'
                          ? 'bg-bg-card text-txt-muted'
                          : 'bg-state-loss/20 text-state-loss'
                      }`}
                    >
                      {result}
                    </span>
                    <span className="text-txt-muted truncate flex-1">
                      {isUserHome ? 'vs' : '@'} {opp?.shortName ?? '—'}
                    </span>
                    <span className="text-txt font-medium tabular-nums">
                      {userGoals}–{oppGoals}
                    </span>
                    <span className="text-txt-dim text-[10px]">
                      {formatShort(r.playedDate)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="panel p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="label">Training</div>
          <div className="text-sm text-txt mt-1">
            {save.trainingPlan
              ? `${save.trainingPlan.intensity} · ${save.trainingPlan.focus}`
              : 'No plan set'}
          </div>
        </div>
        <button className="btn" onClick={() => onNavigate('training')}>
          Change plan
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          className="btn flex-1 md:flex-none"
          onClick={() => advanceOneDay()}
          disabled={loading}
        >
          {loading ? 'Advancing…' : 'Advance 1 day'}
        </button>
        <button
          className="btn btn-primary flex-1 md:flex-none"
          onClick={() => advanceToNextMatch()}
          disabled={loading}
        >
          {loading ? 'Advancing…' : 'Continue to next match'}
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// SUBCOMPONENTS
// ------------------------------------------------------------

function PlayerAvatar({
  player,
  club,
}: {
  player: { displayName: string; shirtNumber: number };
  club: { primaryColor: string; secondaryColor: string; name: string };
}) {
  return (
    <div
      className="relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
      style={{
        background: `linear-gradient(135deg, ${club.primaryColor} 0%, ${club.secondaryColor} 100%)`,
      }}
    >
      <span className="text-2xl md:text-3xl font-black text-white/90 drop-shadow">
        {player.shirtNumber}
      </span>
    </div>
  );
}

function BigRating({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider text-txt-dim">
        {label}
      </div>
      <div
        className={`text-2xl md:text-3xl font-black tabular-nums ${
          muted ? 'text-txt-muted' : 'text-txt'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ConditionBar({
  label,
  value,
  color,
  inverted,
}: {
  label: string;
  value: number;
  color: string;
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
      <div className="h-1.5 mt-1 rounded-full bg-bg-border overflow-hidden">
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-txt-dim">
        {label}
      </div>
      <div className="text-sm font-semibold text-txt mt-0.5 truncate">
        {value}
      </div>
    </div>
  );
}

function StatSmall({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-txt tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-txt-dim mt-0.5">
        {label}
      </div>
    </div>
  );
}

function formatForm(form: number): string {
  if (form > 2.5) return 'Excellent';
  if (form > 1.0) return 'Good';
  if (form > -1.0) return 'Average';
  if (form > -2.5) return 'Poor';
  return 'Very poor';
}
