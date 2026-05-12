CREATE OR REPLACE FUNCTION public.get_projeto_publico(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_projeto projetos%ROWTYPE;
  v_cliente jsonb;
  v_consultor jsonb;
  v_etapas jsonb;
  v_empresa jsonb;
BEGIN
  SELECT * INTO v_projeto FROM projetos WHERE token_publico = p_token AND token_ativo = true;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT to_jsonb(c) INTO v_cliente FROM clientes c WHERE c.id = v_projeto.cliente_id;
  SELECT to_jsonb(p) INTO v_consultor FROM profiles p WHERE p.id = v_projeto.consultor_id;
  SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.ordem), '[]'::jsonb) INTO v_etapas
    FROM etapas_projeto e WHERE e.projeto_id = v_projeto.id;
  SELECT empresa INTO v_empresa FROM config_global WHERE id = 1;

  RETURN jsonb_build_object(
    'projeto', to_jsonb(v_projeto),
    'cliente', v_cliente,
    'consultor', v_consultor,
    'etapas', v_etapas,
    'empresa', COALESCE(v_empresa, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_projeto_publico(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_projeto_publico(text) TO anon, authenticated;

ALTER TABLE public.projetos REPLICA IDENTITY FULL;
ALTER TABLE public.etapas_projeto REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projetos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.etapas_projeto;