import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { brl, num } from "@/lib/format";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { FunilChart } from "@/components/dashboard/FunilChart";
import { ReceitaChart } from "@/components/dashboard/ReceitaChart";
import { SegmentoPie } from "@/components/dashboard/SegmentoPie";
import { RankingConsultores } from "@/components/dashboard/RankingConsultores";
import { Alertas } from "@/components/dashboard/Alertas";
import { DollarSign, FileText, TrendingUp, Zap, Wrench, Target } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Vert CRM" }] }),
});

function Dashboard() {
  const propostas = useStore((s) => s.propostas);
  const produtos = useStore((s) => s.produtos);
  const cards = useStore((s) => s.cards);
  const clientes = useStore((s) => s.clientes);
  const metas = useStore((s) => s.metas);

  const stats = useMemo(() => {
    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();
    const propostasMes = propostas.filter((p) => {
      const d = new Date(p.criadoEm);
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    });
    const aceitas = propostasMes.filter((p) => p.status === "aceita");
    const calcTotal = (p: typeof propostas[number]) =>
      p.itens.reduce((acc, it) => {
        const prod = produtos.find((x) => x.id === it.produtoId);
        return acc + (it.precoUnitario ?? prod?.precoVenda ?? 0) * it.quantidade;
      }, 0);
    const faturamento = aceitas.reduce((a, p) => a + calcTotal(p), 0);
    const conversao = propostasMes.length > 0 ? (aceitas.length / propostasMes.length) * 100 : 0;
    const ticketResid = (() => {
      const list = aceitas.filter((p) => clientes.find((c) => c.id === p.clienteId)?.segmento === "residencial");
      if (!list.length) return 0;
      return list.reduce((a, p) => a + calcTotal(p), 0) / list.length;
    })();
    const ticketCom = (() => {
      const list = aceitas.filter((p) => {
        const seg = clientes.find((c) => c.id === p.clienteId)?.segmento;
        return seg === "comercial" || seg === "industrial" || seg === "agronegocio";
      });
      if (!list.length) return 0;
      return list.reduce((a, p) => a + calcTotal(p), 0) / list.length;
    })();
    const kwpMes = cards
      .filter((c) => {
        if (c.stage !== "ativado" && c.stage !== "instalacao") return false;
        const d = new Date(c.diasNaEtapaDesde);
        return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
      })
      .reduce((a, c) => a + c.potenciaKwp, 0);
    const projetosAndamento = cards.filter((c) =>
      ["contrato", "homologacao", "instalacao"].includes(c.stage),
    ).length;

    return {
      faturamento,
      propostasMes: propostasMes.length,
      conversao,
      ticketResid,
      ticketCom,
      kwpMes,
      projetosAndamento,
    };
  }, [propostas, produtos, cards, clientes]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <header>
        <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Dashboard Executiva</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão completa do mês — Vert Energie</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          label="Faturamento do mês"
          value={brl(stats.faturamento)}
          sub={`Meta ${brl(metas.faturamentoMensal)}`}
          progress={(stats.faturamento / metas.faturamentoMensal) * 100}
          icon={DollarSign}
          accent="vert"
        />
        <KpiCard
          label="Propostas do mês"
          value={num(stats.propostasMes)}
          sub={`Meta ${metas.propostasMensais}`}
          progress={(stats.propostasMes / metas.propostasMensais) * 100}
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
          progress={(stats.kwpMes / metas.kwpMensais) * 100}
          icon={Zap}
        />
        <KpiCard label="Projetos em andamento" value={num(stats.projetosAndamento)} icon={Wrench} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-base">Receita realizada · 12 meses</h2>
            <span className="text-xs text-muted-foreground">Propostas aceitas</span>
          </div>
          <ReceitaChart />
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
