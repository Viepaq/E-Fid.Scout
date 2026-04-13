import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// ─── Deterministic PRNG (LCG) ────────────────────────────────────────────────
// Same seed → same data every run (true idempotency)

class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  next(): number {
    this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0;
    return this.s / 4294967296;
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  float(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

const rng = new Rng(42);

// ─── Constants ───────────────────────────────────────────────────────────────

const MOCK_DRIVERS = [
  { id: 'a1b2c3d4-0001-0001-0001-000000000001', display_name: 'Max Brenner',  birth_date: '2009-03-15', iracing_customer_id: 'IR_001' },
  { id: 'a1b2c3d4-0002-0002-0002-000000000002', display_name: 'Leon Fischer', birth_date: '2008-07-22', iracing_customer_id: 'IR_002' },
  { id: 'a1b2c3d4-0003-0003-0003-000000000003', display_name: 'Lukas Mayer',  birth_date: '2011-01-10', iracing_customer_id: 'IR_003' },
  { id: 'a1b2c3d4-0004-0004-0004-000000000004', display_name: 'Felix Wagner', birth_date: '2006-11-05', iracing_customer_id: 'IR_004' },
  { id: 'a1b2c3d4-0005-0005-0005-000000000005', display_name: 'Noah Bauer',   birth_date: '2010-06-18', iracing_customer_id: 'IR_005' },
  { id: 'a1b2c3d4-0006-0006-0006-000000000006', display_name: 'Tom Richter',  birth_date: '2009-09-30', iracing_customer_id: 'IR_006' },
  { id: 'a1b2c3d4-0007-0007-0007-000000000007', display_name: 'Jonas Wolf',   birth_date: '2005-04-12', iracing_customer_id: 'IR_007' },
  { id: 'a1b2c3d4-0008-0008-0008-000000000008', display_name: 'Erik Schulz',  birth_date: '2008-12-03', iracing_customer_id: 'IR_008' },
  { id: 'a1b2c3d4-0009-0009-0009-000000000009', display_name: 'Finn Krause',  birth_date: '2012-08-25', iracing_customer_id: 'IR_009' },
  { id: 'a1b2c3d4-0010-0010-0010-000000000010', display_name: 'Nico Hofmann', birth_date: '2007-02-14', iracing_customer_id: 'IR_010' },
  { id: 'a1b2c3d4-0011-0011-0011-000000000011', display_name: 'Ben Schwarz',  birth_date: '2009-10-08', iracing_customer_id: 'IR_011' },
  { id: 'a1b2c3d4-0012-0012-0012-000000000012', display_name: 'Paul Werner',  birth_date: '2010-05-20', iracing_customer_id: 'IR_012' },
] as const;

// Trajectory: linear start→end with optional mid-peak (for IR_012)
type Trajectory = {
  start: number;
  end: number;
  peak?: { day: number; value: number };
};

const TRAJECTORIES: Record<string, Trajectory> = {
  IR_001: { start: 1800, end: 2400 },
  IR_002: { start: 1600, end: 2000 },
  IR_003: { start: 1200, end: 1700 },
  IR_004: { start: 2200, end: 2300 },
  IR_005: { start: 1500, end: 1700 },
  IR_006: { start: 1000, end: 1300 },
  IR_007: { start: 2500, end: 2400 },
  IR_008: { start: 1700, end: 1900 },
  IR_009: { start: 1100, end: 1600 },
  IR_010: { start: 2000, end: 2050 },
  IR_011: { start: 1400, end: 2000 },
  IR_012: { start: 1600, end: 1550, peak: { day: 45, value: 1700 } },
};

// Safety rating [min, max] per driver
const SAFETY_RANGES: Record<string, [number, number]> = {
  IR_001: [3.8, 4.5],
  IR_002: [3.8, 4.5],
  IR_008: [3.8, 4.5],
  IR_006: [2.0, 2.8],
  IR_009: [2.0, 2.8],
  IR_012: [2.0, 2.8],
};
const DEFAULT_SAFETY: [number, number] = [2.8, 3.5];

// Race count [min, max] per driver
const RACE_COUNTS: Record<string, [number, number]> = {
  IR_001: [35, 40], IR_002: [35, 40], IR_003: [35, 40], IR_011: [35, 40],
  IR_004: [15, 25], IR_005: [15, 25], IR_007: [15, 25], IR_008: [15, 25],
};
const OCCASIONAL: [number, number] = [8, 14];

type Tier = 'top' | 'mid' | 'lower';
const TIERS: Record<string, Tier> = {
  IR_001: 'top', IR_002: 'top', IR_011: 'top',
  IR_004: 'mid', IR_005: 'mid', IR_007: 'mid', IR_008: 'mid',
  IR_003: 'lower', IR_006: 'lower', IR_009: 'lower', IR_010: 'lower', IR_012: 'lower',
};

const TRACKS = [
  'Nürburgring GP', 'Spa-Francorchamps', 'Silverstone', 'Monza', 'Zandvoort',
  'Red Bull Ring', 'Hockenheim', 'Barcelona', 'Brands Hatch', 'Imola',
] as const;

const CAR_SERIES: Array<{ car: string; series: string }> = [
  { car: 'Formula Vee',         series: 'Formula Vee Challenge' },
  { car: 'Skip Barber F2000',   series: 'Skip Barber Race Series' },
  { car: 'Dallara F3',          series: 'Dallara F3 Championship' },
  { car: 'Porsche Cup',         series: 'Porsche Esports Supercup' },
  { car: 'Mazda MX-5 Cup',      series: 'Mazda MX-5 Cup Series' },
  { car: 'Ferrari GT3',         series: 'Ferrari GT3 Challenge' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLicenseLevel(irating: number): string {
  if (irating < 1200) return 'Rookie';
  if (irating < 1600) return 'D';
  if (irating < 2100) return 'C';
  if (irating < 2800) return 'B';
  return 'A';
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

async function upsertChunked<T extends object>(
  table: string,
  rows: T[],
  onConflict: string,
  chunkSize = 200,
): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict });
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
    inserted += chunk.length;
    process.stdout.write(`\r  ${table}: ${inserted}/${rows.length}`);
  }
  if (rows.length > 0) console.log();
  return inserted;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const startDate = addDays(today, -90);

  // ── 1. Auth users + Profiles ─────────────────────────────────────────────────
  // GoTrue admin API supports a custom `id` field (not in TS types, hence cast).
  // Using email_confirm:true so no verification email is sent.
  console.log('\n[1/4] Upserting auth users + profiles…');

  for (const d of MOCK_DRIVERS) {
    const fakeEmail = `${d.iracing_customer_id.toLowerCase()}@mock.fid-scout.dev`;

    const { error: authError } = await (supabase.auth.admin.createUser as Function)({
      id: d.id,
      email: fakeEmail,
      email_confirm: true,
      user_metadata: { display_name: d.display_name },
    });

    // "User already registered" means idempotent re-run — that's fine
    if (authError && !authError.message.includes('already')) {
      throw new Error(`Auth createUser failed for ${d.display_name}: ${authError.message}`);
    }

    process.stdout.write(`\r  auth users: ${MOCK_DRIVERS.indexOf(d) + 1}/${MOCK_DRIVERS.length}`);
  }
  console.log();

  await upsertChunked(
    'profiles',
    MOCK_DRIVERS.map((d) => ({
      id: d.id,
      display_name: d.display_name,
      birth_date: d.birth_date,
      role: 'user',
      iracing_customer_id: d.iracing_customer_id,
    })),
    'id',
  );

  // ── 2. Scouting status ───────────────────────────────────────────────────────
  console.log('[2/4] Upserting scouting status…');
  await upsertChunked(
    'scouting_status',
    MOCK_DRIVERS.map((d) => ({
      user_id: d.id,
      status: 'none',
      status_since: startDate.toISOString(),
      last_evaluated_at: startDate.toISOString(),
    })),
    'user_id',
  );

  // ── 3. iRacing history ───────────────────────────────────────────────────────
  console.log('[3/4] Generating iRacing history (90 days × 12 drivers)…');

  // Cache iRating per driver per day for race result lookups
  const iRatingGrid: Record<string, number[]> = {};

  type HistoryRow = {
    user_id: string;
    irating_value: number;
    safety_rating: number;
    license_level: string;
    recorded_at: string;
  };

  const historyRows: HistoryRow[] = [];

  for (const driver of MOCK_DRIVERS) {
    const cid = driver.iracing_customer_id;
    const traj = TRAJECTORIES[cid];
    const safetyRange = SAFETY_RANGES[cid] ?? DEFAULT_SAFETY;

    iRatingGrid[driver.id] = [];

    for (let day = 0; day < 90; day++) {
      // Linear interpolation toward the target, with optional peak for IR_012
      let target: number;
      if (traj.peak) {
        const { day: peakDay, value: peakValue } = traj.peak;
        if (day <= peakDay) {
          target = traj.start + ((peakValue - traj.start) * day) / peakDay;
        } else {
          target = peakValue + ((traj.end - peakValue) * (day - peakDay)) / (89 - peakDay);
        }
      } else {
        target = traj.start + ((traj.end - traj.start) * day) / 89;
      }

      const noise = rng.int(-20, 20);
      const irating = Math.max(800, Math.round(target + noise));
      const safety = parseFloat(rng.float(safetyRange[0], safetyRange[1]).toFixed(2));

      iRatingGrid[driver.id].push(irating);

      const recordedAt = addDays(startDate, day);
      recordedAt.setHours(3, 0, 0, 0); // daily snapshot at 03:00

      historyRows.push({
        user_id: driver.id,
        irating_value: irating,
        safety_rating: safety,
        license_level: getLicenseLevel(irating),
        recorded_at: recordedAt.toISOString(),
      });
    }
  }

  await upsertChunked('iracing_history', historyRows, 'user_id,recorded_at');

  // ── 4. Race results ──────────────────────────────────────────────────────────
  console.log('[4/4] Generating race results…');

  type RaceRow = {
    user_id: string;
    iracing_subsession_id: number;
    track_name: string;
    car_name: string;
    series_name: string;
    start_position: number;
    finish_position: number;
    incidents: number;
    fastest_lap_ms: number;
    irating_before: number;
    irating_after: number;
    race_date: string;
  };

  let subsessionId = 90000001;
  const raceRows: RaceRow[] = [];

  for (const driver of MOCK_DRIVERS) {
    const cid = driver.iracing_customer_id;
    const tier = TIERS[cid];
    const [rMin, rMax] = RACE_COUNTS[cid] ?? OCCASIONAL;
    const raceCount = rng.int(rMin, rMax);

    // Generate race days with a slight recency bias
    // Using 1 - (1-u)^1.5 maps [0,1] → [0,1] with more values near 1
    const raceDays = Array.from({ length: raceCount }, () => {
      const u = rng.next();
      return Math.min(89, Math.floor((1 - Math.pow(1 - u, 1.5)) * 90));
    }).sort((a, b) => a - b);

    for (const day of raceDays) {
      const iratingBase = iRatingGrid[driver.id][day];

      let startPos: number;
      let finishPos: number;
      let incidents: number;

      if (tier === 'top') {
        startPos = rng.int(3, 15);
        finishPos = clamp(startPos - rng.int(2, 5), 1, 20);
        incidents = rng.int(0, 2);
      } else if (tier === 'mid') {
        startPos = rng.int(5, 18);
        finishPos = clamp(startPos + rng.int(-2, 2), 1, 20);
        incidents = rng.int(1, 4);
      } else {
        startPos = rng.int(8, 20);
        finishPos = clamp(startPos + rng.int(0, 4), 1, 20);
        incidents = rng.int(2, 6);
      }

      const posGained = startPos - finishPos;
      const iDelta = posGained > 0
        ? rng.int(10, 40)
        : posGained < 0
          ? rng.int(-30, -5)
          : rng.int(-10, 10);

      const cs = rng.pick(CAR_SERIES);
      const raceDate = addDays(startDate, day);
      raceDate.setHours(rng.int(10, 20), rng.int(0, 59), 0, 0);

      raceRows.push({
        user_id: driver.id,
        iracing_subsession_id: subsessionId++,
        track_name: rng.pick(TRACKS),
        car_name: cs.car,
        series_name: cs.series,
        start_position: startPos,
        finish_position: finishPos,
        incidents,
        fastest_lap_ms: rng.int(82000, 130000),
        irating_before: iratingBase,
        irating_after: Math.max(800, iratingBase + iDelta),
        race_date: raceDate.toISOString(),
      });
    }
  }

  await upsertChunked('race_results', raceRows, 'user_id,iracing_subsession_id');

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('\n✅  Seed complete\n');
  console.log(`  Auth users upserted:      ${MOCK_DRIVERS.length}`);
  console.log(`  Profiles inserted:        ${MOCK_DRIVERS.length}`);
  console.log(`  iRating history entries:  ${historyRows.length}`);
  console.log(`  Race results inserted:    ${raceRows.length}`);
  console.log(`  Scouting status entries:  ${MOCK_DRIVERS.length}\n`);
}

main().catch((err) => {
  console.error('\n❌  Seed failed:', err.message ?? err);
  process.exit(1);
});
