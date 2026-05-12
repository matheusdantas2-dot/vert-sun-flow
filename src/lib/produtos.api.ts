import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Produto, ProdutoCategoria } from "./types";

type DbProduto = {
  id: string;
  categoria: string;
  nome: string;
  fabricante: string | null;
  potencia_w: number | string | null;
  potencia_kw: number | string | null;
  unidade: string;
  preco_custo: number | string;
  preco_venda: number | string;
  garantia_anos: number | null;
  detalhes: string | null;
  ativo: boolean;
};

export function dbToProduto(r: DbProduto): Produto {
  return {
    id: r.id,
    categoria: r.categoria as ProdutoCategoria,
    nome: r.nome,
    fabricante: r.fabricante ?? undefined,
    potenciaW: r.potencia_w != null ? Number(r.potencia_w) : undefined,
    potenciaKw: r.potencia_kw != null ? Number(r.potencia_kw) : undefined,
    unidade: r.unidade as Produto["unidade"],
    precoCusto: Number(r.preco_custo ?? 0),
    precoVenda: Number(r.preco_venda ?? 0),
    garantiaAnos: r.garantia_anos ?? undefined,
    detalhes: r.detalhes ?? undefined,
    ativo: r.ativo,
  };
}

function produtoToDb(p: Partial<Omit<Produto, "id">>) {
  const out: Record<string, unknown> = {};
  if (p.categoria !== undefined) out.categoria = p.categoria;
  if (p.nome !== undefined) out.nome = p.nome;
  if (p.fabricante !== undefined) out.fabricante = p.fabricante ?? null;
  if (p.potenciaW !== undefined) out.potencia_w = p.potenciaW ?? null;
  if (p.potenciaKw !== undefined) out.potencia_kw = p.potenciaKw ?? null;
  if (p.unidade !== undefined) out.unidade = p.unidade;
  if (p.precoCusto !== undefined) out.preco_custo = p.precoCusto;
  if (p.precoVenda !== undefined) out.preco_venda = p.precoVenda;
  if (p.garantiaAnos !== undefined) out.garantia_anos = p.garantiaAnos ?? null;
  if (p.detalhes !== undefined) out.detalhes = p.detalhes ?? null;
  if (p.ativo !== undefined) out.ativo = p.ativo;
  return out;
}

const KEY = ["produtos"] as const;

export function useProdutosQuery() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Produto[]> => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => dbToProduto(r as DbProduto));
    },
  });
}

export function useAddProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Produto, "id">) => {
      const { data, error } = await supabase
        .from("produtos")
        .insert(produtoToDb(input) as never)
        .select("*")
        .single();
      if (error) throw error;
      return dbToProduto(data as DbProduto);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Produto> }) => {
      const { error } = await supabase
        .from("produtos")
        .update(produtoToDb(patch) as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
