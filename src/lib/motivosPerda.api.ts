import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MotivoPerda = { id: string; texto: string; ativo: boolean };

export function useMotivosPerdaQuery() {
  return useQuery({
    queryKey: ["motivos_perda"],
    queryFn: async (): Promise<MotivoPerda[]> => {
      const { data, error } = await supabase
        .from("motivos_perda")
        .select("*")
        .eq("ativo", true)
        .order("texto");
      if (error) throw error;
      return (data ?? []) as MotivoPerda[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useAddMotivoPerda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (texto: string) => {
      const { data, error } = await supabase
        .from("motivos_perda")
        .insert({ texto, ativo: true })
        .select()
        .single();
      if (error) throw error;
      return data as MotivoPerda;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["motivos_perda"] }),
  });
}

export function useRemoveMotivoPerda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("motivos_perda").update({ ativo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["motivos_perda"] }),
  });
}
