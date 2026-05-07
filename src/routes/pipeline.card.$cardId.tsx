import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { brl, kwp, dataBR, formatTel } from "@/lib/format";
import { ORIGEM_LABEL, SEGMENTOS_LABEL, STAGES } from "@/lib/types";
import { CronogramaProjetoAdmin } from "@/components/projeto/CronogramaProjetoAdmin";
import { mensagemWhatsAppInicial, urlPortal, whatsappLink } from "@/lib/portalCliente";
import { notify } from "@/lib/notificacoes";
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
} from "lucide-react";

export const Route = createFileRoute("/pipeline/card/$cardId")({
  component: CardDetalhe,
  head: () => ({ meta: [{ title: "Card — Vert CRM" }] }),
});

function CardDetalhe() {
  const { cardId } = Route.useParams();
  const navigate = useNavigate();

  const card = useStore((s) => s.cards.find((c) => c.id === cardId));
  const cliente = useStore((s) => (card ? s.clientes.find((c) => c.id === card.clienteId) : undefined));
  const consultor = useStore((s) => (card ? s.usuarios.find((u) => u.id === card.consultorId) : undefined));
  const projeto = useStore((s) => s.projetos.find((p) => p.cardId === cardId));
  const criar = useStore((s) => s.criarProjetoCliente);
  const regenerar = useStore((s) => s.regenerarProjetoCliente);
  const remover = useStore((s) => s.removerProjetoCliente);

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

  const stage = STAGES.find((s) => s.id === card.stage);
  const link = projeto ? urlPortal(projeto.id) : "";

  const handleCopiar = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    notify.success("Link copiado");
  };

  const handleGerar = () => {
    const novo = criar(card.id);
    if (novo) notify.success("Portal criado", `Link gerado para ${cliente.nome}`);
  };

  const handleRegenerar = () => {
    if (!confirm("Gerar um novo link invalidará o atual. Continuar?")) return;
    const novo = regenerar(card.id);
    if (novo) notify.success("Novo link gerado");
  };

  const handleRemover = () => {
    if (!confirm("Remover o portal de acompanhamento deste cliente?")) return;
    remover(card.id);
    notify.warning("Portal removido");
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1200px] mx-auto">
      <button
        onClick={() => navigate({ to: "/pipeline" })}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-vert"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para o pipeline
      </button>

      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div
              className="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded mb-2"
              style={{ background: stage?.cor, color: "white" }}
            >
              {stage?.nome}
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

      {/* Link de acompanhamento */}
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vert text-white text-sm font-semibold hover:opacity-90"
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
                  mensagemWhatsAppInicial(cliente, link, consultor),
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

      {/* Cronograma */}
      {projeto && <CronogramaProjetoAdmin cardId={card.id} />}

      {/* Contato */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-lg mb-3">Contato</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Info label="Telefone" value={formatTel(cliente.telefone)} />
          <Info label="WhatsApp" value={formatTel(cliente.whatsapp)} />
          <Info label="E-mail" value={cliente.email} />
          <Info label="Concessionária" value={cliente.concessionaria} />
        </div>
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
