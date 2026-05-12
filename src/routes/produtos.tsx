import { createFileRoute } from "@tanstack/react-router";
import { brl } from "@/lib/format";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Produto, ProdutoCategoria } from "@/lib/types";
import { usePode } from "@/lib/permissoes";
import {
  useProdutosQuery,
  useAddProduto,
  useUpdateProduto,
  useDeleteProduto,
} from "@/lib/produtos.api";

export const Route = createFileRoute("/produtos")({
  component: Produtos,
  head: () => ({ meta: [{ title: "Produtos — Vert CRM" }] }),
});

const CAT_LABEL: Record<ProdutoCategoria, string> = {
  modulo: "Módulos",
  inversor: "Inversores",
  estrutura: "Estruturas",
  cabeamento: "Cabeamento/Elétrica",
  servico: "Serviços",
};

function Produtos() {
  const { data: produtos = [] } = useProdutosQuery();
  const addProdutoM = useAddProduto();
  const updateProdutoM = useUpdateProduto();
  const deleteProdutoM = useDeleteProduto();
  const podeEditar = usePode("editar_produto");
  const podeVerMargem = usePode("ver_margem");

  const [filterCat, setFilterCat] = useState<ProdutoCategoria | "">("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);

  const filtered = filterCat ? produtos.filter((p) => p.categoria === filterCat) : produtos;

  const inp = "w-full h-9 px-3 rounded-lg bg-muted border border-transparent focus:bg-card focus:border-vert-light text-sm outline-none";

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1500px] mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Produtos & Serviços</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{produtos.length} itens no catálogo</p>
        </div>
        {podeEditar && (
          <button onClick={() => { setEditing(null); setOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            <Plus className="h-4 w-4" /> Novo item
          </button>
        )}
      </header>

      <div className="flex gap-2 flex-wrap">
        {(["", "modulo", "inversor", "estrutura", "cabeamento", "servico"] as const).map((c) => (
          <button key={c || "all"} onClick={() => setFilterCat(c)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${filterCat === c ? "bg-vert-dark text-white border-vert-dark" : "border-border hover:bg-accent"}`}>
            {c === "" ? "Todos" : CAT_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Item</th>
                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Categoria</th>
                <th className="text-right font-semibold px-4 py-3 hidden md:table-cell">{podeVerMargem ? "Custo" : ""}</th>
                <th className="text-right font-semibold px-4 py-3">Venda</th>
                <th className="text-right font-semibold px-4 py-3">{podeVerMargem ? "Margem" : ""}</th>
                <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Unidade</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const margem = p.precoVenda > 0 ? ((p.precoVenda - p.precoCusto) / p.precoVenda) * 100 : 0;
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-accent/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{p.nome}</div>
                      {p.fabricante && <div className="text-[11px] text-muted-foreground">{p.fabricante}{p.potenciaW ? ` · ${p.potenciaW}W` : p.potenciaKw ? ` · ${p.potenciaKw}kW` : ""}</div>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{CAT_LABEL[p.categoria]}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-right tabular-nums">{podeVerMargem ? brl(p.precoCusto) : ""}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{brl(p.precoVenda)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {podeVerMargem ? <span className={margem >= 30 ? "text-vert font-semibold" : "text-amber-700"}>{margem.toFixed(0)}%</span> : ""}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{p.unidade}</td>
                    <td className="px-4 py-3 text-right">
                      {podeEditar && <>
                        <button onClick={() => { setEditing(p); setOpen(true); }} className="text-xs font-semibold text-vert hover:underline mr-2">Editar</button>
                        <button onClick={() => { if (confirm("Excluir item?")) deleteProdutoM.mutate(p.id); }} className="text-rose-600 hover:text-rose-700"><Trash2 className="h-4 w-4 inline" /></button>
                      </>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <ProdutoForm
          produto={editing}
          onClose={() => setOpen(false)}
          onSave={(data) => {
            if (editing) updateProduto(editing.id, data);
            else addProduto(data);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ProdutoForm({ produto, onClose, onSave }: { produto: Produto | null; onClose: () => void; onSave: (data: Omit<Produto, "id">) => void }) {
  const [d, setD] = useState<Omit<Produto, "id">>(
    produto
      ? { ...produto }
      : { categoria: "modulo", nome: "", unidade: "unid", precoCusto: 0, precoVenda: 0, ativo: true },
  );
  const inp = "w-full h-9 px-3 rounded-lg bg-muted border border-transparent focus:bg-card focus:border-vert-light text-sm outline-none";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(d); }} className="bg-card rounded-xl shadow-2xl max-w-xl w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display font-bold text-lg mb-4">{produto ? "Editar" : "Novo"} item</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 block text-xs">Nome<input className={inp + " mt-1"} value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} required /></label>
          <label className="block text-xs">Categoria<select className={inp + " mt-1"} value={d.categoria} onChange={(e) => setD({ ...d, categoria: e.target.value as ProdutoCategoria })}><option value="modulo">Módulo</option><option value="inversor">Inversor</option><option value="estrutura">Estrutura</option><option value="cabeamento">Cabeamento</option><option value="servico">Serviço</option></select></label>
          <label className="block text-xs">Unidade<select className={inp + " mt-1"} value={d.unidade} onChange={(e) => setD({ ...d, unidade: e.target.value as Produto["unidade"] })}><option value="unid">Unidade</option><option value="metro">Metro</option><option value="kWp">kWp</option><option value="hora">Hora</option><option value="mes">Mês</option><option value="ano">Ano</option></select></label>
          <label className="block text-xs">Fabricante<input className={inp + " mt-1"} value={d.fabricante ?? ""} onChange={(e) => setD({ ...d, fabricante: e.target.value })} /></label>
          <label className="block text-xs">Garantia (anos)<input type="number" className={inp + " mt-1"} value={d.garantiaAnos ?? ""} onChange={(e) => setD({ ...d, garantiaAnos: +e.target.value || undefined })} /></label>
          <label className="block text-xs">Potência (W)<input type="number" className={inp + " mt-1"} value={d.potenciaW ?? ""} onChange={(e) => setD({ ...d, potenciaW: +e.target.value || undefined })} /></label>
          <label className="block text-xs">Potência (kW)<input type="number" step="0.1" className={inp + " mt-1"} value={d.potenciaKw ?? ""} onChange={(e) => setD({ ...d, potenciaKw: +e.target.value || undefined })} /></label>
          <label className="block text-xs">Preço de custo<input type="number" step="0.01" className={inp + " mt-1"} value={d.precoCusto || ""} onChange={(e) => setD({ ...d, precoCusto: +e.target.value })} /></label>
          <label className="block text-xs">Preço de venda<input type="number" step="0.01" className={inp + " mt-1"} value={d.precoVenda || ""} onChange={(e) => setD({ ...d, precoVenda: +e.target.value })} /></label>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent">Cancelar</button>
          <button type="submit" className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Salvar</button>
        </div>
      </form>
    </div>
  );
}
