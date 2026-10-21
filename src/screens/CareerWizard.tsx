import { useEffect, useMemo, useState } from 'react';
import { useCareerStore, generateStartingOffers } from '../store/careerStore';
import { RNG } from '../game/rng';
import { generateWorld, WorldData } from '../game/world';
import {
  ALL_POSITIONS, POSITION_LABEL, POSITION_GROUP,
} from '../game/positions';
import { formatDate } from '../game/dates';
import type {
  CareerCreation, Foot, Nationality, Personality, Position,
} from '../game/types';
import { Crest } from '../components/Layout';

const NATIONALITIES: Nationality[] = [
  'England', 'France', 'Germany', 'Spain', 'Italy',
  'Portugal', 'Netherlands', 'Brazil', 'Argentina', 'Belgium',
];

const PERSONALITIES: Personality[] = [
  'Ambitious', 'Loyal', 'Professional', 'Competitive',
  'Reserved', 'Charismatic', 'RiskTaker',
];

const START_DATE = '2026-08-10';

const PATHWAYS: { key: CareerCreation['pathway']; title: string; body: string }[] = [
  {
    key: 'Youth',
    title: 'Youth Prospect',
    body: 'Start in a club academy with limited first-team access. Lowest starting ability, highest growth ceiling.',
  },
  {
    key: 'LowerLeague',
    title: 'Lower-League Prospect',
    body: 'Join a smaller professional club. Modest starting ability, real match opportunities.',
  },
  {
    key: 'Established',
    title: 'Established Youngster',
    body: 'Begin at a stronger club. Higher starting rating but tougher competition for a starting shirt.',
  },
  {
    key: 'Custom',
    title: 'Custom Career',
    body: 'Pick the starting club yourself. You choose the environment.',
  },
];

interface Props {
  onComplete: () => void;
  onLoad: () => void;
}

export default function CareerWizard({ onComplete, onLoad }: Props) {
  const newCareer = useCareerStore((s) => s.newCareer);
  const loading = useCareerStore((s) => s.loading);
  const error = useCareerStore((s) => s.error);

  const seed = useMemo(() => Math.floor(Math.random() * 1_000_000_000), []);
  const [world, setWorld] = useState<WorldData | null>(null);
  const [offers, setOffers] = useState<string[]>([]);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CareerCreation>({
    firstName: '',
    surname: '',
    displayName: '',
    nationality: 'England',
    age: 16,
    foot: 'Right',
    heightCm: 178,
    weightKg: 72,
    primaryPosition: 'ST',
    secondaryPosition: null,
    shirtNumber: 9,
    personality: 'Balanced' as any,
    pathway: 'Youth',
    startingClubId: null,
  });

  useEffect(() => {
    setForm((f) => ({ ...f, personality: 'Professional' }));
  }, []);

  useEffect(() => {
    const rng = new RNG(seed);
    setWorld(generateWorld(rng, START_DATE));
  }, [seed]);

  const update = <K extends keyof CareerCreation>(key: K, value: CareerCreation[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const canProceed = (): boolean => {
    if (step === 1) {
      return (
        form.firstName.trim().length >= 1 &&
        form.surname.trim().length >= 1 &&
        form.heightCm >= 150 && form.heightCm <= 210 &&
        form.weightKg >= 50 && form.weightKg <= 120
      );
    }
    if (step === 2) return true;
    if (step === 3) return true;
    if (step === 4) {
      if (form.pathway === 'Custom') return form.startingClubId !== null;
      return form.startingClubId !== null;
    }
    return true;
  };

  const generateOffers = () => {
    if (!world) return;
    const tempRng = new RNG(seed + 1);
    const baseline = pathwayBaseRating(form.pathway, tempRng);
    const fake = {
      id: 'tmp', firstName: form.firstName, surname: form.surname,
      displayName: form.displayName, nationality: form.nationality,
      dateOfBirth: '', age: form.age, foot: form.foot,
      heightCm: form.heightCm, weightKg: form.weightKg,
      primaryPosition: form.primaryPosition,
      secondaryPosition: form.secondaryPosition,
      shirtNumber: form.shirtNumber, personality: form.personality,
      attributes: {} as any, potential: 70, overall: baseline,
      fitness: 90, fatigue: 5, sharpness: 70, morale: 80, confidence: 70,
      injury: null, clubId: '', contract: {} as any, status: 'Fringe' as any,
      form: 0, seasonStats: [], careerAppearances: 0, careerGoals: 0,
      careerAssists: 0, developmentPoints: 0, trainingFocus: null,
    };
    const list = generateStartingOffers(world, fake as any, form.pathway, null, tempRng);
    setOffers(list);
  };

  useEffect(() => {
    if (step === 4 && offers.length === 0) generateOffers();
  }, [step]);

  const submit = async () => {
    if (!form.startingClubId) return;
    await newCareer(form, form.startingClubId, seed);
    onComplete();
  };

  return (
    <div className="min-h-full flex items-start justify-center p-4 md:p-8">
      <div className="w-full max-w-3xl">
        <div className="mb-6">
          <div className="label text-accent-soft">New Career</div>
          <h1 className="text-2xl md:text-3xl font-bold text-txt mt-1">
            Build your footballer
          </h1>
          <p className="text-txt-muted text-sm mt-1">
            Step {step} of 5 · Seed {seed}
          </p>
          <div className="mt-3 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className={`h-1 flex-1 rounded-full ${
                  n <= step ? 'bg-accent' : 'bg-bg-border'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="panel p-5 md:p-6">
          {step === 1 && <StepIdentity form={form} update={update} />}
          {step === 2 && <StepPosition form={form} update={update} />}
          {step === 3 && (
            <StepPathway
              form={form}
              update={update}
              onNext={generateOffers}
            />
          )}
          {step === 4 && world && (
            <StepClub
              form={form}
              update={update}
              world={world}
              offers={offers}
            />
          )}
          {step === 5 && world && <StepConfirm form={form} world={world} />}

          {error && (
            <div className="mt-4 p-3 rounded-md bg-state-loss/10 border border-state-loss/30 text-sm text-state-loss">
              {error}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            className="btn"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || loading}
          >
            Back
          </button>
          {step < 5 && (
            <button
              className="btn btn-primary"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed() || loading}
            >
              Continue
            </button>
          )}
          {step === 5 && (
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={!canProceed() || loading}
            >
              {loading ? 'Creating…' : 'Start career'}
            </button>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-bg-border text-center">
          <button className="text-sm text-txt-muted hover:text-txt transition-colors" onClick={onLoad}>
            Or load an existing career
          </button>
        </div>
      </div>
    </div>
  );
}

function StepIdentity({ form, update }: { form: CareerCreation; update: any }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Personal details</h2>
        <p className="text-txt-muted text-sm">Who are you?</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <div className="label mb-1">First name</div>
          <input className="input" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} maxLength={20} placeholder="Alex" />
        </label>
        <label className="block">
          <div className="label mb-1">Surname</div>
          <input className="input" value={form.surname} onChange={(e) => update('surname', e.target.value)} maxLength={20} placeholder="Foster" />
        </label>
      </div>
      <label className="block">
        <div className="label mb-1">Display name (optional)</div>
        <input className="input" value={form.displayName} onChange={(e) => update('displayName', e.target.value)} placeholder={`${form.firstName} ${form.surname}`.trim() || 'Auto'} maxLength={30} />
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <div className="label mb-1">Nationality</div>
          <select className="select" value={form.nationality} onChange={(e) => update('nationality', e.target.value)}>
            {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="block">
          <div className="label mb-1">Starting age</div>
          <select className="select" value={form.age} onChange={(e) => update('age', Number(e.target.value))}>
            {[16, 17, 18, 19, 20, 21].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="block">
          <div className="label mb-1">Preferred foot</div>
          <select className="select" value={form.foot} onChange={(e) => update('foot', e.target.value)}>
            {['Right', 'Left', 'Both'].map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label className="block">
          <div className="label mb-1">Height (cm)</div>
          <input type="number" className="input" min={150} max={210} value={form.heightCm} onChange={(e) => update('heightCm', Number(e.target.value))} />
        </label>
        <label className="block">
          <div className="label mb-1">Weight (kg)</div>
          <input type="number" className="input" min={50} max={120} value={form.weightKg} onChange={(e) => update('weightKg', Number(e.target.value))} />
        </label>
      </div>
      <label className="block">
        <div className="label mb-1">Shirt number</div>
        <input type="number" className="input" min={1} max={99} value={form.shirtNumber} onChange={(e) => update('shirtNumber', Number(e.target.value))} />
      </label>
      <div>
        <div className="label mb-2">Personality</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PERSONALITIES.map((p) => (
            <button key={p} onClick={() => update('personality', p)} className={`px-3 py-2 rounded-md text-sm border transition-colors ${form.personality === p ? 'border-accent bg-accent/10 text-txt' : 'border-bg-border bg-bg-card text-txt-muted hover:text-txt'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepPosition({ form, update }: { form: CareerCreation; update: any }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Position</h2>
        <p className="text-txt-muted text-sm">Where do you play?</p>
      </div>
      <div>
        <div className="label mb-2">Primary position</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {ALL_POSITIONS.map((p) => (
            <button key={p} onClick={() => update('primaryPosition', p)} className={`px-2 py-3 rounded-md text-sm border transition-colors flex flex-col items-center gap-0.5 ${form.primaryPosition === p ? 'border-accent bg-accent/10 text-txt' : 'border-bg-border bg-bg-card text-txt-muted hover:text-txt'}`}>
              <span className="font-bold text-base">{p}</span>
              <span className="text-[10px] opacity-80">{POSITION_LABEL[p].split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="label mb-2">Secondary position (optional)</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <button onClick={() => update('secondaryPosition', null)} className={`px-2 py-3 rounded-md text-sm border transition-colors ${form.secondaryPosition === null ? 'border-accent bg-accent/10 text-txt' : 'border-bg-border bg-bg-card text-txt-muted hover:text-txt'}`}>
            None
          </button>
          {ALL_POSITIONS.filter((p) => p !== form.primaryPosition).map((p) => (
            <button key={p} onClick={() => update('secondaryPosition', p)} className={`px-2 py-3 rounded-md text-sm border transition-colors ${form.secondaryPosition === p ? 'border-accent bg-accent/10 text-txt' : 'border-bg-border bg-bg-card text-txt-muted hover:text-txt'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="panel-card p-3 text-xs text-txt-muted">
        <strong className="text-txt">Group:</strong> {POSITION_GROUP[form.primaryPosition]} · Attributes will be weighted toward {POSITION_LABEL[form.primaryPosition].toLowerCase()} priorities.
      </div>
    </div>
  );
}

function StepPathway({ form, update, onNext }: { form: CareerCreation; update: any; onNext: () => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Starting pathway</h2>
        <p className="text-txt-muted text-sm">How does your career begin?</p>
      </div>
      <div className="space-y-2">
        {PATHWAYS.map((p) => (
          <button key={p.key} onClick={() => { update('pathway', p.key); update('startingClubId', null); onNext(); }} className={`w-full text-left p-4 rounded-md border transition-colors ${form.pathway === p.key ? 'border-accent bg-accent/10' : 'border-bg-border bg-bg-card hover:border-txt-dim'}`}>
            <div className="font-semibold text-txt">{p.title}</div>
            <div className="text-sm text-txt-muted mt-1">{p.body}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepClub({ form, update, world, offers }: { form: CareerCreation; update: any; world: WorldData; offers: string[] }) {
  const clubList = offers.map((id) => world.clubs.find((c) => c.id === id)).filter(Boolean) as any[];
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Club offers</h2>
        <p className="text-txt-muted text-sm">These clubs are interested in signing you. Pick one to start your career.</p>
      </div>
      {clubList.length === 0 && <div className="text-sm text-state-warn">No offers yet — try a different pathway.</div>}
      <div className="space-y-2">
        {clubList.map((club: any) => {
          const league = world.leagues.find((l) => l.id === club.leagueId);
          const selected = form.startingClubId === club.id;
          return (
            <button key={club.id} onClick={() => update('startingClubId', club.id)} className={`w-full text-left p-4 rounded-md border transition-colors flex items-start gap-3 ${selected ? 'border-accent bg-accent/10' : 'border-bg-border bg-bg-card hover:border-txt-dim'}`}>
              <Crest club={club} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <span className="font-semibold text-txt truncate">{club.name}</span>
                  <span className="text-[11px] text-txt-muted">{league?.name} · T{league?.tier}</span>
                </div>
                <div className="text-xs text-txt-muted mt-0.5">{club.stadium} · {club.managerName}</div>
                <div className="text-[11px] text-txt-dim mt-1 flex gap-3">
                  <span>Reputation {club.reputation}</span>
                  <span>Finances {club.finances}</span>
                  <span>Training {club.trainingFacilities}</span>
                  <span>Youth {club.youthFacilities}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepConfirm({ form, world }: { form: CareerCreation; world: WorldData }) {
  const club = world.clubs.find((c) => c.id === form.startingClubId);
  const league = club ? world.leagues.find((l) => l.id === club.leagueId) : null;
  const display = form.displayName || `${form.firstName} ${form.surname}`.trim();
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Confirm</h2>
        <p className="text-txt-muted text-sm">Ready to begin your career?</p>
      </div>
      <div className="panel-card p-4 grid grid-cols-2 gap-4 text-sm">
        <div><div className="text-[10px] uppercase tracking-wider text-txt-dim">Name</div><div className="text-txt font-medium truncate">{display}</div></div>
        <div><div className="text-[10px] uppercase tracking-wider text-txt-dim">Nationality</div><div className="text-txt font-medium truncate">{form.nationality}</div></div>
        <div><div className="text-[10px] uppercase tracking-wider text-txt-dim">Age</div><div className="text-txt font-medium truncate">{form.age}</div></div>
        <div><div className="text-[10px] uppercase tracking-wider text-txt-dim">Foot</div><div className="text-txt font-medium truncate">{form.foot}</div></div>
        <div><div className="text-[10px] uppercase tracking-wider text-txt-dim">Position</div><div className="text-txt font-medium truncate">{form.primaryPosition}{form.secondaryPosition ? ` / ${form.secondaryPosition}` : ''}</div></div>
        <div><div className="text-[10px] uppercase tracking-wider text-txt-dim">Personality</div><div className="text-txt font-medium truncate">{form.personality}</div></div>
        <div><div className="text-[10px] uppercase tracking-wider text-txt-dim">Height</div><div className="text-txt font-medium truncate">{form.heightCm} cm</div></div>
        <div><div className="text-[10px] uppercase tracking-wider text-txt-dim">Weight</div><div className="text-txt font-medium truncate">{form.weightKg} kg</div></div>
        <div><div className="text-[10px] uppercase tracking-wider text-txt-dim">Pathway</div><div className="text-txt font-medium truncate">{form.pathway}</div></div>
        <div><div className="text-[10px] uppercase tracking-wider text-txt-dim">Shirt</div><div className="text-txt font-medium truncate">#{form.shirtNumber}</div></div>
      </div>
      {club && (
        <div className="panel-card p-4">
          <div className="flex items-center gap-3">
            <Crest club={club} size={48} />
            <div>
              <div className="label">Starting club</div>
              <div className="font-semibold text-txt">{club.name}</div>
              <div className="text-xs text-txt-muted">{league?.name} · {club.stadium}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function pathwayBaseRating(pathway: CareerCreation['pathway'], rng: RNG): number {
  switch (pathway) {
    case 'Youth': return rng.int(50, 57);
    case 'LowerLeague': return rng.int(54, 60);
    case 'Established': return rng.int(60, 67);
    case 'Custom': return rng.int(54, 68);
    default: return 55;
  }
}
