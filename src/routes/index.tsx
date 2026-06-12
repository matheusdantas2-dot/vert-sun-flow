import { createFileRoute } from "@tanstack/react-router";
import { brl, num } from "@/lib/format";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { FunilChart } from "@/components/dashboard/FunilChart";
import { ReceitaChart } from "@/components/dashboard/ReceitaChart";
import { SegmentoPie } from "@/components/dashboard/SegmentoPie";
import { RankingConsultores } from "@/components/dashboard/RankingConsultores";
import { Alertas } from "@/components/dashboard/Alertas";
import { SeletorPeriodo, calcPeriodo, type Periodo } from "@/components/dashboard/SeletorPeriodo";
import { DollarSign, FileText, TrendingUp, Zap, Wrench, Target } from "lucide-react";
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
    const dentro = (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= deTs && t <= ateTs;
    };
    const propostasMes = propostas.filter((p) => dentro(p.criadoEm));
    const aceitas = propostasMes.filter((p) => p.status === "aceita");
    const calcTotal = (p: typeof propostas[number]) =>
      p.itens.reduce((acc, it) => acc + (it.precoUnitario ?? 0) * it.quantidade, 0);
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
        return dentro(c.diasNaEtapaDesde);
      })
      .reduce((a, c) => a + c.potenciaKwp, 0);
    const projetosAndamento = cards.filter((c) =>
      ["contrato", "homologacao", "instalacao"].includes(c.stage),
    ).length;

    return { faturamento, propostasMes: propostasMes.length, conversao, ticketResid, kwpMes, projetosAndamento };
  }, [propostas, cards, clientes, periodo]);

  const safePerc = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <header>
        <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Dashboard Executiva</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {periodo.de.toLocaleDateString("pt-BR")} – {periodo.ate.toLocaleDateString("pt-BR")} · Vert Energie
        </p>
      </header>

      <SeletorPeriodo periodo={periodo} onChange={setPeriodo} />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          label="Faturamento"
          value={brl(stats.faturamento)}
          sub={`Meta ${brl(metas.faturamentoMensal)}`}
          progress={safePerc(stats.faturamento, metas.faturamentoMensal)}
          icon={DollarSign}
          accent="vert"
        />
        <KpiCard
          label="Propostas"
          value={num(stats.propostasMes)}
          sub={`Meta ${metas.propostasMensais}`}
          progress={safePerc(stats.propostasMes, metas.propostasMensais)}
          icon={FileText}
        />
        <KpiCard
          label="Taxa de conversão"
          value={`${stats.conversao.toFixed(1)}%`}
          sub="Propostas → Aceitas"
          icon={TrendingUp}
        />
        <KpiCard label="Ticket Residencial" value={brl(stats.ticketResid)} icon={Target} />
        <KpiCard
          label="kWp instalados"
          value={`${num(stats.kwpMes, 1)}`}
          sub={`Meta ${metas.kwpMensais} kWp`}
          progress={safePerc(stats.kwpMes, metas.kwpMensais)}
          icon={Zap}
        />
        <KpiCard label="Projetos em andamento" value={num(stats.projetosAndamento)} icon={Wrench} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-base">Receita realizada</h2>
            <span className="text-xs text-muted-foreground">Propostas aceitas</span>
          </div>
          <ReceitaChart periodo={{ de: periodo.de, ate: periodo.ate }} />
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-display font-bold text-base mb-4">Funil de Conversão</h2>
          <FunilChart />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-display font-bold text-base mb-2">Distribuição por Segmento</h2>
          <SegmentoPie />
        </div>
        <div className="bg-card rounded-xl border border-border p-5 lg:col-span-2">
          <h2 className="font-display font-bold text-base mb-3">Ranking de Consultores</h2>
          <RankingConsultores />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-base mb-3">Alertas e Ações Necessárias</h2>
        <Alertas />
      </div>
    </div>
  );
}
