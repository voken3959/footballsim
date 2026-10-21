import { useEffect, useRef, useState } from 'react';
import { useCareerStore } from '../store/careerStore';
import type { CareerSave } from '../game/types';
import { formatDate } from '../game/dates';

interface Props {
  onBack: () => void;
}

export default function LoadScreen({ onBack }: Props) {
  const listCareers = useCareerStore((s) => s.listCareers);
  const loadCareer = useCareerStore((s) => s.loadCareer);
  const deleteCareer = useCareerStore((s) => s.deleteCareer);
  const save = useCareerStore((s) => s.save);

  const [careers, setCareers] = useState<CareerSave[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = async () => {
    setBusy(true);
    try {
      const list = await listCareers();
      setCareers(list);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleLoad = async (id: string) => {
    setError(null);
    await loadCareer(id);
    onBack();
  };

  const handleDelete = async (id: string) => {
    await deleteCareer(id);
    setConfirmDelete(null);
    await refresh();
  };

  const handleExport = (career: CareerSave) => {
    const json = JSON.stringify(career, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `career_${career.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as CareerSave;
      // Minimal validation
      if (!parsed.id || !parsed.players || !parsed.userPlayerId) {
        throw new Error('Not a valid career save file.');
      }
      // Store it
      const db = await import('idb').then((m) =>
        m.openDB('football_career_db', 1),
      );
      await db.put('careers', parsed);
      await refresh();
    } catch (err: any) {
      setError(err.message ?? 'Failed to import save.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="label text-accent-soft">Saves</div>
          <h1 className="text-xl font-bold mt-1">Career slots</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn" onClick={handleImportClick}>
            Import save
          </button>
          <input
            type="file"
            accept="application/json"
            ref={fileInputRef}
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-state-loss/10 border border-state-loss/30 text-sm text-state-loss">
          {error}
        </div>
      )}

      {careers.length === 0 && !busy && (
        <div className="panel p-8 text-center">
          <div className="text-txt-muted text-sm">
            No career saves yet. Create one from the career creation screen.
          </div>
        </div>
      )}

      <div className="space-y-2">
        {careers.map((c) => {
          const isCurrent = save?.id === c.id;
          const user = c.players.find((p) => p.id === c.userPlayerId);
          const club = user ? c.clubs.find((cl) => cl.id === user.clubId) : null;
          return (
            <div
              key={c.id}
              className={`panel-card p-4 ${
                isCurrent ? 'border-accent/50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold text-txt truncate">
                    {user?.displayName ?? 'Unknown player'}{' '}
                    {isCurrent && (
                      <span className="pill bg-accent/20 text-accent-soft ml-2">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-txt-muted mt-1">
                    {club?.name ?? '—'} · {user?.primaryPosition ?? '—'} ·{' '}
                    {user?.age ?? '—'} yrs
                  </div>
                  <div className="text-[11px] text-txt-dim mt-1">
                    {c.currentSeason} · {formatDate(c.currentDate)} ·{' '}
                    {c.players.find((p) => p.id === c.userPlayerId)?.careerAppearances ?? 0} apps
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!isCurrent && (
                    <button
                      className="btn btn-primary text-xs px-2.5 py-1.5"
                      onClick={() => handleLoad(c.id)}
                    >
                      Load
                    </button>
                  )}
                  <button
                    className="btn text-xs px-2.5 py-1.5"
                    onClick={() => handleExport(c)}
                  >
                    Export
                  </button>
                  <button
                    className="btn text-xs px-2.5 py-1.5 text-state-loss hover:bg-state-loss/10"
                    onClick={() => setConfirmDelete(c.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {confirmDelete === c.id && (
                <div className="mt-3 p-3 rounded-md bg-state-loss/10 border border-state-loss/30 flex items-center justify-between gap-2">
                  <span className="text-sm text-state-loss">
                    Delete this career permanently?
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="btn text-xs px-2 py-1"
                      onClick={() => setConfirmDelete(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn text-xs px-2 py-1 bg-state-loss text-white border-transparent"
                      onClick={() => handleDelete(c.id)}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-2">
        <button className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
      </div>
    </div>
  );
}
