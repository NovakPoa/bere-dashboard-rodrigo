
-- 1) Tabela dedicada para atividades do Garmin (via Terra)
CREATE TABLE public.garmin_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  terra_user_id text NOT NULL,
  terra_payload_id text NOT NULL,
  provider text NOT NULL DEFAULT 'garmin',
  external_id text, -- ID externo da atividade (Terra/Garmin) quando disponível
  activity_type text NOT NULL, -- tipo normalizado (ex.: corrida, ciclismo, natacao, caminhada, musculacao, etc.)
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_sec integer,
  distance_km numeric,
  calories numeric,
  steps integer,
  avg_hr numeric,
  max_hr numeric,
  elevation_gain_m numeric,
  elevation_loss_m numeric,
  pace_min_per_km numeric,
  raw jsonb, -- payload bruto para auditoria/depuração
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Índices e unicidades para evitar duplicatas comuns e acelerar consultas
CREATE INDEX garmin_activities_user_time_idx
  ON public.garmin_activities (user_id, start_time DESC);

-- Evita duplicatas quando external_id estiver presente
CREATE UNIQUE INDEX garmin_activities_external_unique
  ON public.garmin_activities (external_id)
  WHERE external_id IS NOT NULL;

-- Evita duplicatas grosseiras mesmo sem external_id
CREATE UNIQUE INDEX garmin_activities_user_provider_time_unique
  ON public.garmin_activities (user_id, provider, start_time, end_time);

-- 3) RLS
ALTER TABLE public.garmin_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own garmin activities"
  ON public.garmin_activities
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own garmin activities"
  ON public.garmin_activities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own garmin activities"
  ON public.garmin_activities
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own garmin activities"
  ON public.garmin_activities
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4) Trigger para manter updated_at
CREATE TRIGGER set_garmin_activities_updated_at
BEFORE UPDATE ON public.garmin_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
