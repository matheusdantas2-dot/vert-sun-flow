ALTER TABLE public.atividades REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades;