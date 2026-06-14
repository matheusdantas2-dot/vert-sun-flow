import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { HardHat, FileText, Cable, Download, Eye, CheckSquare, Square, Save, Search, AlertCircle } from "lucide-react";
import { useCardsQuery } from "@/lib/cards.api";
import { useClientesQuery } from "@/lib/clientes.api";
import { usePropostasQuery } from "@/lib/propostas.api";
import { useProdutosQuery } from "@/lib/produtos.api";
import { useStore } from "@/lib/store";
import { useConfigGlobalQuery } from "@/lib/config.api";
import { kwp } from "@/lib/format";
import {
  gerarMemorialDescritivo,
  gerarDiagramaUnifilar,
  CHECKLIST_HOMOLOGACAO,
  type ResponsavelTecnico,
  type DadosEngenharia,
} from "@/lib/pdfEngenharia";
import { PdfPreviewModal } from "@/components/propostas/PdfPreviewModal";
import { notify } from "@/lib/notificacoes";
import type { Cliente, Produto, Proposta, Empresa } from "@/lib/types";

export const Route = createFileRoute("/engenharia")({
  component: EngenhariaPage,
  head: () => ({ meta: [{ title: "Engenharia — VertCRM" }] }),
});

interface DocsState {
  responsavel: ResponsavelTecnico;
  observacoes: string;
  checklist: Record<string, boolean>;
}

const STORAGE_KEY = "vert-engenharia-v1";
const DEFAULT_RESP: ResponsavelTecnico = { nome: "", crea: "", art: "", titulo: "Engenheiro Eletricista" };

function loadAll(): Record<string, DocsState> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, DocsState>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const ETAPAS_ENG = new Set(["contrato", "homologacao", "instalacao", "ativado"]);

function EngenhariaPage() {
  const { data: cards = [] } = useCardsQuery();
  const { data: clientes = [] } = useClientesQuery();
  const { data: propostas = [] } = usePropostasQuery();
  const { data: produtos = [] } = useProdutosQuery();
  const empresaStore = useStore((s) => s.empresa);
  const { data: cfg } = useConfigGlobalQuery();
  const empresa: Empresa = { ...empresaStore, ...(cfg?.empresa ?? {}) };

  const elegíveis = useMemo(
    () =>
      cards
        .filter((c) => ETAPAS_ENG.has(c.stage))
        .map((c) => {
          const cliente = clientes.find((x) => x.id === c.clienteId);
          const proposta = propostas
            .filter((p) => p.clienteId === c.clienteId)
            .sort((a, b) => +new Date(b.criadoEm) - +new Date(a.criadoEm))[0];
          return { card: c, cliente, proposta };
        })
        .filter((x) => x.cliente),
    [cards, clientes, propostas],
  );

  const [busca, setBusca] = useState("");
  const filtrados = elegíveis.filter((e) =>
    e.cliente!.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (e.cliente!.uc ?? "").toLowerCase().includes(busca.toLowerCase()),
  );

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCardId && filtrados.length > 0) setSelectedCardId(filtrados[0].card.id);
  }, [filtrados, selectedCardId]);

  const selecionado = filtrados.find((e) => e.card.id === selectedCardId);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-vert-dark text-vert-glow flex items-center justify-center">
            <HardHat className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-vert-dark leading-none">Engenharia</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Memorial Descritivo, Diagrama Unifilar e checklist de homologação
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* lista de projetos */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar cliente ou UC"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-input bg-background"
              />
            </div>
          </div>
          <ul className="max-h-[70vh] overflow-y-auto divide-y divide-border">
            {filtrados.length === 0 && (
              <li className="p-6 text-center text-sm text-muted-foreground">
                Nenhum projeto em contrato/homologação/instalação.
              </li>
            )}
            {filtrados.map((e) => (
              <li key={e.card.id}>
                <button
                  onClick={() => setSelectedCardId(e.card.id)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-accent/40 transition-colors ${
                    selectedCardId === e.card.id ? "bg-vert-glow/15 border-l-2 border-vert" : ""
                  }`}
                >
                  <div className="font-medium text-sm text-vert-dark truncate">{e.cliente!.nome}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span className="uppercase">{e.card.stage}</span>
                    <span>·</span>
                    <span>{kwp(e.card.potenciaKwp || 0)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* detalhe */}
        <div>
          {selecionado ? (
            <DetalheEngenharia
              key={selecionado.card.id}
              cardId={selecionado.card.id}
              cliente={selecionado.cliente!}
              proposta={selecionado.proposta}
              produtos={produtos}
              empresa={empresa}
              potenciaKwp={selecionado.card.potenciaKwp || 0}
            />
          ) : (
            <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
              Selecione um projeto à esquerda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetalheEngenharia({
  cardId,
  cliente,
  proposta,
  produtos,
  empresa,
  potenciaKwp,
}: {
  cardId: string;
  cliente: Cliente;
  proposta?: Proposta;
  produtos: Produto[];
  empresa: Empresa;
  potenciaKwp: number;
}) {
  const [state, setState] = useState<DocsState>(() => {
    const all = loadAll();
    return (
      all[cardId] ?? {
        responsavel: { ...DEFAULT_RESP },
        observacoes: "",
        checklist: {},
      }
    );
  });

  const persist = (next: DocsState) => {
    setState(next);
    const all = loadAll();
    all[cardId] = next;
    saveAll(all);
  };

  const [preview, setPreview] = useState<{ url: string; titulo: string; download: () => void } | null>(null);

  const dados: DadosEngenharia = {
    empresa,
    cliente,
    proposta,
    produtos,
    potenciaKwp,
    responsavel: state.responsavel,
    observacoes: state.observacoes,
  };

  const abrirPdf = (tipo: "memorial" | "unifilar") => {
    const pdf = tipo === "memorial" ? gerarMemorialDescritivo(dados) : gerarDiagramaUnifilar(dados);
    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    const titulo =
      tipo === "memorial"
        ? `Memorial Descritivo — ${cliente.nome}`
        : `Diagrama Unifilar — ${cliente.nome}`;
    const fileName =
      tipo === "memorial"
        ? `Memorial-${cliente.nome.replace(/\s+/g, "_")}.pdf`
        : `Unifilar-${cliente.nome.replace(/\s+/g, "_")}.pdf`;
    setPreview({
      url,
      titulo,
      download: () => pdf.save(fileName),
    });
  };

  const baixarPdf = (tipo: "memorial" | "unifilar") => {
    const pdf = tipo === "memorial" ? gerarMemorialDescritivo(dados) : gerarDiagramaUnifilar(dados);
    const base = tipo === "memorial" ? "Memorial" : "Unifilar";
    pdf.save(`${base}-${cliente.nome.replace(/\s+/g, "_")}.pdf`);
    notify.success(`${base} baixado`);
  };

  const obrig = CHECKLIST_HOMOLOGACAO.filter((i) => i.obrigatorio);
  const obrigOk = obrig.filter((i) => state.checklist[i.id]).length;
  const total = CHECKLIST_HOMOLOGACAO.length;
  const totalOk = CHECKLIST_HOMOLOGACAO.filter((i) => state.checklist[i.id]).length;
  const prontoParaProtocolar = obrigOk === obrig.length;

  const respMissing = !state.responsavel.nome || !state.responsavel.crea || !state.responsavel.art;

  return (
    <div className="space-y-4">
      {/* header projeto */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Projeto</div>
            <div className="font-display font-bold text-xl text-vert-dark">{cliente.nome}</div>
            <div className="text-sm text-muted-foreground mt-1">
              UC {cliente.uc || "—"} · {cliente.concessionaria || "—"} · {kwp(potenciaKwp)} · rede {cliente.rede}
            </div>
          </div>
          <Link
            to="/pipeline/card/$cardId"
            params={{ cardId }}
            className="text-xs text-vert hover:underline"
          >
            Ver no pipeline →
          </Link>
        </div>
      </div>

      {/* responsável técnico */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-vert-dark">Responsável técnico</h2>
          {respMissing && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
              <AlertCircle className="h-3.5 w-3.5" /> Preencha para gerar PDFs assinados
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <Field label="Nome">
            <input
              value={state.responsavel.nome}
              onChange={(e) => persist({ ...state, responsavel: { ...state.responsavel, nome: e.target.value } })}
              placeholder="Nome completo do engenheiro"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
            />
          </Field>
          <Field label="Título profissional">
            <input
              value={state.responsavel.titulo ?? ""}
              onChange={(e) => persist({ ...state, responsavel: { ...state.responsavel, titulo: e.target.value } })}
              placeholder="Engenheiro Eletricista"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
            />
          </Field>
          <Field label="CREA">
            <input
              value={state.responsavel.crea}
              onChange={(e) => persist({ ...state, responsavel: { ...state.responsavel, crea: e.target.value } })}
              placeholder="Ex.: 123456/D-CE"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
            />
          </Field>
          <Field label="ART nº">
            <input
              value={state.responsavel.art}
              onChange={(e) => persist({ ...state, responsavel: { ...state.responsavel, art: e.target.value } })}
              placeholder="Número da ART"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Observações para o memorial">
              <textarea
                value={state.observacoes}
                onChange={(e) => persist({ ...state, observacoes: e.target.value })}
                rows={3}
                placeholder="Observações específicas deste projeto..."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              />
            </Field>
          </div>
        </div>
      </div>

      {/* documentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DocCard
          icon={<FileText className="h-5 w-5" />}
          titulo="Memorial Descritivo"
          descricao="Documento técnico em PDF com identificação, responsável, características do sistema, equipamentos, normas e assinatura."
          onPreview={() => abrirPdf("memorial")}
          onDownload={() => baixarPdf("memorial")}
        />
        <DocCard
          icon={<Cable className="h-5 w-5" />}
          titulo="Diagrama Unifilar"
          descricao="Esquema unifilar simplificado em A4 paisagem: arranjo FV → string box → inversor → quadro CA → padrão/medidor."
          onPreview={() => abrirPdf("unifilar")}
          onDownload={() => baixarPdf("unifilar")}
        />
      </div>

      {/* checklist */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="font-display font-bold text-vert-dark">Checklist de homologação</h2>
            <div className="text-xs text-muted-foreground mt-0.5">
              {totalOk}/{total} concluídos · obrigatórios {obrigOk}/{obrig.length}
            </div>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1.5 rounded-full ${
              prontoParaProtocolar
                ? "bg-vert-glow/30 text-vert-dark"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {prontoParaProtocolar ? "Pronto para protocolar" : "Pendente"}
          </span>
        </div>

        <ul className="space-y-1">
          {CHECKLIST_HOMOLOGACAO.map((item) => {
            const done = !!state.checklist[item.id];
            return (
              <li key={item.id}>
                <button
                  onClick={() =>
                    persist({
                      ...state,
                      checklist: { ...state.checklist, [item.id]: !done },
                    })
                  }
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/40 text-left"
                >
                  {done ? (
                    <CheckSquare className="h-4 w-4 text-vert shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={`text-sm flex-1 ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {item.texto}
                  </span>
                  {item.obrigatorio && (
                    <span className="text-[10px] uppercase tracking-wider text-amber-600 font-bold">obr.</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {preview && (
        <PdfPreviewModal
          url={preview.url}
          titulo={preview.titulo}
          onClose={() => {
            URL.revokeObjectURL(preview.url);
            setPreview(null);
          }}
          onDownload={preview.download}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{label}</span>
      {children}
    </label>
  );
}

function DocCard({
  icon,
  titulo,
  descricao,
  onPreview,
  onDownload,
}: {
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
  onPreview: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col">
      <div className="flex items-center gap-2 text-vert-dark">
        <div className="h-9 w-9 rounded-lg bg-vert-glow/30 flex items-center justify-center">{icon}</div>
        <h3 className="font-display font-bold">{titulo}</h3>
      </div>
      <p className="text-sm text-muted-foreground mt-2 flex-1">{descricao}</p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onPreview}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-input bg-background text-sm font-medium hover:bg-accent"
        >
          <Eye className="h-4 w-4" /> Pré-visualizar
        </button>
        <button
          onClick={onDownload}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-vert-dark text-vert-glow text-sm font-bold hover:brightness-110"
        >
          <Download className="h-4 w-4" /> Baixar PDF
        </button>
      </div>
    </div>
  );
}
