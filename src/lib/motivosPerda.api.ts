import { useQuery } from "@tanstack/react-query";
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
