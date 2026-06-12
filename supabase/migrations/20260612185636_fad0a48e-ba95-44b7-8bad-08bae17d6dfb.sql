
CREATE TABLE IF NOT EXISTS public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  card_id uuid REFERENCES public.cards_pipeline(id) ON DELETE SET NULL,
  proposta_id uuid REFERENCES public.propostas(id) ON DELETE SET NULL,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  consultor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pdf_path text,
  status text NOT NULL DEFAULT 'gerado' CHECK (status IN ('gerado', 'enviado', 'assinado', 'cancelado')),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO authenticated;
GRANT ALL ON public.contratos TO service_role;

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contratos_select" ON public.contratos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "contratos_insert" ON public.contratos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "contratos_update" ON public.contratos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_contratos_card_id ON public.contratos(card_id);
CREATE INDEX IF NOT EXISTS idx_contratos_cliente_id ON public.contratos(cliente_id);

CREATE TRIGGER update_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
