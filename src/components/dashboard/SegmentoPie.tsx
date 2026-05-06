import { useStore } from "@/lib/store";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useMemo } from "react";
import { SEGMENTOS_LABEL } from "@/lib/types";

const COLORS = ["#0d5234", "#2d9e64", "#5ee89a", "#a8e6c2"];

export function SegmentoPie() {
  const clientes = useStore((s) => s.clientes);

  const data = useMemo(() => {
    const map = new Map<string, number>();
    clientes.forEach((c) => map.set(c.segmento, (map.get(c.segmento) ?? 0) + 1));
    return Array.from(map.entries()).map(([k, v]) => ({
      name: SEGMENTOS_LABEL[k as keyof typeof SEGMENTOS_LABEL],
      value: v,
    }));
  }, [clientes]);

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e0e0d8" }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs px-4">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="ml-auto font-semibold">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
