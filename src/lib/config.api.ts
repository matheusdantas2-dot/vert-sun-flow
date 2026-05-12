import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Empresa, Metas, SlaConfig } from "./types";

export interface ConfigGlobal {
  empresa: Partial<Empresa>;
  metas: Partial<Metas>;
  sla: SlaConfig;
}

const defaults: ConfigGlobal = {
  empresa: { razaoSocial: "", cnpj: "", endereco: "", telefone: "", email: "" },
  metas: { faturamentoMensal: 0, propostasMensais: 0, projetosMensais: 0, kwpMensais: 0 },
  sla: {},
};

export function useConfigGlobalQuery() {
  return useQuery({
    queryKey: ["config_global"],
    queryFn: async (): Promise<ConfigGlobal> => {
      const { data, error } = await supabase
        .from("config_global")
        .select("empresa, metas, sla")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return {
        empresa: { ...defaults.empresa, ...((data?.empresa as object) ?? {}) },
        metas: { ...defaults.metas, ...((data?.metas as object) ?? {}) },
        sla: { ...defaults.sla, ...((data?.sla as object) ?? {}) },
      };
    },
    staleTime: 60_000,
  });
}

export function useUpdateConfigGlobal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<ConfigGlobal>) => {
      const current = qc.getQueryData<ConfigGlobal>(["config_global"]) ?? defaults;
      const next: ConfigGlobal = {
        empresa: { ...current.empresa, ...(patch.empresa ?? {}) },
        metas: { ...current.metas, ...(patch.metas ?? {}) },
        sla: { ...current.sla, ...(patch.sla ?? {}) },
      };
      const { error } = await supabase
        .from("config_global")
        .upsert({ id: 1, empresa: next.empresa, metas: next.metas, sla: next.sla });
      if (error) throw error;
      return next;
    },
    onSuccess: (data) => {
      qc.setQueryData(["config_global"], data);
    },
  });
}
