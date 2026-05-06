import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { brl, brlPrec, dataBR, formatDoc, formatTel, initials, kwh } from "@/lib/format";
import { ORIGEM_LABEL, SEGMENTOS_LABEL } from "@/lib/types";
import { useState, useMemo } from "react";
import { Plus, Search, Phone, MessageCircle, ChevronRight } from "lucide-react";
import { ClienteFormModal } from "@/components/clientes/ClienteFormModal";

export const Route = createFileRoute("/clientes/")({
  component: ClientesList,
  head: () => ({ meta: [{ title: "Clientes — Vert CRM" }] }),
});

function ClientesList() {
  const clientes = useStore((s) => s.clientes);
  const cards = useStore((s) => s.cards);
  const propostas = useStore((s) => s.propostas);
  const produtos = useStore((s) => s.produtos);

  const [busca, setBusca] = useState("");
  const [filterSeg, setFilterSeg] = useState("");
  const [page, setPage] = useState(0);
  const [openForm, setOpenForm] = useState(false);
  const navigate = useNavigate();

  const PER_PAGE = 12;

  const filtered = useMemo(() => {
    return clientes.filter((c) => {
      if (filterSeg && c.segmento !== filterSeg) return false;
      if (busca) {
        const s = busca.toLowerCase();
        return (
          c.nome.toLowerCase().includes(s) ||
          c.endereco.cidade.toLowerCase().includes(s) ||
          c.documento.includes(s.replace(/\D/g, ""))
        );
      }
      return true;
    });
  }, [clientes, busca, filterSeg]);

  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const valorCliente = (id: string) =>
    propostas
      .filter((p) => p.clienteId === id && p.status === "aceita")
      .reduce(
        (a, p) =>
          a +
          p.itens.reduce((b, it) => {
            const prod = produtos.find((x) => x.id === it.produtoId);
            return b + (it.precoUnitario ?? prod?.precoVenda ?? 0) * it.quantidade;
          }, 0),
        0,
      );

  const exportCsv = () => {
    const rows = [
      ["Nome", "Documento", "Telefone", "E-mail", "Cidade", "UF", "Segmento", "Origem", "Consumo", "Tarifa"],
      ...filtered.map((c) => [
        c.nome,
        formatDoc(c.documento),
        formatTel(c.telefone),
        c.email,
        c.endereco.cidade,
        c.endereco.uf,
        SEGMENTOS_LABEL[c.segmento],
        ORIGEM_LABEL[c.origem],
        c.consumoMedio,
        brlPrec(c.tarifa),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `clientes-vert-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1500px] mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} clientes cadastrados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-accent">
            Exportar CSV
          </button>
          <button onClick={() => setOpenForm(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
            <Plus className="h-4 w-4" /> Novo cliente
          </button>
        </div>
      </header>

      <div className="bg-card rounded-xl border border-border p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPage(0); }}
            placeholder="Buscar por nome, cidade ou documento…"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted text-sm outline-none focus:bg-card border border-transparent focus:border-vert-light"
          />
        </div>
        <select value={filterSeg} onChange={(e) => { setFilterSeg(e.target.value); setPage(0); }} className="h-9 px-3 rounded-lg bg-muted text-sm outline-none border border-transparent focus:border-vert-light">
          <option value="">Todos segmentos</option>
          <option value="residencial">Residencial</option>
          <option value="comercial">Comercial</option>
          <option value="agronegocio">Agronegócio</option>
          <option value="industrial">Industrial</option>
        </select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Cliente</th>
                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Cidade</th>
                <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Segmento</th>
                <th className="text-right font-semibold px-4 py-3 hidden lg:table-cell">Consumo</th>
                <th className="text-right font-semibold px-4 py-3 hidden xl:table-cell">Receita</th>
                <th className="text-right font-semibold px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-accent/40 cursor-pointer" onClick={() => navigate({ to: "/clientes/$id", params: { id: c.id } })}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-vert-soft text-vert-dark flex items-center justify-center text-xs font-bold shrink-0">
                        {initials(c.nome)}
                      </div>
                      <div>
                        <div className="font-semibold">{c.nome}</div>
                        <div className="text-[11px] text-muted-foreground">{formatDoc(c.documento)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.endereco.cidade}/{c.endereco.uf}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="badge-stage bg-vert-soft text-vert-dark">{SEGMENTOS_LABEL[c.segmento]}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-right tabular-nums">{kwh(c.consumoMedio)}</td>
                  <td className="px-4 py-3 hidden xl:table-cell text-right tabular-nums font-semibold">{brl(valorCliente(c.id))}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">
                      <a href={`tel:+55${c.telefone}`} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-vert" title="Ligar">
                        <Phone className="h-4 w-4" />
                      </a>
                      <a href={`https://wa.me/55${c.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-vert" title="WhatsApp">
                        <MessageCircle className="h-4 w-4" />
                      </a>
                      <Link to="/clientes/$id" params={{ id: c.id }} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-vert">
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">Nenhum cliente encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
            <span className="text-muted-foreground">Página {page + 1} de {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 rounded border border-border disabled:opacity-50">Anterior</button>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 rounded border border-border disabled:opacity-50">Próxima</button>
            </div>
          </div>
        )}
      </div>

      <ClienteFormModal open={openForm} onClose={() => setOpenForm(false)} />
    </div>
  );
}
