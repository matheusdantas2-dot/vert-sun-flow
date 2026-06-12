import { createFileRoute, Link } from "@tanstack/react-router";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useStore } from "@/lib/store";
import { useClientesQuery } from "@/lib/clientes.api";
import { useProfilesQuery } from "@/lib/profiles.api";
import { useCardsQuery, useMoveCard, useCardsRealtime } from "@/lib/cards.api";
import { STAGES, type StageId, ORIGEM_LABEL, SEGMENTOS_LABEL } from "@/lib/types";
import { KanbanColumn } from "@/components/pipeline/KanbanColumn";
import { KanbanCard } from "@/components/pipeline/KanbanCard";
import { MotivoPerdaModal } from "@/components/pipeline/MotivoPerdaModal";
import { GerarLinkProjetoModal } from "@/components/pipeline/GerarLinkProjetoModal";
import { NovoCardModal } from "@/components/pipeline/NovoCardModal";
import { useMemo, useState } from "react";
import { Search, ExternalLink, Plus, Loader2, LayoutGrid, List, Phone, MessageCircle, ArrowRight } from "lucide-react";
import { usePode } from "@/lib/permissoes";
import { notify } from "@/lib/notificacoes";
import { brl, kwp, initials, diasEntre, formatTel } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pipeline/")({
  component: Pipeline,
  head: () => ({ meta: [{ title: "Pipeline — VertCRM" }] }),
});

function Pipeline() {
  useCardsRealtime();
  const { data: cards = [], isLoading: loadingCards } = useCardsQuery();
  const { data: clientes = [] } = useClientesQuery();
  const { data: profiles = [] } = useProfilesQuery();
  const sla = useStore((s) => s.sla);
  const moveCard = useMoveCard();
  const podeMover = usePode("mover_card");

  const [filterConsultor, setFilterConsultor] = useState("");
  const [filterSeg, setFilterSeg] = useState("");
  const [filterOrigem, setFilterOrigem] = useState("");
  const [busca, setBusca] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ cardId: string; stage: StageId } | null>(null);
  const [contratoCardId, setContratoCardId] = useState<string | null>(null);
  const [novoCardOpen, setNovoCardOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const clientesMap = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);
  const profilesMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (filterConsultor && c.consultorId !== filterConsultor) return false;
      if (filterOrigem && c.origem !== filterOrigem) return false;
      const cliente = clientesMap.get(c.clienteId);
      if (!cliente) return false;
      if (filterSeg && cliente.segmento !== filterSeg) return false;
      if (busca) {
        const s = busca.toLowerCase();
        if (!cliente.nome.toLowerCase().includes(s) && !cliente.endereco.cidade.toLowerCase().includes(s))
          return false;
      }
      return true;
    });
  }, [cards, clientesMap, filterConsultor, filterSeg, filterOrigem, busca]);

  const byStage = useMemo(() => {
    const m: Record<string, typeof cards> = {};
    STAGES.forEach((s) => (m[s.id] = []));
    filtered.forEach((c) => m[c.stage]?.push(c));
    return m;
  }, [filtered]);

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    if (!podeMover) return;
    if (!e.over) return;
    const cardId = e.active.id as string;
    const newStage = e.over.id as StageId;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.stage === newStage) return;

    if (newStage === "perdido") {
      setPendingMove({ cardId, stage: newStage });
      return;
    }
    try {
      await moveCard.mutateAsync({ id: cardId, stage: newStage });
      const clienteCard = clientesMap.get(card.clienteId);
      const stageNome = STAGES.find((s) => s.id === newStage)?.nome ?? newStage;
      notify.success("Card movido", `${clienteCard?.nome ?? "Lead"} → ${stageNome}`);
    } catch (err: unknown) {
      notify.warning("Falha ao mover", err instanceof Error ? err.message : "Tente novamente");
      return;
    }

    if (newStage === "proposta") {
      const cliente = clientesMap.get(card.clienteId);
      if (cliente) {
        const params = new URLSearchParams({
          nome: cliente.nome,
          consumo: String(cliente.consumoMedio),
          tarifa: String(cliente.tarifa),
          kwp: String(card.potenciaKwp),
          valor: String(card.valorEstimado),
        });
        window.open(`/gerador-proposta.html?${params.toString()}`, "_blank");
      }
    }

    if (newStage === "contrato") {
      setContratoCardId(cardId);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1800px] mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Pipeline de Vendas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} oportunidades · arraste os cards entre etapas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNovoCardOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Novo card
          </button>
          <a
            href="/gerador-proposta.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-vert-dark text-vert-dark hover:bg-vert-soft text-sm font-semibold"
          >
            <ExternalLink className="h-4 w-4" />
            Gerador de Proposta
          </a>
        </div>
      </header>

      <div className="bg-card rounded-xl border border-border p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente ou cidade…"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted text-sm outline-none focus:bg-card border border-transparent focus:border-vert-light"
          />
        </div>
        <select value={filterConsultor} onChange={(e) => setFilterConsultor(e.target.value)} className="h-9 px-3 rounded-lg bg-muted text-sm outline-none border border-transparent focus:border-vert-light">
          <option value="">Todos consultores</option>
          {profiles.map((u) => (
            <option key={u.id} value={u.id}>{u.nome}</option>
          ))}
        </select>
        <select value={filterSeg} onChange={(e) => setFilterSeg(e.target.value)} className="h-9 px-3 rounded-lg bg-muted text-sm outline-none border border-transparent focus:border-vert-light">
          <option value="">Todos segmentos</option>
          <option value="residencial">Residencial</option>
          <option value="comercial">Comercial</option>
          <option value="agronegocio">Agronegócio</option>
          <option value="industrial">Industrial</option>
        </select>
        <select value={filterOrigem} onChange={(e) => setFilterOrigem(e.target.value)} className="h-9 px-3 rounded-lg bg-muted text-sm outline-none border border-transparent focus:border-vert-light">
          <option value="">Todas origens</option>
          <option value="trafego">Tráfego Pago</option>
          <option value="indicacao">Indicação</option>
          <option value="prospeccao">Prospecção</option>
          <option value="reativacao">Reativação</option>
          <option value="licitacao">Licitação</option>
        </select>
        {(filterConsultor || filterSeg || filterOrigem || busca) && (
          <button
            onClick={() => { setFilterConsultor(""); setFilterSeg(""); setFilterOrigem(""); setBusca(""); }}
            className="text-xs text-muted-foreground hover:text-foreground px-2"
          >
            Limpar
          </button>
        )}
      </div>

      {loadingCards ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-vert" />
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGES.map((s) => (
              <KanbanColumn
                key={s.id}
                stageId={s.id}
                cards={byStage[s.id] ?? []}
                slaDias={sla[s.id] ?? 999}
                clientesMap={clientesMap}
                profilesMap={profilesMap}
              />
            ))}
          </div>
          <DragOverlay>
            {activeCard ? (
              <KanbanCard
                card={activeCard}
                slaDias={sla[activeCard.stage] ?? 999}
                cliente={clientesMap.get(activeCard.clienteId)}
                consultor={profilesMap.get(activeCard.consultorId)}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <MotivoPerdaModal
        open={!!pendingMove}
        onClose={() => setPendingMove(null)}
        onConfirm={async (motivo) => {
          if (pendingMove) {
            try {
              await moveCard.mutateAsync({ id: pendingMove.cardId, stage: pendingMove.stage, motivoPerda: motivo });
              const card = cards.find((c) => c.id === pendingMove.cardId);
              const cli = clientesMap.get(card?.clienteId ?? "");
              notify.warning("Lead perdido", `${cli?.nome ?? "Lead"} · ${motivo}`);
            } catch (err: unknown) {
              notify.warning("Falha ao mover", err instanceof Error ? err.message : "Tente novamente");
            }
          }
          setPendingMove(null);
        }}
      />

      <GerarLinkProjetoModal
        open={!!contratoCardId}
        onClose={() => setContratoCardId(null)}
        cardId={contratoCardId}
      />

      <NovoCardModal open={novoCardOpen} onClose={() => setNovoCardOpen(false)} />
    </div>
  );
}
