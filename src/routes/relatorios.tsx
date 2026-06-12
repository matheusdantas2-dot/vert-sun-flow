import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { brl, num } from "@/lib/format";
import { STAGES } from "@/lib/types";
import { useMemo } from "react";

export const Route = createFileRoute("/relatorios")({
  component: Relatorios,
  head: () => ({ meta: [{ title: "Relatórios — VertCRM" }] }),
});

function Relatorios() {
  const propostas = useStore((s) => s.propostas);
  const cards = useStore((s) => s.cards);
  const usuarios = useStore((s) => s.usuarios);
  const produtos = useStore((s) => s.produtos);
  const metas = useStore((s) => s.metas);

  const calcTotal = (p: typeof propostas[number]) =>
    p.itens.reduce((a, it) => {
      const prod = produtos.find((x) => x.id === it.produtoId);
      return a + (it.precoUnitario ?? prod?.precoVenda ?? 0) * it.quantidade;
    }, 0);

  const stats = useMemo(() => {
    const aceitas = propostas.filter((p) => p.status === "aceita");
    const receita = aceitas.reduce((a, p) => a + calcTotal(p), 0);
    const conv = propostas.length ? (aceitas.length / propostas.length) * 100 : 0;
    const ticket = aceitas.length ? receita / aceitas.length : 0;
    return { receita, conv, ticket, total: propostas.length, aceitas: aceitas.length };
  }, [propostas]);

  const perdidos = cards.filter((c) => c.stage === "perdido");
  const motivosCount = perdidos.reduce<Record<string, number>>((acc, c) => {
    const m = c.motivoPerda ?? "Sem motivo";
    acc[m] = (acc[m] ?? 0) + 1;
    return acc;
  }, {});

  const exportPipelineCsv = () => {
    const rows = [
      ["Etapa", "Quantidade", "Valor total"],
      ...STAGES.map((s) => {
        const cs = cards.filter((c) => c.stage === s.id);
        return [s.nome, cs.length, brl(cs.reduce((a, c) => a + c.valorEstimado, 0))];
      }),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `pipeline-vert-${Date.now()}.csv`; a.click();
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Relatórios & Metas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Performance geral e análise de perdas</p>
        </div>
        <button onClick={exportPipelineCsv} className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-accent">Exportar CSV</button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4"><div className="text-[11px] uppercase text-muted-foreground">Receita realizada</div><div className="stat-number text-2xl text-vert mt-1">{brl(stats.receita)}</div></div>
        <div className="bg-card rounded-xl border border-border p-4"><div className="text-[11px] uppercase text-muted-foreground">Propostas geradas</div><div className="stat-number text-2xl mt-1">{num(stats.total)}</div></div>
        <div className="bg-card rounded-xl border border-border p-4"><div className="text-[11px] uppercase text-muted-foreground">Taxa de conversão</div><div className="stat-number text-2xl mt-1">{stats.conv.toFixed(1)}%</div></div>
        <div className="bg-card rounded-xl border border-border p-4"><div className="text-[11px] uppercase text-muted-foreground">Ticket médio</div><div className="stat-number text-2xl mt-1">{brl(stats.ticket)}</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-display font-bold text-base mb-3">Distribuição no funil</h2>
          <div className="space-y-2">
            {STAGES.map((s) => {
              const cs = cards.filter((c) => c.stage === s.id);
              const total = cs.reduce((a, c) => a + c.valorEstimado, 0);
              return (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.cor }} />
                  <span className="flex-1">{s.nome}</span>
                  <span className="text-muted-foreground tabular-nums">{cs.length}</span>
                  <span className="font-semibold tabular-nums w-28 text-right">{brl(total)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-display font-bold text-base mb-3">Análise de perdas ({perdidos.length})</h2>
          {Object.entries(motivosCount).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem perdas registradas.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(motivosCount).sort((a, b) => b[1] - a[1]).map(([m, c]) => {
                const pct = (c / perdidos.length) * 100;
                return (
                  <div key={m}>
                    <div className="flex justify-between text-sm mb-1"><span>{m}</span><span className="tabular-nums font-semibold">{c} · {pct.toFixed(0)}%</span></div>
                    <div className="h-2 bg-muted rounded overflow-hidden"><div className="h-full bg-rose-500" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-base mb-3">Metas mensais vs realizado</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { l: "Faturamento", r: stats.receita, m: metas.faturamentoMensal, fmt: brl },
            { l: "Propostas", r: stats.total, m: metas.propostasMensais, fmt: (v: number) => num(v) },
            { l: "Projetos ativados", r: cards.filter((c) => c.stage === "ativado").length, m: metas.projetosMensais, fmt: (v: number) => num(v) },
            { l: "kWp instalados", r: cards.filter((c) => c.stage === "ativado" || c.stage === "instalacao").reduce((a, c) => a + c.potenciaKwp, 0), m: metas.kwpMensais, fmt: (v: number) => `${num(v, 1)} kWp` },
          ].map((it) => {
            const pct = it.m > 0 ? Math.min(100, (it.r / it.m) * 100) : 0;
            return (
              <div key={it.l} className="border border-border rounded-lg p-3">
                <div className="text-[11px] text-muted-foreground uppercase">{it.l}</div>
                <div className="font-display font-extrabold text-lg mt-1">{it.fmt(it.r)}</div>
                <div className="text-[11px] text-muted-foreground">de {it.fmt(it.m)}</div>
                <div className="h-1.5 bg-muted rounded mt-2 overflow-hidden"><div className="h-full bg-vert" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
