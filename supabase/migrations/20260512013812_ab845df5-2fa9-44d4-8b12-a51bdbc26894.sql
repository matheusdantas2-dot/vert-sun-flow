
-- ============================================================
-- HELPERS
-- ============================================================

-- Helper: usuário é admin ou gestor (staff interno com visão total)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
      OR public.has_role(_user_id, 'gestor'::app_role)
$$;

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'pf',                 -- pf | pj
  documento text,
  telefone text,
  whatsapp text,
  email text,
  cep text,
  rua text,
  numero text,
  bairro text,
  cidade text,
  uf text,
  segmento text NOT NULL DEFAULT 'residencial',    -- residencial | comercial | agronegocio | industrial
  origem text NOT NULL DEFAULT 'prospeccao',
  concessionaria text,
  grupo_tarifario text,
  consumo_medio numeric DEFAULT 0,
  tarifa numeric DEFAULT 0,
  rede text DEFAULT 'monofasico',
  uc text,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  consultor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_clientes_consultor ON public.clientes(consultor_id);

CREATE POLICY clientes_select ON public.clientes FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()) OR consultor_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY clientes_insert ON public.clientes FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()) OR consultor_id = auth.uid());
CREATE POLICY clientes_update ON public.clientes FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()) OR consultor_id = auth.uid());
CREATE POLICY clientes_delete ON public.clientes FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()));

CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PRODUTOS
-- ============================================================
CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL,
  nome text NOT NULL,
  fabricante text,
  potencia_w numeric,
  potencia_kw numeric,
  unidade text NOT NULL DEFAULT 'unid',
  preco_custo numeric NOT NULL DEFAULT 0,
  preco_venda numeric NOT NULL DEFAULT 0,
  garantia_anos integer,
  detalhes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY produtos_select ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY produtos_insert ON public.produtos FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY produtos_update ON public.produtos FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()));
CREATE POLICY produtos_delete ON public.produtos FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()));
CREATE TRIGGER trg_produtos_updated BEFORE UPDATE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- CARDS_PIPELINE
-- ============================================================
CREATE TABLE public.cards_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'prospeccao',
  valor_estimado numeric NOT NULL DEFAULT 0,
  potencia_kwp numeric NOT NULL DEFAULT 0,
  consultor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  origem text NOT NULL DEFAULT 'prospeccao',
  motivo_perda text,
  dias_na_etapa_desde timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cards_pipeline ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cards_consultor ON public.cards_pipeline(consultor_id);
CREATE INDEX idx_cards_cliente ON public.cards_pipeline(cliente_id);

CREATE POLICY cards_select ON public.cards_pipeline FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()) OR consultor_id = auth.uid());
CREATE POLICY cards_insert ON public.cards_pipeline FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()) OR consultor_id = auth.uid());
CREATE POLICY cards_update ON public.cards_pipeline FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()) OR consultor_id = auth.uid());
CREATE POLICY cards_delete ON public.cards_pipeline FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()) OR consultor_id = auth.uid());
CREATE TRIGGER trg_cards_updated BEFORE UPDATE ON public.cards_pipeline
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PROPOSTAS + ITENS
-- ============================================================
CREATE TABLE public.propostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  consultor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'rascunho',
  validade_ate timestamptz NOT NULL,
  irradiacao numeric DEFAULT 5,
  eficiencia numeric DEFAULT 0.78,
  cobertura numeric DEFAULT 1,
  inflacao numeric DEFAULT 0.08,
  taxa_financiamento numeric DEFAULT 0.012,
  taxa_cartao numeric DEFAULT 0.025,
  versao integer NOT NULL DEFAULT 1,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_propostas_cliente ON public.propostas(cliente_id);
CREATE INDEX idx_propostas_consultor ON public.propostas(consultor_id);

CREATE POLICY propostas_select ON public.propostas FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()) OR consultor_id = auth.uid());
CREATE POLICY propostas_insert ON public.propostas FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()) OR consultor_id = auth.uid());
CREATE POLICY propostas_update ON public.propostas FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()) OR consultor_id = auth.uid());
CREATE POLICY propostas_delete ON public.propostas FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()) OR consultor_id = auth.uid());
CREATE TRIGGER trg_propostas_updated BEFORE UPDATE ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.proposta_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  preco_unitario numeric NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.proposta_itens ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_proposta_itens_prop ON public.proposta_itens(proposta_id);

CREATE POLICY proposta_itens_select ON public.proposta_itens FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.propostas p WHERE p.id = proposta_id
  AND (public.is_staff(auth.uid()) OR p.consultor_id = auth.uid())));
CREATE POLICY proposta_itens_insert ON public.proposta_itens FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.propostas p WHERE p.id = proposta_id
  AND (public.is_staff(auth.uid()) OR p.consultor_id = auth.uid())));
CREATE POLICY proposta_itens_update ON public.proposta_itens FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.propostas p WHERE p.id = proposta_id
  AND (public.is_staff(auth.uid()) OR p.consultor_id = auth.uid())));
CREATE POLICY proposta_itens_delete ON public.proposta_itens FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.propostas p WHERE p.id = proposta_id
  AND (public.is_staff(auth.uid()) OR p.consultor_id = auth.uid())));

-- ============================================================
-- PROJETOS + ETAPAS
-- ============================================================
CREATE TABLE public.projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL UNIQUE REFERENCES public.cards_pipeline(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  consultor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  tecnico_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  potencia_kwp numeric NOT NULL DEFAULT 0,
  valor_investimento numeric NOT NULL DEFAULT 0,
  token_publico text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  token_ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_projetos_consultor ON public.projetos(consultor_id);
CREATE INDEX idx_projetos_tecnico ON public.projetos(tecnico_id);

CREATE POLICY projetos_select ON public.projetos FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()) OR consultor_id = auth.uid() OR tecnico_id = auth.uid());
CREATE POLICY projetos_insert ON public.projetos FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()) OR consultor_id = auth.uid());
CREATE POLICY projetos_update ON public.projetos FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()) OR consultor_id = auth.uid() OR tecnico_id = auth.uid());
CREATE POLICY projetos_delete ON public.projetos FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()));
CREATE TRIGGER trg_projetos_updated BEFORE UPDATE ON public.projetos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.etapas_projeto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  etapa_id text NOT NULL,                       -- contrato | compra | homologacao | agendamento | instalacao | ativacao | posvenda
  status text NOT NULL DEFAULT 'pendente',
  ordem integer NOT NULL DEFAULT 0,
  data_prevista timestamptz,
  data_real timestamptz,
  observacoes_internas text,
  extra jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (projeto_id, etapa_id)
);
ALTER TABLE public.etapas_projeto ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_etapas_projeto ON public.etapas_projeto(projeto_id);

CREATE POLICY etapas_select ON public.etapas_projeto FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.projetos pr WHERE pr.id = projeto_id
  AND (public.is_staff(auth.uid()) OR pr.consultor_id = auth.uid() OR pr.tecnico_id = auth.uid())));
CREATE POLICY etapas_insert ON public.etapas_projeto FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.projetos pr WHERE pr.id = projeto_id
  AND (public.is_staff(auth.uid()) OR pr.consultor_id = auth.uid() OR pr.tecnico_id = auth.uid())));
CREATE POLICY etapas_update ON public.etapas_projeto FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.projetos pr WHERE pr.id = projeto_id
  AND (public.is_staff(auth.uid()) OR pr.consultor_id = auth.uid() OR pr.tecnico_id = auth.uid())));
CREATE POLICY etapas_delete ON public.etapas_projeto FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.projetos pr WHERE pr.id = projeto_id
  AND (public.is_staff(auth.uid()) OR pr.consultor_id = auth.uid())));
CREATE TRIGGER trg_etapas_updated BEFORE UPDATE ON public.etapas_projeto
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- ATIVIDADES (agenda)
-- ============================================================
CREATE TABLE public.atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  card_id uuid REFERENCES public.cards_pipeline(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  data timestamptz NOT NULL,
  duracao integer,
  status text NOT NULL DEFAULT 'pendente',
  responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_atividades_resp ON public.atividades(responsavel_id);

CREATE POLICY atividades_select ON public.atividades FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()) OR responsavel_id = auth.uid());
CREATE POLICY atividades_insert ON public.atividades FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()) OR responsavel_id = auth.uid());
CREATE POLICY atividades_update ON public.atividades FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()) OR responsavel_id = auth.uid());
CREATE POLICY atividades_delete ON public.atividades FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()) OR responsavel_id = auth.uid());
CREATE TRIGGER trg_atividades_updated BEFORE UPDATE ON public.atividades
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- INTERACOES (histórico)
-- ============================================================
CREATE TABLE public.interacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  data timestamptz NOT NULL DEFAULT now(),
  usuario_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_interacoes_cliente ON public.interacoes(cliente_id);

CREATE POLICY interacoes_select ON public.interacoes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = cliente_id
  AND (public.is_staff(auth.uid()) OR c.consultor_id = auth.uid())));
CREATE POLICY interacoes_insert ON public.interacoes FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = cliente_id
  AND (public.is_staff(auth.uid()) OR c.consultor_id = auth.uid())));
CREATE POLICY interacoes_delete ON public.interacoes FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()));

-- ============================================================
-- NOTIFICACOES
-- ============================================================
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensagem text,
  link text,
  lida boolean NOT NULL DEFAULT false,
  resolvida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notif_user ON public.notificacoes(user_id, lida);

CREATE POLICY notif_select ON public.notificacoes FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY notif_insert ON public.notificacoes FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY notif_update ON public.notificacoes FOR UPDATE TO authenticated
USING (user_id = auth.uid());
CREATE POLICY notif_delete ON public.notificacoes FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- MOTIVOS DE PERDA
-- ============================================================
CREATE TABLE public.motivos_perda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.motivos_perda ENABLE ROW LEVEL SECURITY;
CREATE POLICY mot_select ON public.motivos_perda FOR SELECT TO authenticated USING (true);
CREATE POLICY mot_insert ON public.motivos_perda FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY mot_update ON public.motivos_perda FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()));
CREATE POLICY mot_delete ON public.motivos_perda FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()));

-- ============================================================
-- CONFIG GLOBAL (empresa, metas, sla) - linha única
-- ============================================================
CREATE TABLE public.config_global (
  id integer PRIMARY KEY DEFAULT 1,
  empresa jsonb NOT NULL DEFAULT '{}'::jsonb,
  metas jsonb NOT NULL DEFAULT '{}'::jsonb,
  sla jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
ALTER TABLE public.config_global ENABLE ROW LEVEL SECURITY;
CREATE POLICY cfg_select ON public.config_global FOR SELECT TO authenticated USING (true);
CREATE POLICY cfg_insert ON public.config_global FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY cfg_update ON public.config_global FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()));
CREATE TRIGGER trg_cfg_updated BEFORE UPDATE ON public.config_global
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.config_global (id, empresa, metas, sla)
VALUES (1, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb);

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.cards_pipeline;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
