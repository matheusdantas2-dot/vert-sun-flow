import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { brl, dataBR } from "@/lib/format";
import { STATUS_PROPOSTA_LABEL } from "@/lib/types";
import { Plus, FileText, ExternalLink, Download, Eye, Share2 } from "lucide-react";
import { gerarPdfProposta } from "@/lib/pdfProposta";
import { usePode } from "@/lib/permissoes";
import { notify } from "@/lib/notificacoes";
import { useState } from "react";
import { PdfPreviewModal } from "@/components/propostas/PdfPreviewModal";
import { CompartilharPropostaModal } from "@/components/propostas/CompartilharPropostaModal";

export const Route = createFileRoute("/propostas/")({
  component: PropostasList,
  head: () => ({ meta: [{ title: "Propostas — Vert CRM" }] }),
});

function PropostasList() {
  const propostas = useStore((s) => s.propostas);
  const clientes = useStore((s) => s.clientes);
  const usuarios = useStore((s) => s.usuarios);
  const produtos = useStore((s) => s.produtos);
  const empresa = useStore((s) => s.empresa);
  const aceitarProposta = useStore((s) => s.aceitarProposta);
  const podeCriar = usePode("criar_proposta");
  const podePdf = usePode("exportar_pdf");

  const [preview, setPreview] = useState<{ url: string; titulo: string; propostaId: string } | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);

  const buildPdf = (id: string, modo: "save" | "blob") => {
    const p = propostas.find((x) => x.id === id);
    const cliente = clientes.find((c) => c.id === p?.clienteId);
    const consultor = usuarios.find((u) => u.id === p?.consultorId);
    if (!p || !cliente) return null;
    return { result: gerarPdfProposta({ proposta: p, cliente, consultor, produtos, empresa, modo }), p, cliente };
  };

  const baixarPdf = (id: string) => {
    const r = buildPdf(id, "save");
    if (r) notify.success("PDF gerado", `Proposta ${r.p.numero} baixada.`);
  };

  const visualizarPdf = (id: string) => {
    const r = buildPdf(id, "blob");
    if (r && typeof r.result === "string") {
      setPreview({ url: r.result, titulo: `${r.p.numero} · ${r.cliente.nome}`, propostaId: id });
    }
  };

  const aceitar = (id: string, numero: string) => {
    aceitarProposta(id);
    notify.success("Proposta aceita", `${numero} marcada como fechada.`);
  };

  const calcTotal = (p: typeof propostas[number]) =>
    p.itens.reduce((a, it) => {
      const prod = produtos.find((x) => x.id === it.produtoId);
      return a + (it.precoUnitario ?? prod?.precoVenda ?? 0) * it.quantidade;
    }, 0);

  const calcKwp = (p: typeof propostas[number]) =>
    p.itens.reduce((a, it) => {
      const prod = produtos.find((x) => x.id === it.produtoId);
      if (prod?.categoria === "modulo" && prod.potenciaW) return a + (prod.potenciaW * it.quantidade) / 1000;
      return a;
    }, 0);

  const statusColor: Record<string, string> = {
    rascunho: "bg-muted text-muted-foreground",
    enviada: "bg-blue-100 text-blue-800",
    negociacao: "bg-amber-100 text-amber-800",
    aceita: "bg-vert text-white",
    recusada: "bg-rose-100 text-rose-800",
    expirada: "bg-rose-100 text-rose-800",
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1500px] mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Propostas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{propostas.length} propostas geradas</p>
        </div>
        <div className="flex gap-2">
          <a href="/gerador-proposta.html" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-accent">
            <ExternalLink className="h-4 w-4" /> Gerador externo
          </a>
          {podeCriar && (
            <Link to="/propostas/nova" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              <Plus className="h-4 w-4" /> Nova proposta
            </Link>
          )}
        </div>
      </header>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Número</th>
                <th className="text-left font-semibold px-4 py-3">Cliente</th>
                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Consultor</th>
                <th className="text-right font-semibold px-4 py-3 hidden lg:table-cell">kWp</th>
                <th className="text-right font-semibold px-4 py-3">Valor</th>
                <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Validade</th>
                <th className="text-center font-semibold px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {propostas.map((p) => {
                const cliente = clientes.find((c) => c.id === p.clienteId);
                const consultor = usuarios.find((u) => u.id === p.consultorId);
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-accent/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-vert" />
                        <span className="font-mono text-xs font-semibold">{p.numero}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {cliente ? (
                        <Link to="/clientes/$id" params={{ id: cliente.id }} className="font-medium hover:text-vert">{cliente.nome}</Link>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{consultor?.nome ?? "—"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-right tabular-nums">{calcKwp(p).toFixed(1)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-vert">{brl(calcTotal(p))}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{dataBR(p.validadeAte)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge-stage ${statusColor[p.status]}`}>{STATUS_PROPOSTA_LABEL[p.status]}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        <button onClick={() => visualizarPdf(p.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-vert hover:underline">
                          <Eye className="h-3.5 w-3.5" /> Visualizar
                        </button>
                        {podePdf && (
                          <button onClick={() => baixarPdf(p.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-vert-dark hover:underline">
                            <Download className="h-3.5 w-3.5" /> PDF
                          </button>
                        )}
                        {p.status !== "aceita" && p.status !== "recusada" && (
                          <button onClick={() => aceitar(p.id, p.numero)} className="text-xs font-semibold text-vert hover:underline">
                            Marcar aceita
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {propostas.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Nenhuma proposta ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {preview && (
        <PdfPreviewModal
          url={preview.url}
          titulo={preview.titulo}
          onClose={() => setPreview(null)}
          onDownload={() => baixarPdf(preview.propostaId)}
        />
      )}
    </div>
  );
}
