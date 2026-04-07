export type AgeGroup = 'U10' | 'U14' | 'U17' | 'U25' | 'O25';
export type ScoutingStatus = 'none' | 'watchlist' | 'talent_pool' | 'qualifier_invited';
export type UserRole = 'user' | 'scout' | 'admin';

export interface Profile {
  id: string;
  display_name: string;
  birth_date: string; // ISO date string
  role: UserRole;
  iracing_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  display_name: string;
  birth_date: string;
  role?: UserRole;
  iracing_customer_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdate {
  display_name?: string;
  birth_date?: string;
  role?: UserRole;
  iracing_customer_id?: string | null;
  updated_at?: string;
}

export interface IracingHistory {
  id: string;
  user_id: string;
  irating_value: number;
  safety_rating: number | null;
  license_level: string | null;
  recorded_at: string;
}

export interface IracingHistoryInsert {
  id?: string;
  user_id: string;
  irating_value: number;
  safety_rating?: number | null;
  license_level?: string | null;
  recorded_at: string;
}

export interface IracingHistoryUpdate {
  irating_value?: number;
  safety_rating?: number | null;
  license_level?: string | null;
  recorded_at?: string;
}

export interface RaceResult {
  id: string;
  user_id: string;
  iracing_subsession_id: number;
  track_name: string | null;
  car_name: string | null;
  series_name: string | null;
  start_position: number | null;
  finish_position: number | null;
  incidents: number;
  fastest_lap_ms: number | null;
  irating_before: number | null;
  irating_after: number | null;
  race_date: string | null;
}

export interface RaceResultInsert {
  id?: string;
  user_id: string;
  iracing_subsession_id: number;
  track_name?: string | null;
  car_name?: string | null;
  series_name?: string | null;
  start_position?: number | null;
  finish_position?: number | null;
  incidents?: number;
  fastest_lap_ms?: number | null;
  irating_before?: number | null;
  irating_after?: number | null;
  race_date?: string | null;
}

export interface RaceResultUpdate {
  track_name?: string | null;
  car_name?: string | null;
  series_name?: string | null;
  start_position?: number | null;
  finish_position?: number | null;
  incidents?: number;
  fastest_lap_ms?: number | null;
  irating_before?: number | null;
  irating_after?: number | null;
  race_date?: string | null;
}

export interface TalentScore {
  id: string;
  user_id: string;
  score_total: number;
  score_learning_rate: number;
  score_consistency: number;
  score_racecraft: number;
  score_versatility: number;
  score_activity: number;
  age_group: AgeGroup | null;
  age_group_percentile: number | null;
  insights_text: string | null;
  calculated_at: string;
}

export interface TalentScoreInsert {
  id?: string;
  user_id: string;
  score_total: number;
  score_learning_rate: number;
  score_consistency: number;
  score_racecraft: number;
  score_versatility: number;
  score_activity: number;
  age_group?: AgeGroup | null;
  age_group_percentile?: number | null;
  insights_text?: string | null;
  calculated_at?: string;
}

export interface TalentScoreUpdate {
  score_total?: number;
  score_learning_rate?: number;
  score_consistency?: number;
  score_racecraft?: number;
  score_versatility?: number;
  score_activity?: number;
  age_group?: AgeGroup | null;
  age_group_percentile?: number | null;
  insights_text?: string | null;
  calculated_at?: string;
}

export interface ScoutingStatusRow {
  user_id: string;
  status: ScoutingStatus;
  status_since: string;
  last_evaluated_at: string;
}

export interface ScoutingStatusInsert {
  user_id: string;
  status?: ScoutingStatus;
  status_since?: string;
  last_evaluated_at?: string;
}

export interface ScoutingStatusUpdate {
  status?: ScoutingStatus;
  status_since?: string;
  last_evaluated_at?: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      iracing_history: {
        Row: IracingHistory;
        Insert: IracingHistoryInsert;
        Update: IracingHistoryUpdate;
      };
      race_results: {
        Row: RaceResult;
        Insert: RaceResultInsert;
        Update: RaceResultUpdate;
      };
      talent_scores: {
        Row: TalentScore;
        Insert: TalentScoreInsert;
        Update: TalentScoreUpdate;
      };
      scouting_status: {
        Row: ScoutingStatusRow;
        Insert: ScoutingStatusInsert;
        Update: ScoutingStatusUpdate;
      };
    };
    Enums: {
      age_group_enum: AgeGroup;
      scouting_status_enum: ScoutingStatus;
      user_role_enum: UserRole;
    };
  };
}
