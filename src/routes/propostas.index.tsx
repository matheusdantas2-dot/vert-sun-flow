import { createFileRoute, Link } from "@tanstack/react-router";
import { brl, dataBR } from "@/lib/format";
import { STATUS_PROPOSTA_LABEL, type PropostaStatus, type Proposta } from "@/lib/types";
import { Plus, FileText, ExternalLink, Download, Eye, Share2, Pencil } from "lucide-react";
import { exportPropostasCsv } from "@/lib/exportCsv";
import { gerarPdfProposta } from "@/lib/pdfProposta";
import { gerarPdfComparativo } from "@/lib/pdfPropostaComparativa";
import { gerarPdfPropostaResumo } from "@/lib/pdfPropostaResumo";
import { usePode } from "@/lib/permissoes";

type ModeloPdf = "completa" | "resumo";
import { notify } from "@/lib/notificacoes";
import { useMemo, useState } from "react";
import { PdfPreviewModal } from "@/components/propostas/PdfPreviewModal";
import { CompartilharPropostaModal } from "@/components/propostas/CompartilharPropostaModal";
import { TierGroupCard } from "@/components/propostas/TierGroupCard";
import { useClientesQuery } from "@/lib/clientes.api";
import { useProdutosQuery } from "@/lib/produtos.api";
import { useProfilesQuery } from "@/lib/profiles.api";
import { usePropostasQuery, useUpdatePropostaStatus } from "@/lib/propostas.api";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/propostas/")({
  component: PropostasList,
  head: () => ({ meta: [{ title: "Propostas — VertCRM" }] }),
});

function PropostasList() {
  const { data: propostas = [] } = usePropostasQuery();
  const { data: clientes = [] } = useClientesQuery();
  const { data: produtos = [] } = useProdutosQuery();
  const { data: profiles = [] } = useProfilesQuery();
  const empresa = useStore((s) => s.empresa);
  const updateStatus = useUpdatePropostaStatus();
  const podeCriar = usePode("criar_proposta");
  const podePdf = usePode("exportar_pdf");

  const [preview, setPreview] = useState<{ url: string; titulo: string; propostaId: string } | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [modelo, setModelo] = useState<ModeloPdf>("completa");

  // Separa propostas em "avulsas" e "grupos de tier"
  const { avulsas, grupos } = useMemo(() => {
    const grupos = new Map<string, Proposta[]>();
    const avulsas: Proposta[] = [];
    propostas.forEach((p) => {
      if (p.grupoTierId) {
        if (!grupos.has(p.grupoTierId)) grupos.set(p.grupoTierId, []);
        grupos.get(p.grupoTierId)!.push(p);
      } else {
        avulsas.push(p);
      }
    });
    return { avulsas, grupos };
  }, [propostas]);

  const buildPdf = (id: string, modo: "save" | "blob") => {
    const p = propostas.find((x) => x.id === id);
    const cliente = clientes.find((c) => c.id === p?.clienteId);
    const profile = profiles.find((u) => u.id === p?.consultorId);
    const consultor = profile
      ? { id: profile.id, nome: profile.nome, email: profile.email ?? "", perfil: "consultor" as const, cor: profile.cor, ativo: profile.ativo }
      : undefined;
    if (!p || !cliente) return null;
    const gerador = modelo === "resumo" ? gerarPdfPropostaResumo : gerarPdfProposta;
    return { result: gerador({ proposta: p, cliente, consultor, produtos, empresa, modo }), p, cliente };
  };

  const baixarPdf = (id: string) => {
    const r = buildPdf(id, "save");
    if (r) notify.success("PDF gerado", `Proposta ${r.p.numero} (${modelo === "resumo" ? "Resumo" : "Completa"}) baixada.`);
  };

  const visualizarPdf = (id: string) => {
    const r = buildPdf(id, "blob");
    if (r && typeof r.result === "string") {
      const tag = modelo === "resumo" ? "Resumo" : "Completa";
      setPreview({ url: r.result, titulo: `${r.p.numero} · ${r.cliente.nome} · ${tag}`, propostaId: id });
    }
  };

  const visualizarComparativo = (grupoId: string) => {
    const lista = grupos.get(grupoId) ?? [];
    if (lista.length === 0) return;
    const cliente = clientes.find((c) => c.id === lista[0].clienteId);
    if (!cliente) return;
    const profile = profiles.find((u) => u.id === lista[0].consultorId);
    const consultor = profile
      ? { id: profile.id, nome: profile.nome, email: profile.email ?? "", perfil: "consultor" as const, cor: profile.cor, ativo: profile.ativo }
      : undefined;
    const url = gerarPdfComparativo({ propostas: lista, cliente, empresa, consultor, produtos, modo: "blob" });
    if (typeof url === "string") {
      setPreview({ url, titulo: `Comparativo · ${cliente.nome}`, propostaId: lista[0].id });
    }
  };

  const mudarStatus = (id: string, status: PropostaStatus) => {
    updateStatus.mutate({ id, status });
    notify.success("Status atualizado", STATUS_PROPOSTA_LABEL[status]);
  };

  const STATUS_LIST: PropostaStatus[] = ["rascunho", "enviada", "negociacao", "aceita", "recusada", "expirada"];

  const calcTotal = (p: Proposta) =>
    p.itens.reduce((a, it) => {
      const prod = produtos.find((x) => x.id === it.produtoId);
      return a + (it.precoUnitario ?? prod?.precoVenda ?? 0) * it.quantidade;
    }, 0);

  const calcKwp = (p: Proposta) =>
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
          <p className="text-sm text-muted-foreground mt-0.5">
            {propostas.length} propostas · {grupos.size} grupo(s) comparativo(s)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border bg-card">
            <FileText className="h-3.5 w-3.5 text-vert" />
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Modelo</span>
            <select
              value={modelo}
              onChange={(e) => setModelo(e.target.value as ModeloPdf)}
              className="bg-transparent text-xs font-semibold outline-none cursor-pointer"
              title="Modelo do PDF para visualizar/baixar/compartilhar"
            >
              <option value="completa">Completa (7 págs)</option>
              <option value="resumo">Resumo (1 pág)</option>
            </select>
          </div>
          <button
            onClick={() => exportPropostasCsv(propostas, clientes)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-accent"
          >
            <Download className="h-4 w-4" /> Download CSV
          </button>
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

      {grupos.size > 0 && (
        <section className="space-y-3">
          <h2 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">
            Comparativos (3 tiers)
          </h2>
          {Array.from(grupos.entries()).map(([gid, lista]) => {
            const cliente = clientes.find((c) => c.id === lista[0].clienteId);
            return (
              <TierGroupCard
                key={gid}
                grupoId={gid}
                propostas={lista}
                cliente={cliente}
                produtos={produtos}
                onVisualizar={visualizarPdf}
                onBaixar={baixarPdf}
                onCompartilhar={(id) => setShareId(id)}
                onCompartilharComparativo={visualizarComparativo}
                podePdf={podePdf}
              />
            );
          })}
        </section>
      )}

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
              {avulsas.map((p) => {
                const cliente = clientes.find((c) => c.id === p.clienteId);
                const consultor = profiles.find((u) => u.id === p.consultorId);
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
                      <select
                        value={p.status}
                        onChange={(e) => mudarStatus(p.id, e.target.value as PropostaStatus)}
                        className={`badge-stage cursor-pointer border-0 outline-none ${statusColor[p.status]}`}
                        title="Alterar status"
                      >
                        {STATUS_LIST.map((s) => (
                          <option key={s} value={s}>{STATUS_PROPOSTA_LABEL[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        <Link to="/propostas/$id" params={{ id: p.id }} className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:text-vert">
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Link>
                        <button onClick={() => visualizarPdf(p.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-vert hover:underline">
                          <Eye className="h-3.5 w-3.5" /> Visualizar
                        </button>
                        <button onClick={() => setShareId(p.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-vert-dark hover:underline">
                          <Share2 className="h-3.5 w-3.5" /> Compartilhar
                        </button>
                        {podePdf && (
                          <button onClick={() => baixarPdf(p.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-vert-dark hover:underline">
                            <Download className="h-3.5 w-3.5" /> PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {avulsas.length === 0 && grupos.size === 0 && (
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
      {shareId && <CompartilharPropostaModal propostaId={shareId} onClose={() => setShareId(null)} />}
    </div>
  );
}
