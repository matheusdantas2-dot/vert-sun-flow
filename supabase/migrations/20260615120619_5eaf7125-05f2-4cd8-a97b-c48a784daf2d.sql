
CREATE TABLE IF NOT EXISTS public.homologacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 24),
  tipo text NOT NULL CHECK (tipo IN ('inicial','aumento','lista_compensacao')),
  etapa text NOT NULL DEFAULT 'documentacao'
    CHECK (etapa IN ('documentacao','analise_interna','protocolo','em_analise','pendencia','aprovado','medidor_trocado')),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  card_id uuid REFERENCES public.cards_pipeline(id) ON DELETE SET NULL,
  consultor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  potencia_kwp numeric(8,2),
  uc text NOT NULL,
  concessionaria text NOT NULL DEFAULT 'COELBA',
  endereco_instalacao text NOT NULL,
  processo_original_numero text,
  processo_original_data date,
  data_protocolo date,
  numero_protocolo text,
  data_previsao_resposta date,
  data_aprovacao date,
  data_medidor date,
  dados_cliente jsonb NOT NULL DEFAULT '{}'::jsonb,
  documentos jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacoes_internas text,
  mensagem_cliente text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.homologacoes TO authenticated;
GRANT SELECT, UPDATE ON public.homologacoes TO anon;
GRANT ALL ON public.homologacoes TO service_role;

ALTER TABLE public.homologacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "homologacoes_auth_all" ON public.homologacoes
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "homologacoes_public_select" ON public.homologacoes
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "homologacoes_public_update" ON public.homologacoes
  FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_homologacoes_token      ON public.homologacoes(token);
CREATE INDEX IF NOT EXISTS idx_homologacoes_cliente_id ON public.homologacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_homologacoes_card_id    ON public.homologacoes(card_id);
CREATE INDEX IF NOT EXISTS idx_homologacoes_etapa      ON public.homologacoes(etapa);

CREATE TRIGGER homologacoes_set_updated_at
  BEFORE UPDATE ON public.homologacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Policies de storage para o bucket homologacao-docs (criado via tool de bucket)
CREATE POLICY "homologacao_docs_insert_all" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'homologacao-docs');

CREATE POLICY "homologacao_docs_select_all" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'homologacao-docs');

CREATE POLICY "homologacao_docs_delete_auth" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'homologacao-docs');
