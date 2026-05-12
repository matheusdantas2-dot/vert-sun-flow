import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type InteracaoTipo = "ligacao" | "whatsapp" | "email" | "visita" | "nota" | "etapa" | "proposta";

export type InteracaoRow = {
  id: string;
  cliente_id: string;
  tipo: InteracaoTipo;
  titulo: string;
  descricao: string | null;
  data: string;
  usuario_id: string | null;
  created_at: string;
};

export function useInteracoesByClienteQuery(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["interacoes", clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<InteracaoRow[]> => {
      const { data, error } = await supabase
        .from("interacoes")
        .select("*")
        .eq("cliente_id", clienteId!)
        .order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InteracaoRow[];
    },
  });
}

export function useAddInteracao() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      cliente_id: string;
      tipo: InteracaoTipo;
      titulo: string;
      descricao?: string | null;
      data?: string;
    }) => {
      const { data, error } = await supabase
        .from("interacoes")
        .insert({
          cliente_id: input.cliente_id,
          tipo: input.tipo,
          titulo: input.titulo,
          descricao: input.descricao ?? null,
          data: input.data ?? new Date().toISOString(),
          usuario_id: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as InteracaoRow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["interacoes", row.cliente_id] });
    },
  });
}

export function useInteracoesRealtime(clienteId?: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!clienteId) return;
    const channel = supabase
      .channel(`interacoes:${clienteId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "interacoes", filter: `cliente_id=eq.${clienteId}` },
        () => qc.invalidateQueries({ queryKey: ["interacoes", clienteId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clienteId, qc]);
}
