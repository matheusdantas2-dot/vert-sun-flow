import { dataBR, diasEntre } from "@/lib/format";
import { AlertTriangle, Clock, CalendarClock, Wrench } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useCardsQuery } from "@/lib/cards.api";
import { useClientesQuery } from "@/lib/clientes.api";
import { usePropostasQuery } from "@/lib/propostas.api";
import { useAtividadesQuery } from "@/lib/atividades.api";
import { useConfigGlobalQuery } from "@/lib/config.api";

export function Alertas() {
  const { data: cards = [] } = useCardsQuery();
  const { data: clientes = [] } = useClientesQuery();
  const { data: propostas = [] } = usePropostasQuery();
  const { data: atividades = [] } = useAtividadesQuery();
  const { data: cfg } = useConfigGlobalQuery();
  const sla = cfg?.sla ?? {};

  const items = useMemo(() => {
    const list: { icon: typeof AlertTriangle; cor: string; titulo: string; sub: string; link: string }[] = [];

    cards.forEach((c) => {
      if (c.stage === "ativado" || c.stage === "perdido") return;
      const dias = diasEntre(c.diasNaEtapaDesde);
      const limite = sla[c.stage] ?? 999;
      if (dias > limite) {
        const cliente = clientes.find((x) => x.id === c.clienteId);
        list.push({
          icon: Clock,
          cor: "text-rose-600 bg-rose-50",
          titulo: `${cliente?.nome ?? "Cliente"} parado há ${dias}d em ${c.stage}`,
          sub: `SLA ${limite} dias`,
          link: cliente ? `/clientes/${cliente.id}` : "/pipeline",
        });
      }
    });

    propostas.forEach((p) => {
      if (p.status === "aceita" || p.status === "recusada" || p.status === "expirada") return;
      const venc = new Date(p.validadeAte);
      if (venc < new Date()) {
        const cliente = clientes.find((x) => x.id === p.clienteId);
        list.push({
          icon: AlertTriangle,
          cor: "text-amber-700 bg-amber-50",
          titulo: `Proposta ${p.numero} vencida`,
          sub: `${cliente?.nome ?? "—"} · venceu em ${dataBR(p.validadeAte)}`,
          link: `/propostas`,
        });
      }
    });

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const limiteAmanha = new Date(hoje.getTime() + 2 * 86400000);
    atividades.forEach((a) => {
      if (a.tipo !== "visita" || a.status !== "pendente") return;
      const dt = new Date(a.data);
      if (dt >= hoje && dt < limiteAmanha) {
        list.push({
          icon: CalendarClock,
          cor: "text-blue-700 bg-blue-50",
          titulo: a.titulo,
          sub: `Visita técnica em ${dataBR(a.data)}`,
          link: "/agenda",
        });
      }
    });

    cards.forEach((c) => {
      if (c.stage !== "instalacao") return;
      const dias = diasEntre(c.diasNaEtapaDesde);
      if (dias > (sla.instalacao ?? 20)) {
        const cliente = clientes.find((x) => x.id === c.clienteId);
        list.push({
          icon: Wrench,
          cor: "text-rose-600 bg-rose-50",
          titulo: `Instalação atrasada — ${cliente?.nome ?? "—"}`,
          sub: `${dias} dias em instalação`,
          link: cliente ? `/clientes/${cliente.id}` : "/pipeline",
        });
      }
    });

    return list.slice(0, 8);
  }, [cards, clientes, propostas, atividades, sla]);

  if (items.length === 0)
    return <div className="text-sm text-muted-foreground py-6 text-center">Nenhum alerta no momento. ✨</div>;

  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <Link
          key={i}
          to={it.link}
          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-vert-light hover:bg-vert-soft/30 transition-colors"
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${it.cor}`}>
            <it.icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{it.titulo}</div>
            <div className="text-[11px] text-muted-foreground">{it.sub}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
