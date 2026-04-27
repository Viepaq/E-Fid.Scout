const TICK_RATE = 60;
const BUF_LEN = 1075;
const DATA_OFFSET = 52397;
const DOWNSAMPLE = 6; // every 6th sample → 10 Hz

// Number of distance-percent bins per lap for chart alignment
const LAP_RESOLUTION = 200;

// Hardcoded var offsets for performance
const VAR_OFFSETS = {
  SessionTime:              { type: 5, offset: 0 },
  PlayerCarMyIncidentCount: { type: 2, offset: 143 },
  SteeringWheelAngle:       { type: 4, offset: 185 },
  Throttle:                 { type: 4, offset: 189 },
  Brake:                    { type: 4, offset: 193 },
  Gear:                     { type: 2, offset: 201 },
  RPM:                      { type: 4, offset: 205 },
  Lap:                      { type: 2, offset: 209 },
  LapDistPct:               { type: 4, offset: 221 },
  LapBestLapTime:           { type: 4, offset: 237 },
  LapLastLapTime:           { type: 4, offset: 241 },
  LapCurrentLapTime:        { type: 4, offset: 245 },
  Speed:                    { type: 4, offset: 310 },
} as const;

// ─── Per-lap chart data (LAP_RESOLUTION bins, aligned by LapDistPct) ─────────

export interface LapChartData {
  pct:      number[]; // 0..1, length = LAP_RESOLUTION
  speed:    number[]; // km/h
  throttle: number[];
  brake:    number[];
  steering: number[]; // radians
  gear:     number[];
  rpm:      number[];
}

export interface LapData {
  lapNumber: number;
  lapTime:   number;   // seconds; -1 = no recorded time (out lap / incomplete)
  isBest:    boolean;
  gap:       number;   // +gap vs best in seconds; -1 if invalid
  avgSpeed:  number;   // km/h
  topSpeed:  number;   // km/h
  chart:     LapChartData;
}

export interface IBTResult {
  session: {
    trackName:          string;
    trackDisplayName:   string;
    trackConfig:        string;
    carName:            string;
    driverName:         string;
    eventType:          string;
    duration:           number;
    totalSamples:       number;
    tickRate:           number;
    totalLaps:          number;
    bestLapTime:        number;
    completedLapTimes:  number[];
    incidents:          number;
  };
  telemetry: {
    time:       number[];
    speed:      number[];
    throttle:   number[];
    brake:      number[];
    steering:   number[];
    gear:       number[];
    rpm:        number[];
    lapDistPct: number[];
    lap:        number[];
  };
  laps: LapData[];
  analysis: {
    topSpeed:           number;
    avgSpeed:           number;
    avgThrottle:        number;
    avgBrake:           number;
    steeringDelta:      number;
    throttleDelta:      number;
    brakeDelta:         number;
    lapConsistencyStd:  number;
    scores: {
      smoothness:       number;
      throttleControl:  number;
      brakeEfficiency:  number;
      consistency:      number;
      total:            number;
    };
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function readString(buf: Buffer, offset: number, length: number): string {
  const end = buf.indexOf(0, offset);
  const actual = end === -1 || end > offset + length ? offset + length : end;
  return buf.toString("utf8", offset, actual).trim();
}

function extractYamlField(yaml: string, pattern: RegExp): string {
  const m = yaml.match(pattern);
  return m ? m[1].trim() : "";
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function avgAbsDelta(values: number[]): number {
  if (values.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < values.length; i++) sum += Math.abs(values[i] - values[i - 1]);
  return sum / (values.length - 1);
}

function arrAvg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

// ── Scoring helpers ───────────────────────────────────────────────────────────

/**
 * Throttle discipline — counts snap applications: throttle jumps from ≤15%
 * to ≥65% within 5 samples (83 ms at 60 Hz). Penalises aggressive, jerky inputs.
 */
function scoreThrottleDiscipline(throttle: number[], lapCount: number): number {
  let snaps = 0;
  for (let i = 5; i < throttle.length; i++) {
    if (throttle[i - 5] < 0.15 && throttle[i] > 0.65) snaps++;
  }
  const perLap = snaps / Math.max(lapCount, 1);
  if (perLap < 1)  return 100;
  if (perLap < 3)  return 85;
  if (perLap < 6)  return 68;
  if (perLap < 10) return 48;
  if (perLap < 16) return 30;
  return 15;
}

/**
 * Brake technique — counts lock / panic-release events: brake was >50% then
 * drops >40% in a single sample (16 ms). Penalises over-braking and ABS abuse.
 */
function scoreBrakeTechnique(brake: number[], lapCount: number): number {
  let locks = 0;
  for (let i = 1; i < brake.length; i++) {
    if (brake[i - 1] > 0.5 && (brake[i - 1] - brake[i]) > 0.40) locks++;
  }
  const perLap = locks / Math.max(lapCount, 1);
  if (perLap < 0.5) return 100;
  if (perLap < 1.5) return 83;
  if (perLap < 3)   return 63;
  if (perLap < 5)   return 42;
  if (perLap < 8)   return 25;
  return 12;
}

/**
 * On-throttle steering smoothness — avg |Δsteering| only during high-throttle
 * samples (>60%). Fighting the car mid-corner increases this value.
 */
function scoreSteeringSmoothness(steering: number[], throttle: number[]): number {
  let sum = 0, n = 0;
  for (let i = 1; i < steering.length; i++) {
    if (throttle[i] > 0.60) {
      sum += Math.abs(steering[i] - steering[i - 1]);
      n++;
    }
  }
  if (n === 0) return 75;
  const avg = sum / n; // rad per sample at 60 Hz
  if (avg < 0.0005) return 100;
  if (avg < 0.0010) return 85;
  if (avg < 0.0020) return 68;
  if (avg < 0.0040) return 48;
  if (avg < 0.0080) return 28;
  return 12;
}

/**
 * Lap time consistency — coefficient of variation (std / mean). The gold
 * standard of lap-to-lap repeatability in motorsport.
 */
function scoreConsistencyCV(std: number, mean: number, lapCount: number): number {
  if (lapCount < 2 || mean <= 0) return 50;
  const cv = std / mean;
  if (cv < 0.001) return 100; // < 0.1 % variation — exceptional
  if (cv < 0.003) return 88;  // < 0.3 %
  if (cv < 0.006) return 73;  // < 0.6 %
  if (cv < 0.012) return 55;  // < 1.2 %
  if (cv < 0.025) return 35;  // < 2.5 %
  return 18;
}

function readSample(
  buf: Buffer,
  sampleIndex: number,
  varOffset: number,
  type: number,
): number {
  const byteOffset = DATA_OFFSET + sampleIndex * BUF_LEN + varOffset;
  if (byteOffset + 8 > buf.length) return 0;
  if (type === 5) return buf.readDoubleLE(byteOffset);
  if (type === 4) return buf.readFloatLE(byteOffset);
  if (type === 2) return buf.readInt32LE(byteOffset);
  return 0;
}

// ─── Per-lap resampling ───────────────────────────────────────────────────────

interface LapSample {
  pct:      number;
  speed:    number;
  throttle: number;
  brake:    number;
  steering: number;
  gear:     number;
  rpm:      number;
}

function resampleLap(samples: LapSample[]): LapChartData {
  const speedB:    number[][] = Array.from({ length: LAP_RESOLUTION }, () => []);
  const throttleB: number[][] = Array.from({ length: LAP_RESOLUTION }, () => []);
  const brakeB:    number[][] = Array.from({ length: LAP_RESOLUTION }, () => []);
  const steeringB: number[][] = Array.from({ length: LAP_RESOLUTION }, () => []);
  const gearB:     number[][] = Array.from({ length: LAP_RESOLUTION }, () => []);
  const rpmB:      number[][] = Array.from({ length: LAP_RESOLUTION }, () => []);

  for (const s of samples) {
    const bin = Math.max(0, Math.min(Math.floor(s.pct * LAP_RESOLUTION), LAP_RESOLUTION - 1));
    speedB[bin].push(s.speed);
    throttleB[bin].push(s.throttle);
    brakeB[bin].push(s.brake);
    steeringB[bin].push(s.steering);
    gearB[bin].push(s.gear);
    rpmB[bin].push(s.rpm);
  }

  return {
    pct:      Array.from({ length: LAP_RESOLUTION }, (_, i) => +(i / LAP_RESOLUTION).toFixed(3)),
    speed:    speedB.map(b    => +(arrAvg(b).toFixed(1))),
    throttle: throttleB.map(b => +(arrAvg(b).toFixed(3))),
    brake:    brakeB.map(b    => +(arrAvg(b).toFixed(3))),
    steering: steeringB.map(b => +(arrAvg(b).toFixed(4))),
    gear:     gearB.map(b     => Math.round(arrAvg(b))),
    rpm:      rpmB.map(b      => Math.round(arrAvg(b))),
  };
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseIBT(buffer: Buffer): IBTResult {
  // ── Header ────────────────────────────────────────────────────────────────
  const sessionInfoLen    = buffer.readInt32LE(0x70);
  const sessionInfoOffset = buffer.readInt32LE(0x74);
  const tickRate          = buffer.readInt32LE(0x08);

  // ── YAML ──────────────────────────────────────────────────────────────────
  const yaml            = buffer.toString("utf8", sessionInfoOffset, sessionInfoOffset + sessionInfoLen);
  const trackName       = extractYamlField(yaml, /TrackName:\s*(.+)/);
  const trackDisplayName= extractYamlField(yaml, /TrackDisplayName:\s*(.+)/);
  const trackConfig     = extractYamlField(yaml, /TrackConfigName:\s*(.+)/);
  const carName         = extractYamlField(yaml, /CarScreenName:\s*(.+)/);
  const driverName      = extractYamlField(yaml, /UserName:\s*(.+)/);
  const eventType       = extractYamlField(yaml, /EventType:\s*(.+)/);

  const totalSamples = Math.floor((buffer.length - DATA_OFFSET) / BUF_LEN);

  // ── Arrays ────────────────────────────────────────────────────────────────
  const time: number[]       = [];
  const speed: number[]      = [];
  const throttle: number[]   = [];
  const brake: number[]      = [];
  const steering: number[]   = [];
  const gear: number[]       = [];
  const rpm: number[]        = [];
  const lapDistPct: number[] = [];
  const lap: number[]        = [];

  // Full-res for analysis metrics
  const fullSpeed:    number[] = [];
  const fullThrottle: number[] = [];
  const fullBrake:    number[] = [];
  const fullSteering: number[] = [];

  // Per-lap tracking
  const lapSamplesMap    = new Map<number, LapSample[]>();
  // lapTimesMap: lapNum → completed lap time via LapLastLapTime at crossing
  const lapTimesMap      = new Map<number, number>();
  // lapMaxCurrentTime: max LapCurrentLapTime seen per lapNum (fallback / primary)
  const lapMaxCurrentTime = new Map<number, number>();

  let lastLap       = -1;
  const completedLapTimes: number[] = [];
  let lastIncidents = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t      = readSample(buffer, i, VAR_OFFSETS.SessionTime.offset, 5);
    const spd    = readSample(buffer, i, VAR_OFFSETS.Speed.offset, 4) * 3.6;
    const thr    = readSample(buffer, i, VAR_OFFSETS.Throttle.offset, 4);
    const brk    = readSample(buffer, i, VAR_OFFSETS.Brake.offset, 4);
    const steer  = readSample(buffer, i, VAR_OFFSETS.SteeringWheelAngle.offset, 4);
    const gr     = readSample(buffer, i, VAR_OFFSETS.Gear.offset, 2);
    const rp     = readSample(buffer, i, VAR_OFFSETS.RPM.offset, 4);
    const lpct   = readSample(buffer, i, VAR_OFFSETS.LapDistPct.offset, 4);
    const lapNum = readSample(buffer, i, VAR_OFFSETS.Lap.offset, 2);
    const lapLast= readSample(buffer, i, VAR_OFFSETS.LapLastLapTime.offset, 4);
    const lcTime = readSample(buffer, i, VAR_OFFSETS.LapCurrentLapTime.offset, 4);
    const inc    = readSample(buffer, i, VAR_OFFSETS.PlayerCarMyIncidentCount.offset, 2);

    // Track LapLastLapTime at lap transitions (may lag by 1 sample in some builds)
    if (lapNum !== lastLap) {
      if (lapLast > 0 && lapLast < 900) {
        completedLapTimes.push(lapLast);
        if (lastLap >= 0) lapTimesMap.set(lastLap, lapLast);
      }
    }
    lastLap = lapNum;

    // Track max LapCurrentLapTime per lap — counts up during the lap, resets at S/F.
    // This is the primary/fallback source for lap time and works regardless of
    // whether LapLastLapTime updates in the same sample as Lap increments.
    if (lcTime > 0 && lcTime < 900) {
      const prev = lapMaxCurrentTime.get(lapNum) ?? 0;
      if (lcTime > prev) lapMaxCurrentTime.set(lapNum, lcTime);
    }

    if (inc > lastIncidents) lastIncidents = inc;

    // Per-lap sample collection (all samples, not downsampled)
    let lapArr = lapSamplesMap.get(lapNum);
    if (!lapArr) { lapArr = []; lapSamplesMap.set(lapNum, lapArr); }
    lapArr.push({ pct: lpct, speed: spd, throttle: thr, brake: brk, steering: steer, gear: gr, rpm: rp });

    // Full-res for analysis
    fullSpeed.push(spd);
    fullThrottle.push(thr);
    fullBrake.push(brk);
    fullSteering.push(steer);

    // Downsampled flat telemetry (backward compat for SessionDetailClient)
    if (i % DOWNSAMPLE === 0) {
      time.push(Math.round(t * 1000) / 1000);
      speed.push(Math.round(spd * 10) / 10);
      throttle.push(Math.round(thr * 1000) / 1000);
      brake.push(Math.round(brk * 1000) / 1000);
      steering.push(Math.round(steer * 10000) / 10000);
      gear.push(gr);
      rpm.push(Math.round(rp));
      lapDistPct.push(Math.round(lpct * 10000) / 10000);
      lap.push(lapNum);
    }
  }

  const duration   = time.length > 0 ? time[time.length - 1] - time[0] : 0;
  const totalLaps  = lap.length > 0 ? Math.max(...lap) : 0;
  // Use LapLastLapTime-based times when available; fall back to per-lap
  // LapCurrentLapTime maxima if LapLastLapTime never fired (common in test/hotlap sessions).
  const lcTimes       = Array.from(lapMaxCurrentTime.values()).filter(t => t > 0 && t < 900);
  const validLapTimes = (completedLapTimes.length > 0 ? completedLapTimes : lcTimes)
    .filter(t => t > 0 && t < 900);
  const bestLapTime   = validLapTimes.length > 0 ? Math.min(...validLapTimes) : -1;

  // ── Analysis ──────────────────────────────────────────────────────────────
  const topSpeed       = fullSpeed.length    > 0 ? Math.max(...fullSpeed)    : 0;
  const avgSpeed       = fullSpeed.length    > 0 ? arrAvg(fullSpeed)          : 0;
  const avgThrottle    = fullThrottle.length > 0 ? arrAvg(fullThrottle)       : 0;
  const avgBrake       = fullBrake.length    > 0 ? arrAvg(fullBrake)          : 0;
  const steeringDelta     = avgAbsDelta(fullSteering);
  const throttleDelta     = avgAbsDelta(fullThrottle);
  const brakeDelta        = avgAbsDelta(fullBrake);
  const lapConsistencyStd = stdDev(validLapTimes);
  const lapMean           = validLapTimes.length > 0
    ? validLapTimes.reduce((a, b) => a + b, 0) / validLapTimes.length
    : 0;

  const throttleControl = scoreThrottleDiscipline(fullThrottle, validLapTimes.length);
  const brakeEfficiency = scoreBrakeTechnique(fullBrake, validLapTimes.length);
  const smoothness      = scoreSteeringSmoothness(fullSteering, fullThrottle);
  const consistency     = scoreConsistencyCV(lapConsistencyStd, lapMean, validLapTimes.length);
  const total           = Math.round((smoothness + throttleControl + brakeEfficiency + consistency) / 4);

  // ── Build per-lap data ────────────────────────────────────────────────────
  const allLapNums = Array.from(lapSamplesMap.keys()).sort((a, b) => a - b);

  const rawLapInfos = allLapNums.map(lapNum => {
    const samples = lapSamplesMap.get(lapNum)!;
    // Prefer LapLastLapTime (exact), fall back to max LapCurrentLapTime (robust)
    const lapTime = lapTimesMap.get(lapNum) ?? lapMaxCurrentTime.get(lapNum) ?? -1;
    const speeds  = samples.map(s => s.speed);
    return {
      lapNum,
      lapTime,
      samples,
      avgSpd: arrAvg(speeds),
      topSpd: speeds.length > 0 ? Math.max(...speeds) : 0,
    };
  });

  const laps: LapData[] = rawLapInfos.map(l => ({
    lapNumber: l.lapNum,
    lapTime:   l.lapTime > 0 ? +(l.lapTime.toFixed(3)) : -1,
    isBest:    l.lapTime > 0 && bestLapTime > 0 && Math.abs(l.lapTime - bestLapTime) < 0.001,
    gap:       l.lapTime > 0 && bestLapTime > 0 ? +(( l.lapTime - bestLapTime).toFixed(3)) : -1,
    avgSpeed:  +(l.avgSpd.toFixed(1)),
    topSpeed:  +(l.topSpd.toFixed(1)),
    chart:     resampleLap(l.samples),
  }));

  return {
    session: {
      trackName,
      trackDisplayName,
      trackConfig,
      carName,
      driverName,
      eventType,
      duration:          Math.round(duration * 100) / 100,
      totalSamples,
      tickRate:          tickRate || TICK_RATE,
      totalLaps,
      bestLapTime:       bestLapTime > 0 ? Math.round(bestLapTime * 1000) / 1000 : -1,
      completedLapTimes: validLapTimes.map(t => Math.round(t * 1000) / 1000),
      incidents:         lastIncidents,
    },
    telemetry: { time, speed, throttle, brake, steering, gear, rpm, lapDistPct, lap },
    laps,
    analysis: {
      topSpeed:          Math.round(topSpeed * 10) / 10,
      avgSpeed:          Math.round(avgSpeed * 10) / 10,
      avgThrottle:       Math.round(avgThrottle * 1000) / 1000,
      avgBrake:          Math.round(avgBrake * 1000) / 1000,
      steeringDelta:     Math.round(steeringDelta * 100000) / 100000,
      throttleDelta:     Math.round(throttleDelta * 100000) / 100000,
      brakeDelta:        Math.round(brakeDelta * 100000) / 100000,
      lapConsistencyStd: Math.round(lapConsistencyStd * 1000) / 1000,
      scores: { smoothness, throttleControl, brakeEfficiency, consistency, total },
    },
  };
}
