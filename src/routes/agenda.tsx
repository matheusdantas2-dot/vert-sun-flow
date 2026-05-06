import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { dataHoraBR } from "@/lib/format";
import { Calendar, Phone, MessageCircle, MapPin, Users as UsersIcon, Wrench, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/agenda")({
  component: Agenda,
  head: () => ({ meta: [{ title: "Agenda — Vert CRM" }] }),
});

const ICON = {
  ligacao: Phone, whatsapp: MessageCircle, visita: MapPin, reuniao: UsersIcon,
  followup: ClipboardCheck, instalacao: Wrench, vistoria: ClipboardCheck,
} as const;

function Agenda() {
  const atividades = useStore((s) => s.atividades);
  const clientes = useStore((s) => s.clientes);
  const usuarios = useStore((s) => s.usuarios);
  const updateAtividade = useStore((s) => s.updateAtividade);

  const ordenadas = [...atividades].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje.getTime() + 86400000);

  const grupos = {
    hoje: ordenadas.filter((a) => { const d = new Date(a.data); return d >= hoje && d < amanha; }),
    proximas: ordenadas.filter((a) => new Date(a.data) >= amanha),
    passadas: ordenadas.filter((a) => new Date(a.data) < hoje),
  };

  const renderItem = (a: typeof atividades[number]) => {
    const cliente = clientes.find((c) => c.id === a.clienteId);
    const resp = usuarios.find((u) => u.id === a.responsavelId);
    const Icon = ICON[a.tipo];
    return (
      <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/30">
        <div className="w-9 h-9 rounded-lg bg-vert-soft text-vert-dark flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{a.titulo}</div>
          <div className="text-[11px] text-muted-foreground">{dataHoraBR(a.data)} · {cliente?.nome ?? "—"} · {resp?.nome}</div>
        </div>
        {a.status === "pendente" ? (
          <select value={a.status} onChange={(e) => updateAtividade(a.id, { status: e.target.value as typeof a.status })} className="text-xs bg-muted rounded px-2 py-1 border border-transparent">
            <option value="pendente">Pendente</option>
            <option value="realizada">Realizada</option>
            <option value="nao_atendeu">Não atendeu</option>
            <option value="reagendada">Reagendada</option>
          </select>
        ) : (
          <span className="text-xs px-2 py-1 rounded bg-vert-soft text-vert-dark capitalize">{a.status.replace("_", " ")}</span>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1300px] mx-auto">
      <header>
        <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Agenda & Atividades</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Tarefas, visitas e instalações</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-vert" /> Hoje ({grupos.hoje.length})</h2>
          <div className="space-y-2">{grupos.hoje.map(renderItem)}{grupos.hoje.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem atividades hoje.</p>}</div>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-display font-bold text-base mb-3">Próximas ({grupos.proximas.length})</h2>
          <div className="space-y-2">{grupos.proximas.map(renderItem)}{grupos.proximas.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nada agendado.</p>}</div>
        </section>
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-display font-bold text-base mb-3 text-muted-foreground">Passadas ({grupos.passadas.length})</h2>
          <div className="space-y-2">{grupos.passadas.slice(0, 10).map(renderItem)}</div>
        </section>
      </div>
    </div>
  );
}
