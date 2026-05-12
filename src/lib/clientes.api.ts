import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Cliente } from "./types";

// ============= Mappers =============
type DbCliente = {
  id: string;
  nome: string;
  tipo: string;
  documento: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  segmento: string;
  origem: string;
  concessionaria: string | null;
  grupo_tarifario: string | null;
  consumo_medio: number | null;
  tarifa: number | null;
  rede: string | null;
  uc: string | null;
  ativo: boolean;
  observacoes: string | null;
  consultor_id: string | null;
  created_at: string;
};

export function dbToCliente(r: DbCliente): Cliente {
  return {
    id: r.id,
    nome: r.nome,
    tipo: (r.tipo as Cliente["tipo"]) ?? "pf",
    documento: r.documento ?? "",
    telefone: r.telefone ?? "",
    whatsapp: r.whatsapp ?? "",
    email: r.email ?? "",
    endereco: {
      cep: r.cep ?? "",
      rua: r.rua ?? "",
      numero: r.numero ?? "",
      bairro: r.bairro ?? "",
      cidade: r.cidade ?? "",
      uf: r.uf ?? "",
    },
    segmento: r.segmento as Cliente["segmento"],
    origem: r.origem as Cliente["origem"],
    concessionaria: r.concessionaria ?? "",
    grupoTarifario: r.grupo_tarifario ?? "",
    consumoMedio: Number(r.consumo_medio ?? 0),
    tarifa: Number(r.tarifa ?? 0),
    rede: (r.rede as Cliente["rede"]) ?? "monofasico",
    uc: r.uc ?? "",
    ativo: r.ativo,
    observacoes: r.observacoes ?? undefined,
    criadoEm: r.created_at,
  };
}

function clienteToDb(c: Partial<Omit<Cliente, "id" | "criadoEm">>) {
  const out: Record<string, unknown> = {};
  if (c.nome !== undefined) out.nome = c.nome;
  if (c.tipo !== undefined) out.tipo = c.tipo;
  if (c.documento !== undefined) out.documento = c.documento;
  if (c.telefone !== undefined) out.telefone = c.telefone;
  if (c.whatsapp !== undefined) out.whatsapp = c.whatsapp;
  if (c.email !== undefined) out.email = c.email;
  if (c.endereco) {
    out.cep = c.endereco.cep;
    out.rua = c.endereco.rua;
    out.numero = c.endereco.numero;
    out.bairro = c.endereco.bairro;
    out.cidade = c.endereco.cidade;
    out.uf = c.endereco.uf;
  }
  if (c.segmento !== undefined) out.segmento = c.segmento;
  if (c.origem !== undefined) out.origem = c.origem;
  if (c.concessionaria !== undefined) out.concessionaria = c.concessionaria;
  if (c.grupoTarifario !== undefined) out.grupo_tarifario = c.grupoTarifario;
  if (c.consumoMedio !== undefined) out.consumo_medio = c.consumoMedio;
  if (c.tarifa !== undefined) out.tarifa = c.tarifa;
  if (c.rede !== undefined) out.rede = c.rede;
  if (c.uc !== undefined) out.uc = c.uc;
  if (c.ativo !== undefined) out.ativo = c.ativo;
  if (c.observacoes !== undefined) out.observacoes = c.observacoes;
  return out;
}

// ============= Queries =============
const KEY = ["clientes"] as const;

export function useClientesQuery() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Cliente[]> => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => dbToCliente(r as DbCliente));
    },
  });
}

export function useClienteQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["clientes", id],
    enabled: !!id,
    queryFn: async (): Promise<Cliente | null> => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data ? dbToCliente(data as DbCliente) : null;
    },
  });
}

// ============= Mutations =============
export function useAddCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Cliente, "id" | "criadoEm">) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      const payload = {
        ...clienteToDb(input),
        consultor_id: uid,
        created_by: uid,
      };
      const { data, error } = await supabase
        .from("clientes")
        .insert(payload as never)
        .select("*")
        .single();
      if (error) throw error;
      return dbToCliente(data as DbCliente);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Cliente> }) => {
      const { data, error } = await supabase
        .from("clientes")
        .update(clienteToDb(patch) as never)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return dbToCliente(data as DbCliente);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["clientes", vars.id] });
    },
  });
}

export function useDeleteCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
