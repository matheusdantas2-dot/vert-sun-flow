-- Função: cria card no pipeline ao inserir proposta, se cliente ainda não tem card
CREATE OR REPLACE FUNCTION public.criar_card_para_proposta()
RETURNS TRIGGER
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
  IF v_existe > 0 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(origem, 'prospeccao') INTO v_origem FROM public.clientes WHERE id = NEW.cliente_id;

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

  INSERT INTO public.cards_pipeline (cliente_id, stage, valor_estimado, potencia_kwp, consultor_id, origem)
  VALUES (NEW.cliente_id, 'proposta', v_valor, v_kwp, NEW.consultor_id, COALESCE(v_origem, 'prospeccao'));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_criar_card_para_proposta ON public.propostas;
CREATE TRIGGER trg_criar_card_para_proposta
AFTER INSERT ON public.propostas
FOR EACH ROW
EXECUTE FUNCTION public.criar_card_para_proposta();

-- Backfill: criar cards para clientes com propostas mas sem card
INSERT INTO public.cards_pipeline (cliente_id, stage, valor_estimado, potencia_kwp, consultor_id, origem)
SELECT
  p.cliente_id,
  'proposta',
  COALESCE((SELECT SUM(pi.quantidade * pi.preco_unitario) FROM public.proposta_itens pi WHERE pi.proposta_id = p.id), 0),
  COALESCE((
    SELECT SUM(CASE WHEN pr.categoria = 'modulo' AND pr.potencia_w IS NOT NULL
      THEN (pr.potencia_w * pi.quantidade) / 1000.0 ELSE 0 END)
    FROM public.proposta_itens pi
    LEFT JOIN public.produtos pr ON pr.id = pi.produto_id
    WHERE pi.proposta_id = p.id
  ), 0),
  p.consultor_id,
  COALESCE((SELECT origem FROM public.clientes c WHERE c.id = p.cliente_id), 'prospeccao')
FROM public.propostas p
WHERE NOT EXISTS (
  SELECT 1 FROM public.cards_pipeline cp WHERE cp.cliente_id = p.cliente_id
)
AND p.id = (
  SELECT id FROM public.propostas p2 WHERE p2.cliente_id = p.cliente_id ORDER BY created_at ASC LIMIT 1
);