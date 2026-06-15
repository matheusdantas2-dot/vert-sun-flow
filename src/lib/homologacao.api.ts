import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  HomologacaoProcesso,
  HomologacaoTipo,
  HomologacaoEtapa,
  HomologacaoDoc,
  HomologacaoDadosCliente,
} from "@/lib/types";
import { DOCS_POR_TIPO } from "@/lib/types";

type DbRow = {
  id: string;
  token: string;
  tipo: string;
  etapa: string;
  cliente_id: string;
  card_id: string | null;
  consultor_id: string | null;
  potencia_kwp: number | string | null;
  uc: string;
  concessionaria: string;
  endereco_instalacao: string;
  processo_original_numero: string | null;
  processo_original_data: string | null;
  data_protocolo: string | null;
  numero_protocolo: string | null;
  data_previsao_resposta: string | null;
  data_aprovacao: string | null;
  data_medidor: string | null;
  dados_cliente: Record<string, unknown> | null;
  documentos: HomologacaoDoc[] | null;
  observacoes_internas: string | null;
  mensagem_cliente: string | null;
  created_at: string;
  updated_at: string;
};

const TBL = "homologacoes" as never;

function fromDb(r: DbRow): HomologacaoProcesso {
  return {
    id: r.id,
    token: r.token,
    tipo: r.tipo as HomologacaoTipo,
    etapa: r.etapa as HomologacaoEtapa,
    clienteId: r.cliente_id,
    cardId: r.card_id ?? undefined,
    consultorId: r.consultor_id ?? undefined,
    potenciaKwp: r.potencia_kwp != null ? Number(r.potencia_kwp) : undefined,
    uc: r.uc,
    concessionaria: r.concessionaria,
    enderecoInstalacao: r.endereco_instalacao,
    processoOriginalNumero: r.processo_original_numero ?? undefined,
    processoOriginalData: r.processo_original_data ?? undefined,
    dataProtocolo: r.data_protocolo ?? undefined,
    numeroProtocolo: r.numero_protocolo ?? undefined,
    dataPrevisaoResposta: r.data_previsao_resposta ?? undefined,
    dataAprovacao: r.data_aprovacao ?? undefined,
    dataMedidor: r.data_medidor ?? undefined,
    documentos: (r.documentos ?? []) as HomologacaoDoc[],
    dadosCliente: (r.dados_cliente ?? {}) as HomologacaoDadosCliente,
    observacoesInternas: r.observacoes_internas ?? undefined,
    mensagemCliente: r.mensagem_cliente ?? undefined,
    criadoEm: r.created_at,
    atualizadoEm: r.updated_at,
  };
}

function toDb(p: Partial<HomologacaoProcesso>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (p.token !== undefined) o.token = p.token;
  if (p.tipo !== undefined) o.tipo = p.tipo;
  if (p.etapa !== undefined) o.etapa = p.etapa;
  if (p.clienteId !== undefined) o.cliente_id = p.clienteId;
  if (p.cardId !== undefined) o.card_id = p.cardId ?? null;
  if (p.consultorId !== undefined) o.consultor_id = p.consultorId ?? null;
  if (p.potenciaKwp !== undefined) o.potencia_kwp = p.potenciaKwp ?? null;
  if (p.uc !== undefined) o.uc = p.uc;
  if (p.concessionaria !== undefined) o.concessionaria = p.concessionaria;
  if (p.enderecoInstalacao !== undefined) o.endereco_instalacao = p.enderecoInstalacao;
  if (p.processoOriginalNumero !== undefined) o.processo_original_numero = p.processoOriginalNumero ?? null;
  if (p.processoOriginalData !== undefined) o.processo_original_data = p.processoOriginalData ?? null;
  if (p.dataProtocolo !== undefined) o.data_protocolo = p.dataProtocolo ?? null;
  if (p.numeroProtocolo !== undefined) o.numero_protocolo = p.numeroProtocolo ?? null;
  if (p.dataPrevisaoResposta !== undefined) o.data_previsao_resposta = p.dataPrevisaoResposta ?? null;
  if (p.dataAprovacao !== undefined) o.data_aprovacao = p.dataAprovacao ?? null;
  if (p.dataMedidor !== undefined) o.data_medidor = p.dataMedidor ?? null;
  if (p.dadosCliente !== undefined) o.dados_cliente = p.dadosCliente;
  if (p.documentos !== undefined) o.documentos = p.documentos;
  if (p.observacoesInternas !== undefined) o.observacoes_internas = p.observacoesInternas ?? null;
  if (p.mensagemCliente !== undefined) o.mensagem_cliente = p.mensagemCliente ?? null;
  return o;
}

export function gerarTokenHomologacao(len = 24) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

export function urlPortalHomologacao(token: string) {
  return `${window.location.origin}/homologacao/${token}`;
}

export interface HomologacaoFiltros {
  etapa?: HomologacaoEtapa;
  tipo?: HomologacaoTipo;
  clienteId?: string;
  cardId?: string;
}

export function useHomologacoesQuery(filtros: HomologacaoFiltros = {}) {
  return useQuery({
    queryKey: ["homologacoes", filtros],
    queryFn: async (): Promise<HomologacaoProcesso[]> => {
      let q = supabase.from(TBL).select("*").order("created_at", { ascending: false });
      if (filtros.etapa) q = q.eq("etapa", filtros.etapa);
      if (filtros.tipo) q = q.eq("tipo", filtros.tipo);
      if (filtros.clienteId) q = q.eq("cliente_id", filtros.clienteId);
      if (filtros.cardId) q = q.eq("card_id", filtros.cardId);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as unknown as DbRow[]).map(fromDb);
    },
  });
}

export function useHomologacaoByToken(token: string | undefined) {
  return useQuery({
    queryKey: ["homologacao_token", token],
    enabled: !!token,
    queryFn: async (): Promise<HomologacaoProcesso | null> => {
      if (!token) return null;
      const { data, error } = await supabase
        .from(TBL)
        .select("*")
        .eq("token", token)
        .maybeSingle();
      if (error) throw error;
      return data ? fromDb(data as unknown as DbRow) : null;
    },
  });
}

export function useAddHomologacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<Partial<HomologacaoProcesso>, "documentos"> & {
        tipo: HomologacaoTipo;
        clienteId: string;
        uc: string;
        enderecoInstalacao: string;
      },
    ) => {
      const docs: HomologacaoDoc[] = DOCS_POR_TIPO[input.tipo].map((d, i) => ({
        id: crypto.randomUUID(),
        nome: d.nome,
        obrigatorio: d.obrigatorio,
        status: "pendente",
      }));
      const payload = toDb({
        ...input,
        token: gerarTokenHomologacao(24),
        etapa: input.etapa ?? "documentacao",
        concessionaria: input.concessionaria ?? "COELBA",
        documentos: docs,
        dadosCliente: input.dadosCliente ?? {},
      });
      const { data, error } = await supabase
        .from(TBL)
        .insert(payload as never)
        .select()
        .single();
      if (error) throw error;
      return fromDb(data as unknown as DbRow);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["homologacoes"] }),
  });
}

export function useUpdateHomologacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<HomologacaoProcesso> }) => {
      const { error } = await supabase
        .from(TBL)
        .update(toDb(patch) as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ["homologacoes"] });
      qc.invalidateQueries({ queryKey: ["homologacao_token"] });
      void vars;
    },
  });
}

/** Update via token público (portal do cliente). */
export function useUpdateHomologacaoByToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ token, patch }: { token: string; patch: Partial<HomologacaoProcesso> }) => {
      const { error } = await supabase
        .from(TBL)
        .update(toDb(patch) as never)
        .eq("token", token);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["homologacao_token"] }),
  });
}

export interface UploadDocArgs {
  token: string;
  processoId: string;
  docId: string;
  file: File;
  documentos: HomologacaoDoc[];
}

export function useUploadDocHomologacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: UploadDocArgs) => {
      const ext = args.file.name.split(".").pop() || "bin";
      const safe = args.file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
      const path = `${args.token}/${args.docId}-${Date.now()}.${ext}.${safe}`;
      const up = await supabase.storage
        .from("homologacao-docs")
        .upload(path, args.file, { contentType: args.file.type || undefined, upsert: true });
      if (up.error) throw up.error;

      const novos = args.documentos.map((d) =>
        d.id === args.docId
          ? {
              ...d,
              status: "recebido" as const,
              arquivoPath: path,
              arquivoNome: args.file.name,
              enviadoEm: new Date().toISOString(),
              observacao: undefined,
            }
          : d,
      );
      const { error } = await supabase
        .from(TBL)
        .update({ documentos: novos } as never)
        .eq("token", args.token);
      if (error) throw error;
      return novos;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["homologacao_token"] });
      qc.invalidateQueries({ queryKey: ["homologacoes"] });
    },
  });
}

export async function signedUrlDoc(path: string, seconds = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("homologacao-docs")
    .createSignedUrl(path, seconds);
  if (error) return null;
  return data.signedUrl;
}

export function useDeleteHomologacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TBL).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["homologacoes"] }),
  });
}
