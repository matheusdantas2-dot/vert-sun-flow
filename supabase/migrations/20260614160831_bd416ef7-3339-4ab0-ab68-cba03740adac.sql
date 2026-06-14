CREATE TABLE IF NOT EXISTS public.despesas_fixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta text NOT NULL CHECK (conta IN ('vert_pj', 'pessoal_matheus')),
  descricao text NOT NULL,
  valor numeric(12,2) NOT NULL CHECK (valor > 0),
  categoria text NOT NULL,
  frequencia text NOT NULL DEFAULT 'mensal'
    CHECK (frequencia IN ('mensal','bimestral','trimestral','semestral','anual')),
  dia_vencimento smallint NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 28),
  ativa boolean NOT NULL DEFAULT true,
  proximo_vencimento date NOT NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas_fixas TO authenticated;
GRANT ALL ON public.despesas_fixas TO service_role;

ALTER TABLE public.despesas_fixas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "despesas_fixas_select" ON public.despesas_fixas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "despesas_fixas_insert" ON public.despesas_fixas
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "despesas_fixas_update" ON public.despesas_fixas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "despesas_fixas_delete" ON public.despesas_fixas
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_despesas_fixas_ativa
  ON public.despesas_fixas(ativa, proximo_vencimento);

CREATE TRIGGER trg_despesas_fixas_updated
  BEFORE UPDATE ON public.despesas_fixas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();