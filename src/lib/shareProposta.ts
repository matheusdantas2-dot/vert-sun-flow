// Helpers para criar/listar links compartilhados de propostas.
import { supabase } from "@/integrations/supabase/client";

export interface ShareRow {
  id: string;
  token: string;
  proposta_id: string;
  proposta_numero: string;
  cliente_nome: string;
  pdf_path: string;
  criado_em: string;
  expira_em: string;
  ativo: boolean;
  total_aberturas: number;
  ultima_abertura: string | null;
}

export interface AberturaRow {
  id: string;
  share_id: string;
  proposta_id: string;
  aberto_em: string;
  ip: string | null;
  user_agent: string | null;
  referer: string | null;
}

function genToken(len = 24) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

export async function criarShareProposta(args: {
  propostaId: string;
  propostaNumero: string;
  clienteNome: string;
  pdfBlob: Blob;
  diasValidade?: number;
}): Promise<ShareRow> {
  const dias = args.diasValidade ?? 7;
  const token = genToken(24);
  const path = `${args.propostaId}/${token}.pdf`;

  const up = await supabase.storage
    .from("propostas-pdf")
    .upload(path, args.pdfBlob, { contentType: "application/pdf", upsert: true });
  if (up.error) throw up.error;

  const expira = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();

  const ins = await supabase
    .from("propostas_compartilhadas")
    .insert({
      token,
      proposta_id: args.propostaId,
      proposta_numero: args.propostaNumero,
      cliente_nome: args.clienteNome,
      pdf_path: path,
      expira_em: expira,
    })
    .select()
    .single();
  if (ins.error) throw ins.error;
  return ins.data as ShareRow;
}

export function urlShare(token: string) {
  return `${window.location.origin}/api/public/p/${token}`;
}

export async function listarSharesProposta(propostaId: string) {
  const { data, error } = await supabase
    .from("propostas_compartilhadas")
    .select("*")
    .eq("proposta_id", propostaId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ShareRow[];
}

export async function listarAberturas(propostaId: string) {
  const { data, error } = await supabase
    .from("proposta_aberturas")
    .select("*")
    .eq("proposta_id", propostaId)
    .order("aberto_em", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as AberturaRow[];
}

export async function revogarShare(id: string) {
  const { error } = await supabase
    .from("propostas_compartilhadas")
    .update({ ativo: false })
    .eq("id", id);
  if (error) throw error;
}
