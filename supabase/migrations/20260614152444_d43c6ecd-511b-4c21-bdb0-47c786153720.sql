
CREATE TABLE IF NOT EXISTS public.lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta text NOT NULL CHECK (conta IN ('vert_pj', 'pessoal_matheus')),
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa', 'transferencia')),
  descricao text NOT NULL,
  valor numeric(12,2) NOT NULL CHECK (valor > 0),
  categoria text NOT NULL,
  data_vencimento date NOT NULL,
  data_realizacao date,
  status text NOT NULL DEFAULT 'previsto' CHECK (status IN ('previsto', 'realizado', 'cancelado')),
  card_id uuid REFERENCES public.cards_pipeline(id) ON DELETE SET NULL,
  proposta_id uuid REFERENCES public.propostas(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  conta_destino text CHECK (conta_destino IN ('vert_pj', 'pessoal_matheus')),
  modo_recebimento text,
  parcela_numero smallint,
  parcela_total smallint,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos TO authenticated;
GRANT ALL ON public.lancamentos TO service_role;

ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lancamentos_select" ON public.lancamentos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "lancamentos_insert" ON public.lancamentos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "lancamentos_update" ON public.lancamentos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "lancamentos_delete" ON public.lancamentos
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_lancamentos_conta ON public.lancamentos(conta);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON public.lancamentos(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_lancamentos_card ON public.lancamentos(card_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_status ON public.lancamentos(status);

CREATE TRIGGER update_lancamentos_updated_at
  BEFORE UPDATE ON public.lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
