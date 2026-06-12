import { useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export type PeriodoTipo = "mes" | "mes_anterior" | "trimestre" | "ano" | "ano_anterior" | "custom";
export interface Periodo {
  tipo: PeriodoTipo;
  de: Date;
  ate: Date;
}

interface SeletorPeriodoProps {
  periodo: Periodo;
  onChange: (p: Periodo) => void;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function calcPeriodo(tipo: PeriodoTipo): Periodo {
  const hoje = new Date();
  switch (tipo) {
    case "mes":
      return {
        tipo,
        de: new Date(hoje.getFullYear(), hoje.getMonth(), 1),
        ate: endOfDay(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)),
      };
    case "mes_anterior":
      return {
        tipo,
        de: new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1),
        ate: endOfDay(new Date(hoje.getFullYear(), hoje.getMonth(), 0)),
      };
    case "trimestre":
      return {
        tipo,
        de: new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1),
        ate: endOfDay(hoje),
      };
    case "ano":
      return {
        tipo,
        de: new Date(hoje.getFullYear(), 0, 1),
        ate: endOfDay(hoje),
      };
    case "ano_anterior":
      return {
        tipo,
        de: new Date(hoje.getFullYear() - 1, 0, 1),
        ate: endOfDay(new Date(hoje.getFullYear() - 1, 11, 31)),
      };
    default:
      return {
        tipo: "custom",
        de: startOfDay(hoje),
        ate: endOfDay(hoje),
      };
  }
}

const OPTS: { id: PeriodoTipo; label: string }[] = [
  { id: "mes", label: "Este mês" },
  { id: "mes_anterior", label: "Mês anterior" },
  { id: "trimestre", label: "Trimestre" },
  { id: "ano", label: "Este ano" },
  { id: "ano_anterior", label: "Ano anterior" },
];

function toInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function SeletorPeriodo({ periodo, onChange }: SeletorPeriodoProps) {
  const [showCustom, setShowCustom] = useState(periodo.tipo === "custom");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1 flex-wrap">
        {OPTS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              setShowCustom(false);
              onChange(calcPeriodo(o.id));
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition",
              periodo.tipo === o.id
                ? "bg-vert text-white"
                : "bg-muted hover:bg-accent text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setShowCustom(true);
            onChange({ ...periodo, tipo: "custom" });
          }}
          className={cn(
            "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition",
            periodo.tipo === "custom"
              ? "bg-vert text-white"
              : "bg-muted hover:bg-accent text-foreground",
          )}
        >
          <Calendar className="h-3.5 w-3.5" />
          Customizar
        </button>
      </div>
      {(periodo.tipo === "custom" || showCustom) && (
        <div className="inline-flex items-center gap-2">
          <input
            type="date"
            value={toInput(periodo.de)}
            onChange={(e) =>
              onChange({
                tipo: "custom",
                de: startOfDay(new Date(e.target.value + "T00:00:00")),
                ate: periodo.ate,
              })
            }
            className="h-8 px-2 rounded-lg bg-muted text-sm border border-transparent focus:border-vert-light outline-none"
          />
          <span className="text-muted-foreground text-sm">até</span>
          <input
            type="date"
            value={toInput(periodo.ate)}
            onChange={(e) =>
              onChange({
                tipo: "custom",
                de: periodo.de,
                ate: endOfDay(new Date(e.target.value + "T00:00:00")),
              })
            }
            className="h-8 px-2 rounded-lg bg-muted text-sm border border-transparent focus:border-vert-light outline-none"
          />
        </div>
      )}
    </div>
  );
}
