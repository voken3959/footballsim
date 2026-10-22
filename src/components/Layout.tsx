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
    <div className="min-h-full flex flex-col md:flex-row bg-bg">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 border-r border-bg-border bg-bg-panel/40 backdrop-blur-xl shrink-0 z-20">
        <div className="p-5 border-b border-bg-border flex items-center gap-3">
          {club && <Crest club={club} size={36} />}
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate tracking-tight">
              {user?.displayName ?? 'New career'}
            </div>
            <div className="text-[11px] font-medium text-txt-muted truncate mt-0.5">
              {club?.shortName ?? '—'} · {user?.primaryPosition ?? '—'}
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group ${
                active === item.key
                  ? 'bg-accent/10 text-accent-soft'
                  : 'text-txt-muted hover:text-txt hover:bg-bg-hover'
              }`}
            >
              <div className={`${active === item.key ? 'text-accent' : 'text-txt-dim group-hover:text-txt-muted'} transition-colors`}>
                <Icon name={item.icon} />
              </div>
              <span className="flex-1">{item.label}</span>
              {item.key === 'mail' && unreadCount > 0 && (
                <span className="bg-accent text-[#040d0a] text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>
        
        {save && (
          <div className="p-4 border-t border-bg-border bg-bg-panel/60">
            <div className="label mb-1">Current Date</div>
            <div className="text-sm font-semibold text-txt tabular-nums">
              {formatDate(save.currentDate)}
            </div>
            <div className="text-xs text-txt-muted mt-0.5">{save.currentSeason}</div>
          </div>
        )}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-bg-border bg-bg-panel/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {club && <Crest club={club} size={28} />}
          <span className="text-sm font-bold text-white truncate">{user?.displayName ?? 'Career'}</span>
        </div>
        {save && (
          <div className="text-right">
            <div className="text-[10px] text-txt-dim font-bold uppercase tracking-wider">{save.currentSeason}</div>
            <div className="text-xs font-medium text-txt-muted">{formatDate(save.currentDate).split(',')[1]}</div>
          </div>
        )}
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 relative">
        <div className="max-w-[1400px] mx-auto p-4 md:p-8 pb-28 md:pb-12">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-bg-border bg-bg-panel/90 backdrop-blur-lg flex justify-around z-40 pb-safe">
        {NAV.filter(i => ['dashboard', 'match', 'stats', 'mail', 'profile'].includes(i.key)).map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-bold transition-colors relative ${
              active === item.key ? 'text-accent' : 'text-txt-dim hover:text-txt-muted'
            }`}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.key === 'mail' && unreadCount > 0 && (
              <span className="absolute top-2 right-1/4 bg-accent text-[#040d0a] text-[9px] font-black px-1.5 rounded-md">
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
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="shrink-0" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function Crest({ club, size = 32 }: { club: { name: string; abbreviation: string; primaryColor: string; secondaryColor: string }; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-black shrink-0 shadow-inner-top"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${club.primaryColor} 0%, ${club.primaryColor} 60%, ${club.secondaryColor} 60%)`,
        color: pickContrast(club.primaryColor),
        fontSize: size * 0.34,
        border: '1px solid rgba(255,255,255,0.15)',
        letterSpacing: '-0.05em'
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
  return lum > 0.6 ? '#090c10' : '#ffffff';
}