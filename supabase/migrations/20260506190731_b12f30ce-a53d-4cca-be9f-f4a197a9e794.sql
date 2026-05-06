
-- Tabela de links compartilhados
CREATE TABLE public.propostas_compartilhadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  proposta_id TEXT NOT NULL,
  proposta_numero TEXT NOT NULL,
  cliente_nome TEXT NOT NULL,
  pdf_path TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em TIMESTAMPTZ NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  total_aberturas INTEGER NOT NULL DEFAULT 0,
  ultima_abertura TIMESTAMPTZ
);

CREATE INDEX idx_propostas_compartilhadas_token ON public.propostas_compartilhadas(token);
CREATE INDEX idx_propostas_compartilhadas_proposta ON public.propostas_compartilhadas(proposta_id);

ALTER TABLE public.propostas_compartilhadas ENABLE ROW LEVEL SECURITY;

-- Como o CRM ainda não tem auth, libera acesso público (será refinado quando houver login)
CREATE POLICY "leitura publica shares" ON public.propostas_compartilhadas
  FOR SELECT USING (true);
CREATE POLICY "insercao publica shares" ON public.propostas_compartilhadas
  FOR INSERT WITH CHECK (true);
CREATE POLICY "update publico shares" ON public.propostas_compartilhadas
  FOR UPDATE USING (true);
CREATE POLICY "delete publico shares" ON public.propostas_compartilhadas
  FOR DELETE USING (true);

-- Tabela de aberturas
CREATE TABLE public.proposta_aberturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id UUID NOT NULL REFERENCES public.propostas_compartilhadas(id) ON DELETE CASCADE,
  proposta_id TEXT NOT NULL,
  aberto_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip TEXT,
  user_agent TEXT,
  referer TEXT
);

CREATE INDEX idx_aberturas_share ON public.proposta_aberturas(share_id);
CREATE INDEX idx_aberturas_proposta ON public.proposta_aberturas(proposta_id);

ALTER TABLE public.proposta_aberturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leitura publica aberturas" ON public.proposta_aberturas
  FOR SELECT USING (true);
CREATE POLICY "insercao publica aberturas" ON public.proposta_aberturas
  FOR INSERT WITH CHECK (true);

-- Bucket público para os PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('propostas-pdf', 'propostas-pdf', true);

-- Policies de storage
CREATE POLICY "leitura publica pdf" ON storage.objects
  FOR SELECT USING (bucket_id = 'propostas-pdf');
CREATE POLICY "upload publico pdf" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'propostas-pdf');
CREATE POLICY "update publico pdf" ON storage.objects
  FOR UPDATE USING (bucket_id = 'propostas-pdf');
CREATE POLICY "delete publico pdf" ON storage.objects
  FOR DELETE USING (bucket_id = 'propostas-pdf');

-- Realtime para receber notificações de abertura ao vivo
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposta_aberturas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.propostas_compartilhadas;
