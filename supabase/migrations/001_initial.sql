-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
CREATE TYPE age_group_enum AS ENUM 
  ('U12', 'U15', 'U18', 'U21', '21+');

CREATE TYPE scouting_status_enum AS ENUM 
  ('none', 'watchlist', 'talent_pool', 'qualifier_invited');

CREATE TYPE user_role_enum AS ENUM 
  ('user', 'scout', 'admin');

-- PROFILES (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  role user_role_enum NOT NULL DEFAULT 'user',
  iracing_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IRACING HISTORY (iRating over time)
CREATE TABLE public.iracing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  irating_value INTEGER NOT NULL,
  safety_rating DECIMAL(4,2),
  license_level TEXT,
  recorded_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, recorded_at)
);

-- RACE RESULTS
CREATE TABLE public.race_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  iracing_subsession_id BIGINT NOT NULL,
  track_name TEXT,
  car_name TEXT,
  series_name TEXT,
  start_position INTEGER,
  finish_position INTEGER,
  incidents INTEGER DEFAULT 0,
  fastest_lap_ms INTEGER,
  irating_before INTEGER,
  irating_after INTEGER,
  race_date TIMESTAMPTZ,
  UNIQUE(user_id, iracing_subsession_id)
);

-- TALENT SCORES (one entry per calculation run)
CREATE TABLE public.talent_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score_total INTEGER NOT NULL CHECK (score_total BETWEEN 0 AND 100),
  score_learning_rate INTEGER NOT NULL CHECK (score_learning_rate BETWEEN 0 AND 100),
  score_consistency INTEGER NOT NULL CHECK (score_consistency BETWEEN 0 AND 100),
  score_racecraft INTEGER NOT NULL CHECK (score_racecraft BETWEEN 0 AND 100),
  score_versatility INTEGER NOT NULL CHECK (score_versatility BETWEEN 0 AND 100),
  score_activity INTEGER NOT NULL CHECK (score_activity BETWEEN 0 AND 100),
  age_group age_group_enum,
  age_group_percentile INTEGER CHECK (age_group_percentile BETWEEN 0 AND 100),
  insights_text TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SCOUTING STATUS
CREATE TABLE public.scouting_status (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status scouting_status_enum NOT NULL DEFAULT 'none',
  status_since TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AUTO UPDATE updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iracing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_status ENABLE ROW LEVEL SECURITY;

-- USER POLICIES: users only see their own data
CREATE POLICY "users_own_profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "users_own_iracing_history" ON public.iracing_history
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_race_results" ON public.race_results
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_talent_scores" ON public.talent_scores
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_scouting_status" ON public.scouting_status
  FOR ALL USING (auth.uid() = user_id);

-- SCOUT POLICIES: scouts and admins can read all data
CREATE POLICY "scouts_read_all_profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('scout', 'admin')
    )
  );

CREATE POLICY "scouts_read_all_scores" ON public.talent_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('scout', 'admin')
    )
  );

CREATE POLICY "scouts_read_all_scouting" ON public.scouting_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('scout', 'admin')
    )
  );

CREATE POLICY "scouts_read_all_race_results" ON public.race_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('scout', 'admin')
    )
  );

-- SERVICE ROLE POLICIES: cron job can do everything
CREATE POLICY "service_role_profiles" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_iracing_history" ON public.iracing_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_race_results" ON public.race_results
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_talent_scores" ON public.talent_scores
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_scouting_status" ON public.scouting_status
  FOR ALL USING (auth.role() = 'service_role');
