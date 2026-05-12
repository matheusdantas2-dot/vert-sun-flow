import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AtividadeTipo =
  | "ligacao"
  | "whatsapp"
  | "visita"
  | "reuniao"
  | "followup"
  | "instalacao"
  | "vistoria";

export type AtividadeStatus =
  | "pendente"
  | "realizada"
  | "nao_atendeu"
  | "reagendada";

export type AtividadeRow = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: AtividadeTipo;
  status: AtividadeStatus;
  data: string;
  duracao: number | null;
  cliente_id: string | null;
  card_id: string | null;
  responsavel_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AtividadeInput = {
  titulo: string;
  descricao?: string | null;
  tipo: AtividadeTipo;
  status?: AtividadeStatus;
  data: string;
  duracao?: number | null;
  cliente_id?: string | null;
  card_id?: string | null;
  responsavel_id?: string | null;
};

const KEY = ["atividades"] as const;

export function useAtividadesQuery() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<AtividadeRow[]> => {
      const { data, error } = await supabase
        .from("atividades")
        .select("*")
        .order("data", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AtividadeRow[];
    },
    staleTime: 30_000,
  });
}

export function useAtividadesRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("atividades-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atividades" },
        () => qc.invalidateQueries({ queryKey: KEY }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

export function useCreateAtividade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AtividadeInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const responsavel_id = input.responsavel_id ?? userData.user?.id ?? null;
      const { data, error } = await supabase
        .from("atividades")
        .insert({ ...input, responsavel_id })
        .select()
        .single();
      if (error) throw error;
      return data as AtividadeRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateAtividade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AtividadeInput> }) => {
      const { data, error } = await supabase
        .from("atividades")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as AtividadeRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteAtividade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("atividades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
