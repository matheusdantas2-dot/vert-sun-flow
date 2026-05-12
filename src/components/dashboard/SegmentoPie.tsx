import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useMemo } from "react";
import { SEGMENTOS_LABEL } from "@/lib/types";
import { useClientesQuery } from "@/lib/clientes.api";

const COLORS = ["#0d5234", "#2d9e64", "#5ee89a", "#a8e6c2"];

export function SegmentoPie() {
  const { data: clientes = [] } = useClientesQuery();

  const data = useMemo(() => {
    const map = new Map<string, number>();
    clientes.forEach((c) => map.set(c.segmento, (map.get(c.segmento) ?? 0) + 1));
    return Array.from(map.entries()).map(([k, v]) => ({
      name: SEGMENTOS_LABEL[k as keyof typeof SEGMENTOS_LABEL],
      value: v,
    }));
  }, [clientes]);

  const total = data.reduce((a, d) => a + d.value, 0);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full h-56 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e0e0d8" }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</span>
          <span className="font-display font-extrabold text-2xl text-vert-dark tabular-nums leading-none">
            {total}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-3 text-xs w-full px-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="text-muted-foreground truncate">{d.name}</span>
            <span className="ml-auto font-semibold tabular-nums">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
