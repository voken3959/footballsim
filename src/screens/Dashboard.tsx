import { useCareerStore } from '../store/careerStore';
import { Crest } from '../components/Layout';
import { formatDate, formatShort } from '../game/dates';
import { POSITION_LABEL } from '../game/positions';
import { isSeasonComplete } from '../game/season';
import type { NavKey } from '../components/Layout';

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
    .filter((r) => r.homeClubId === club.id || r.awayClubId === club.id)
    .slice(-5)
    .reverse();

  const daysToFixture = next
    ? Math.max(0, Math.round((new Date(next.date).getTime() - new Date(save.currentDate).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const seasonComplete = isSeasonComplete(save);

  return (
    <div className="space-y-5">
      {seasonComplete && (
        <div className="panel p-5 border-accent/40 bg-accent/5">
          <div className="label text-accent">Season Complete</div>
          <p className="text-sm font-medium text-txt mt-2">
            Your {save.currentSeason} season is finished. Finalise the season to see awards, promotions, and start the next campaign.
          </p>
          <button
            className="btn btn-primary mt-4"
            onClick={() => finaliseSeason()}
            disabled={loading}
          >
            {loading ? 'Finalising…' : 'Finalise season →'}
          </button>
        </div>
      )}

      {/* Player header */}
      <div className="panel p-5 md:p-6 relative overflow-hidden">
        {/* Background glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex items-start gap-5 flex-wrap relative z-10">
          <div
            className="w-20 h-20 rounded-xl shrink-0 flex items-center justify-center shadow-inner-top"
            style={{ background: `linear-gradient(135deg, ${club.primaryColor} 0%, ${club.secondaryColor} 100%)` }}
          >
            <span className="text-4xl font-black text-white drop-shadow-md">
              {user.shirtNumber}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight truncate">
                {user.displayName}
              </h1>
              <span className="pill bg-accent/15 text-accent-soft border border-accent/20">
                {POSITION_LABEL[user.primaryPosition]}
              </span>
            </div>
            <div className="text-sm font-medium text-txt-muted mt-1.5 flex items-center gap-2.5 flex-wrap">
              <Crest club={club} size={18} />
              <span className="text-txt">{club.name}</span>
              <span className="text-txt-dim">·</span>
              <span>{user.age} yrs</span>
              <span className="text-txt-dim">·</span>
              <span>{user.nationality}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 pr-2">
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

        {/* Condition bars */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          <ConditionBar label="Fitness" value={user.fitness} color="bg-state-win" />
          <ConditionBar label="Fatigue" value={user.fatigue} color="bg-state-loss" inverted />
          <ConditionBar label="Sharpness" value={user.sharpness} color="bg-state-info" />
          <ConditionBar label="Morale" value={user.morale} color="bg-accent" />
          <ConditionBar label="Confidence" value={user.confidence} color="bg-state-warn" />
        </div>

        {user.injury && (
          <div className="mt-4 p-3 rounded-lg bg-state-loss/10 border border-state-loss/20 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-state-loss animate-pulse" />
            <span className="text-sm font-bold text-state-loss">{user.injury.type}</span>
            <span className="text-sm text-txt-muted">· {user.injury.severity} · {user.injury.daysRemaining} days out</span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniStat label="Weekly Wage" value={`£${user.contract.weeklyWage.toLocaleString()}`} />
        <MiniStat label="Contract Until" value={user.contract.endDate.slice(0, 7)} />
        <MiniStat label="Squad Role" value={user.contract.squadRole} />
        <MiniStat label="Recent Form" value={formatForm(user.form)} />
      </div>

      {/* Next Fixture + League Position */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="panel p-5">
          <div className="label mb-3">Next Fixture</div>
          {next && opponentClub ? (
            <>
              <div className="text-xs font-semibold text-txt-muted mb-4 flex items-center gap-2">
                <span className="bg-bg-hover px-2 py-1 rounded text-txt">{formatDate(next.date)}</span>
                <span>{isHome ? 'Home' : 'Away'}</span>
                <span className="text-txt-dim">·</span>
                <span className="text-accent-soft">{daysToFixture === 0 ? 'Today' : `In ${daysToFixture} days`}</span>
              </div>
              <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-bg-card border border-bg-border">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Crest club={club} size={36} />
                  <span className="text-sm font-bold text-txt truncate">{club.shortName}</span>
                </div>
                <div className="text-txt-dim text-xs font-bold bg-bg-hover px-2 py-1 rounded-md">VS</div>
                <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                  <span className="text-sm font-bold text-txt truncate text-right">{opponentClub.shortName}</span>
                  <Crest club={opponentClub} size={36} />
                </div>
              </div>
              <button
                className="btn btn-primary w-full mt-4"
                onClick={() => onNavigate('match')}
                disabled={loading}
              >
                Prepare for match
              </button>
            </>
          ) : (
            <div className="text-sm text-txt-muted">Season complete.</div>
          )}
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="label">League Position</div>
            <button className="text-xs font-bold text-accent hover:text-accent-soft transition-colors" onClick={() => onNavigate('league')}>
              View Table →
            </button>
          </div>
          {userRow && (
            <div className="flex items-center gap-5">
              <div className="text-4xl font-black text-white tracking-tighter">#{userRowIdx + 1}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-txt">
                  {userRow.won}W · {userRow.drawn}D · {userRow.lost}L
                </div>
                <div className="text-xs font-medium text-txt-muted mt-0.5">
                  {userRow.points} pts · GD {userRow.goalDifference >= 0 ? '+' : ''}{userRow.goalDifference}
                </div>
                <div className="mt-2 flex gap-1">
                  {userRow.form.map((f, i) => (
                    <span key={i} className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-black ${f === 'W' ? 'bg-accent/20 text-accent-soft' : f === 'D' ? 'bg-txt-dim/20 text-txt-muted' : 'bg-state-loss/20 text-state-loss'}`}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Season stats + recent results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="label">Season Stats</div>
            <button className="text-xs font-bold text-accent hover:text-accent-soft transition-colors" onClick={() => onNavigate('profile')}>
              Full Profile →
            </button>
          </div>
          {seasonStats ? (
            <div className="grid grid-cols-4 gap-4 text-center">
              <StatSmall value={seasonStats.appearances} label="Apps" />
              <StatSmall value={seasonStats.goals} label="Goals" />
              <StatSmall value={seasonStats.assists} label="Assists" />
              <StatSmall value={seasonStats.a