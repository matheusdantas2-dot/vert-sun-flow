import { useDroppable } from "@dnd-kit/core";
import type { PipelineCard, StageId, Cliente } from "@/lib/types";
import type { Profile } from "@/lib/profiles.api";
import { STAGES } from "@/lib/types";
import { KanbanCard } from "./KanbanCard";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

export function KanbanColumn({
  stageId,
  cards,
  slaDias,
  clientesMap,
  profilesMap,
}: {
  stageId: StageId;
  cards: PipelineCard[];
  slaDias: number;
  clientesMap: Map<string, Cliente>;
  profilesMap: Map<string, Profile>;
}) {
  const stage = STAGES.find((s) => s.id === stageId)!;
  const { setNodeRef, isOver } = useDroppable({ id: stageId });
  const total = cards.reduce((a, c) => a + c.valorEstimado, 0);

  return (
    <div className="w-[290px] shrink-0 flex flex-col bg-muted/40 rounded-xl border border-border max-h-[calc(100vh-200px)]">
      <div className="px-3 pt-3 pb-2 sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: stage.cor }} />
          <h3 className="font-display font-bold text-[13px] uppercase tracking-wider">{stage.nome}</h3>
          <span className="ml-auto text-xs font-semibold text-muted-foreground tabular-nums">{cards.length}</span>
        </div>
        <div className="text-xs text-muted-foreground">{brl(total)}</div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 overflow-y-auto px-2 pb-3 space-y-2 transition-colors",
          isOver && "bg-vert-soft/60",
        )}
      >
        {cards.map((c) => (
          <KanbanCard
            key={c.id}
            card={c}
            slaDias={slaDias}
            cliente={clientesMap.get(c.clienteId)}
            consultor={profilesMap.get(c.consultorId)}
          />
        ))}
        {cards.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8 border-2 border-dashed border-border rounded-lg">
            Solte cards aqui
          </div>
        )}
      </div>
    </div>
  );
}
