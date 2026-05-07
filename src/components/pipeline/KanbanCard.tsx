import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { PipelineCard, StageId } from "@/lib/types";
import { ORIGEM_LABEL, SEGMENTOS_LABEL } from "@/lib/types";
import { useStore } from "@/lib/store";
import { brl, kwp, initials, diasEntre } from "@/lib/format";
import { Phone, MessageCircle, ExternalLink, Megaphone, UserPlus, Repeat, Briefcase, GripVertical } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const ORIGEM_ICON = {
  trafego: Megaphone,
  indicacao: UserPlus,
  prospeccao: Phone,
  reativacao: Repeat,
  licitacao: Briefcase,
};

export function KanbanCard({ card, slaDias }: { card: PipelineCard; slaDias: number }) {
  const cliente = useStore((s) => s.clientes.find((c) => c.id === card.clienteId));
  const consultor = useStore((s) => s.usuarios.find((u) => u.id === card.consultorId));
  const navigate = useNavigate();

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });

  const dias = diasEntre(card.diasNaEtapaDesde);
  const atrasado = dias > slaDias && card.stage !== "ativado" && card.stage !== "perdido";
  const OrigemIcon = ORIGEM_ICON[card.origem];

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  if (!cliente) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if (isDragging) return;
        if ((e.target as HTMLElement).closest("a,button")) return;
        navigate({ to: "/pipeline/card/$cardId", params: { cardId: card.id } });
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate({ to: "/pipeline/card/$cardId", params: { cardId: card.id } });
        }
      }}
      className={cn(
        "bg-card rounded-lg border p-3 shadow-sm cursor-pointer hover:shadow-md transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vert-light",
        atrasado ? "border-l-[3px] border-l-rose-500 border-y-border border-r-border" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{cliente.nome}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {cliente.endereco.cidade}/{cliente.endereco.uf} · {SEGMENTOS_LABEL[cliente.segmento]}
          </div>
        </div>
        {consultor && (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
            style={{ backgroundColor: consultor.cor }}
            title={consultor.nome}
          >
            {initials(consultor.nome)}
          </div>
        )}
        <button
          type="button"
          {...listeners}
          {...attributes}
          className="-mr-1 p-1 rounded text-muted-foreground hover:bg-accent hover:text-foreground cursor-grab active:cursor-grabbing"
          title="Arrastar card"
          aria-label="Arrastar card"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-baseline gap-2 mt-2">
        <div className="font-display font-extrabold text-base text-vert-dark">{brl(card.valorEstimado)}</div>
        <div className="text-[11px] text-muted-foreground">{kwp(card.potenciaKwp)}</div>
      </div>

      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <OrigemIcon className="h-3 w-3" />
          <span title={ORIGEM_LABEL[card.origem]}>{ORIGEM_LABEL[card.origem].split(" ")[0]}</span>
          <span>·</span>
          <span className={cn("tabular-nums", atrasado && "text-rose-600 font-semibold")}>
            {dias}d
          </span>
        </div>
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <a
            href={`tel:+55${cliente.telefone.replace(/\D/g, "")}`}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-vert"
            title="Ligar"
          >
            <Phone className="h-3.5 w-3.5" />
          </a>
          <a
            href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-vert"
            title="WhatsApp"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
          <Link
            to="/clientes/$id"
            params={{ id: cliente.id }}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-vert"
            title="Detalhes"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {card.motivoPerda && (
        <div className="text-[11px] text-rose-700 bg-rose-50 rounded px-2 py-1 mt-2">
          ✗ {card.motivoPerda}
        </div>
      )}
    </div>
  );
}
