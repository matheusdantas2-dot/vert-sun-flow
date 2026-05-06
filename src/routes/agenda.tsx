import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useState, useMemo } from "react";
import { Calendar as CalIcon, Phone, MessageCircle, MapPin, Users as UsersIcon, Wrench, ClipboardCheck, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import type { Atividade } from "@/lib/types";
import { uid } from "@/lib/format";

export const Route = createFileRoute("/agenda")({
  component: Agenda,
  head: () => ({ meta: [{ title: "Agenda — Vert CRM" }] }),
});

const ICON = {
  ligacao: Phone, whatsapp: MessageCircle, visita: MapPin, reuniao: UsersIcon,
  followup: ClipboardCheck, instalacao: Wrench, vistoria: ClipboardCheck,
} as const;

const TIPO_LABEL: Record<Atividade["tipo"], string> = {
  ligacao: "Ligação", whatsapp: "WhatsApp", visita: "Visita técnica", reuniao: "Reunião",
  followup: "Follow-up", instalacao: "Instalação", vistoria: "Vistoria",
};

const TIPO_COR: Record<Atividade["tipo"], string> = {
  ligacao: "bg-blue-100 text-blue-700 border-blue-300",
  whatsapp: "bg-emerald-100 text-emerald-700 border-emerald-300",
  visita: "bg-amber-100 text-amber-700 border-amber-300",
  reuniao: "bg-purple-100 text-purple-700 border-purple-300",
  followup: "bg-slate-100 text-slate-700 border-slate-300",
  instalacao: "bg-vert-soft text-vert-dark border-vert-light",
  vistoria: "bg-rose-100 text-rose-700 border-rose-300",
};

type Modo = "mes" | "semana" | "dia";
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function Agenda() {
  const atividades = useStore((s) => s.atividades);
  const clientes = useStore((s) => s.clientes);
  const usuarios = useStore((s) => s.usuarios);
  const currentUserId = useStore((s) => s.currentUserId);
  const updateAtividade = useStore((s) => s.updateAtividade);
  const addAtividade = useStore((s) => s.addAtividade);
  const deleteAtividade = useStore((s) => s.deleteAtividade);

  const [modo, setModo] = useState<Modo>("mes");
  const [refDate, setRefDate] = useState(new Date());
  const [novoOpen, setNovoOpen] = useState<Date | null>(null);

  const titulo = useMemo(() => {
    if (modo === "mes") return `${MESES[refDate.getMonth()]} ${refDate.getFullYear()}`;
    if (modo === "semana") {
      const ini = new Date(refDate); ini.setDate(refDate.getDate() - refDate.getDay());
      const fim = new Date(ini); fim.setDate(ini.getDate() + 6);
      return `${ini.getDate()}/${ini.getMonth() + 1} – ${fim.getDate()}/${fim.getMonth() + 1} de ${fim.getFullYear()}`;
    }
    return refDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  }, [modo, refDate]);

  const navegar = (dir: -1 | 0 | 1) => {
    if (dir === 0) return setRefDate(new Date());
    const d = new Date(refDate);
    if (modo === "mes") d.setMonth(d.getMonth() + dir);
    else if (modo === "semana") d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setRefDate(d);
  };

  const atividadesNoDia = (data: Date) =>
    atividades
      .filter((a) => sameDay(new Date(a.data), data))
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1500px] mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Agenda & Atividades</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{titulo}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            {(["mes", "semana", "dia"] as const).map((m) => (
              <button key={m} onClick={() => setModo(m)} className={`px-3 py-1.5 text-sm font-semibold capitalize ${modo === m ? "bg-vert-dark text-white" : "bg-card hover:bg-accent"}`}>{m}</button>
            ))}
          </div>
          <div className="inline-flex items-center gap-1">
            <button onClick={() => navegar(-1)} className="p-1.5 rounded-lg border border-border hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => navegar(0)} className="px-3 py-1.5 rounded-lg border border-border text-sm font-semibold hover:bg-accent">Hoje</button>
            <button onClick={() => navegar(1)} className="p-1.5 rounded-lg border border-border hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <button onClick={() => setNovoOpen(new Date())} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            <Plus className="h-4 w-4" /> Nova atividade
          </button>
        </div>
      </header>

      {modo === "mes" && <VistaMes refDate={refDate} atividadesNoDia={atividadesNoDia} onClickDia={(d) => { setRefDate(d); setModo("dia"); }} onCriar={(d) => setNovoOpen(d)} />}
      {modo === "semana" && <VistaSemana refDate={refDate} atividadesNoDia={atividadesNoDia} onClickDia={(d) => { setRefDate(d); setModo("dia"); }} onCriar={(d) => setNovoOpen(d)} />}
      {modo === "dia" && <VistaDia data={refDate} atividades={atividadesNoDia(refDate)} clientes={clientes} usuarios={usuarios} updateAtividade={updateAtividade} deleteAtividade={deleteAtividade} onCriar={() => setNovoOpen(refDate)} />}

      {novoOpen && (
        <NovaAtividadeModal
          dataInicial={novoOpen}
          clientes={clientes}
          usuarios={usuarios}
          currentUserId={currentUserId}
          onClose={() => setNovoOpen(null)}
          onSalvar={(a) => { addAtividade(a); setNovoOpen(null); }}
        />
      )}
    </div>
  );
}

function VistaMes({ refDate, atividadesNoDia, onClickDia, onCriar }: {
  refDate: Date;
  atividadesNoDia: (d: Date) => Atividade[];
  onClickDia: (d: Date) => void;
  onCriar: (d: Date) => void;
}) {
  const ini = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const startWeekday = ini.getDay();
  const ultDia = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= ultDia; d++) cells.push(new Date(refDate.getFullYear(), refDate.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  const hoje = new Date();

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="grid grid-cols-7 bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
        {DIAS_SEMANA.map((d) => <div key={d} className="px-2 py-2 text-center font-semibold">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 auto-rows-[110px]">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="border-t border-r border-border bg-muted/20" />;
          const acts = atividadesNoDia(d);
          const isHoje = sameDay(d, hoje);
          return (
            <div key={i} className="border-t border-r border-border p-1.5 hover:bg-accent/30 cursor-pointer group relative" onClick={() => onClickDia(d)}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isHoje ? "bg-vert-dark text-white" : "text-foreground"}`}>{d.getDate()}</span>
                <button onClick={(e) => { e.stopPropagation(); onCriar(d); }} className="opacity-0 group-hover:opacity-100 text-vert hover:text-vert-dark"><Plus className="h-3 w-3" /></button>
              </div>
              <div className="space-y-0.5">
                {acts.slice(0, 3).map((a) => (
                  <div key={a.id} className={`text-[10px] px-1 py-0.5 rounded border truncate ${TIPO_COR[a.tipo]}`}>{new Date(a.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} {a.titulo}</div>
                ))}
                {acts.length > 3 && <div className="text-[10px] text-muted-foreground px-1">+{acts.length - 3} mais…</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VistaSemana({ refDate, atividadesNoDia, onClickDia, onCriar }: {
  refDate: Date;
  atividadesNoDia: (d: Date) => Atividade[];
  onClickDia: (d: Date) => void;
  onCriar: (d: Date) => void;
}) {
  const ini = new Date(refDate); ini.setDate(refDate.getDate() - refDate.getDay()); ini.setHours(0, 0, 0, 0);
  const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(ini); d.setDate(ini.getDate() + i); return d; });
  const hoje = new Date();
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
      {dias.map((d) => {
        const acts = atividadesNoDia(d);
        const isHoje = sameDay(d, hoje);
        return (
          <div key={d.toISOString()} className={`bg-card rounded-xl border ${isHoje ? "border-vert" : "border-border"} p-3 min-h-[260px]`}>
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
              <button onClick={() => onClickDia(d)} className="text-left">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{DIAS_SEMANA[d.getDay()]}</div>
                <div className={`text-xl font-display font-extrabold ${isHoje ? "text-vert-dark" : ""}`}>{d.getDate()}</div>
              </button>
              <button onClick={() => onCriar(d)} className="p-1 rounded hover:bg-accent text-vert"><Plus className="h-4 w-4" /></button>
            </div>
            <div className="space-y-1.5">
              {acts.length === 0 && <p className="text-[11px] text-muted-foreground">Sem atividades.</p>}
              {acts.map((a) => {
                const Icon = ICON[a.tipo];
                return (
                  <div key={a.id} className={`text-xs px-2 py-1.5 rounded border ${TIPO_COR[a.tipo]} flex items-center gap-1.5`}>
                    <Icon className="h-3 w-3 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{a.titulo}</div>
                      <div className="text-[10px] opacity-75">{new Date(a.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VistaDia({ data, atividades, clientes, usuarios, updateAtividade, deleteAtividade, onCriar }: {
  data: Date;
  atividades: Atividade[];
  clientes: ReturnType<typeof useStore.getState>["clientes"];
  usuarios: ReturnType<typeof useStore.getState>["usuarios"];
  updateAtividade: ReturnType<typeof useStore.getState>["updateAtividade"];
  deleteAtividade: ReturnType<typeof useStore.getState>["deleteAtividade"];
  onCriar: () => void;
}) {
  const horas = Array.from({ length: 14 }, (_, i) => i + 7); // 7h-20h
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-lg flex items-center gap-2"><CalIcon className="h-5 w-5 text-vert" /> {data.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</h2>
        <button onClick={onCriar} className="text-sm font-semibold text-vert hover:underline inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Nova</button>
      </div>
      <div className="space-y-1">
        {horas.map((h) => {
          const acts = atividades.filter((a) => new Date(a.data).getHours() === h);
          return (
            <div key={h} className="flex items-start gap-3 py-1.5 border-t border-border/50">
              <div className="w-12 text-xs text-muted-foreground pt-1 tabular-nums">{String(h).padStart(2, "0")}:00</div>
              <div className="flex-1 space-y-1">
                {acts.length === 0 && <div className="h-6" />}
                {acts.map((a) => {
                  const cliente = clientes.find((c) => c.id === a.clienteId);
                  const resp = usuarios.find((u) => u.id === a.responsavelId);
                  const Icon = ICON[a.tipo];
                  return (
                    <div key={a.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${TIPO_COR[a.tipo]}`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{a.titulo}</div>
                        <div className="text-[11px] opacity-80 truncate">{new Date(a.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {cliente?.nome ?? "—"} · {resp?.nome}</div>
                      </div>
                      <select value={a.status} onChange={(e) => updateAtividade(a.id, { status: e.target.value as Atividade["status"] })} className="text-xs bg-white/60 rounded px-2 py-0.5 border border-current/20">
                        <option value="pendente">Pendente</option>
                        <option value="realizada">Realizada</option>
                        <option value="nao_atendeu">Não atendeu</option>
                        <option value="reagendada">Reagendada</option>
                      </select>
                      <button onClick={() => deleteAtividade(a.id)} className="opacity-60 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NovaAtividadeModal({ dataInicial, clientes, usuarios, currentUserId, onClose, onSalvar }: {
  dataInicial: Date;
  clientes: ReturnType<typeof useStore.getState>["clientes"];
  usuarios: ReturnType<typeof useStore.getState>["usuarios"];
  currentUserId: string;
  onClose: () => void;
  onSalvar: (a: Omit<Atividade, "id">) => void;
}) {
  const isoDate = dataInicial.toISOString().slice(0, 10);
  const [tipo, setTipo] = useState<Atividade["tipo"]>("ligacao");
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState(isoDate);
  const [hora, setHora] = useState("09:00");
  const [duracao, setDuracao] = useState(30);
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [responsavelId, setResponsavelId] = useState(currentUserId);
  const [descricao, setDescricao] = useState("");

  const inp = "w-full h-9 px-3 rounded-lg bg-muted border border-transparent focus:bg-card focus:border-vert-light text-sm outline-none";

  const submit = () => {
    if (!titulo.trim()) return alert("Informe o título.");
    const dt = new Date(`${data}T${hora}:00`);
    onSalvar({
      tipo, titulo: titulo.trim(), descricao: descricao.trim() || undefined,
      data: dt.toISOString(), duracao, status: "pendente",
      clienteId: clienteId || undefined, responsavelId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-display font-bold text-lg">Nova atividade</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs">Tipo<select value={tipo} onChange={(e) => setTipo(e.target.value as Atividade["tipo"])} className={inp + " mt-1"}>
              {(Object.keys(TIPO_LABEL) as Atividade["tipo"][]).map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
            </select></label>
            <label className="block text-xs">Duração (min)<input type="number" value={duracao} onChange={(e) => setDuracao(+e.target.value)} className={inp + " mt-1"} /></label>
          </div>
          <label className="block text-xs">Título<input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Ligar para apresentar proposta" className={inp + " mt-1"} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs">Data<input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inp + " mt-1"} /></label>
            <label className="block text-xs">Hora<input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={inp + " mt-1"} /></label>
          </div>
          <label className="block text-xs">Cliente<select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={inp + " mt-1"}>
            <option value="">— sem cliente —</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select></label>
          <label className="block text-xs">Responsável<select value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)} className={inp + " mt-1"}>
            {usuarios.filter((u) => u.ativo).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select></label>
          <label className="block text-xs">Observações<textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className={inp + " mt-1 h-20 py-2"} /></label>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border bg-muted/30">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-accent">Cancelar</button>
          <button onClick={submit} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Salvar atividade</button>
        </div>
      </div>
    </div>
  );
}

// uid não é mais necessário — mantemos apenas o import para evitar tree-shake removal
void uid;
