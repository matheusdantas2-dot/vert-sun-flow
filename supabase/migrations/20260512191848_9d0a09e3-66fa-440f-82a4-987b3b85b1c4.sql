
ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS kit_nome text,
  ADD COLUMN IF NOT EXISTS kit_consumo_kwh integer,
  ADD COLUMN IF NOT EXISTS mostrar_como_kit boolean NOT NULL DEFAULT false;
