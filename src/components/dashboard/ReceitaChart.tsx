import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useMemo } from "react";
import { brl } from "@/lib/format";
import { usePropostasQuery } from "@/lib/propostas.api";

interface ReceitaChartProps {
  periodo?: { de: Date; ate: Date };
}

export function ReceitaChart({ periodo }: ReceitaChartProps = {}) {
  const { data: propostas = [] } = usePropostasQuery();

  const data = useMemo(() => {
    // Determinar lista de meses
    let inicio: Date;
    let fim: Date;
    if (periodo) {
      inicio = new Date(periodo.de.getFullYear(), periodo.de.getMonth(), 1);
      fim = new Date(periodo.ate.getFullYear(), periodo.ate.getMonth(), 1);
    } else {
      const hoje = new Date();
      fim = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1);
    }
    const months: { d: Date; label: string; receita: number; propostas: number }[] = [];
    const cursor = new Date(inicio);
    while (cursor <= fim) {
      months.push({
        d: new Date(cursor),
        label: cursor.toLocaleDateString("pt-BR", { month: "short" }),
        receita: 0,
        propostas: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    propostas.forEach((p) => {
      const dt = new Date(p.criadoEm);
      const idx = months.findIndex(
        (m) => m.d.getMonth() === dt.getMonth() && m.d.getFullYear() === dt.getFullYear(),
      );
      if (idx === -1) return;
      const total = p.itens.reduce((acc, it) => acc + (it.precoUnitario ?? 0) * it.quantidade, 0);
      months[idx].propostas += 1;
      if (p.status === "aceita") months[idx].receita += total;
    });
    return months.map((m) => ({ mes: m.label, receita: m.receita, propostas: m.propostas }));
  }, [propostas, periodo]);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1a7a4a" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#1a7a4a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0d8" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#888" />
          <YAxis tick={{ fontSize: 11 }} stroke="#888" tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e0e0d8" }}
            formatter={(v) => brl(Number(v))}
            labelStyle={{ fontWeight: 600 }}
          />
          <Area type="monotone" dataKey="receita" stroke="#0d5234" strokeWidth={2.5} fill="url(#grad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
