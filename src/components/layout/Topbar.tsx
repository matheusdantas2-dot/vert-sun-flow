import { Bell, Search, AlertTriangle, CheckCircle2, Info, AlertCircle, Trash2, Clock, FileText, CalendarClock, Wrench, Inbox } from "lucide-react";
import { useStore } from "@/lib/store";
import { useNotificacoes } from "@/lib/notificacoes";
import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { initials, dataHoraBR } from "@/lib/format";

type Categoria = "sla" | "propostas" | "visitas" | "instalacoes" | "geral";
type NotifItem = {
  id: string;
  tipo: "info" | "success" | "warning" | "error";
  titulo: string;
  mensagem?: string;
  criadoEm: string;
  lida: boolean;
  link?: string;
  categoria: Categoria;
  urgencia: number; // 3=crítico, 2=alto, 1=médio, 0=info
};

const CATS: { id: "todas" | Categoria; label: string; icon: typeof Bell }[] = [
  { id: "todas", label: "Todas", icon: Inbox },
  { id: "sla", label: "SLA", icon: Clock },
  { id: "propostas", label: "Propostas", icon: FileText },
  { id: "visitas", label: "Visitas", icon: CalendarClock },
  { id: "instalacoes", label: "Instalação", icon: Wrench },
  { id: "geral", label: "Geral", icon: Info },
];

export function Topbar() {
  const [q, setQ] = useState("");
  const clientes = useStore((s) => s.clientes);
  const cards = useStore((s) => s.cards);
  const sla = useStore((s) => s.sla);
  const propostas = useStore((s) => s.propostas);
  const atividades = useStore((s) => s.atividades);

  const alertasVirtuais = useMemo<NotifItem[]>(() => {
    const lista: NotifItem[] = [];

    // SLA estourado
    cards.forEach((c) => {
      if (c.stage === "ativado" || c.stage === "perdido") return;
      const limite = sla[c.stage] ?? 999;
      const dias = Math.floor((Date.now() - new Date(c.diasNaEtapaDesde).getTime()) / 86400000);
      if (dias > limite) {
        const cliente = clientes.find((x) => x.id === c.clienteId);
        const excesso = dias - limite;
        lista.push({
          id: `sla-${c.id}`,
          tipo: excesso > limite ? "error" : "warning",
          titulo: `SLA estourado · ${cliente?.nome ?? "Lead"}`,
          mensagem: `${dias} dias em ${c.stage} (limite ${limite}d)`,
          criadoEm: c.diasNaEtapaDesde,
          lida: false,
          link: cliente ? `/clientes/${cliente.id}` : undefined,
          categoria: c.stage === "instalacao" ? "instalacoes" : "sla",
          urgencia: excesso > limite ? 3 : 2,
        });
      }
    });

    // Propostas vencidas / a vencer
    const agora = Date.now();
    propostas.forEach((p) => {
      if (p.status === "aceita" || p.status === "recusada" || p.status === "expirada") return;
      const venc = new Date(p.validadeAte).getTime();
      const cliente = clientes.find((x) => x.id === p.clienteId);
      const diasRest = Math.floor((venc - agora) / 86400000);
      if (venc < agora) {
        lista.push({
          id: `prop-venc-${p.id}`,
          tipo: "error",
          titulo: `Proposta ${p.numero} vencida`,
          mensagem: `${cliente?.nome ?? "—"} · venceu há ${Math.abs(diasRest)}d`,
          criadoEm: p.validadeAte,
          lida: false,
          link: "/propostas",
          categoria: "propostas",
          urgencia: 3,
        });
      } else if (diasRest <= 3) {
        lista.push({
          id: `prop-vencer-${p.id}`,
          tipo: "warning",
          titulo: `Proposta ${p.numero} vence em ${diasRest}d`,
          mensagem: cliente?.nome,
          criadoEm: new Date().toISOString(),
          lida: false,
          link: "/propostas",
          categoria: "propostas",
          urgencia: 2,
        });
      }
    });

    // Visitas hoje/amanhã
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const limiteAmanha = new Date(hoje.getTime() + 2 * 86400000);
    atividades.forEach((a) => {
      if (a.tipo !== "visita" || a.status !== "pendente") return;
      const dt = new Date(a.data);
      if (dt >= hoje && dt < limiteAmanha) {
        const isHoje = dt < new Date(hoje.getTime() + 86400000);
        lista.push({
          id: `visita-${a.id}`,
          tipo: "info",
          titulo: a.titulo,
          mensagem: isHoje ? "Visita técnica hoje" : "Visita técnica amanhã",
          criadoEm: a.data,
          lida: false,
          link: "/agenda",
          categoria: "visitas",
          urgencia: isHoje ? 2 : 1,
        });
      }
    });

    return lista;
  }, [cards, sla, clientes, propostas, atividades]);

  const notifs = useNotificacoes((s) => s.itens);
  const marcarTodasLidas = useNotificacoes((s) => s.marcarTodasLidas);
  const limpar = useNotificacoes((s) => s.limpar);

  const todas = useMemo<NotifItem[]>(() => {
    const geral: NotifItem[] = notifs.map((n) => ({
      id: n.id,
      tipo: n.tipo,
      titulo: n.titulo,
      mensagem: n.mensagem,
      criadoEm: n.criadoEm,
      lida: n.lida,
      link: n.link,
      categoria: "geral",
      urgencia: n.tipo === "error" ? 3 : n.tipo === "warning" ? 2 : n.tipo === "success" ? 1 : 0,
    }));
    return [...alertasVirtuais, ...geral].sort((a, b) => {
      if (b.urgencia !== a.urgencia) return b.urgencia - a.urgencia;
      return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
    });
  }, [alertasVirtuais, notifs]);

  const naoLidas = todas.filter((n) => !n.lida).length;
  const [aba, setAba] = useState<"todas" | Categoria>("todas");
  const visiveis = useMemo(() => aba === "todas" ? todas : todas.filter((n) => n.categoria === aba), [todas, aba]);
  const contagens = useMemo(() => {
    const m: Record<string, number> = { todas: todas.length };
    todas.forEach((n) => { m[n.categoria] = (m[n.categoria] ?? 0) + 1; });
    return m;
  }, [todas]);

  const [openNotif, setOpenNotif] = useState(false);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const s = q.toLowerCase();
    return clientes
      .filter((c) => c.nome.toLowerCase().includes(s) || c.endereco.cidade.toLowerCase().includes(s))
      .slice(0, 6);
  }, [q, clientes]);

  return (
    <header className="sticky top-0 z-20 bg-card/80 backdrop-blur border-b border-border">
      <div className="flex items-center gap-3 px-4 lg:px-6 h-[60px]">
        <div className="relative flex-1 max-w-xl ml-12 lg:ml-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente, cidade…"
            className="w-full h-10 pl-10 pr-3 rounded-lg bg-muted text-sm border border-transparent focus:border-primary focus:bg-card outline-none transition"
          />
          {results.length > 0 && (
            <div className="absolute top-12 left-0 right-0 bg-card border border-border rounded-lg shadow-xl py-1 z-30">
              {results.map((c) => (
                <Link
                  key={c.id}
                  to="/clientes/$id"
                  params={{ id: c.id }}
                  onClick={() => setQ("")}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-accent text-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-vert-soft text-vert-dark flex items-center justify-center text-xs font-bold">
                    {initials(c.nome)}
                  </div>
                  <div>
                    <div className="font-medium">{c.nome}</div>
                    <div className="text-xs text-muted-foreground">{c.endereco.cidade}/{c.endereco.uf}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => { setOpenNotif((v) => !v); if (!openNotif) marcarTodasLidas(); }}
            className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
            {naoLidas > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {naoLidas}
              </span>
            )}
          </button>
          {openNotif && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setOpenNotif(false)} />
              <div className="absolute right-0 top-12 w-[400px] max-w-[calc(100vw-1rem)] bg-card border border-border rounded-xl shadow-xl z-40 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div>
                    <div className="font-display font-bold text-sm">Notificações</div>
                    <div className="text-[11px] text-muted-foreground">{todas.length} no total · ordenadas por urgência</div>
                  </div>
                  {notifs.length > 0 && (
                    <button onClick={limpar} className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> limpar
                    </button>
                  )}
                </div>
                <div className="flex gap-1 px-2 py-2 border-b border-border overflow-x-auto">
                  {CATS.map((c) => {
                    const n = contagens[c.id] ?? 0;
                    if (c.id !== "todas" && n === 0) return null;
                    const ativo = aba === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setAba(c.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                          ativo ? "bg-vert text-white" : "text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        <c.icon className="h-3 w-3" />
                        {c.label}
                        <span className={`text-[10px] px-1 rounded ${ativo ? "bg-white/20" : "bg-muted"}`}>{n}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="max-h-[420px] overflow-y-auto">
                  {visiveis.length === 0 ? (
                    <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Nenhuma notificação nesta categoria.
                    </div>
                  ) : (
                    visiveis.map((n) => <NotifRow key={n.id} n={n} onClose={() => setOpenNotif(false)} />)
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <UserSwitcher />
      </div>
    </header>
  );
}

function NotifRow({ n }: { n: { id: string; tipo: string; titulo: string; mensagem?: string; criadoEm: string; link?: string } }) {
  const Icon = n.tipo === "error" ? AlertCircle
    : n.tipo === "warning" ? AlertTriangle
    : n.tipo === "success" ? CheckCircle2
    : Info;
  const cor = n.tipo === "error" ? "text-rose-600 bg-rose-50"
    : n.tipo === "warning" ? "text-amber-700 bg-amber-50"
    : n.tipo === "success" ? "text-vert bg-vert-soft"
    : "text-blue-600 bg-blue-50";
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-accent/40">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground truncate">{n.titulo}</div>
        {n.mensagem && <div className="text-xs text-muted-foreground line-clamp-2">{n.mensagem}</div>}
        <div className="text-[10px] text-muted-foreground mt-1">{dataHoraBR(n.criadoEm)}</div>
      </div>
    </div>
  );
}

function UserSwitcher() {
  const usuarios = useStore((s) => s.usuarios);
  const currentUserId = useStore((s) => s.currentUserId);
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const usuario = usuarios.find((u) => u.id === currentUserId);
  const [open, setOpen] = useState(false);
  if (!usuario) return null;
  return (
    <div className="relative pl-2 border-l border-border">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 hover:bg-accent rounded-lg p-1 pr-2">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: usuario.cor }}>
          {initials(usuario.nome)}
        </div>
        <div className="hidden md:block leading-tight text-left">
          <div className="text-sm font-semibold">{usuario.nome}</div>
          <div className="text-[11px] text-muted-foreground capitalize">{usuario.perfil}</div>
        </div>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 w-64 bg-card border border-border rounded-lg shadow-xl py-1 z-40">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">Trocar usuário (demo)</div>
            {usuarios.filter((u) => u.ativo).map((u) => (
              <button key={u.id} onClick={() => { setCurrentUser(u.id); setOpen(false); }} className={`flex items-center gap-2 w-full px-3 py-2 hover:bg-accent text-left ${u.id === currentUserId ? "bg-accent/50" : ""}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: u.cor }}>{initials(u.nome)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{u.nome}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">{u.perfil}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
