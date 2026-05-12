import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Proposta, PropostaItem, PropostaStatus } from "./types";

type DbProposta = {
  id: string;
  numero: string;
  cliente_id: string;
  consultor_id: string | null;
  status: string;
  validade_ate: string;
  irradiacao: number | string | null;
  eficiencia: number | string | null;
  cobertura: number | string | null;
  inflacao: number | string | null;
  taxa_financiamento: number | string | null;
  taxa_cartao: number | string | null;
  observacoes: string | null;
  versao: number;
  created_at: string;
};

type DbPropostaItem = {
  id: string;
  proposta_id: string;
  produto_id: string | null;
  quantidade: number | string;
  preco_unitario: number | string;
  ordem: number;
};

function dbToProposta(p: DbProposta, items: DbPropostaItem[]): Proposta {
  return {
    id: p.id,
    numero: p.numero,
    clienteId: p.cliente_id,
    consultorId: p.consultor_id ?? "",
    criadoEm: p.created_at,
    validadeAte: p.validade_ate,
    status: p.status as PropostaStatus,
    itens: items
      .filter((it) => it.proposta_id === p.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map<PropostaItem>((it) => ({
        produtoId: it.produto_id ?? "",
        quantidade: Number(it.quantidade ?? 0),
        precoUnitario: Number(it.preco_unitario ?? 0),
      })),
    irradiacao: Number(p.irradiacao ?? 5),
    eficiencia: Number(p.eficiencia ?? 0.8),
    cobertura: Number(p.cobertura ?? 1),
    inflacao: Number(p.inflacao ?? 8),
    taxaFinanciamento: Number(p.taxa_financiamento ?? 1.49),
    taxaCartao: Number(p.taxa_cartao ?? 2.99),
    versao: p.versao,
    observacoes: p.observacoes ?? undefined,
  };
}

const KEY = ["propostas"] as const;

export function usePropostasQuery() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Proposta[]> => {
      const [{ data: pData, error: pErr }, { data: iData, error: iErr }] = await Promise.all([
        supabase.from("propostas").select("*").order("created_at", { ascending: false }),
        supabase.from("proposta_itens").select("*"),
      ]);
      if (pErr) throw pErr;
      if (iErr) throw iErr;
      const items = (iData ?? []) as DbPropostaItem[];
      return ((pData ?? []) as DbProposta[]).map((p) => dbToProposta(p, items));
    },
  });
}

async function nextNumero(): Promise<string> {
  const ano = new Date().getFullYear();
  const { count } = await supabase
    .from("propostas")
    .select("*", { count: "exact", head: true });
  const seq = ((count ?? 0) + 1).toString().padStart(4, "0");
  return `VRT-${ano}-${seq}`;
}

export function useAddProposta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<Proposta, "id" | "criadoEm" | "numero" | "versao">,
    ): Promise<Proposta> => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;
      const numero = await nextNumero();
      const { data: created, error } = await supabase
        .from("propostas")
        .insert({
          numero,
          cliente_id: input.clienteId,
          consultor_id: input.consultorId || uid,
          status: input.status,
          validade_ate: input.validadeAte,
          irradiacao: input.irradiacao,
          eficiencia: input.eficiencia,
          cobertura: input.cobertura,
          inflacao: input.inflacao,
          taxa_financiamento: input.taxaFinanciamento,
          taxa_cartao: input.taxaCartao,
          observacoes: input.observacoes ?? null,
          versao: 1,
        } as never)
        .select("*")
        .single();
      if (error) throw error;
      const proposta = created as DbProposta;
      if (input.itens.length > 0) {
        const rows = input.itens.map((it, idx) => ({
          proposta_id: proposta.id,
          produto_id: it.produtoId,
          quantidade: it.quantidade,
          preco_unitario: it.precoUnitario,
          ordem: idx,
        }));
        const { error: iErr } = await supabase.from("proposta_itens").insert(rows as never);
        if (iErr) throw iErr;
      }
      const { data: itens } = await supabase
        .from("proposta_itens")
        .select("*")
        .eq("proposta_id", proposta.id);
      return dbToProposta(proposta, (itens ?? []) as DbPropostaItem[]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdatePropostaStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PropostaStatus }) => {
      const { error } = await supabase
        .from("propostas")
        .update({ status } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteProposta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("proposta_itens").delete().eq("proposta_id", id);
      const { error } = await supabase.from("propostas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
