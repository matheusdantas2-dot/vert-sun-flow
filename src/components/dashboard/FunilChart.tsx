import { STAGES } from "@/lib/types";
import { useMemo } from "react";
import { useCardsQuery } from "@/lib/cards.api";

export function FunilChart() {
  const { data: cards = [] } = useCardsQuery();

  const data = useMemo(() => {
    return STAGES.filter((s) => s.id !== "perdido").map((s) => ({
      stage: s,
      count: cards.filter((c) => c.stage === s.id).length,
    }));
  }, [cards]);

  const max = Math.max(1, ...data.map((d) => d.count));
  const topo = data[0]?.count ?? 0;

  return (
    <div className="space-y-1.5">
      {data.map(({ stage, count }, idx) => {
        const pctTopo = topo > 0 ? (count / topo) * 100 : 0;
        const anterior = idx > 0 ? data[idx - 1].count : count;
        const conv = anterior > 0 ? (count / anterior) * 100 : 0;
        return (
          <div key={stage.id} className="flex items-center gap-2 group">
            <div className="text-[11px] w-24 truncate text-muted-foreground font-medium">{stage.nome}</div>
            <div className="flex-1 h-7 bg-muted/60 rounded-md relative overflow-hidden">
              <div
                className="h-full rounded-md transition-all flex items-center px-2"
                style={{
                  width: `${(count / max) * 100}%`,
                  background: `linear-gradient(90deg, ${stage.cor}, ${stage.cor}cc)`,
                  minWidth: count > 0 ? "28px" : "0",
                }}
              >
                {count > 0 && (
                  <span className="text-[10px] font-bold text-white/90 tabular-nums">
                    {pctTopo.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            <div className="text-xs font-semibold w-7 text-right tabular-nums">{count}</div>
            {idx > 0 && (
              <div
                className={`text-[10px] w-10 text-right tabular-nums font-semibold ${
                  conv >= 70 ? "text-emerald-600" : conv >= 40 ? "text-amber-600" : "text-rose-500"
                }`}
                title={`Conversão da etapa anterior`}
              >
                {conv.toFixed(0)}%
              </div>
            )}
            {idx === 0 && <div className="w-10" />}
          </div>
        );
      })}
      <div className="flex items-center justify-end gap-3 pt-2 mt-2 border-t border-border/60 text-[10px] text-muted-foreground">
        <span>% do topo</span>
        <span>·</span>
        <span>conversão entre etapas</span>
      </div>
    </div>
  );
}
