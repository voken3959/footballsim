import { ReactNode } from 'react';
import { useCareerStore } from '../store/careerStore';
import { formatDate } from '../game/dates';

export type NavKey =
  | 'dashboard' | 'squad' | 'training' | 'match'
  | 'league' | 'profile' | 'mail' | 'stats' | 'load' | 'settings';

interface NavItem {
  key: NavKey;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Home', icon: 'home' },
  { key: 'match', label: 'Matches', icon: 'ball' },
  { key: 'squad', label: 'Club', icon: 'shield' },
  { key: 'training', label: 'Training', icon: 'dumbbell' },
  { key: 'league', label: 'League', icon: 'table' },
  { key: 'stats', label: 'Stats DB', icon: 'chart' },
  { key: 'profile', label: 'Player', icon: 'user' },
  { key: 'mail', label: 'Inbox', icon: 'mail' },
  { key: 'load', label: 'Saves', icon: 'save' },
];

interface Props {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  children: ReactNode;
}

export default function Layout({ active, onNavigate, children }: Props) {
  const user = useCareerStore((s) => s.userPlayer());
  const club = useCareerStore((s) => s.userClub());
  const save = useCareerStore((s) => s.save);

  const unreadCount = save && save.emails ? save.emails.filter(e => !e.read).length : 0;

  return (
    <div className="min-h-full flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-56 border-r border-bg-border bg-bg-panel/60 backdrop-blur shrink-0">
        <div className="p-4 border-b border-bg-border">
          <div className="flex items-center gap-2.5">
            {club && <Crest club={club} size={32} />}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-txt truncate">
                {user?.displayName ?? 'New career'}
              </div>
              <div className="text-[11px] text-txt-muted truncate">
                {club?.shortName ?? '—'} · {user?.primaryPosition ?? '—'}
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm mb-0.5 transition-colors text-left relative ${
                active === item.key
                  ? 'bg-accent/15 text-txt border border-accent/30'
                  : 'text-txt-muted hover:text-txt hover:bg-bg-card border border-transparent'
              }`}
            >
              <Icon name={item.icon} />
              <span className="flex-1">{item.label}</span>
              {item.key === 'mail' && unreadCount > 0 && (
                <span className="bg-state-loss text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>
        {save && (
          <div className="p-3 border-t border-bg-border text-[11px] text-txt-dim space-y-0.5">
            <div>{formatDate(save.currentDate)}</div>
            <div>{save.currentSeason}</div>
          </div>
        )}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-bg-border bg-bg-panel/70 sticky top-0 z-10 backdrop-blur">
        <div className="flex items-center gap-2">
          {club && <Crest club={club} size={24} />}
          <span className="text-sm font-semibold truncate">{user?.displayName ?? 'Career'}</span>
        </div>
        {save && <span className="text-[11px] text-txt-muted">{formatDate(save.currentDate)}</span>}
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto p-4 md:p-6 pb-24 md:pb-6">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-bg-border bg-bg-panel/95 backdrop-blur flex justify-around z-20">
        {NAV.filter(i => ['dashboard', 'match', 'stats', 'mail', 'profile'].includes(i.key)).map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 text-[10px] relative ${
              active === item.key ? 'text-accent-soft' : 'text-txt-muted'
            }`}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.key === 'mail' && unreadCount > 0 && (
              <span className="absolute top-1 right-1/4 bg-state-loss text-white text-[9px] font-bold px-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: 'M3 11.5 12 3l9 8.5V21h-6v-6H9v6H3z',
    ball: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2 3 2.6-1.2 3.6h-3.6L9 6.6 12 4Zm-6.5 4 2.9.4 1.2 3.6-2.4 2.4-2.6-1.5A7.9 7.9 0 0 1 5.5 8Zm13 0a7.9 7.9 0 0 1 2.5 5.2L18.4 14l-2.4-2.4 1.2-3.6 2.9-.4ZM9.5 13.3h5l1.4 4-3.9 2.6-3.9-2.6 1.4-4Z',
    shield: 'M12 2 4 5v7c0 5 3.4 9.3 8 10 4.6-.7 8-5 8-10V5l-8-3Z',
    dumbbell: 'M3 9h2v6H3V9Zm16 0h2v6h-2V9ZM7 7h3v10H7V7Zm7 0h3v10h-3V7ZM10 10h4v4h-4v-4Z',
    table: 'M3 5h18v3H3V5Zm0 5h18v3H3v-3Zm0 5h18v3H3v-3Z',
    user: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm-8 9a8 8 0 0 1 16 0H4Z',
    save: 'M5 3h12l4 4v14H3V3h2Zm2 2v6h10V5H7Zm0 10v6h10v-6H7Z',
    mail: 'M2 5h20v14H2V5Zm2.4 2L12 12.6 19.6 7H4.4ZM4 9.5V17h16V9.5l-8 5.5-8-5.5Z',
    chart: 'M4 20h16v2H4v-2Zm2-8h3v6H6v-6Zm5-6h3v12h-3V6Zm5 4h3v8h-3v-8Z',
  };
  const d = paths[name] ?? paths.home;
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="shrink-0" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function Crest({ club, size = 32 }: { club: { name: string; abbreviation: string; primaryColor: string; secondaryColor: string }; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${club.primaryColor} 0%, ${club.primaryColor} 60%, ${club.secondaryColor} 60%)`,
        color: pickContrast(club.primaryColor),
        fontSize: size * 0.32,
        border: '1px solid rgba(255,255,255,0.1)',
      }}
      title={club.name}
    >
      {club.abbreviation}
    </div>
  );
}

function pickContrast(hex: string): string {
  const m = hex.replace('#', '');
  if (m.length !== 6) return '#fff';
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#0b0f12' : '#ffffff';
}
