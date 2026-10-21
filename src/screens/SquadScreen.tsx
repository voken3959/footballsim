import { useCareerStore } from '../store/careerStore';
import { Crest } from '../components/Layout';
import { POSITION_LABEL } from '../game/positions';
import { sortSquad } from '../game/world';
import type { Player, Position } from '../game/types';

export default function SquadScreen() {
  const save = useCareerStore((s) => s.save);
  const user = useCareerStore((s) => s.userPlayer());
  const club = useCareerStore((s) => s.userClub());
  const league = useCareerStore((s) => s.userLeague());

  if (!save || !user || !club || !league) {
    return <div className="panel p-6 text-txt-muted">No active career.</div>;
  }

  const squad = save.players.filter((p) => p.clubId === club.id);
  const sorted = sortSquad(squad);
  const standings = save.standings[league.id] ?? [];
  const userRowIdx = standings.findIndex((r) => r.clubId === club.id);
  const userRow = standings[userRowIdx];

  return (
    <div className="space-y-4">
      {/* Club header */}
      <div className="panel p-4 md:p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <Crest club={club} size={56} />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-txt truncate">
              {club.name}
            </h1>
            <div className="text-sm text-txt-muted mt-1">
              {club.stadium} · {league.name}
            </div>
            <div className="text-xs text-txt-dim mt-1">
              Manager: {club.managerName} · {club.formation} · {club.tactic}
            </div>
          </div>
          {userRow && (
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-txt-dim">
                League
              </div>
              <div className="text-3xl font-black text-txt tabular-nums">
                #{userRowIdx + 1}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <ClubStat label="Reputation" value={club.reputation} max={100} />
          <ClubStat label="Finances" value={club.finances} max={100} />
          <ClubStat label="Training" value={club.trainingFacilities} max={100} />
          <ClubStat label="Youth" value={club.youthFacilities} max={100} />
        </div>
      </div>

      {/* Squad list */}
      <div className="panel overflow-hidden">
        <div className="px-4 py-3 border-b border-bg-border flex items-center justify-between">
          <div className="label">Squad · {squad.length} players</div>
        </div>
        <div>
          {sorted.map((p) => (
            <SquadRow
              key={p.id}
              player={p}
              isUser={p.id === user.id}
              userPosition={user.primaryPosition}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ClubStat({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="panel-card p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-txt-dim">
        {label}
      </div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-sm font-semibold text-txt tabular-nums">{value}</span>
        <span className="text-[10px] text-txt-dim">/{max}</span>
      </div>
      <div className="h-1 mt-1 rounded-full bg-bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  );
}

function SquadRow({
  player,
  isUser,
  userPosition,
}: {
  player: Player;
  isUser: boolean;
  userPosition: Position;
}) {
  const group = posGroup(player.primaryPosition);
  const badgeColor =
    group === 'GK'
      ? 'bg-state-warn/20 text-state-warn'
      : group === 'DEF'
      ? 'bg-state-info/20 text-state-info'
      : group === 'MID'
      ? 'bg-accent/20 text-accent-soft'
      : 'bg-state-loss/20 text-state-loss';

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 border-b border-bg-border last:border-b-0 ${
        isUser ? 'bg-accent/5' : ''
      }`}
    >
      <span className={`pill ${badgeColor} w-10 justify-center`}>
        {player.primaryPosition}
      </span>
      <span className="w-7 text-txt-dim text-xs tabular-nums">
        #{player.shirtNumber}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-txt truncate flex items-center gap-2">
          {player.displayName}
          {isUser && (
            <span className="pill bg-accent/20 text-accent-soft text-[9px]">
              YOU
            </span>
          )}
        </div>
        <div className="text-[11px] text-txt-muted">
          {player.age} yrs · {player.nationality}
          {player.injury && (
            <span className="text-state-loss ml-1.5">· injured</span>
          )}
        </div>
      </div>
      <div className="text-xs text-txt-muted tabular-nums hidden md:block w-16 text-right">
        {POSITION_LABEL[player.primaryPosition].split(' ')[0]}
      </div>
      <div className="text-xs text-txt-muted tabular-nums w-12 text-right">
        {player.contract.squadRole}
      </div>
      <div className="w-10 text-right">
        <span
          className={`text-sm font-bold tabular-nums ${
            player.overall >= 80
              ? 'text-state-win'
              : player.overall >= 70
              ? 'text-txt'
              : player.overall >= 60
              ? 'text-txt-muted'
              : 'text-txt-dim'
          }`}
        >
          {player.overall}
        </span>
      </div>
    </div>
  );
}

function posGroup(pos: Position): 'GK' | 'DEF' | 'MID' | 'ATT' {
  if (pos === 'GK') return 'GK';
  if (pos === 'RB' || pos === 'LB' || pos === 'CB') return 'DEF';
  if (pos === 'DM' || pos === 'CM' || pos === 'AM') return 'MID';
  return 'ATT';
}
