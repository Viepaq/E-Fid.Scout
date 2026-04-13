import { createServiceClient } from '@/lib/supabase/service';
import type {
  AgeGroup,
  ScoutingStatus,
  IracingHistory,
  RaceResult,
  TalentScore,
  ScoutingStatusRow,
} from '@/lib/database.types';

// ─── Utility ─────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Maps value linearly from [inputMin, inputMax] to [outputMin, outputMax],
 * clamped to the output range.
 */
function linearScale(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number,
): number {
  if (inputMax === inputMin) return outputMin;
  const t = (value - inputMin) / (inputMax - inputMin);
  return clamp(outputMin + t * (outputMax - outputMin), outputMin, outputMax);
}

/**
 * Piecewise linear interpolation through a list of [x, y] breakpoints.
 * x values must be sorted ascending.
 */
function piecewiseLinear(value: number, breakpoints: [number, number][]): number {
  if (breakpoints.length === 0) return 0;
  if (value <= breakpoints[0][0]) return breakpoints[0][1];
  if (value >= breakpoints[breakpoints.length - 1][0]) {
    return breakpoints[breakpoints.length - 1][1];
  }
  for (let i = 0; i < breakpoints.length - 1; i++) {
    const [x0, y0] = breakpoints[i];
    const [x1, y1] = breakpoints[i + 1];
    if (value >= x0 && value <= x1) {
      return linearScale(value, x0, x1, y0, y1);
    }
  }
  return breakpoints[breakpoints.length - 1][1];
}

/** Least-squares linear regression slope (iRating units per day). */
function linearRegression(points: { x: number; y: number }[]): number {
  const n = points.length;
  if (n < 2) return 0;

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/** Population standard deviation. */
function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function getAgeGroup(birthDate: Date): AgeGroup {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

  if (age < 12) return 'U12';
  if (age < 15) return 'U15';
  if (age < 18) return 'U18';
  if (age < 21) return 'U21';
  return '21+';
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─── Score Dimensions ─────────────────────────────────────────────────────────

export function scoreLearningRate(
  iRatingHistory: { irating_value: number; recorded_at: string }[],
): number {
  const sorted = [...iRatingHistory]
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    .slice(-90);

  const points = sorted.map((row, i) => ({ x: i, y: row.irating_value }));
  const slope = linearRegression(points);

  // Piecewise: slope → score
  return Math.round(
    piecewiseLinear(slope, [
      [-5, 0],
      [0, 25],
      [5, 55],
      [15, 85],
      [20, 100],
    ]),
  );
}

export function scoreConsistency(
  raceResults: {
    start_position: number | null;
    finish_position: number | null;
    incidents: number;
  }[],
): number {
  const valid = raceResults.filter(
    (r) => r.start_position != null && r.finish_position != null,
  );
  if (valid.length < 3) return 50;

  const deltas = valid.map((r) => r.start_position! - r.finish_position!);
  const avgIncidents =
    raceResults.reduce((s, r) => s + r.incidents, 0) / raceResults.length;

  // Part A: std dev of position deltas (lower is better)
  const std = stdDev(deltas);
  const partA = linearScale(std, 1.5, 7.0, 100, 0);

  // Part B: avg incidents per race (lower is better)
  const partB = linearScale(avgIncidents, 0.5, 4.0, 100, 0);

  return clamp(Math.round(partA * 0.6 + partB * 0.4), 0, 100);
}

export function scoreRacecraft(
  raceResults: {
    start_position: number | null;
    finish_position: number | null;
  }[],
): number {
  const valid = raceResults.filter(
    (r) => r.start_position != null && r.finish_position != null,
  );
  if (valid.length < 3) return 35;

  const avg =
    valid.reduce((s, r) => s + (r.start_position! - r.finish_position!), 0) /
    valid.length;

  return Math.round(
    piecewiseLinear(avg, [
      [-3, 0],
      [0, 35],
      [3, 70],
      [6, 90],
      [10, 100],
    ]),
  );
}

export function scoreVersatility(
  raceResults: {
    track_name: string | null;
    car_name: string | null;
    race_date: string | null;
  }[],
  daysWindow = 90,
): number {
  const cutoff = daysAgo(daysWindow);
  const recent = raceResults.filter(
    (r) => r.race_date != null && new Date(r.race_date) >= cutoff,
  );

  const uniqueTracks = new Set(recent.map((r) => r.track_name).filter(Boolean)).size;
  const uniqueCars = new Set(recent.map((r) => r.car_name).filter(Boolean)).size;

  // Track score via lookup table
  const trackBreakpoints: [number, number][] = [
    [1, 15],
    [2, 35],
    [3, 50],
    [4, 60],
    [5, 70],
    [6, 80],
    [7, 90],
    [8, 100],
  ];
  const trackScore = uniqueTracks === 0 ? 0 : piecewiseLinear(uniqueTracks, trackBreakpoints);

  const carBonus = uniqueCars >= 3 ? 10 : uniqueCars === 2 ? 5 : 0;

  return clamp(Math.round(trackScore + carBonus), 0, 100);
}

export function scoreActivity(
  raceResults: { race_date: string | null }[],
): number {
  const now = new Date();
  const cut30 = daysAgo(30);
  const cut90 = daysAgo(90);

  const races30d = raceResults.filter(
    (r) => r.race_date != null && new Date(r.race_date) >= cut30,
  ).length;

  const races90d = raceResults.filter(
    (r) => r.race_date != null && new Date(r.race_date) >= cut90,
  ).length;

  void now; // used via daysAgo

  // Base from races in last 30 days
  const base = piecewiseLinear(races30d, [
    [0, 0],
    [5, 35],
    [10, 60],
    [20, 80],
    [30, 100],
  ]);

  // Consistency modifier from races in last 90 days
  const modifier = races90d >= 30 ? 10 : races90d >= 15 ? 0 : -10;

  return clamp(Math.round(base + modifier), 0, 100);
}

// ─── Insights Text ────────────────────────────────────────────────────────────

type ScoreDimensions = {
  learning_rate: number;
  consistency: number;
  racecraft: number;
  versatility: number;
  activity: number;
  total: number;
};

type DimensionKey = Exclude<keyof ScoreDimensions, 'total'>;

const POSITIVE_SENTENCES: Record<DimensionKey, string> = {
  learning_rate:
    'Your learning curve is exceptional — you are improving faster than most drivers in your age group.',
  consistency:
    'Your consistency sets you apart. You deliver reliable results race after race.',
  racecraft:
    'You excel at racing wheel-to-wheel. Gaining positions during races is your strongest skill.',
  versatility:
    'Your versatility across different tracks and cars is a strong indicator of real talent.',
  activity:
    'Your dedication and race frequency show serious commitment that scouts notice.',
};

const IMPROVEMENT_SENTENCES: Record<DimensionKey, string> = {
  learning_rate:
    'Focus on consistency in your training to accelerate your iRating growth.',
  consistency:
    'Reducing incidents and stabilizing your finishing positions would significantly boost your score.',
  racecraft:
    'Work on your racecraft — gaining positions during races will have a big impact on your total score.',
  versatility:
    'Try racing on more different tracks and in different cars to improve your versatility score.',
  activity:
    'More races means more data and a higher activity score. Aim for at least 10 races per month.',
};

function generateInsightsText(
  scores: ScoreDimensions,
  percentile: number,
  ageGroup: string,
): string {
  const dims: DimensionKey[] = [
    'learning_rate',
    'consistency',
    'racecraft',
    'versatility',
    'activity',
  ];

  const highest = dims.reduce((a, b) => (scores[a] >= scores[b] ? a : b));
  const lowest = dims.reduce((a, b) => (scores[a] <= scores[b] ? a : b));

  const positiveSentence = POSITIVE_SENTENCES[highest];
  const improvementSentence = IMPROVEMENT_SENTENCES[lowest];

  let percentileSentence: string;
  if (percentile >= 90) {
    percentileSentence = `You are in the top ${100 - percentile}% of drivers in your age group (${ageGroup}).`;
  } else if (percentile >= 70) {
    percentileSentence = `You are performing above average for your age group (${ageGroup}).`;
  } else {
    percentileSentence = `Keep improving — you are building a strong foundation in the ${ageGroup} age group.`;
  }

  return [positiveSentence, improvementSentence, percentileSentence].join(' ');
}

// ─── Main Functions ───────────────────────────────────────────────────────────

export async function calculateAndSaveScore(userId: string): Promise<void> {
  const supabase = createServiceClient();

  // 1. Load data
  const [historyResult, racesResult, profileResult] = await Promise.all([
    supabase
      .from('iracing_history')
      .select('irating_value, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: true }),
    supabase
      .from('race_results')
      .select('start_position, finish_position, incidents, track_name, car_name, race_date')
      .eq('user_id', userId)
      .order('race_date', { ascending: false }),
    supabase
      .from('profiles')
      .select('birth_date')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  if (historyResult.error) throw historyResult.error;
  if (racesResult.error) throw racesResult.error;
  if (profileResult.error) throw profileResult.error;
  if (!profileResult.data) throw new Error(`Profile not found for user ${userId}`);

  const iRatingHistory = historyResult.data as Pick<IracingHistory, 'irating_value' | 'recorded_at'>[];
  const raceResults = racesResult.data as Pick<RaceResult, 'start_position' | 'finish_position' | 'incidents' | 'track_name' | 'car_name' | 'race_date'>[];
  const { birth_date } = profileResult.data as { birth_date: string };

  // 2. Calculate dimension scores
  const lr = scoreLearningRate(iRatingHistory);
  const con = scoreConsistency(raceResults);
  const rc = scoreRacecraft(raceResults);
  const ver = scoreVersatility(raceResults);
  const act = scoreActivity(raceResults);
  const total = Math.round((lr + con + rc + ver + act) / 5);

  // 3. Age group
  const ageGroup = getAgeGroup(new Date(birth_date));

  // 4. Percentile: latest score per peer in the same age group
  const { data: peerRowsRaw } = await supabase
    .from('talent_scores')
    .select('user_id, score_total, calculated_at')
    .eq('age_group', ageGroup)
    .neq('user_id', userId)
    .order('calculated_at', { ascending: false });

  const peerRows = (peerRowsRaw ?? []) as Pick<TalentScore, 'user_id' | 'score_total' | 'calculated_at'>[];

  // Keep only the most recent entry per peer (DISTINCT ON user_id equivalent)
  const latestPerPeer = new Map<string, number>();
  for (const row of peerRows) {
    if (!latestPerPeer.has(row.user_id)) {
      latestPerPeer.set(row.user_id, row.score_total);
    }
  }
  const peerTotals = Array.from(latestPerPeer.values());
  const percentile =
    peerTotals.length === 0
      ? 50
      : Math.round(
          (peerTotals.filter((s) => s < total).length / peerTotals.length) * 100,
        );

  // 5. Insights
  const insightsText = generateInsightsText(
    { learning_rate: lr, consistency: con, racecraft: rc, versatility: ver, activity: act, total },
    percentile,
    ageGroup,
  );

  // 6. Insert (always a new row — every calculation is a historical snapshot)
  const { error: insertError } = await supabase.from('talent_scores').insert({
    user_id: userId,
    score_total: total,
    score_learning_rate: lr,
    score_consistency: con,
    score_racecraft: rc,
    score_versatility: ver,
    score_activity: act,
    age_group: ageGroup,
    age_group_percentile: percentile,
    insights_text: insightsText,
  });
  if (insertError) throw insertError;

  // 7. Evaluate scouting status
  await evaluateScoutingStatus(userId);
}

export async function evaluateScoutingStatus(userId: string): Promise<void> {
  const supabase = createServiceClient();
  const cutoff90 = daysAgo(90).toISOString();

  const [latestScoreResult, racesResult, latestHistoryResult, currentStatusResult] =
    await Promise.all([
      supabase
        .from('talent_scores')
        .select('score_total, score_learning_rate, age_group_percentile')
        .eq('user_id', userId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('race_results')
        .select('track_name, race_date')
        .eq('user_id', userId)
        .gte('race_date', cutoff90),
      supabase
        .from('iracing_history')
        .select('safety_rating')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('scouting_status')
        .select('status, status_since')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

  if (latestScoreResult.error) throw latestScoreResult.error;
  if (racesResult.error) throw racesResult.error;
  if (latestHistoryResult.error) throw latestHistoryResult.error;

  const latestScore = latestScoreResult.data as Pick<TalentScore, 'score_total' | 'score_learning_rate' | 'age_group_percentile'>;
  const races90d = (racesResult.data ?? []) as Pick<RaceResult, 'track_name' | 'race_date'>[];

  const races90dCount = races90d.length;
  const uniqueTracks90d = new Set(
    races90d.map((r) => r.track_name).filter(Boolean),
  ).size;

  const currentPercentile = latestScore.age_group_percentile ?? 0;
  const learningRate = latestScore.score_learning_rate;
  const latestHistory = latestHistoryResult.data as Pick<IracingHistory, 'safety_rating'> | null;
  const currentSafety = latestHistory?.safety_rating ?? 0;

  // Determine status (first match wins)
  let newStatus: ScoutingStatus;

  if (
    currentPercentile >= 97 &&
    learningRate >= 60 &&
    currentSafety >= 3.0 &&
    uniqueTracks90d >= 3
  ) {
    newStatus = 'talent_pool';
  } else if (
    currentPercentile >= 90 &&
    learningRate >= 50 &&
    races90dCount >= 20
  ) {
    newStatus = 'watchlist';
  } else {
    newStatus = 'none';
  }

  const now = new Date().toISOString();
  const currentRow = currentStatusResult.data as Pick<ScoutingStatusRow, 'status' | 'status_since'> | null;
  const statusChanged = newStatus !== currentRow?.status;

  const { error: upsertError } = await supabase
    .from('scouting_status')
    .upsert(
      {
        user_id: userId,
        status: newStatus,
        status_since: statusChanged ? now : currentRow?.status_since ?? now,
        last_evaluated_at: now,
      },
      { onConflict: 'user_id' },
    );

  if (upsertError) throw upsertError;
}
