-- 1. Adicionar coluna proposta_id ao card
ALTER TABLE public.cards_pipeline
  ADD COLUMN IF NOT EXISTS proposta_id uuid;

CREATE INDEX IF NOT EXISTS idx_cards_pipeline_proposta_id
  ON public.cards_pipeline(proposta_id);

-- 2. Atualizar função de sincronização para usar a proposta vinculada
CREATE OR REPLACE FUNCTION public.sincronizar_card_com_propostas(p_cliente_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_valor NUMERIC;
  v_kwp NUMERIC;
  v_proposta_id uuid;
BEGIN
  FOR r IN
    SELECT id, proposta_id FROM public.cards_pipeline WHERE cliente_id = p_cliente_id
  LOOP
    v_proposta_id := r.proposta_id;

    -- fallback: mais recente do cliente
    IF v_proposta_id IS NULL THEN
      SELECT id INTO v_proposta_id
      FROM public.propostas
      WHERE cliente_id = p_cliente_id
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;

    IF v_proposta_id IS NULL THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(SUM(quantidade * preco_unitario), 0) INTO v_valor
    FROM public.proposta_itens WHERE proposta_id = v_proposta_id;

    SELECT COALESCE(SUM(
      CASE WHEN p.categoria = 'modulo' AND p.potencia_w IS NOT NULL
        THEN (p.potencia_w * pi.quantidade) / 1000.0
        ELSE 0 END
    ), 0) INTO v_kwp
    FROM public.proposta_itens pi
    LEFT JOIN public.produtos p ON p.id = pi.produto_id
    WHERE pi.proposta_id = v_proposta_id;

    UPDATE public.cards_pipeline
    SET valor_estimado = v_valor,
        potencia_kwp = v_kwp,
        proposta_id = COALESCE(proposta_id, v_proposta_id),
        updated_at = now()
    WHERE id = r.id;
  END LOOP;
END;
$function$;

-- 3. Atualizar trigger de criação de card / vinculação
CREATE OR REPLACE FUNCTION public.criar_card_para_proposta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_card_id uuid;
  v_origem TEXT;
  v_valor NUMERIC;
  v_kwp NUMERIC;
BEGIN
  SELECT COALESCE(SUM(quantidade * preco_unitario), 0) INTO v_valor
    FROM public.proposta_itens WHERE proposta_id = NEW.id;

  SELECT COALESCE(SUM(
    CASE WHEN p.categoria = 'modulo' AND p.potencia_w IS NOT NULL
      THEN (p.potencia_w * pi.quantidade) / 1000.0
      ELSE 0 END
  ), 0) INTO v_kwp
  FROM public.proposta_itens pi
  LEFT JOIN public.produtos p ON p.id = pi.produto_id
  WHERE pi.proposta_id = NEW.id;

  -- Existe card sem proposta vinculada? Vincula este.
  SELECT id INTO v_card_id
    FROM public.cards_pipeline
   WHERE cliente_id = NEW.cliente_id AND proposta_id IS NULL
   ORDER BY created_at ASC
   LIMIT 1;

  IF v_card_id IS NOT NULL THEN
    UPDATE public.cards_pipeline
       SET proposta_id = NEW.id,
           valor_estimado = v_valor,
           potencia_kwp = v_kwp,
           updated_at = now()
     WHERE id = v_card_id;
    RETURN NEW;
  END IF;

  -- Já existe um card vinculado a esta proposta? Apenas atualiza
  SELECT id INTO v_card_id
    FROM public.cards_pipeline
   WHERE proposta_id = NEW.id
   LIMIT 1;

  IF v_card_id IS NOT NULL THEN
    UPDATE public.cards_pipeline
       SET valor_estimado = v_valor,
           potencia_kwp = v_kwp,
           updated_at = now()
     WHERE id = v_card_id;
    RETURN NEW;
  END IF;

  -- Cria um novo card vinculado à proposta
  SELECT COALESCE(origem, 'prospeccao') INTO v_origem
    FROM public.clientes WHERE id = NEW.cliente_id;

  INSERT INTO public.cards_pipeline
    (cliente_id, stage, valor_estimado, potencia_kwp, consultor_id, origem, proposta_id)
  VALUES
    (NEW.cliente_id, 'proposta', v_valor, v_kwp, NEW.consultor_id,
     COALESCE(v_origem, 'prospeccao'), NEW.id);

  RETURN NEW;
END;
$function$;

-- 4. Trigger de itens: usa cliente_id mas agora vai sincronizar pelo proposta_id do card.
CREATE OR REPLACE FUNCTION public.trg_itens_sincronizar_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_proposta_id uuid;
  v_cliente_id uuid;
  v_valor NUMERIC;
  v_kwp NUMERIC;
BEGIN
  v_proposta_id := COALESCE(NEW.proposta_id, OLD.proposta_id);
  SELECT cliente_id INTO v_cliente_id FROM public.propostas WHERE id = v_proposta_id;
  IF v_cliente_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Recalcula totais desta proposta
  SELECT COALESCE(SUM(quantidade * preco_unitario), 0) INTO v_valor
    FROM public.proposta_itens WHERE proposta_id = v_proposta_id;

  SELECT COALESCE(SUM(
    CASE WHEN p.categoria = 'modulo' AND p.potencia_w IS NOT NULL
      THEN (p.potencia_w * pi.quantidade) / 1000.0
      ELSE 0 END
  ), 0) INTO v_kwp
  FROM public.proposta_itens pi
  LEFT JOIN public.produtos p ON p.id = pi.produto_id
  WHERE pi.proposta_id = v_proposta_id;

  -- Atualiza qualquer card vinculado a esta proposta
  UPDATE public.cards_pipeline
     SET valor_estimado = v_valor,
         potencia_kwp = v_kwp,
         updated_at = now()
   WHERE proposta_id = v_proposta_id;

  -- Para cards do mesmo cliente sem proposta vinculada, mantém comportamento antigo
  PERFORM public.sincronizar_card_com_propostas(v_cliente_id);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 5. Backfill: vincula cards existentes à proposta mais recente do cliente e recalcula
WITH ultima AS (
  SELECT DISTINCT ON (p.cliente_id)
    p.cliente_id, p.id AS proposta_id
  FROM public.propostas p
  ORDER BY p.cliente_id, p.created_at DESC
),
totais AS (
  SELECT u.cliente_id,
         u.proposta_id,
         COALESCE((SELECT SUM(quantidade * preco_unitario)
                     FROM public.proposta_itens
                    WHERE proposta_id = u.proposta_id), 0) AS valor,
         COALESCE((SELECT SUM(
                       CASE WHEN p.categoria = 'modulo' AND p.potencia_w IS NOT NULL
                         THEN (p.potencia_w * pi.quantidade) / 1000.0 ELSE 0 END)
                     FROM public.proposta_itens pi
                LEFT JOIN public.produtos p ON p.id = pi.produto_id
                    WHERE pi.proposta_id = u.proposta_id), 0) AS kwp
  FROM ultima u
)
UPDATE public.cards_pipeline c
   SET proposta_id = t.proposta_id,
       valor_estimado = t.valor,
       potencia_kwp = t.kwp,
       updated_at = now()
  FROM totais t
 WHERE c.cliente_id = t.cliente_id
   AND c.proposta_id IS NULL;
