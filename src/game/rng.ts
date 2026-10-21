// ============================================================
// DETERMINISTIC RNG (Mulberry32)
// ============================================================
// All randomness in the game flows through this. Persisting
// `counter` in the save lets us resume identically.

export interface RNGState {
  seed: number;
  counter: number;
}

export class RNG {
  private seed: number;
  private state: number;
  public counter: number;

  constructor(seed: number, counter = 0) {
    this.seed = seed >>> 0;
    this.state = this.mix(seed >>> 0);
    this.counter = 0;
    // Fast-forward to persisted counter if resuming
    if (counter > 0) {
      for (let i = 0; i < counter; i++) this.next();
    }
  }

  private mix(n: number): number {
    // Ensure non-zero state
    let x = (n + 0x6d2b79f5) >>> 0;
    x = Math.imul(x ^ (x >>> 15), x | 1) >>> 0;
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61) >>> 0;
    return (x ^ (x >>> 14)) >>> 0;
  }

  /** Returns a float in [0, 1) */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61) >>> 0;
    this.counter++;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Float in [min, max) */
  float(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /** True with probability p (0..1) */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Pick random element from array */
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('RNG.pick: empty array');
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Pick random element by weight (weights >= 0) */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    if (items.length !== weights.length) {
      throw new Error('RNG.weighted: length mismatch');
    }
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return items[0];
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  /** Shuffle array in place (Fisher-Yates) */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Save state for persistence */
  save(): RNGState {
    return { seed: this.seed, counter: this.counter };
  }
}

// ============================================================
// STATISTICAL HELPERS
// ============================================================

/** Normal distribution via Box-Muller */
export function normal(rng: RNG, mean: number, stdDev: number): number {
  const u1 = Math.max(rng.next(), 1e-9);
  const u2 = rng.next();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

/** Clamp value between min and max */
export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Clamp attribute to valid 1-100 range */
export function clampAttribute(v: number): number {
  return clamp(Math.round(v), 1, 100);
}

/** Round to N decimals */
export function round(v: number, decimals = 2): number {
  const p = Math.pow(10, decimals);
  return Math.round(v * p) / p;
}
