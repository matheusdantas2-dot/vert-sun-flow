import { createFileRoute } from "@tanstack/react-router";
import { brl, num } from "@/lib/format";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { FunilChart } from "@/components/dashboard/FunilChart";
import { ReceitaChart } from "@/components/dashboard/ReceitaChart";
import { SegmentoPie } from "@/components/dashboard/SegmentoPie";
import { RankingConsultores } from "@/components/dashboard/RankingConsultores";
import { Alertas } from "@/components/dashboard/Alertas";
import { SeletorPeriodo, calcPeriodo, type Periodo } from "@/components/dashboard/SeletorPeriodo";
import { DollarSign, FileText, TrendingUp, Zap, Wrench, Target, Activity } from "lucide-react";
import { useMemo, useState } from "react";
import { usePropostasQuery } from "@/lib/propostas.api";
import { useCardsQuery, useCardsRealtime } from "@/lib/cards.api";
import { useClientesQuery } from "@/lib/clientes.api";
import { useConfigGlobalQuery } from "@/lib/config.api";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — VertCRM" }] }),
});

function Dashboard() {
  const { data: propostas = [] } = usePropostasQuery();
  const { data: cards = [] } = useCardsQuery();
  const { data: clientes = [] } = useClientesQuery();
  const { data: cfg } = useConfigGlobalQuery();
  useCardsRealtime();

  const [periodo, setPeriodo] = useState<Periodo>(() => calcPeriodo("mes"));

  const metas = {
    faturamentoMensal: 0,
    propostasMensais: 0,
    projetosMensais: 0,
    kwpMensais: 0,
    ...(cfg?.metas ?? {}),
  };

  const stats = useMemo(() => {
    const deTs = periodo.de.getTime();
    const ateTs = periodo.ate.getTime();
    const durMs = Math.max(1, ateTs - deTs);
    const prevDe = new Date(deTs - durMs);
    const prevAte = new Date(deTs - 1);

    const inRange = (iso: string, de: Date, ate: Date) => {
      const t = new Date(iso).getTime();
      return t >= de.getTime() && t <= ate.getTime();
    };
    const calcTotal = (p: typeof propostas[number]) =>
      p.itens.reduce((acc, it) => acc + (it.precoUnitario ?? 0) * it.quantidade, 0);

    const compute = (de: Date, ate: Date) => {
      const propostasMes = propostas.filter((p) => inRange(p.criadoEm, de, ate));
      const aceitas = propostasMes.filter((p) => p.status === "aceita");
      const faturamento = aceitas.reduce((a, p) => a + calcTotal(p), 0);
      const conversao = propostasMes.length > 0 ? (aceitas.length / propostasMes.length) * 100 : 0;
      const ticketResid = (() => {
        const list = aceitas.filter(
          (p) => clientes.find((c) => c.id === p.clienteId)?.segmento === "residencial",
        );
        if (!list.length) return 0;
        return list.reduce((a, p) => a + calcTotal(p), 0) / list.length;
      })();
      const kwpMes = cards
        .filter((c) => {
          if (c.stage !== "ativado" && c.stage !== "instalacao") return false;
          return inRange(c.diasNaEtapaDesde, de, ate);
        })
        .reduce((a, c) => a + c.potenciaKwp, 0);
      return { faturamento, propostasMes: propostasMes.length, conversao, ticketResid, kwpMes };
    };

    const cur = compute(periodo.de, periodo.ate);
    const prev = compute(prevDe, prevAte);

    const projetosAndamento = cards.filter((c) =>
      ["contrato", "homologacao", "instalacao"].includes(c.stage),
    ).length;

    const delta = (a: number, b: number) => {
      if (b === 0) return a > 0 ? 100 : null;
      return ((a - b) / b) * 100;
    };

    // sparklines: 8 buckets dentro do período
    const buckets = 8;
    const stepMs = durMs / buckets;
    const sparkReceita: number[] = Array(buckets).fill(0);
    const sparkPropostas: number[] = Array(buckets).fill(0);
    const sparkKwp: number[] = Array(buckets).fill(0);
    propostas.forEach((p) => {
      const t = new Date(p.criadoEm).getTime();
      if (t < deTs || t > ateTs) return;
      const idx = Math.min(buckets - 1, Math.floor((t - deTs) / stepMs));
      sparkPropostas[idx] += 1;
      if (p.status === "aceita") sparkReceita[idx] += calcTotal(p);
    });
    cards.forEach((c) => {
      if (c.stage !== "ativado" && c.stage !== "instalacao") return;
      const t = new Date(c.diasNaEtapaDesde).getTime();
      if (t < deTs || t > ateTs) return;
      const idx = Math.min(buckets - 1, Math.floor((t - deTs) / stepMs));
      sparkKwp[idx] += c.potenciaKwp;
    });

    return {
      ...cur,
      projetosAndamento,
      d_faturamento: delta(cur.faturamento, prev.faturamento),
      d_propostas: delta(cur.propostasMes, prev.propostasMes),
      d_conv: delta(cur.conversao, prev.conversao),
      d_ticket: delta(cur.ticketResid, prev.ticketResid),
      d_kwp: delta(cur.kwpMes, prev.kwpMes),
      sparkReceita,
      sparkPropostas,
      sparkKwp,
    };
  }, [propostas, cards, clientes, periodo]);

  const safePerc = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* HERO */}
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-vert">
            <Activity className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-[0.14em]">Visão executiva</span>
          </div>
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight mt-1">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {periodo.de.toLocaleDateString("pt-BR")} – {periodo.ate.toLocaleDateString("pt-BR")} · Vert Energie
          </p>
        </div>
        <SeletorPeriodo periodo={periodo} onChange={setPeriodo} />
      </header>

      {/* KPI HERO ROW — métricas financeiras destacadas */}
      <section>
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2 px-1">
          Performance financeira
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard
            label="Faturamento"
            value={brl(stats.faturamento)}
            sub={`Meta ${brl(metas.faturamentoMensal)}`}
            progress={safePerc(stats.faturamento, metas.faturamentoMensal)}
            delta={stats.d_faturamento}
            icon={DollarSign}
            accent="vert"
            spark={stats.sparkReceita}
          />
          <KpiCard
            label="Taxa de conversão"
            value={`${stats.conversao.toFixed(1)}%`}
            sub="Propostas → Aceitas"
            delta={stats.d_conv}
            icon={TrendingUp}
            accent="blue"
          />
          <KpiCard
            label="Ticket Residencial"
            value={brl(stats.ticketResid)}
            sub="Média por contrato"
            delta={stats.d_ticket}
            icon={Target}
            accent="amber"
          />
        </div>
      </section>

      {/* KPI OPERACIONAIS */}
      <section>
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2 px-1">
          Operação & Pipeline
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KpiCard
            label="Propostas emitidas"
            value={num(stats.propostasMes)}
            sub={`Meta ${metas.propostasMensais}`}
            progress={safePerc(stats.propostasMes, metas.propostasMensais)}
            delta={stats.d_propostas}
            icon={FileText}
            spark={stats.sparkPropostas}
          />
          <KpiCard
            label="kWp instalados"
            value={`${num(stats.kwpMes, 1)}`}
            sub={`Meta ${metas.kwpMensais} kWp`}
            progress={safePerc(stats.kwpMes, metas.kwpMensais)}
            delta={stats.d_kwp}
            icon={Zap}
            spark={stats.sparkKwp}
          />
          <KpiCard
            label="Projetos em andamento"
            value={num(stats.projetosAndamento)}
            sub="Contrato → Instalação"
            icon={Wrench}
          />
        </div>
      </section>

      {/* CHARTS PRIMARY */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 lg:col-span-2 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-base">Receita realizada</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Evolução mensal das propostas aceitas</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-vert bg-vert-soft px-2 py-1 rounded">
              Aceitas
            </span>
          </div>
          <ReceitaChart periodo={{ de: periodo.de, ate: periodo.ate }} />
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="mb-4">
            <h2 className="font-display font-bold text-base">Funil de Conversão</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Cards ativos por etapa</p>
          </div>
          <FunilChart />
        </div>
      </section>

      {/* SECONDARY */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="mb-3">
            <h2 className="font-display font-bold text-base">Distribuição por Segmento</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Base de clientes</p>
          </div>
          <SegmentoPie />
        </div>
        <div className="bg-card rounded-xl border border-border p-5 lg:col-span-2 shadow-sm hover:shadow-md transition-shadow">
          <div className="mb-3">
            <h2 className="font-display font-bold text-base">Ranking de Consultores</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Performance da equipe no período</p>
          </div>
          <RankingConsultores />
        </div>
      </section>

      {/* ALERTAS */}
      <section className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display font-bold text-base">Alertas e Ações Necessárias</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Itens que precisam de atenção</p>
          </div>
        </div>
        <Alertas />
      </section>
    </div>
  );
}
