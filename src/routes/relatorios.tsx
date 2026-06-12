import { createFileRoute } from "@tanstack/react-router";
import { brl, num } from "@/lib/format";
import { STAGES } from "@/lib/types";
import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { usePropostasQuery } from "@/lib/propostas.api";
import { useCardsQuery } from "@/lib/cards.api";
import { useProfilesQuery } from "@/lib/profiles.api";
import { useProdutosQuery } from "@/lib/produtos.api";
import { useClientesQuery } from "@/lib/clientes.api";
import { useConfigGlobalQuery } from "@/lib/config.api";
import { SeletorPeriodo, calcPeriodo, type Periodo } from "@/components/dashboard/SeletorPeriodo";
import { exportPipelineCsv, exportPropostasCsv } from "@/lib/exportCsv";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/relatorios")({
  component: Relatorios,
  head: () => ({ meta: [{ title: "Relatórios — VertCRM" }] }),
});

function Relatorios() {
  const { data: propostas = [] } = usePropostasQuery();
  const { data: cards = [] } = useCardsQuery();
  const { data: profiles = [] } = useProfilesQuery();
  const { data: produtos = [] } = useProdutosQuery();
  const { data: clientes = [] } = useClientesQuery();
  const { data: cfg } = useConfigGlobalQuery();

  const [periodo, setPeriodo] = useState<Periodo>(() => calcPeriodo("mes"));
  const [filtroConsultor, setFiltroConsultor] = useState<string | null>(null);

  const metas = {
    faturamentoMensal: 0,
    propostasMensais: 0,
    projetosMensais: 0,
    kwpMensais: 0,
    ...(cfg?.metas ?? {}),
  };

  const calcTotal = (p: typeof propostas[number]) =>
    p.itens.reduce((a, it) => {
      const prod = produtos.find((x) => x.id === it.produtoId);
      return a + (it.precoUnitario ?? prod?.precoVenda ?? 0) * it.quantidade;
    }, 0);

  const deTs = periodo.de.getTime();
  const ateTs = periodo.ate.getTime();
  const dentro = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= deTs && t <= ateTs;
  };

  const propostasPeriodo = useMemo(
    () => propostas.filter((p) => dentro(p.criadoEm)),
    [propostas, deTs, ateTs],
  );
  const cardsPeriodo = useMemo(
    () => cards.filter((c) => dentro(c.criadoEm ?? c.diasNaEtapaDesde)),
    [cards, deTs, ateTs],
  );

  const stats = useMemo(() => {
    const aceitas = propostasPeriodo.filter((p) => p.status === "aceita");
    const receita = aceitas.reduce((a, p) => a + calcTotal(p), 0);
    const conv = propostasPeriodo.length ? (aceitas.length / propostasPeriodo.length) * 100 : 0;
    const ticket = aceitas.length ? receita / aceitas.length : 0;
    return { receita, conv, ticket, total: propostasPeriodo.length, aceitas: aceitas.length };
  }, [propostasPeriodo, produtos]);

  const perdidos = cardsPeriodo.filter((c) => c.stage === "perdido");
  const motivosCount = perdidos.reduce<Record<string, number>>((acc, c) => {
    const m = c.motivoPerda ?? "Sem motivo";
    acc[m] = (acc[m] ?? 0) + 1;
    return acc;
  }, {});

  // Conversão por consultor
  const consultoresStats = useMemo(() => {
    return profiles
      .map((p) => {
        const meusPropostas = propostasPeriodo.filter((pr) => pr.consultorId === p.id);
        const aceitas = meusPropostas.filter((pr) => pr.status === "aceita");
        const receita = aceitas.reduce((a, pr) => a + calcTotal(pr), 0);
        const taxa = meusPropostas.length ? (aceitas.length / meusPropostas.length) * 100 : 0;
        const ticket = aceitas.length ? receita / aceitas.length : 0;
        return {
          consultor: p,
          geradas: meusPropostas.length,
          aceitas: aceitas.length,
          taxa,
          receita,
          ticket,
        };
      })
      .filter((c) => c.geradas > 0)
      .sort((a, b) => b.receita - a.receita);
  }, [profiles, propostasPeriodo, produtos]);

  // kWp por mês — últimos 12 meses
  const kwpPorMes = useMemo(() => {
    const hoje = new Date();
    const months = Array.from({ length: 12 }).map((_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1);
      return {
        d,
        label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        kwp: 0,
      };
    });
    cards
      .filter((c) => c.stage === "ativado")
      .forEach((c) => {
        const dt = new Date(c.diasNaEtapaDesde);
        const idx = months.findIndex(
          (m) => m.d.getMonth() === dt.getMonth() && m.d.getFullYear() === dt.getFullYear(),
        );
        if (idx !== -1) months[idx].kwp += c.potenciaKwp;
      });
    return months.map((m) => ({ mes: m.label, kwp: Math.round(m.kwp * 10) / 10 }));
  }, [cards]);

  const filtroConsultorObj = filtroConsultor
    ? profiles.find((p) => p.id === filtroConsultor)
    : null;

  const funilFiltrado = filtroConsultor
    ? cardsPeriodo.filter((c) => c.consultorId === filtroConsultor)
    : cardsPeriodo;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">
            Relatórios & Metas
          </h1>
          <p className="text-sm text-muted-foreground">
            {periodo.de.toLocaleDateString("pt-BR")} – {periodo.ate.toLocaleDateString("pt-BR")} ·
            Vert Energie
          </p>
          <SeletorPeriodo periodo={periodo} onChange={setPeriodo} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportPipelineCsv(cards, clientes, profiles)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-accent"
          >
            <Download className="h-4 w-4" /> Exportar Pipeline
          </button>
          <button
            onClick={() => exportPropostasCsv(propostas, clientes)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-accent"
          >
            <FileText className="h-4 w-4" /> Exportar Propostas
          </button>
        </div>
      </header>

      {filtroConsultorObj && (
        <div className="bg-vert-soft border border-vert-light rounded-lg px-3 py-2 text-sm flex items-center justify-between">
          <span>
            Filtrando funil por <strong>{filtroConsultorObj.nome}</strong>
          </span>
          <button
            onClick={() => setFiltroConsultor(null)}
            className="text-xs font-semibold text-vert-dark hover:underline"
          >
            Limpar filtro
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-[11px] uppercase text-muted-foreground">Receita realizada</div>
          <div className="stat-number text-2xl text-vert mt-1">{brl(stats.receita)}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-[11px] uppercase text-muted-foreground">Propostas geradas</div>
          <div className="stat-number text-2xl mt-1">{num(stats.total)}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-[11px] uppercase text-muted-foreground">Taxa de conversão</div>
          <div className="stat-number text-2xl mt-1">{stats.conv.toFixed(1)}%</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-[11px] uppercase text-muted-foreground">Ticket médio</div>
          <div className="stat-number text-2xl mt-1">{brl(stats.ticket)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-display font-bold text-base mb-3">Distribuição no funil</h2>
          <div className="space-y-2">
            {STAGES.map((s) => {
              const cs = funilFiltrado.filter((c) => c.stage === s.id);
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
          <h2 className="font-display font-bold text-base mb-3">
            Análise de perdas ({perdidos.length})
          </h2>
          {Object.entries(motivosCount).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem perdas registradas.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(motivosCount)
                .sort((a, b) => b[1] - a[1])
                .map(([m, c]) => {
                  const pct = (c / perdidos.length) * 100;
                  return (
                    <div key={m}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{m}</span>
                        <span className="tabular-nums font-semibold">
                          {c} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded overflow-hidden">
                        <div className="h-full bg-rose-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-base mb-3">Conversão por consultor</h2>
        {consultoresStats.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem propostas no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left font-semibold py-2">Consultor</th>
                  <th className="text-right font-semibold py-2">Propostas</th>
                  <th className="text-right font-semibold py-2">Aceitas</th>
                  <th className="text-right font-semibold py-2">Conversão</th>
                  <th className="text-right font-semibold py-2">Receita</th>
                  <th className="text-right font-semibold py-2">Ticket médio</th>
                </tr>
              </thead>
              <tbody>
                {consultoresStats.map((c) => (
                  <tr
                    key={c.consultor.id}
                    onClick={() => setFiltroConsultor(c.consultor.id)}
                    className="border-b border-border last:border-0 hover:bg-accent/40 cursor-pointer"
                  >
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: c.consultor.cor }}
                        >
                          {c.consultor.nome
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <span className="font-medium">{c.consultor.nome}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums">{c.geradas}</td>
                    <td className="py-2 text-right tabular-nums">{c.aceitas}</td>
                    <td className="py-2 text-right tabular-nums font-semibold">
                      {c.taxa.toFixed(1)}%
                    </td>
                    <td className="py-2 text-right tabular-nums font-semibold text-vert">
                      {brl(c.receita)}
                    </td>
                    <td className="py-2 text-right tabular-nums">{brl(c.ticket)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-base mb-3">kWp instalado por mês</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={kwpPorMes} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0d8" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#888" />
              <YAxis tick={{ fontSize: 11 }} stroke="#888" />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e0e0d8" }}
                formatter={(v) => `${v} kWp`}
              />
              <Bar dataKey="kwp" fill="var(--vert)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-base mb-3">Metas mensais vs realizado</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { l: "Faturamento", r: stats.receita, m: metas.faturamentoMensal, fmt: brl },
            { l: "Propostas", r: stats.total, m: metas.propostasMensais, fmt: (v: number) => num(v) },
            {
              l: "Projetos ativados",
              r: cardsPeriodo.filter((c) => c.stage === "ativado").length,
              m: metas.projetosMensais,
              fmt: (v: number) => num(v),
            },
            {
              l: "kWp instalados",
              r: cardsPeriodo
                .filter((c) => c.stage === "ativado" || c.stage === "instalacao")
                .reduce((a, c) => a + c.potenciaKwp, 0),
              m: metas.kwpMensais,
              fmt: (v: number) => `${num(v, 1)} kWp`,
            },
          ].map((it) => {
            const pct = it.m > 0 ? Math.min(100, (it.r / it.m) * 100) : 0;
            return (
              <div key={it.l} className="border border-border rounded-lg p-3">
                <div className="text-[11px] text-muted-foreground uppercase">{it.l}</div>
                <div className="font-display font-extrabold text-lg mt-1">{it.fmt(it.r)}</div>
                <div className="text-[11px] text-muted-foreground">de {it.fmt(it.m)}</div>
                <div className="h-1.5 bg-muted rounded mt-2 overflow-hidden">
                  <div className="h-full bg-vert" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
