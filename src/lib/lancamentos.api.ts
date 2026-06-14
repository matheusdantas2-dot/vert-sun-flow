import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  type Lancamento,
  type LancamentoStatus,
  type LancamentoTipo,
  type ContaFinanceiraId,
  type ModoRecebimento,
  type DespesaFixa,
  type DespesaFixaFrequencia,
  type CategoriaFinanceira,
  MODO_RECEBIMENTO_LABEL,
  DESPESA_FIXA_FREQUENCIA_LABEL,
} from "@/lib/types";


type DbLanc = {
  id: string;
  conta: string;
  tipo: string;
  descricao: string;
  valor: number | string;
  categoria: string;
  data_vencimento: string;
  data_realizacao: string | null;
  status: string;
  card_id: string | null;
  proposta_id: string | null;
  cliente_id: string | null;
  conta_destino: string | null;
  modo_recebimento: string | null;
  parcela_numero: number | null;
  parcela_total: number | null;
  observacoes: string | null;
  created_at: string;
};

function fromDb(r: DbLanc): Lancamento {
  return {
    id: r.id,
    conta: r.conta as ContaFinanceiraId,
    tipo: r.tipo as LancamentoTipo,
    descricao: r.descricao,
    valor: Number(r.valor),
    categoria: r.categoria,
    dataVencimento: r.data_vencimento,
    dataRealizacao: r.data_realizacao ?? undefined,
    status: r.status as LancamentoStatus,
    cardId: r.card_id ?? undefined,
    propostaId: r.proposta_id ?? undefined,
    clienteId: r.cliente_id ?? undefined,
    contaDestino: (r.conta_destino ?? undefined) as ContaFinanceiraId | undefined,
    modoRecebimento: (r.modo_recebimento ?? undefined) as ModoRecebimento | undefined,
    parcelaNumero: r.parcela_numero ?? undefined,
    parcelaTotal: r.parcela_total ?? undefined,
    observacoes: r.observacoes ?? undefined,
    criadoEm: r.created_at,
  };
}

function toDb(p: Partial<Lancamento>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (p.conta !== undefined) o.conta = p.conta;
  if (p.tipo !== undefined) o.tipo = p.tipo;
  if (p.descricao !== undefined) o.descricao = p.descricao;
  if (p.valor !== undefined) o.valor = p.valor;
  if (p.categoria !== undefined) o.categoria = p.categoria;
  if (p.dataVencimento !== undefined) o.data_vencimento = p.dataVencimento;
  if (p.dataRealizacao !== undefined) o.data_realizacao = p.dataRealizacao ?? null;
  if (p.status !== undefined) o.status = p.status;
  if (p.cardId !== undefined) o.card_id = p.cardId ?? null;
  if (p.propostaId !== undefined) o.proposta_id = p.propostaId ?? null;
  if (p.clienteId !== undefined) o.cliente_id = p.clienteId ?? null;
  if (p.contaDestino !== undefined) o.conta_destino = p.contaDestino ?? null;
  if (p.modoRecebimento !== undefined) o.modo_recebimento = p.modoRecebimento ?? null;
  if (p.parcelaNumero !== undefined) o.parcela_numero = p.parcelaNumero ?? null;
  if (p.parcelaTotal !== undefined) o.parcela_total = p.parcelaTotal ?? null;
  if (p.observacoes !== undefined) o.observacoes = p.observacoes ?? null;
  return o;
}

export interface LancamentosFiltros {
  conta?: ContaFinanceiraId;
  tipo?: LancamentoTipo;
  status?: LancamentoStatus;
  cardId?: string;
  de?: string;
  ate?: string;
}

export function useLancamentosQuery(filtros: LancamentosFiltros = {}) {
  return useQuery({
    queryKey: ["lancamentos", filtros],
    queryFn: async (): Promise<Lancamento[]> => {
      let q = supabase.from("lancamentos").select("*").order("data_vencimento", { ascending: false });
      if (filtros.conta) q = q.eq("conta", filtros.conta);
      if (filtros.tipo) q = q.eq("tipo", filtros.tipo);
      if (filtros.status) q = q.eq("status", filtros.status);
      if (filtros.cardId) q = q.eq("card_id", filtros.cardId);
      if (filtros.de) q = q.gte("data_vencimento", filtros.de);
      if (filtros.ate) q = q.lte("data_vencimento", filtros.ate);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => fromDb(r as DbLanc));
    },
  });
}

export function useLancamentosRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("lancamentos_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lancamentos" },
        () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
}

export function useAddLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Lancamento>) => {
      const { data, error } = await supabase
        .from("lancamentos")
        .insert(toDb(input) as never)
        .select()
        .single();
      if (error) throw error;
      return fromDb(data as DbLanc);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}

export function useAddLancamentosBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lista: Partial<Lancamento>[]) => {
      if (!lista.length) return [];
      const payload = lista.map((l) => toDb(l));
      const { data, error } = await supabase
        .from("lancamentos")
        .insert(payload as never)
        .select();
      if (error) throw error;
      return (data ?? []).map((r) => fromDb(r as DbLanc));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}

export function useUpdateLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Lancamento> }) => {
      const { error } = await supabase
        .from("lancamentos")
        .update(toDb(patch) as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}

export function useDeleteLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lancamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}

export function gerarParcelasRecebimento(opts: {
  valor: number;
  modo: ModoRecebimento;
  cardId: string;
  propostaId?: string;
  clienteId: string;
  descricaoBase: string;
  dataReferencia?: Date;
}): Partial<Lancamento>[] {
  const base = opts.dataReferencia ?? new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const addDias = (d: Date, dias: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + dias);
    return r;
  };

  const comum: Partial<Lancamento> = {
    conta: "vert_pj",
    tipo: "receita",
    categoria: "projeto_solar",
    cardId: opts.cardId,
    propostaId: opts.propostaId,
    clienteId: opts.clienteId,
    modoRecebimento: opts.modo,
    status: "previsto",
  };

  switch (opts.modo) {
    case "avista":
      return [{
        ...comum,
        descricao: `${opts.descricaoBase} — À vista`,
        valor: +(opts.valor * 0.95).toFixed(2),
        dataVencimento: iso(base),
        parcelaNumero: 1,
        parcelaTotal: 1,
      }];
    case "50_30_20":
      return [
        { ...comum, descricao: `${opts.descricaoBase} — Entrada (50%)`, valor: +(opts.valor * 0.5).toFixed(2), dataVencimento: iso(base), parcelaNumero: 1, parcelaTotal: 3 },
        { ...comum, descricao: `${opts.descricaoBase} — Entrega (30%)`, valor: +(opts.valor * 0.3).toFixed(2), dataVencimento: iso(addDias(base, 30)), parcelaNumero: 2, parcelaTotal: 3 },
        { ...comum, descricao: `${opts.descricaoBase} — Final (20%)`, valor: +(opts.valor * 0.2).toFixed(2), dataVencimento: iso(addDias(base, 60)), parcelaNumero: 3, parcelaTotal: 3 },
      ];
    case "cartao_credito":
      return [{
        ...comum,
        descricao: `${opts.descricaoBase} — Cartão de crédito`,
        valor: opts.valor,
        dataVencimento: iso(addDias(base, 30)),
        parcelaNumero: 1,
        parcelaTotal: 1,
      }];
    case "financiado_sol_agora":
    case "financiado_eos":
    case "financiado_77sol":
    case "financiado_bnb": {
      const nome = MODO_RECEBIMENTO_LABEL[opts.modo].replace("Financiado — ", "");
      return [{
        ...comum,
        descricao: `${opts.descricaoBase} — Repasse ${nome}`,
        valor: opts.valor,
        dataVencimento: iso(addDias(base, 20)),
        parcelaNumero: 1,
        parcelaTotal: 1,
        observacoes: `Aguardar liberação do crédito pela ${nome}. Prazo estimado: 15-30 dias.`,
      }];
    }
    default:
      return [];
  }
}

// ─── DESPESAS FIXAS RECORRENTES ─────────────────────────────────────────────

type DbDespFixa = {
  id: string;
  conta: string;
  descricao: string;
  valor: number | string;
  categoria: string;
  frequencia: string;
  dia_vencimento: number;
  ativa: boolean;
  proximo_vencimento: string;
  observacoes: string | null;
  created_at: string;
};

function fromDbDF(r: DbDespFixa): DespesaFixa {
  return {
    id: r.id,
    conta: r.conta as ContaFinanceiraId,
    descricao: r.descricao,
    valor: Number(r.valor),
    categoria: r.categoria as CategoriaFinanceira,
    frequencia: r.frequencia as DespesaFixaFrequencia,
    diaVencimento: r.dia_vencimento,
    ativa: r.ativa,
    proximoVencimento: r.proximo_vencimento,
    observacoes: r.observacoes ?? undefined,
    criadoEm: r.created_at,
  };
}

function toDbDF(p: Partial<DespesaFixa>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (p.conta !== undefined) o.conta = p.conta;
  if (p.descricao !== undefined) o.descricao = p.descricao;
  if (p.valor !== undefined) o.valor = p.valor;
  if (p.categoria !== undefined) o.categoria = p.categoria;
  if (p.frequencia !== undefined) o.frequencia = p.frequencia;
  if (p.diaVencimento !== undefined) o.dia_vencimento = p.diaVencimento;
  if (p.ativa !== undefined) o.ativa = p.ativa;
  if (p.proximoVencimento !== undefined) o.proximo_vencimento = p.proximoVencimento;
  if (p.observacoes !== undefined) o.observacoes = p.observacoes ?? null;
  return o;
}

/**
 * Calcula a próxima data de vencimento a partir da frequência e do dia preferido.
 * Limita o dia em 28 para evitar problemas em fevereiro.
 */
export function calcularProximoVencimento(
  frequencia: DespesaFixaFrequencia,
  diaVencimento: number,
  referencia: Date = new Date(),
): string {
  const mesesPorFrequencia: Record<DespesaFixaFrequencia, number> = {
    mensal: 1,
    bimestral: 2,
    trimestral: 3,
    semestral: 6,
    anual: 12,
  };
  const dia = Math.min(Math.max(1, diaVencimento), 28);
  const hoje = new Date(referencia);
  hoje.setHours(0, 0, 0, 0);

  // Próximo vencimento neste mesmo mês, se o dia ainda não passou
  const candidato = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
  if (candidato >= hoje) {
    return candidato.toISOString().slice(0, 10);
  }
  // Caso contrário, soma o intervalo da frequência
  const meses = mesesPorFrequencia[frequencia];
  const r = new Date(hoje.getFullYear(), hoje.getMonth() + meses, dia);
  return r.toISOString().slice(0, 10);
}

/**
 * Gera lançamentos a partir das despesas fixas ativas cujo próximo vencimento
 * cai dentro do mês informado.
 */
export function gerarLancamentosDespesasFixas(
  despesas: DespesaFixa[],
  mes: Date = new Date(),
): Partial<Lancamento>[] {
  const inicio = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const fim = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const ini = iso(inicio);
  const end = iso(fim);

  return despesas
    .filter((d) => d.ativa && d.proximoVencimento >= ini && d.proximoVencimento <= end)
    .map((d) => ({
      conta: d.conta,
      tipo: "despesa" as LancamentoTipo,
      descricao: d.descricao,
      valor: d.valor,
      categoria: d.categoria,
      dataVencimento: d.proximoVencimento,
      status: "previsto" as LancamentoStatus,
      observacoes: `Gerado automaticamente — despesa fixa (${DESPESA_FIXA_FREQUENCIA_LABEL[d.frequencia]})`,
    }));
}

export function useDespesasFixasQuery() {
  return useQuery({
    queryKey: ["despesas_fixas"],
    queryFn: async (): Promise<DespesaFixa[]> => {
      const { data, error } = await supabase
        .from("despesas_fixas")
        .select("*")
        .order("proximo_vencimento", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => fromDbDF(r as DbDespFixa));
    },
  });
}

export function useAddDespesaFixa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<DespesaFixa> & { frequencia: DespesaFixaFrequencia; diaVencimento: number }) => {
      const proximo = input.proximoVencimento
        ?? calcularProximoVencimento(input.frequencia, input.diaVencimento);
      const payload = toDbDF({ ...input, proximoVencimento: proximo });
      const { data, error } = await supabase
        .from("despesas_fixas")
        .insert(payload as never)
        .select()
        .single();
      if (error) throw error;
      return fromDbDF(data as DbDespFixa);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["despesas_fixas"] }),
  });
}

export function useUpdateDespesaFixa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<DespesaFixa> }) => {
      const { error } = await supabase
        .from("despesas_fixas")
        .update(toDbDF(patch) as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["despesas_fixas"] }),
  });
}

export function useDeleteDespesaFixa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("despesas_fixas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["despesas_fixas"] }),
  });
}
