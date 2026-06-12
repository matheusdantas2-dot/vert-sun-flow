import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCardsQuery, useMoveCard } from "@/lib/cards.api";
import { useClientesQuery } from "@/lib/clientes.api";
import { useProfilesQuery } from "@/lib/profiles.api";
import { usePropostasQuery, useUpdatePropostaStatus } from "@/lib/propostas.api";
import { useProdutosQuery } from "@/lib/produtos.api";
import { useStore } from "@/lib/store";
import { gerarPdfProposta } from "@/lib/pdfProposta";
import { gerarPdfContrato } from "@/lib/pdfContrato";
import { PdfPreviewModal } from "@/components/propostas/PdfPreviewModal";
import { CompartilharPropostaModal } from "@/components/propostas/CompartilharPropostaModal";
import { MotivoPerdaModal } from "@/components/pipeline/MotivoPerdaModal";
import type { PropostaStatus } from "@/lib/types";
import {
  useInteracoesByClienteQuery,
  useAddInteracao,
  useInteracoesRealtime,
} from "@/lib/interacoes.api";
import {
  useProjetoByCardId,
  useCriarProjeto,
  useRegenerarToken,
  useRemoverProjeto,
  useProjetosRealtime,
} from "@/lib/projetos.api";
import { brl, kwp, dataBR, dataHoraBR, formatTel } from "@/lib/format";
import { ORIGEM_LABEL, SEGMENTOS_LABEL, STAGES, STATUS_PROPOSTA_LABEL } from "@/lib/types";
import { CronogramaProjetoAdmin } from "@/components/projeto/CronogramaProjetoAdmin";
import { MensagensWhatsApp } from "@/components/clientes/MensagensWhatsApp";
import { mensagemWhatsAppInicial, urlPortal, whatsappLink } from "@/lib/portalCliente";
import { notify } from "@/lib/notificacoes";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  ExternalLink,
  Copy,
  Link2,
  RefreshCw,
  Trash2,
  User,
  FileText,
  Plus,
  Eye,
  Share2,
  Download,
  Pencil,
  FileSignature,
  Trophy,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/pipeline/card/$cardId")({
  component: CardDetalhe,
  head: () => ({ meta: [{ title: "Card — VertCRM" }] }),
});

function CardDetalhe() {
  const { cardId } = Route.useParams();
  const navigate = useNavigate();
  useProjetosRealtime();

  const { data: cards = [] } = useCardsQuery();
  const { data: clientes = [] } = useClientesQuery();
  const { data: profiles = [] } = useProfilesQuery();
  const { data: todasPropostas = [] } = usePropostasQuery();
  const { data: projetoData } = useProjetoByCardId(cardId);
  const criarMut = useCriarProjeto();
  const regenerarMut = useRegenerarToken();
  const removerMut = useRemoverProjeto();
  const updateStatus = useUpdatePropostaStatus();
  const { data: produtos = [] } = useProdutosQuery();
  const empresa = useStore((s) => s.empresa);
  const [preview, setPreview] = useState<{ url: string; titulo: string } | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const moveCard = useMoveCard();
  const [motivoPerdaOpen, setMotivoPerdaOpen] = useState(false);

  const card = cards.find((c) => c.id === cardId);
  const cliente = card ? clientes.find((c) => c.id === card.clienteId) : undefined;
  const consultor = card ? profiles.find((u) => u.id === card.consultorId) : undefined;
  const projeto = projetoData?.projeto;

  const { data: interacoes = [] } = useInteracoesByClienteQuery(cliente?.id);
  useInteracoesRealtime(cliente?.id);
  const addInteracao = useAddInteracao();
  const [novaNota, setNovaNota] = useState("");

  const propostas = useMemo(
    () => todasPropostas.filter((p) => cliente && p.clienteId === cliente.id),
    [todasPropostas, cliente],
  );
  const calcProposta = (p: typeof propostas[number]) =>
    p.itens.reduce((a, it) => a + (it.precoUnitario ?? 0) * it.quantidade, 0);

  if (!card || !cliente) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Card não encontrado.</p>
        <Link to="/pipeline" className="text-vert font-semibold">
          Voltar para o pipeline
        </Link>
      </div>
    );
  }

  const registrarNota = () => {
    if (!novaNota.trim()) return;
    addInteracao.mutate(
      { cliente_id: cliente.id, tipo: "nota", titulo: "Nota interna", descricao: novaNota },
      { onSuccess: () => setNovaNota("") },
    );
  };

  const stage = STAGES.find((s) => s.id === card.stage);
  const link = projeto ? urlPortal(projeto.token_publico) : "";

  const handleCopiar = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    notify.success("Link copiado");
  };

  const handleGerar = () => {
    criarMut.mutate(
      {
        cardId: card.id,
        clienteId: cliente.id,
        consultorId: card.consultorId || null,
        potenciaKwp: card.potenciaKwp,
        valorInvestimento: card.valorEstimado,
        concessionariaNome: cliente.concessionaria,
      },
      { onSuccess: () => notify.success("Portal criado", `Link gerado para ${cliente.nome}`) },
    );
  };

  const handleRegenerar = () => {
    if (!projeto) return;
    if (!confirm("Gerar um novo link invalidará o atual. Continuar?")) return;
    regenerarMut.mutate(projeto.id, { onSuccess: () => notify.success("Novo link gerado") });
  };

  const handleRemover = () => {
    if (!projeto) return;
    if (!confirm("Remover o portal de acompanhamento deste cliente?")) return;
    removerMut.mutate(projeto.id, { onSuccess: () => notify.warning("Portal removido") });
  };

  const handleGanhar = async () => {
    if (!confirm(`Confirmar negócio GANHO com ${cliente.nome}?`)) return;
    try {
      await moveCard.mutateAsync({ id: card.id, stage: "ativado" });
      notify.success("Negócio ganho! 🎉", `${cliente.nome} movido para Ativado`);
    } catch (err: unknown) {
      notify.error("Erro ao mover card", err instanceof Error ? err.message : "Tente novamente");
    }
  };

  const handlePerder = () => setMotivoPerdaOpen(true);

  const handleConfirmarPerda = async (motivo: string) => {
    try {
      await moveCard.mutateAsync({ id: card.id, stage: "perdido", motivoPerda: motivo });
      setMotivoPerdaOpen(false);
      notify.warning("Negócio perdido", motivo);
    } catch (err: unknown) {
      notify.error("Erro ao mover card", err instanceof Error ? err.message : "Tente novamente");
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1200px] mx-auto">
      <button
        onClick={() => navigate({ to: "/pipeline" })}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-vert"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para o pipeline
      </button>

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div
                className="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                style={{ background: stage?.cor, color: "white" }}
              >
                {stage?.nome}
              </div>
              {card.stage === "ativado" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-emerald-600 text-white">
                  <Trophy className="h-3 w-3" /> Ganho
                </span>
              )}
              {card.stage === "perdido" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-rose-600 text-white">
                  <XCircle className="h-3 w-3" /> Perdido{card.motivoPerda ? ` · ${card.motivoPerda.slice(0, 40)}` : ""}
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">
              {cliente.nome}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {SEGMENTOS_LABEL[cliente.segmento]} · {cliente.endereco.cidade}/{cliente.endereco.uf} ·{" "}
              {ORIGEM_LABEL[card.origem]}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`tel:+55${cliente.telefone.replace(/\D/g, "")}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent"
            >
              <Phone className="h-4 w-4" /> Ligar
            </a>
            <a
              href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#25D366] text-white text-sm font-semibold hover:opacity-90"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
            <Link
              to="/clientes/$id"
              params={{ id: cliente.id }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent"
            >
              <User className="h-4 w-4" /> Ficha do cliente
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-border">
          <Info label="Valor estimado" value={brl(card.valorEstimado)} />
          <Info label="Potência" value={kwp(card.potenciaKwp)} />
          <Info label="Consultor" value={consultor?.nome ?? "—"} />
          <Info label="Criado em" value={dataBR(card.criadoEm)} />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-display font-bold text-lg">Link de acompanhamento do cliente</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Portal público com o status do projeto em tempo real.
            </p>
          </div>
        </div>

        {!projeto ? (
          <div className="text-center py-6 border-2 border-dashed border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-3">
              Nenhum link gerado para este card ainda.
            </p>
            <button
              onClick={handleGerar}
              disabled={criarMut.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vert text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" /> Gerar link agora
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-muted rounded-lg p-3 break-all text-sm font-mono">{link}</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopiar}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent"
              >
                <Copy className="h-4 w-4" /> Copiar link
              </button>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent"
              >
                <ExternalLink className="h-4 w-4" /> Abrir portal
              </a>
              <a
                href={whatsappLink(
                  cliente.whatsapp || cliente.telefone,
                  mensagemWhatsAppInicial(cliente, link, consultor as any),
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#25D366] text-white text-sm font-semibold hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" /> Enviar via WhatsApp
              </a>
              <button
                onClick={handleRegenerar}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 text-amber-700 text-sm hover:bg-amber-50"
              >
                <RefreshCw className="h-4 w-4" /> Regenerar
              </button>
              <button
                onClick={handleRemover}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-300 text-rose-700 text-sm hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" /> Remover
              </button>
            </div>
          </div>
        )}
      </div>

      {projeto && <CronogramaProjetoAdmin cardId={card.id} />}

      {card.stage !== "ativado" && card.stage !== "perdido" && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-display font-bold text-lg mb-1">Resultado do negócio</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Mova este card para o resultado final da negociação.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleGanhar}
              disabled={moveCard.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
            >
              <Trophy className="h-4 w-4" /> Marcar como Ganho
            </button>
            <button
              onClick={handlePerder}
              disabled={moveCard.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-sm font-semibold disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" /> Marcar como Perdido
            </button>
          </div>
        </div>
      )}



      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-lg mb-3">Contato</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Info label="Telefone" value={formatTel(cliente.telefone)} />
          <Info label="WhatsApp" value={formatTel(cliente.whatsapp)} />
          <Info label="E-mail" value={cliente.email} />
          <Info label="Concessionária" value={cliente.concessionaria} />
        </div>
      </div>

      {/* Propostas */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-lg">Propostas ({propostas.length})</h2>
          <Link
            to="/propostas/nova"
            search={{ clienteId: cliente.id }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-vert text-white text-sm font-semibold hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Nova proposta
          </Link>
        </div>
        {propostas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhuma proposta gerada para este cliente ainda.</p>
        ) : (
          <div className="space-y-2">
            {propostas.map((p) => {
              const profile = profiles.find((u) => u.id === p.consultorId);
              const consultorPdf = profile
                ? { id: profile.id, nome: profile.nome, email: profile.email ?? "", perfil: "consultor" as const, cor: profile.cor, ativo: profile.ativo }
                : undefined;
              const buildPdf = (modo: "save" | "blob") =>
                gerarPdfProposta({ proposta: p, cliente, consultor: consultorPdf, produtos, empresa, modo });
              const visualizar = () => {
                const url = buildPdf("blob");
                if (typeof url === "string") setPreview({ url, titulo: `${p.numero} · ${cliente.nome}` });
              };
              const baixar = () => {
                buildPdf("save");
                notify.success("PDF gerado", `Proposta ${p.numero} baixada.`);
              };
              return (
                <div key={p.id} className="p-3 rounded-lg border border-border hover:bg-accent/30">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-vert shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm">{p.numero}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {dataBR(p.criadoEm)} · validade {dataBR(p.validadeAte)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-vert">{brl(calcProposta(p))}</div>
                      <select
                        value={p.status}
                        onChange={(e) => {
                          const status = e.target.value as PropostaStatus;
                          updateStatus.mutate({ id: p.id, status });
                          notify.success("Status atualizado", STATUS_PROPOSTA_LABEL[status]);
                        }}
                        className="badge-stage bg-muted text-foreground text-[10px] cursor-pointer outline-none border border-border rounded px-1 py-0.5"
                      >
                        {(["rascunho","enviada","negociacao","aceita","recusada","expirada"] as PropostaStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS_PROPOSTA_LABEL[s]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border">
                    <Link to="/propostas/$id" params={{ id: p.id }} className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:text-vert px-2 py-1 rounded hover:bg-accent">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Link>
                    <button onClick={visualizar} className="inline-flex items-center gap-1 text-xs font-semibold text-vert hover:underline px-2 py-1 rounded hover:bg-accent">
                      <Eye className="h-3.5 w-3.5" /> Visualizar
                    </button>
                    <button onClick={() => setShareId(p.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-vert-dark hover:underline px-2 py-1 rounded hover:bg-accent">
                      <Share2 className="h-3.5 w-3.5" /> Compartilhar
                    </button>
                    <button onClick={baixar} className="inline-flex items-center gap-1 text-xs font-semibold text-vert-dark hover:underline px-2 py-1 rounded hover:bg-accent">
                      <Download className="h-3.5 w-3.5" /> PDF
                    </button>
                    {p.status === "aceita" && (
                      <button
                        onClick={() => {
                          gerarPdfContrato({ card, cliente, proposta: p, produtos, consultor: consultorPdf, empresa, modo: "save" });
                          notify.success("Contrato gerado", p.numero);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline px-2 py-1 rounded hover:bg-accent"
                      >
                        <FileSignature className="h-3.5 w-3.5" /> Contrato
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {preview && (
        <PdfPreviewModal
          url={preview.url}
          titulo={preview.titulo}
          onClose={() => setPreview(null)}
        />
      )}
      {shareId && <CompartilharPropostaModal propostaId={shareId} onClose={() => setShareId(null)} />}
      <MotivoPerdaModal
        open={motivoPerdaOpen}
        onClose={() => setMotivoPerdaOpen(false)}
        onConfirm={handleConfirmarPerda}
      />

      {/* Mensagens prontas WhatsApp */}
      <MensagensWhatsApp cliente={cliente} />

      {/* Registrar interação */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-base mb-3">Registrar interação</h2>
        <textarea
          value={novaNota}
          onChange={(e) => setNovaNota(e.target.value)}
          placeholder="Anote uma observação, retorno do cliente, próximos passos…"
          className="w-full p-3 rounded-lg bg-muted border border-transparent focus:bg-card focus:border-vert-light text-sm outline-none min-h-[70px]"
        />
        <button
          onClick={registrarNota}
          disabled={addInteracao.isPending}
          className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          Adicionar nota
        </button>
      </div>

      {/* Histórico */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-base mb-4">Histórico do negócio</h2>
        {interacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma interação registrada.</p>
        ) : (
          <ol className="relative border-l-2 border-vert-soft ml-2 space-y-4">
            {interacoes.map((i) => (
              <li key={i.id} className="ml-5">
                <span className="absolute -left-[9px] w-4 h-4 rounded-full bg-vert border-2 border-card" />
                <div className="text-[11px] text-muted-foreground">
                  {dataHoraBR(i.data)} · {i.tipo}
                </div>
                <div className="font-semibold text-sm">{i.titulo}</div>
                {i.descricao && (
                  <div className="text-sm text-muted-foreground mt-0.5">{i.descricao}</div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}
