'use server';

import { createServiceClient } from '@/lib/supabase/service';
import { calculateAndSaveScore } from '@/lib/scoring';
import type { IBTResult } from '@/lib/ibt-parser';

interface TelemetryScores {
  smoothness: number;
  throttleControl: number;
  brakeEfficiency: number;
  consistency: number;
  total: number;
}

interface TelemetrySessionData {
  trackName: string;
  carName: string;
  bestLapTime: number;
  incidents: number;
  sessionDate: Date;
  irating?: number;
  scores?: TelemetryScores;
  topSpeed?: number;
  eventType?: string;
  driverName?: string;
  fullResult?: IBTResult;
}

export async function saveTelemetrySession(
  userId: string,
  data: TelemetrySessionData,
): Promise<{ success: true }> {
  const supabase = createServiceClient();

  const fakeSubsessionId = -Date.now();

  const { error } = await supabase.from('race_results').insert({
    user_id: userId,
    iracing_subsession_id: fakeSubsessionId,
    track_name: data.trackName || null,
    car_name: data.carName || null,
    fastest_lap_ms: data.bestLapTime > 0 ? Math.round(data.bestLapTime * 1000) : null,
    incidents: data.incidents,
    race_date: data.sessionDate.toISOString(),
    start_position: 1,
    finish_position: 1,
    irating_before: data.irating ?? null,
    irating_after: data.irating ?? null,
    series_name: JSON.stringify({
      _telemetry: true,
      scores: data.scores ?? null,
      topSpeed: data.topSpeed ?? null,
      eventType: data.eventType ?? null,
      driverName: data.driverName ?? null,
    }),
    // Full parsed result stored separately so the list query stays fast
    telemetry_json: data.fullResult ? JSON.stringify(data.fullResult) : null,
  } as any);

  if (error) throw new Error(error.message);

  try {
    await calculateAndSaveScore(userId);
  } catch {
    // score recalc is best-effort
  }

  return { success: true };
}
