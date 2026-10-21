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

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// COMPONENT
// ------------------------------------------------------------

interface Props {
  onComplete: () => void;
}

export default function CareerWizard({ onComplete }: Props) {
  const newCareer = useCareerStore((s) => s.newCareer);
  const loading = useCareerStore((s) => s.loading);
  const error = useCareerStore((s) => s.error);

  // Stable seed for this wizard session
  const seed = useMemo(() => Math.floor(Math.random() * 1_000_000_000), []);

  // World generated once — used only to show offers
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
    personality: 'Balanced' as any, // will fix below
    pathway: 'Youth',
    startingClubId: null,
  });
  // Correct initial personality
  useEffect(() => {
    setForm((f) => ({ ...f, personality: 'Professional' }));
  }, []);

  // Build the world on mount so the offers step is instant
  useEffect(() => {
    const rng = new RNG(seed);
    setWorld(generateWorld(rng, START_DATE));
  }, [seed]);

  const update = <K extends keyof CareerCreation>(key: K, value: CareerCreation[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  // ----------------------------------------------------------
  // STEP VALIDATION
  // ----------------------------------------------------------
  const canProceed = (): boolean => {
    if (step === 1) {
      return (
        form.firstName.trim().length >= 1 &&
        form.surname.trim().length >= 1 &&
        form.heightCm >= 150 && form.heightCm <= 210 &&
        form.weightKg >= 50 && form.weightKg <= 120
      );
    }
    if (step === 2) return true; // always has a primary
    if (step === 3) return true; // pathway always chosen
    if (step === 4) {
      if (form.pathway === 'Custom') return form.startingClubId !== null;
      return form.startingClubId !== null;
    }
    return true;
  };

  // ----------------------------------------------------------
  // GENERATE OFFERS WHEN PATHWAY PICKED
  // ----------------------------------------------------------
  const generateOffers = () => {
    if (!world) return;
    // Build a temp player to estimate their worth → drives the offers
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

  // ----------------------------------------------------------
  // SUBMIT
  // ----------------------------------------------------------
  const submit = async () => {
    if (!form.startingClubId) return;
    await newCareer(form, form.startingClubId, seed);
    onComplete();
  };

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <div className="min-h-full flex items-start justify-center p-4 md:p-8">
      <div className="w-full max-w-3xl">
        {/* Header */}
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

        {/* Body */}
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

        {/* Navigation */}
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
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// STEP 1 — IDENTITY
// ------------------------------------------------------------

function StepIdentity({
  form,
  update,
}: {
  form: CareerCreation;
  update: <K extends keyof CareerCreation>(k: K, v: CareerCreation[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Personal details</h2>
        <p className="text-txt-muted text-sm">Who are you?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="First name">
          <input
            className="input"
            value={form.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            maxLength={20}
            placeholder="Alex"
          />
        </Field>
        <Field label="Surname">
          <input
            className="input"
            value={form.surname}
            onChange={(e) => update('surname', e.target.value)}
            maxLength={20}
            placeholder="Foster"
          />
        </Field>
      </div>

      <Field label="Display name (optional)">
        <input
          className="input"
          value={form.displayName}
          onChange={(e) => update('displayName', e.target.value)}
          placeholder={`${form.firstName} ${form.surname}`.trim() || 'Auto'}
          maxLength={30}
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nationality">
          <select
            className="select"
            value={form.nationality}
            onChange={(e) => update('nationality', e.target.value as Nationality)}
          >
            {NATIONALITIES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </Field>
        <Field label="Starting age">
          <select
            className="select"
            value={form.age}
            onChange={(e) => update('age', Number(e.target.value))}
          >
            {[16, 17, 18, 19, 20, 21].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Preferred foot">
          <select
            className="select"
            value={form.foot}
            onChange={(e) => update('foot', e.target.value as Foot)}
          >
            {(['Right', 'Left', 'Both'] as Foot[]).map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field label="Height (cm)">
          <input
            type="number"
            className="input"
            min={150}
            max={210}
            value={form.heightCm}
            onChange={(e) => update('heightCm', Number(e.target.value))}
          />
        </Field>
        <Field label="Weight (kg)">
          <input
            type="number"
            className="input"
            min={50}
            max={120}
            value={form.weightKg}
            onChange={(e) => update('weightKg', Number(e.target.value))}
          />
        </Field>
      </div>

      <Field label="Shirt number">
        <input
          type="number"
          className="input"
          min={1}
          max={99}
          value={form.shirtNumber}
          onChange={(e) => update('shirtNumber', Number(e.target.value))}
        />
      </Field>

      <Field label="Personality">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PERSONALITIES.map((p) => (
            <button
              key={p}
              onClick={() => update('personality', p)}
              className={`px-3 py-2 rounded-md text-sm border transition-colors ${
                form.personality === p
                  ? 'border-accent bg-accent/10 text-txt'
                  : 'border-bg-border bg-bg-card text-txt-muted hover:text-txt'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </Field>

      {!form.displayName && form.firstName && form.surname && (
        <p className="text-[11px] text-txt-dim">
          Display name will default to "{form.firstName} {form.surname}".
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// STEP 2 — POSITION
// ------------------------------------------------------------

function StepPosition({
  form,
  update,
}: {
  form: CareerCreation;
  update: <K extends keyof CareerCreation>(k: K, v: CareerCreation[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Position</h2>
        <p className="text-txt-muted text-sm">Where do you play?</p>
      </div>

      <Field label="Primary position">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {ALL_POSITIONS.map((p) => (
            <button
              key={p}
              onClick={() => update('primaryPosition', p)}
              className={`px-2 py-3 rounded-md text-sm border transition-colors flex flex-col items-center gap-0.5 ${
                form.primaryPosition === p
                  ? 'border-accent bg-accent/10 text-txt'
                  : 'border-bg-border bg-bg-card text-txt-muted hover:text-txt'
              }`}
            >
              <span className="font-bold text-base">{p}</span>
              <span className="text-[10px] opacity-80">
                {POSITION_LABEL[p].split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Secondary position (optional)">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <button
            onClick={() => update('secondaryPosition', null)}
            className={`px-2 py-3 rounded-md text-sm border transition-colors ${
              form.secondaryPosition === null
                ? 'border-accent bg-accent/10 text-txt'
                : 'border-bg-border bg-bg-card text-txt-muted hover:text-txt'
            }`}
          >
            None
          </button>
          {ALL_POSITIONS.filter((p) => p !== form.primaryPosition).map((p) => (
            <button
              key={p}
              onClick={() => update('secondaryPosition', p)}
              className={`px-2 py-3 rounded-md text-sm border transition-colors ${
                form.secondaryPosition === p
                  ? 'border-accent bg-accent/10 text-txt'
                  : 'border-bg-border bg-bg-card text-txt-muted hover:text-txt'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </Field>

      <div className="panel-card p-3 text-xs text-txt-muted">
        <strong className="text-txt">Group:</strong>{' '}
        {POSITION_GROUP[form.primaryPosition]} · Attributes will be weighted
        toward {POSITION_LABEL[form.primaryPosition].toLowerCase()} priorities.
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// STEP 3 — PATHWAY
// ------------------------------------------------------------

function StepPathway({
  form,
  update,
  onNext,
}: {
  form: CareerCreation;
  update: <K extends keyof CareerCreation>(k: K, v: CareerCreation[K]) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Starting pathway</h2>
        <p className="text-txt-muted text-sm">
          How does your career begin?
        </p>
      </div>

      <div className="space-y-2">
        {PATHWAYS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              update('pathway', p.key);
              update('startingClubId', null);
              onNext();
            }}
            className={`w-full text-left p-4 rounded-md border transition-colors ${
              form.pathway === p.key
                ? 'border-accent bg-accent/10'
                : 'border-bg-border bg-bg-card hover:border-txt-dim'
            }`}
          >
            <div className="font-semibold text-txt">{p.title}</div>
            <div className="text-sm text-txt-muted mt-1">{p.body}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// STEP 4 — CLUB OFFER
// ------------------------------------------------------------

function StepClub({
  form,
  update,
  world,
  offers,
}: {
  form: CareerCreation;
  update: <K extends keyof CareerCreation>(k: K, v: CareerCreation[K]) => void;
  world: WorldData;
  offers: string[];
}) {
  const clubList = offers
    .map((id) => world.clubs.find((c) => c.id === id))
    .filter(Boolean) as NonNullable<typeof world.clubs[0]>[];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Club offers</h2>
        <p className="text-txt-muted text-sm">
          These clubs are interested in signing you. Pick one to start your
          career.
        </p>
      </div>

      {clubList.length === 0 && (
        <div className="text-sm text-state-warn">
          No offers yet — try a different pathway.
        </div>
      )}

      <div className="space-y-2">
        {clubList.map((club) => {
          const league = world.leagues.find((l) => l.id === club.leagueId);
          const selected = form.startingClubId === club.id;
          return (
            <button
              key={club.id}
              onClick={() => update('startingClubId', club.id)}
              className={`w-full text-left p-4 rounded-md border transition-colors flex items-start gap-3 ${
                selected
                  ? 'border-accent bg-accent/10'
                  : 'border-bg-border bg-bg-card hover:border-txt-dim'
              }`}
            >
              <Crest club={club} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <span className="font-semibold text-txt truncate">
                    {club.name}
                  </span>
                  <span className="text-[11px] text-txt-muted">
                    {league?.name} · T{league?.tier}
                  </span>
                </div>
                <div className="text-xs text-txt-muted mt-0.5">
                  {club.stadium} · {club.managerName}
                </div>
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

// ------------------------------------------------------------
// STEP 5 — CONFIRM
// ------------------------------------------------------------

function StepConfirm({
  form,
  world,
}: {
  form: CareerCreation;
  world: WorldData;
}) {
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
        <KV label="Name" value={display} />
        <KV label="Nationality" value={form.nationality} />
        <KV label="Age" value={String(form.age)} />
        <KV label="Foot" value={form.foot} />
        <KV
          label="Position"
          value={`${form.primaryPosition}${form.secondaryPosition ? ` / ${form.secondaryPosition}` : ''}`}
        />
        <KV label="Personality" value={form.personality} />
        <KV label="Height" value={`${form.heightCm} cm`} />
        <KV label="Weight" value={`${form.weightKg} kg`} />
        <KV label="Pathway" value={form.pathway} />
        <KV label="Shirt" value={`#${form.shirtNumber}`} />
      </div>

      {club && (
        <div className="panel-card p-4">
          <div className="flex items-center gap-3">
            <Crest club={club} size={48} />
            <div>
              <div className="label">Starting club</div>
              <div className="font-semibold text-txt">{club.name}</div>
              <div className="text-xs text-txt-muted">
                {league?.name} · {club.stadium}
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-txt-dim">
        Seed {`#${(window as any).__career_seed ?? '—'}`} · Starting date{' '}
        {formatDate(START_DATE)}
      </p>
    </div>
  );
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="label mb-1">{label}</div>
      {children}
    </label>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-txt-dim">
        {label}
      </div>
      <div className="text-txt font-medium truncate">{value}</div>
    </div>
  );
}

// Approximate starting overall for a pathway — matches store's buildUserPlayer
function pathwayBaseRating(pathway: CareerCreation['pathway'], rng: RNG): number {
  switch (pathway) {
    case 'Youth': return rng.int(50, 57);
    case 'LowerLeague': return rng.int(54, 60);
    case 'Established': return rng.int(60, 67);
    case 'Custom': return rng.int(54, 68);
    default: return 55;
  }
}
