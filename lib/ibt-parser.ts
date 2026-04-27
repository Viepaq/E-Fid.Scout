// ─── iRacing .ibt parser ──────────────────────────────────────────────────────
//
// Fully dynamic: reads bufLen, dataOffset, and per-variable offsets from the
// file header instead of using hardcoded values. Works for any car, track, or
// iRacing build version.
//
// ibt header layout (all int32LE unless noted):
//   0x00  ver
//   0x04  status
//   0x08  tickRate
//   0x0C  sessionInfoUpdate
//   0x10  sessionInfoLen
//   0x14  sessionInfoOffset
//   0x18  numVars
//   0x1C  varHeaderOffset
//   0x20  numBuf
//   0x24  bufLen            ← bytes per sample tick
//   0x28  pad[2]
//   0x30  varBuf[4]         ← each 16 bytes: {tickCount, bufOffset, pad[2]}
//                              varBuf[0].bufOffset = where sample data begins
//
// Variable header (144 bytes each, starts at varHeaderOffset):
//   +0   type   (0=char,1=bool,2=int,3=bitField,4=float,5=double)
//   +4   offset (byte offset within one sample row)
//   +8   count
//   +12  countAsTime + pad[3]
//   +16  name[32]
//   +48  desc[64]
//   +112 unit[32]

const DOWNSAMPLE    = 6;   // keep every 6th sample for flat telemetry arrays
const LAP_RESOLUTION = 200; // distance-pct bins per lap for chart alignment
const FALLBACK_TICK = 60;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LapChartData {
  pct:      number[];
  speed:    number[]; // km/h
  throttle: number[];
  brake:    number[];
  steering: number[]; // radians
  gear:     number[];
  rpm:      number[];
}

export interface LapData {
  lapNumber: number;
  lapTime:   number;  // seconds; -1 = incomplete / no time
  isBest:    boolean;
  gap:       number;  // seconds vs best; -1 if invalid
  avgSpeed:  number;  // km/h
  topSpeed:  number;  // km/h
  chart:     LapChartData;
}

export interface IBTResult {
  session: {
    trackName:         string;
    trackDisplayName:  string;
    trackConfig:       string;
    carName:           string;
    driverName:        string;
    eventType:         string;
    duration:          number;
    totalSamples:      number;
    tickRate:          number;
    totalLaps:         number;
    bestLapTime:       number;
    completedLapTimes: number[];
    incidents:         number;
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
  laps:     LapData[];
  analysis: {
    topSpeed:          number;
    avgSpeed:          number;
    avgThrottle:       number;
    avgBrake:          number;
    steeringDelta:     number;
    throttleDelta:     number;
    brakeDelta:        number;
    lapConsistencyStd: number;
    scores: {
      smoothness:      number;
      throttleControl: number;
      brakeEfficiency: number;
      consistency:     number;
      total:           number;
    };
  };
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface VarInfo { type: number; offset: number }

interface LapSample {
  pct:      number;
  speed:    number;
  throttle: number;
  brake:    number;
  steering: number;
  gear:     number;
  rpm:      number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readNullTermString(buf: Buffer, offset: number, maxLen: number): string {
  const end = buf.indexOf(0, offset);
  const actual = (end === -1 || end > offset + maxLen) ? offset + maxLen : end;
  return buf.toString('utf8', offset, actual).trim();
}

function extractYamlField(yaml: string, pattern: RegExp): string {
  const m = yaml.match(pattern);
  return m ? m[1].trim() : '';
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
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

// ─── Scoring ──────────────────────────────────────────────────────────────────

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

function scoreSteeringSmoothness(steering: number[], throttle: number[]): number {
  let sum = 0, n = 0;
  for (let i = 1; i < steering.length; i++) {
    if (throttle[i] > 0.60) {
      sum += Math.abs(steering[i] - steering[i - 1]);
      n++;
    }
  }
  if (n === 0) return 75;
  const avg = sum / n;
  if (avg < 0.0005) return 100;
  if (avg < 0.0010) return 85;
  if (avg < 0.0020) return 68;
  if (avg < 0.0040) return 48;
  if (avg < 0.0080) return 28;
  return 12;
}

function scoreConsistencyCV(std: number, mean: number, lapCount: number): number {
  if (lapCount < 2 || mean <= 0) return 50;
  const cv = std / mean;
  if (cv < 0.001) return 100;
  if (cv < 0.003) return 88;
  if (cv < 0.006) return 73;
  if (cv < 0.012) return 55;
  if (cv < 0.025) return 35;
  return 18;
}

// ─── Dynamic sample reader ────────────────────────────────────────────────────

function makeSampleReader(buf: Buffer, dataOffset: number, bufLen: number) {
  return function readSample(sampleIndex: number, v: VarInfo): number {
    if (v.offset < 0) return 0;
    const byteOffset = dataOffset + sampleIndex * bufLen + v.offset;
    if (byteOffset + 8 > buf.length) return 0;
    switch (v.type) {
      case 5: return buf.readDoubleLE(byteOffset);
      case 4: return buf.readFloatLE(byteOffset);
      case 2: return buf.readInt32LE(byteOffset);
      case 3: return buf.readUInt32LE(byteOffset);
      case 1: return buf[byteOffset] ? 1 : 0;
      case 0: return buf[byteOffset];
      default: return 0;
    }
  };
}

// ─── Variable dictionary ──────────────────────────────────────────────────────

function parseVarDict(buf: Buffer): Map<string, VarInfo> {
  const numVars       = buf.readInt32LE(0x18);
  const varHdrOffset  = buf.readInt32LE(0x1C);
  const VAR_HDR_SIZE  = 144;
  const NAME_OFFSET   = 16; // within each var header

  const dict = new Map<string, VarInfo>();
  for (let i = 0; i < numVars; i++) {
    const base   = varHdrOffset + i * VAR_HDR_SIZE;
    const type   = buf.readInt32LE(base);
    const offset = buf.readInt32LE(base + 4);
    const name   = readNullTermString(buf, base + NAME_OFFSET, 32);
    if (name) dict.set(name, { type, offset });
  }
  return dict;
}

function getVar(dict: Map<string, VarInfo>, name: string): VarInfo {
  return dict.get(name) ?? { type: 4, offset: -1 };
}

// ─── Per-lap resampling ───────────────────────────────────────────────────────

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

export function parseIBTFromArrayBuffer(ab: ArrayBuffer): IBTResult {
  return parseIBT(Buffer.from(ab));
}

export function parseIBT(buffer: Buffer): IBTResult {
  // ── Read dynamic header fields ─────────────────────────────────────────────
  const tickRate         = buffer.readInt32LE(0x08) || FALLBACK_TICK;
  const sessionInfoLen   = buffer.readInt32LE(0x10);
  const sessionInfoOffset= buffer.readInt32LE(0x14);
  const bufLen           = buffer.readInt32LE(0x24);
  // varBuf[0].bufOffset is at 0x30 + 4 = 0x34
  const dataOffset       = buffer.readInt32LE(0x34);

  if (bufLen <= 0 || dataOffset <= 0 || dataOffset >= buffer.length) {
    throw new Error('Invalid .ibt file: could not read header (bufLen or dataOffset is 0).');
  }

  // ── YAML session info ──────────────────────────────────────────────────────
  const yaml             = buffer.toString('utf8', sessionInfoOffset, sessionInfoOffset + sessionInfoLen);
  const trackName        = extractYamlField(yaml, /TrackName:\s*(.+)/);
  const trackDisplayName = extractYamlField(yaml, /TrackDisplayName:\s*(.+)/);
  const trackConfig      = extractYamlField(yaml, /TrackConfigName:\s*(.+)/);
  const carName          = extractYamlField(yaml, /CarScreenName:\s*(.+)/);
  const driverName       = extractYamlField(yaml, /UserName:\s*(.+)/);
  const eventType        = extractYamlField(yaml, /EventType:\s*(.+)/);

  // ── Variable dictionary ────────────────────────────────────────────────────
  const vars = parseVarDict(buffer);

  const vTime    = getVar(vars, 'SessionTime');
  const vSpeed   = getVar(vars, 'Speed');
  const vThr     = getVar(vars, 'Throttle');
  const vBrk     = getVar(vars, 'Brake');
  const vSteer   = getVar(vars, 'SteeringWheelAngle');
  const vGear    = getVar(vars, 'Gear');
  const vRPM     = getVar(vars, 'RPM');
  const vLap     = getVar(vars, 'Lap');
  const vLapPct  = getVar(vars, 'LapDistPct');
  const vLapLast = getVar(vars, 'LapLastLapTime');
  const vLapCur  = getVar(vars, 'LapCurrentLapTime');
  const vInc     = getVar(vars, 'PlayerCarMyIncidentCount');

  const totalSamples = Math.floor((buffer.length - dataOffset) / bufLen);
  const read = makeSampleReader(buffer, dataOffset, bufLen);

  // ── Accumulation arrays ────────────────────────────────────────────────────
  const time:       number[] = [];
  const speed:      number[] = [];
  const throttle:   number[] = [];
  const brake:      number[] = [];
  const steering:   number[] = [];
  const gear:       number[] = [];
  const rpm:        number[] = [];
  const lapDistPct: number[] = [];
  const lap:        number[] = [];

  const fullSpeed:    number[] = [];
  const fullThrottle: number[] = [];
  const fullBrake:    number[] = [];
  const fullSteering: number[] = [];

  const lapSamplesMap     = new Map<number, LapSample[]>();
  const lapTimesMap       = new Map<number, number>();
  const lapMaxCurrentTime = new Map<number, number>();

  let lastLap             = -1;
  const completedLapTimes: number[] = [];
  let lastIncidents       = 0;

  // ── Main loop ─────────────────────────────────────────────────────────────
  for (let i = 0; i < totalSamples; i++) {
    const t      = read(i, vTime);
    const spd    = read(i, vSpeed) * 3.6; // m/s → km/h
    const thr    = read(i, vThr);
    const brk    = read(i, vBrk);
    const steer  = read(i, vSteer);
    const gr     = read(i, vGear);
    const rp     = read(i, vRPM);
    const lpct   = read(i, vLapPct);
    const lapNum = read(i, vLap);
    const lapLast= read(i, vLapLast);
    const lcTime = read(i, vLapCur);
    const inc    = read(i, vInc);

    // Lap transitions: capture LapLastLapTime at the crossing sample
    if (lapNum !== lastLap) {
      if (lapLast > 0 && lapLast < 900) {
        completedLapTimes.push(lapLast);
        if (lastLap >= 0) lapTimesMap.set(lastLap, lapLast);
      }
    }
    lastLap = lapNum;

    // Max LapCurrentLapTime per lap — robust fallback when LapLastLapTime lags
    if (lcTime > 0 && lcTime < 900) {
      const prev = lapMaxCurrentTime.get(lapNum) ?? 0;
      if (lcTime > prev) lapMaxCurrentTime.set(lapNum, lcTime);
    }

    if (inc > lastIncidents) lastIncidents = inc;

    // Per-lap samples (all samples, full resolution for chart resampling)
    let lapArr = lapSamplesMap.get(lapNum);
    if (!lapArr) { lapArr = []; lapSamplesMap.set(lapNum, lapArr); }
    lapArr.push({ pct: lpct, speed: spd, throttle: thr, brake: brk, steering: steer, gear: gr, rpm: rp });

    // Full-resolution for scoring
    fullSpeed.push(spd);
    fullThrottle.push(thr);
    fullBrake.push(brk);
    fullSteering.push(steer);

    // Downsampled flat telemetry
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

  // ── Lap time resolution ────────────────────────────────────────────────────
  const duration   = time.length > 0 ? time[time.length - 1] - time[0] : 0;
  const totalLaps  = lap.length > 0 ? Math.max(...lap) : 0;

  const lcTimes       = Array.from(lapMaxCurrentTime.values()).filter(t => t > 0 && t < 900);
  const validLapTimes = (completedLapTimes.length > 0 ? completedLapTimes : lcTimes)
    .filter(t => t > 0 && t < 900);
  const bestLapTime   = validLapTimes.length > 0 ? Math.min(...validLapTimes) : -1;

  // ── Scoring ────────────────────────────────────────────────────────────────
  const topSpeed          = fullSpeed.length    > 0 ? Math.max(...fullSpeed)    : 0;
  const avgSpeed          = fullSpeed.length    > 0 ? arrAvg(fullSpeed)         : 0;
  const avgThrottle       = fullThrottle.length > 0 ? arrAvg(fullThrottle)      : 0;
  const avgBrake          = fullBrake.length    > 0 ? arrAvg(fullBrake)         : 0;
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

  // ── Per-lap data ───────────────────────────────────────────────────────────
  const allLapNums = Array.from(lapSamplesMap.keys()).sort((a, b) => a - b);

  const rawLapInfos = allLapNums.map(lapNum => {
    const samples = lapSamplesMap.get(lapNum)!;
    const lapTime = lapTimesMap.get(lapNum) ?? lapMaxCurrentTime.get(lapNum) ?? -1;
    const speeds  = samples.map(s => s.speed);
    return { lapNum, lapTime, samples, avgSpd: arrAvg(speeds), topSpd: speeds.length > 0 ? Math.max(...speeds) : 0 };
  });

  const laps: LapData[] = rawLapInfos.map(l => ({
    lapNumber: l.lapNum,
    lapTime:   l.lapTime > 0 ? +(l.lapTime.toFixed(3)) : -1,
    isBest:    l.lapTime > 0 && bestLapTime > 0 && Math.abs(l.lapTime - bestLapTime) < 0.001,
    gap:       l.lapTime > 0 && bestLapTime > 0 ? +((l.lapTime - bestLapTime).toFixed(3)) : -1,
    avgSpeed:  +(l.avgSpd.toFixed(1)),
    topSpeed:  +(l.topSpd.toFixed(1)),
    chart:     resampleLap(l.samples),
  }));

  return {
    session: {
      trackName, trackDisplayName, trackConfig,
      carName, driverName, eventType,
      duration:          Math.round(duration * 100) / 100,
      totalSamples,
      tickRate,
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
