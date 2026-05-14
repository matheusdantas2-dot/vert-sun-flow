-- Função que recalcula valor e kwp do card a partir das propostas do cliente
CREATE OR REPLACE FUNCTION public.sincronizar_card_com_propostas(p_cliente_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor NUMERIC := 0;
  v_kwp NUMERIC := 0;
  v_proposta_id uuid;
BEGIN
  -- Pega a proposta mais recente do cliente
  SELECT id INTO v_proposta_id
  FROM public.propostas
  WHERE cliente_id = p_cliente_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_proposta_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(quantidade * preco_unitario), 0) INTO v_valor
  FROM public.proposta_itens
  WHERE proposta_id = v_proposta_id;

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
      updated_at = now()
  WHERE cliente_id = p_cliente_id;
END;
$$;

-- Atualiza o trigger de criação para também sincronizar caso card já exista
CREATE OR REPLACE FUNCTION public.criar_card_para_proposta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existe INT;
  v_origem TEXT;
  v_valor NUMERIC;
  v_kwp NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_existe FROM public.cards_pipeline WHERE cliente_id = NEW.cliente_id;

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

  IF v_existe > 0 THEN
    UPDATE public.cards_pipeline
    SET valor_estimado = v_valor,
        potencia_kwp = v_kwp,
        updated_at = now()
    WHERE cliente_id = NEW.cliente_id;
    RETURN NEW;
  END IF;

  SELECT COALESCE(origem, 'prospeccao') INTO v_origem FROM public.clientes WHERE id = NEW.cliente_id;

  INSERT INTO public.cards_pipeline (cliente_id, stage, valor_estimado, potencia_kwp, consultor_id, origem)
  VALUES (NEW.cliente_id, 'proposta', v_valor, v_kwp, NEW.consultor_id, COALESCE(v_origem, 'prospeccao'));

  RETURN NEW;
END;
$$;

-- Garante o trigger na tabela propostas
DROP TRIGGER IF EXISTS trg_criar_card_para_proposta ON public.propostas;
CREATE TRIGGER trg_criar_card_para_proposta
AFTER INSERT ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.criar_card_para_proposta();

-- Trigger nos itens: recalcula card quando itens mudam
CREATE OR REPLACE FUNCTION public.trg_itens_sincronizar_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposta_id uuid;
  v_cliente_id uuid;
BEGIN
  v_proposta_id := COALESCE(NEW.proposta_id, OLD.proposta_id);
  SELECT cliente_id INTO v_cliente_id FROM public.propostas WHERE id = v_proposta_id;
  IF v_cliente_id IS NOT NULL THEN
    PERFORM public.sincronizar_card_com_propostas(v_cliente_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_proposta_itens_sync_card ON public.proposta_itens;
CREATE TRIGGER trg_proposta_itens_sync_card
AFTER INSERT OR UPDATE OR DELETE ON public.proposta_itens
FOR EACH ROW EXECUTE FUNCTION public.trg_itens_sincronizar_card();