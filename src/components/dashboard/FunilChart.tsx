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

  return (
    <div className="space-y-2">
      {data.map(({ stage, count }) => (
        <div key={stage.id} className="flex items-center gap-3">
          <div className="text-xs w-32 truncate text-muted-foreground">{stage.nome}</div>
          <div className="flex-1 h-7 bg-muted rounded relative overflow-hidden">
            <div
              className="h-full rounded transition-all"
              style={{
                width: `${(count / max) * 100}%`,
                background: stage.cor,
                minWidth: count > 0 ? "20px" : "0",
              }}
            />
          </div>
          <div className="text-sm font-semibold w-8 text-right tabular-nums">{count}</div>
        </div>
      ))}
    </div>
  );
}
