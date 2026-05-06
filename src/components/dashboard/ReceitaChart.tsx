import { useStore } from "@/lib/store";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useMemo } from "react";
import { brl } from "@/lib/format";

export function ReceitaChart() {
  const propostas = useStore((s) => s.propostas);
  const produtos = useStore((s) => s.produtos);

  const data = useMemo(() => {
    const months = Array.from({ length: 12 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return { d, label: d.toLocaleDateString("pt-BR", { month: "short" }), receita: 0, propostas: 0 };
    });
    propostas.forEach((p) => {
      const dt = new Date(p.criadoEm);
      const idx = months.findIndex(
        (m) => m.d.getMonth() === dt.getMonth() && m.d.getFullYear() === dt.getFullYear(),
      );
      if (idx === -1) return;
      const total = p.itens.reduce((acc, it) => {
        const prod = produtos.find((x) => x.id === it.produtoId);
        const preco = it.precoUnitario ?? prod?.precoVenda ?? 0;
        return acc + preco * it.quantidade;
      }, 0);
      months[idx].propostas += 1;
      if (p.status === "aceita") months[idx].receita += total;
    });
    return months.map((m) => ({ mes: m.label, receita: m.receita, propostas: m.propostas }));
  }, [propostas, produtos]);

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
            formatter={(v: number) => brl(v)}
            labelStyle={{ fontWeight: 600 }}
          />
          <Area type="monotone" dataKey="receita" stroke="#0d5234" strokeWidth={2.5} fill="url(#grad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
