ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS tier text CHECK (tier IN ('basico','ideal','premium')),
  ADD COLUMN IF NOT EXISTS grupo_tier_id uuid,
  ADD COLUMN IF NOT EXISTS tier_principal boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_propostas_grupo_tier ON public.propostas(grupo_tier_id);