import { createFileRoute } from "@tanstack/react-router";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useStore } from "@/lib/store";
import { STAGES, type StageId } from "@/lib/types";
import { KanbanColumn } from "@/components/pipeline/KanbanColumn";
import { KanbanCard } from "@/components/pipeline/KanbanCard";
import { MotivoPerdaModal } from "@/components/pipeline/MotivoPerdaModal";
import { GerarLinkProjetoModal } from "@/components/pipeline/GerarLinkProjetoModal";
import { useMemo, useState } from "react";
import { Search, ExternalLink } from "lucide-react";
import { usePode } from "@/lib/permissoes";
import { notify } from "@/lib/notificacoes";

export const Route = createFileRoute("/pipeline")({
  component: Pipeline,
  head: () => ({ meta: [{ title: "Pipeline — Vert CRM" }] }),
});

function Pipeline() {
  const cards = useStore((s) => s.cards);
  const clientes = useStore((s) => s.clientes);
  const usuarios = useStore((s) => s.usuarios);
  const sla = useStore((s) => s.sla);
  const moveCard = useStore((s) => s.moveCard);
  const podeMover = usePode("mover_card");

  const [filterConsultor, setFilterConsultor] = useState("");
  const [filterSeg, setFilterSeg] = useState("");
  const [filterOrigem, setFilterOrigem] = useState("");
  const [busca, setBusca] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ cardId: string; stage: StageId } | null>(null);
  const [contratoCardId, setContratoCardId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (filterConsultor && c.consultorId !== filterConsultor) return false;
      if (filterOrigem && c.origem !== filterOrigem) return false;
      const cliente = clientes.find((cl) => cl.id === c.clienteId);
      if (!cliente) return false;
      if (filterSeg && cliente.segmento !== filterSeg) return false;
      if (busca) {
        const s = busca.toLowerCase();
        if (!cliente.nome.toLowerCase().includes(s) && !cliente.endereco.cidade.toLowerCase().includes(s))
          return false;
      }
      return true;
    });
  }, [cards, clientes, filterConsultor, filterSeg, filterOrigem, busca]);

  const byStage = useMemo(() => {
    const m: Record<string, typeof cards> = {};
    STAGES.forEach((s) => (m[s.id] = []));
    filtered.forEach((c) => m[c.stage]?.push(c));
    return m;
  }, [filtered]);

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
  const handleDragEnd = (e: DragEndEvent) => {
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
    moveCard(cardId, newStage);
    const clienteCard = clientes.find((c) => c.id === card.clienteId);
    const stageNome = STAGES.find((s) => s.id === newStage)?.nome ?? newStage;
    notify.success("Card movido", `${clienteCard?.nome ?? "Lead"} → ${stageNome}`);

    if (newStage === "proposta") {
      const cliente = clientes.find((c) => c.id === card.clienteId);
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
        <a
          href="/gerador-proposta.html"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-vert-dark text-vert-dark hover:bg-vert-soft text-sm font-semibold"
        >
          <ExternalLink className="h-4 w-4" />
          Gerador de Proposta
        </a>
      </header>

      {/* Filtros */}
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
          {usuarios.filter((u) => u.perfil !== "instalador").map((u) => (
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

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((s) => (
            <KanbanColumn key={s.id} stageId={s.id} cards={byStage[s.id] ?? []} slaDias={sla[s.id] ?? 999} />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? <KanbanCard card={activeCard} slaDias={sla[activeCard.stage] ?? 999} /> : null}
        </DragOverlay>
      </DndContext>

      <MotivoPerdaModal
        open={!!pendingMove}
        onClose={() => setPendingMove(null)}
        onConfirm={(motivo) => {
          if (pendingMove) {
            moveCard(pendingMove.cardId, pendingMove.stage, motivo);
            const card = cards.find((c) => c.id === pendingMove.cardId);
            const cli = clientes.find((c) => c.id === card?.clienteId);
            notify.warning("Lead perdido", `${cli?.nome ?? "Lead"} · ${motivo}`);
          }
          setPendingMove(null);
        }}
      />
    </div>
  );
}
