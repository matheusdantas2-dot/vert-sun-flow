import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ETAPA_ORDEM } from "@/lib/portalCliente";
import type { EtapaProjetoId, EtapaStatus } from "@/lib/types";

export type EtapaRow = {
  id: string;
  projeto_id: string;
  etapa_id: EtapaProjetoId;
  status: EtapaStatus;
  ordem: number;
  data_prevista: string | null;
  data_real: string | null;
  observacoes_internas: string | null;
  extra: Record<string, any>;
};

export type ProjetoRow = {
  id: string;
  card_id: string;
  cliente_id: string;
  consultor_id: string | null;
  tecnico_id: string | null;
  potencia_kwp: number;
  valor_investimento: number;
  token_publico: string;
  token_ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjetoCompleto = {
  projeto: ProjetoRow;
  etapas: EtapaRow[];
};

const KEY = ["projetos"] as const;

async function fetchProjetoCompleto(cardId: string): Promise<ProjetoCompleto | null> {
  const { data: p, error } = await supabase
    .from("projetos")
    .select("*")
    .eq("card_id", cardId)
    .maybeSingle();
  if (error) throw error;
  if (!p) return null;
  const { data: et, error: eErr } = await supabase
    .from("etapas_projeto")
    .select("*")
    .eq("projeto_id", p.id)
    .order("ordem");
  if (eErr) throw eErr;
  return { projeto: p as ProjetoRow, etapas: (et ?? []) as EtapaRow[] };
}

export function useProjetoByCardId(cardId: string | undefined) {
  return useQuery({
    queryKey: ["projetos", "card", cardId],
    enabled: !!cardId,
    queryFn: () => fetchProjetoCompleto(cardId!),
  });
}

export function useProjetosRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("projetos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "projetos" }, () =>
        qc.invalidateQueries({ queryKey: KEY }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "etapas_projeto" }, () =>
        qc.invalidateQueries({ queryKey: KEY }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
}

export function useCriarProjeto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      cardId,
      clienteId,
      consultorId,
      potenciaKwp,
      valorInvestimento,
      concessionariaNome,
    }: {
      cardId: string;
      clienteId: string;
      consultorId: string | null;
      potenciaKwp: number;
      valorInvestimento: number;
      concessionariaNome?: string;
    }) => {
      const { data: pj, error } = await supabase
        .from("projetos")
        .insert({
          card_id: cardId,
          cliente_id: clienteId,
          consultor_id: consultorId,
          potencia_kwp: potenciaKwp,
          valor_investimento: valorInvestimento,
        })
        .select()
        .single();
      if (error) throw error;

      const hoje = new Date().toISOString();
      const etapas = ETAPA_ORDEM.map((id, idx) => ({
        projeto_id: pj.id,
        etapa_id: id,
        ordem: idx,
        status: idx === 0 ? "concluida" : idx === 1 ? "em_andamento" : "pendente",
        data_real: idx === 0 ? hoje : null,
        extra: id === "homologacao" ? { concessionariaNome: concessionariaNome ?? "" } : {},
      }));
      const { error: eErr } = await supabase.from("etapas_projeto").insert(etapas);
      if (eErr) throw eErr;
      return pj as ProjetoRow;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["projetos", "card", vars.cardId] });
    },
  });
}

export function useUpdateEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      etapaRowId,
      patch,
      mergeExtra,
    }: {
      etapaRowId: string;
      patch?: Partial<Omit<EtapaRow, "id" | "projeto_id" | "etapa_id" | "ordem" | "extra">>;
      mergeExtra?: Record<string, any>;
    }) => {
      const out: Record<string, unknown> = { ...(patch ?? {}) };
      if (mergeExtra) {
        const { data: cur } = await supabase
          .from("etapas_projeto")
          .select("extra")
          .eq("id", etapaRowId)
          .single();
        out.extra = { ...((cur?.extra as Record<string, any>) ?? {}), ...mergeExtra };
      }
      const { error } = await supabase
        .from("etapas_projeto")
        .update(out as never)
        .eq("id", etapaRowId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRegenerarToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projetoId: string) => {
      const novoToken =
        crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const { error } = await supabase
        .from("projetos")
        .update({ token_publico: novoToken, token_ativo: true })
        .eq("id", projetoId);
      if (error) throw error;
      return novoToken;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRemoverProjeto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projetoId: string) => {
      await supabase.from("etapas_projeto").delete().eq("projeto_id", projetoId);
      const { error } = await supabase.from("projetos").delete().eq("id", projetoId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

// Portal público (anônimo) — usa RPC SECURITY DEFINER
export type ProjetoPublico = {
  projeto: ProjetoRow;
  cliente: any;
  consultor: any | null;
  etapas: EtapaRow[];
  empresa: { razaoSocial?: string; telefone?: string; email?: string; cnpj?: string; endereco?: string };
};

export function useProjetoPublico(token: string | undefined) {
  return useQuery({
    queryKey: ["projeto_publico", token],
    enabled: !!token,
    queryFn: async (): Promise<ProjetoPublico | null> => {
      const { data, error } = await supabase.rpc("get_projeto_publico", { p_token: token! });
      if (error) throw error;
      return (data as ProjetoPublico | null) ?? null;
    },
  });
}
