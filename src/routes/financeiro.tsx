import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  Plus,
  MessageCircle,
  ArrowRightLeft,
  Check,
  Pencil,
  X,
  Repeat,
  Pause,
  Play,
  ClipboardList,
} from "lucide-react";
import {
  useLancamentosQuery,
  useLancamentosRealtime,
  useAddLancamento,
  useAddLancamentosBulk,
  useUpdateLancamento,
  useDeleteLancamento,
  useDespesasFixasQuery,
  useAddDespesaFixa,
  useUpdateDespesaFixa,
  useDeleteDespesaFixa,
  calcularProximoVencimento,
  gerarLancamentosDespesasFixas,
} from "@/lib/lancamentos.api";
import {
  CONTAS_FINANCEIRAS,
  CATEGORIA_LABEL,
  CATEGORIAS_RECEITA,
  CATEGORIAS_DESPESA,
  DESPESA_FIXA_FREQUENCIA_LABEL,
  DESPESA_FIXA_FATOR_MENSAL,
  type ContaFinanceiraId,
  type Lancamento,
  type LancamentoTipo,
  type LancamentoStatus,
  type CategoriaFinanceira,
  type DespesaFixa,
  type DespesaFixaFrequencia,
} from "@/lib/types";
import { useClientesQuery } from "@/lib/clientes.api";
import { brl, dataBR } from "@/lib/format";
import { SeletorPeriodo, calcPeriodo, type Periodo } from "@/components/dashboard/SeletorPeriodo";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notificacoes";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export const Route = createFileRoute("/financeiro")({
  component: FinanceiroPage,
  head: () => ({ meta: [{ title: "Financeiro — VertCRM" }] }),
});

type Aba = "visao" | "lancamentos" | "fixas" | "contas";


function FinanceiroPage() {
  useLancamentosRealtime();
  const [aba, setAba] = useState<Aba>("visao");

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-vert">
            <Wallet className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-[0.14em]">Controle de caixa</span>
          </div>
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight mt-1">
            Financeiro
          </h1>
        </div>
        <nav className="inline-flex items-center bg-muted rounded-lg p-1">
          {(
            [
              { id: "visao", label: "Visão geral" },
              { id: "lancamentos", label: "Lançamentos" },
              { id: "fixas", label: "Despesas Fixas" },
              { id: "contas", label: "Contas" },
            ] as { id: Aba; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setAba(t.id)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-semibold transition",
                aba === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {aba === "visao" && <VisaoGeral />}
      {aba === "lancamentos" && <Lancamentos />}
      {aba === "fixas" && <DespesasFixasAba />}
      {aba === "contas" && <Contas />}
    </div>
  );
}

// ─── VISÃO GERAL ────────────────────────────────────────────────────────────
function VisaoGeral() {
  const [periodo, setPeriodo] = useState<Periodo>(() => calcPeriodo("mes"));
  const deIso = periodo.de.toISOString().slice(0, 10);
  const ateIso = periodo.ate.toISOString().slice(0, 10);

  const { data: lancs = [] } = useLancamentosQuery({ de: deIso, ate: ateIso });
  const { data: todos = [] } = useLancamentosQuery({});
  const { data: clientes = [] } = useClientesQuery();

  const realizadas = lancs.filter((l) => l.status === "realizado");
  const receitas = realizadas.filter((l) => l.tipo === "receita").reduce((a, l) => a + l.valor, 0);
  const despesas = realizadas.filter((l) => l.tipo === "despesa").reduce((a, l) => a + l.valor, 0);
  const saldo = receitas - despesas;
  const aReceber = todos
    .filter((l) => l.tipo === "receita" && l.status === "previsto")
    .reduce((a, l) => a + l.valor, 0);

  // Gráfico últimos 6 meses
  const meses = useMemo(() => {
    const hoje = new Date();
    const list: { mes: string; receitas: number; despesas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const ini = d.toISOString().slice(0, 10);
      const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
      const mes = d.toLocaleDateString("pt-BR", { month: "short" });
      const filtered = todos.filter(
        (l) => l.status === "realizado" && l.dataVencimento >= ini && l.dataVencimento <= fim,
      );
      list.push({
        mes,
        receitas: filtered.filter((l) => l.tipo === "receita").reduce((a, l) => a + l.valor, 0),
        despesas: filtered.filter((l) => l.tipo === "despesa").reduce((a, l) => a + l.valor, 0),
      });
    }
    return list;
  }, [todos]);

  const hoje = new Date().toISOString().slice(0, 10);
  const inadimplentes = todos.filter(
    (l) => l.tipo === "receita" && l.status === "previsto" && l.dataVencimento < hoje,
  );

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <SeletorPeriodo periodo={periodo} onChange={setPeriodo} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiBox label="Receitas realizadas" value={brl(receitas)} icon={TrendingUp} tone="emerald" />
        <KpiBox label="Despesas realizadas" value={brl(despesas)} icon={TrendingDown} tone="rose" />
        <KpiBox
          label="Saldo líquido"
          value={brl(saldo)}
          icon={Wallet}
          tone={saldo >= 0 ? "emerald" : "rose"}
        />
        <KpiBox label="A receber (previsto)" value={brl(aReceber)} icon={Clock} tone="blue" />
      </div>

      <DespesasFixasWidget />



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CONTAS_FINANCEIRAS.map((c) => {
          const lcs = todos
            .filter((l) => l.conta === c.id && l.status === "realizado")
            .slice(0, 5);
          const saldoConta = todos
            .filter((l) => l.conta === c.id && l.status === "realizado")
            .reduce((a, l) => a + (l.tipo === "receita" ? l.valor : l.tipo === "despesa" ? -l.valor : 0), 0);
          return (
            <div key={c.id} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-display font-bold text-base">{c.nome}</div>
                  <div className="text-[11px] text-muted-foreground">Últimos lançamentos</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground uppercase">Saldo</div>
                  <div className={cn("font-bold tabular-nums", saldoConta >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {brl(saldoConta)}
                  </div>
                </div>
              </div>
              {lcs.length === 0 ? (
                <div className="text-xs text-muted-foreground py-3">Sem lançamentos.</div>
              ) : (
                <div className="space-y-1.5">
                  {lcs.map((l) => (
                    <div key={l.id} className="flex items-center justify-between text-sm">
                      <div className="truncate flex-1 mr-2">{l.descricao}</div>
                      <div
                        className={cn(
                          "tabular-nums font-semibold",
                          l.tipo === "receita" ? "text-emerald-600" : "text-rose-600",
                        )}
                      >
                        {l.tipo === "receita" ? "+" : "-"}
                        {brl(l.valor)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="mb-4">
          <h2 className="font-display font-bold text-base">Receitas × Despesas — últimos 6 meses</h2>
          <p className="text-[11px] text-muted-foreground">Apenas lançamentos realizados</p>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={meses}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: unknown) => brl(Number(v))} />
              <Legend />
              <Bar dataKey="receitas" fill="#16a34a" name="Receitas" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" fill="#dc2626" name="Despesas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {inadimplentes.length > 0 && (
        <div className="bg-card rounded-xl border border-rose-200 p-5">
          <div className="mb-3">
            <h2 className="font-display font-bold text-base text-rose-700">
              Inadimplência ({inadimplentes.length})
            </h2>
            <p className="text-[11px] text-muted-foreground">Receitas previstas com vencimento passado</p>
          </div>
          <div className="space-y-2">
            {inadimplentes.map((l) => {
              const cli = clientes.find((c) => c.id === l.clienteId);
              const tel = (cli?.whatsapp || cli?.telefone || "").replace(/\D/g, "");
              const msg = encodeURIComponent(
                `Olá ${cli?.nome ?? ""}, tudo bem? Identificamos uma pendência referente a "${l.descricao}" no valor de ${brl(l.valor)} com vencimento em ${dataBR(l.dataVencimento)}. Poderia regularizar? Obrigado!`,
              );
              return (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg border border-rose-200 bg-rose-50/40">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{l.descricao}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {cli?.nome ?? "—"} · Venc. {dataBR(l.dataVencimento)}
                    </div>
                  </div>
                  <div className="font-bold tabular-nums text-rose-700">{brl(l.valor)}</div>
                  {tel && (
                    <a
                      href={`https://wa.me/55${tel}?text=${msg}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 h-8 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:opacity-90"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Cobrar
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiBox({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone: "emerald" | "rose" | "blue";
}) {
  const toneCls = {
    emerald: "from-emerald-600 to-emerald-400",
    rose: "from-rose-600 to-rose-400",
    blue: "from-blue-600 to-blue-400",
  }[tone];
  return (
    <div className={cn("rounded-xl p-4 text-white bg-gradient-to-br shadow-md", toneCls)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">{label}</div>
          <div className="text-2xl font-bold tabular-nums mt-1">{value}</div>
        </div>
        <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
    </div>
  );
}

// ─── LANÇAMENTOS ────────────────────────────────────────────────────────────
function Lancamentos() {
  const [conta, setConta] = useState<"" | ContaFinanceiraId>("");
  const [tipo, setTipo] = useState<"" | LancamentoTipo>("");
  const [status, setStatus] = useState<"" | LancamentoStatus>("");
  const [periodo, setPeriodo] = useState<Periodo>(() => calcPeriodo("mes"));
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Lancamento | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [dataConfirm, setDataConfirm] = useState(new Date().toISOString().slice(0, 10));

  const { data: lancs = [] } = useLancamentosQuery({
    conta: conta || undefined,
    tipo: tipo || undefined,
    status: status || undefined,
    de: periodo.de.toISOString().slice(0, 10),
    ate: periodo.ate.toISOString().slice(0, 10),
  });
  const { data: clientes = [] } = useClientesQuery();
  const update = useUpdateLancamento();
  const del = useDeleteLancamento();

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap items-end gap-3">
        <Filtro label="Conta">
          <select
            value={conta}
            onChange={(e) => setConta(e.target.value as "" | ContaFinanceiraId)}
            className="h-9 px-2 rounded-lg border border-border bg-background text-sm"
          >
            <option value="">Todas</option>
            {CONTAS_FINANCEIRAS.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </Filtro>
        <Filtro label="Tipo">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as "" | LancamentoTipo)}
            className="h-9 px-2 rounded-lg border border-border bg-background text-sm"
          >
            <option value="">Todos</option>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
            <option value="transferencia">Transferência</option>
          </select>
        </Filtro>
        <Filtro label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "" | LancamentoStatus)}
            className="h-9 px-2 rounded-lg border border-border bg-background text-sm"
          >
            <option value="">Todos</option>
            <option value="previsto">Previsto</option>
            <option value="realizado">Realizado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </Filtro>
        <div className="flex-1" />
        <SeletorPeriodo periodo={periodo} onChange={setPeriodo} />
        <button
          onClick={() => {
            setEditando(null);
            setModalAberto(true);
          }}
          className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-vert text-white text-sm font-semibold hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Novo lançamento
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Vencimento</th>
                <th className="text-left px-3 py-2">Descrição</th>
                <th className="text-left px-3 py-2">Cliente</th>
                <th className="text-left px-3 py-2">Categoria</th>
                <th className="text-left px-3 py-2">Conta</th>
                <th className="text-left px-3 py-2">Tipo</th>
                <th className="text-right px-3 py-2">Valor</th>
                <th className="text-center px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lancs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted-foreground py-8">
                    Nenhum lançamento no período.
                  </td>
                </tr>
              ) : (
                lancs.map((l) => {
                  const cli = clientes.find((c) => c.id === l.clienteId);
                  const conta = CONTAS_FINANCEIRAS.find((c) => c.id === l.conta);
                  return (
                    <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap">{dataBR(l.dataVencimento)}</td>
                      <td className="px-3 py-2 max-w-[280px] truncate">{l.descricao}</td>
                      <td className="px-3 py-2 truncate">{cli?.nome ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">
                        {CATEGORIA_LABEL[l.categoria as CategoriaFinanceira] ?? l.categoria}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white"
                          style={{ background: conta?.cor }}
                        >
                          {conta?.nome.split(" ")[0]}
                        </span>
                      </td>
                      <td className="px-3 py-2 capitalize text-xs">{l.tipo}</td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right font-bold tabular-nums",
                          l.tipo === "receita" ? "text-emerald-600" : l.tipo === "despesa" ? "text-rose-600" : "",
                        )}
                      >
                        {brl(l.valor)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded text-[10px] font-bold",
                            l.status === "realizado" && "bg-emerald-100 text-emerald-700",
                            l.status === "previsto" && "bg-amber-100 text-amber-700",
                            l.status === "cancelado" && "bg-muted text-muted-foreground",
                          )}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {confirmandoId === l.id ? (
                          <span className="inline-flex items-center gap-1">
                            <input
                              type="date"
                              value={dataConfirm}
                              onChange={(e) => setDataConfirm(e.target.value)}
                              className="h-7 px-1 rounded border border-border bg-background text-xs"
                            />
                            <button
                              onClick={async () => {
                                await update.mutateAsync({
                                  id: l.id,
                                  patch: { status: "realizado", dataRealizacao: dataConfirm },
                                });
                                setConfirmandoId(null);
                              }}
                              className="h-7 px-2 rounded bg-emerald-600 text-white text-xs"
                            >
                              OK
                            </button>
                            <button
                              onClick={() => setConfirmandoId(null)}
                              className="h-7 px-2 rounded border border-border text-xs"
                            >
                              ✕
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            {l.status !== "realizado" && l.status !== "cancelado" && (
                              <button
                                onClick={() => {
                                  setDataConfirm(new Date().toISOString().slice(0, 10));
                                  setConfirmandoId(l.id);
                                }}
                                className="h-7 w-7 inline-flex items-center justify-center rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                title="Confirmar"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditando(l);
                                setModalAberto(true);
                              }}
                              className="h-7 w-7 inline-flex items-center justify-center rounded border border-border hover:bg-accent"
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm("Cancelar/excluir este lançamento?")) return;
                                await del.mutateAsync(l.id);
                              }}
                              className="h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground hover:text-rose-600"
                              title="Excluir"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAberto && (
        <LancamentoModal
          inicial={editando}
          onClose={() => {
            setModalAberto(false);
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}

function Filtro({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}

// ─── MODAL LANÇAMENTO ───────────────────────────────────────────────────────
function LancamentoModal({ inicial, onClose }: { inicial: Lancamento | null; onClose: () => void }) {
  const add = useAddLancamento();
  const update = useUpdateLancamento();
  const { data: clientes = [] } = useClientesQuery();

  const [tipo, setTipo] = useState<LancamentoTipo>(inicial?.tipo ?? "despesa");
  const [conta, setConta] = useState<ContaFinanceiraId>(inicial?.conta ?? "vert_pj");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [valor, setValor] = useState(String(inicial?.valor ?? ""));
  const [categoria, setCategoria] = useState<string>(
    inicial?.categoria ?? "outros_despesa",
  );
  const [dataVenc, setDataVenc] = useState(
    inicial?.dataVencimento ?? new Date().toISOString().slice(0, 10),
  );
  const [statusV, setStatusV] = useState<LancamentoStatus>(inicial?.status ?? "previsto");
  const [clienteId, setClienteId] = useState(inicial?.clienteId ?? "");
  const [obs, setObs] = useState(inicial?.observacoes ?? "");

  const categorias = tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;

  async function salvar() {
    const valorNum = Number(valor.replace(",", "."));
    if (!descricao.trim() || !valorNum || valorNum <= 0) return;
    const payload: Partial<Lancamento> = {
      tipo,
      conta,
      descricao: descricao.trim(),
      valor: valorNum,
      categoria,
      dataVencimento: dataVenc,
      status: statusV,
      clienteId: clienteId || undefined,
      observacoes: obs || undefined,
    };
    if (inicial) {
      await update.mutateAsync({ id: inicial.id, patch: payload });
    } else {
      await add.mutateAsync(payload);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display font-bold text-lg">
            {inicial ? "Editar lançamento" : "Novo lançamento"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select
                value={tipo}
                onChange={(e) => {
                  const t = e.target.value as LancamentoTipo;
                  setTipo(t);
                  setCategoria(t === "receita" ? "outros_receita" : "outros_despesa");
                }}
                className="w-full h-10 px-2 rounded-lg border border-border bg-background text-sm"
              >
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
            </Field>
            <Field label="Conta">
              <select
                value={conta}
                onChange={(e) => setConta(e.target.value as ContaFinanceiraId)}
                className="w-full h-10 px-2 rounded-lg border border-border bg-background text-sm"
              >
                {CONTAS_FINANCEIRAS.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Descrição">
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                inputMode="decimal"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
              />
            </Field>
            <Field label="Vencimento">
              <input
                type="date"
                value={dataVenc}
                onChange={(e) => setDataVenc(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full h-10 px-2 rounded-lg border border-border bg-background text-sm"
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={statusV}
                onChange={(e) => setStatusV(e.target.value as LancamentoStatus)}
                className="w-full h-10 px-2 rounded-lg border border-border bg-background text-sm"
              >
                <option value="previsto">Previsto</option>
                <option value="realizado">Realizado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </Field>
          </div>
          <Field label="Cliente (opcional)">
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full h-10 px-2 rounded-lg border border-border bg-background text-sm"
            >
              <option value="">—</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Observações">
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none"
            />
          </Field>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm font-semibold">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={add.isPending || update.isPending}
            className="px-4 h-10 rounded-lg bg-vert text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}

// ─── CONTAS ─────────────────────────────────────────────────────────────────
function Contas() {
  const { data: todos = [] } = useLancamentosQuery({});
  const addBulk = useAddLancamentosBulk();
  const [proLaboreOpen, setProLaboreOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CONTAS_FINANCEIRAS.map((c) => {
          const meus = todos.filter((l) => l.conta === c.id);
          const realizados = meus.filter((l) => l.status === "realizado");
          const saldoAtual = realizados.reduce(
            (a, l) => a + (l.tipo === "receita" ? l.valor : l.tipo === "despesa" ? -l.valor : 0),
            0,
          );
          const previstos = meus.filter((l) => l.status === "previsto");
          const saldoPrevisto =
            saldoAtual +
            previstos.reduce(
              (a, l) => a + (l.tipo === "receita" ? l.valor : l.tipo === "despesa" ? -l.valor : 0),
              0,
            );
          const ultimos = meus.slice(0, 10);
          return (
            <div key={c.id} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-display font-bold text-lg">{c.nome}</div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Conta</div>
                </div>
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ background: c.cor }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-muted/60 rounded-lg p-3">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">Saldo atual</div>
                  <div
                    className={cn(
                      "text-xl font-bold tabular-nums mt-1",
                      saldoAtual >= 0 ? "text-emerald-600" : "text-rose-600",
                    )}
                  >
                    {brl(saldoAtual)}
                  </div>
                </div>
                <div className="bg-muted/60 rounded-lg p-3">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">Saldo previsto</div>
                  <div
                    className={cn(
                      "text-xl font-bold tabular-nums mt-1",
                      saldoPrevisto >= 0 ? "text-emerald-600" : "text-rose-600",
                    )}
                  >
                    {brl(saldoPrevisto)}
                  </div>
                </div>
              </div>
              {c.id === "vert_pj" && (
                <button
                  onClick={() => setProLaboreOpen(true)}
                  className="mb-3 w-full inline-flex items-center justify-center gap-2 px-3 h-9 rounded-lg border border-border text-sm font-semibold hover:bg-accent"
                >
                  <ArrowRightLeft className="h-4 w-4" /> Registrar pró-labore
                </button>
              )}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Últimos 10 lançamentos
                </div>
                {ultimos.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-2">Sem lançamentos.</div>
                ) : (
                  <div className="space-y-1.5">
                    {ultimos.map((l) => (
                      <div key={l.id} className="flex items-center justify-between text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{l.descricao}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {dataBR(l.dataVencimento)} · {l.status}
                          </div>
                        </div>
                        <div
                          className={cn(
                            "tabular-nums font-semibold",
                            l.tipo === "receita" ? "text-emerald-600" : "text-rose-600",
                          )}
                        >
                          {l.tipo === "receita" ? "+" : "-"}
                          {brl(l.valor)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {proLaboreOpen && (
        <ProLaboreModal
          onClose={() => setProLaboreOpen(false)}
          onSubmit={async (valor, data) => {
            await addBulk.mutateAsync([
              {
                conta: "vert_pj",
                tipo: "despesa",
                categoria: "prolabore_saida",
                descricao: "Pró-labore — pago",
                valor,
                dataVencimento: data,
                dataRealizacao: data,
                status: "realizado",
              },
              {
                conta: "pessoal_matheus",
                tipo: "receita",
                categoria: "prolabore_entrada",
                descricao: "Pró-labore — recebido",
                valor,
                dataVencimento: data,
                dataRealizacao: data,
                status: "realizado",
              },
            ]);
            setProLaboreOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ProLaboreModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (valor: number, data: string) => Promise<void>;
}) {
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display font-bold text-lg">Registrar pró-labore</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <Field label="Valor (R$)">
            <input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              inputMode="decimal"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
            />
          </Field>
          <Field label="Data">
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
            />
          </Field>
          <p className="text-[11px] text-muted-foreground">
            Cria simultaneamente uma despesa em <b>Vert Energie (PJ)</b> e uma receita em <b>Pessoal (PF)</b>.
          </p>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm font-semibold">
            Cancelar
          </button>
          <button
            onClick={() => {
              const v = Number(valor.replace(",", "."));
              if (!v || v <= 0) return;
              onSubmit(v, data);
            }}
            className="px-4 h-10 rounded-lg bg-vert text-white text-sm font-semibold hover:opacity-90"
          >
            Registrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DESPESAS FIXAS ─────────────────────────────────────────────────────────

function totalMensalComprometido(despesas: DespesaFixa[]): number {
  return despesas
    .filter((d) => d.ativa)
    .reduce((a, d) => a + d.valor * DESPESA_FIXA_FATOR_MENSAL[d.frequencia], 0);
}

function isoMesAtual(mes: Date = new Date()) {
  const ini = new Date(mes.getFullYear(), mes.getMonth(), 1).toISOString().slice(0, 10);
  const fim = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { ini, fim };
}

function DespesasFixasWidget() {
  const { data: fixas = [] } = useDespesasFixasQuery();
  const { ini, fim } = isoMesAtual();
  const { data: lancsMes = [] } = useLancamentosQuery({ de: ini, ate: fim, tipo: "despesa" });
  const addBulk = useAddLancamentosBulk();

  const doMes = useMemo(
    () => fixas.filter((d) => d.ativa && d.proximoVencimento >= ini && d.proximoVencimento <= fim),
    [fixas, ini, fim],
  );

  const jaGeradas = doMes.filter((d) =>
    lancsMes.some((l) => l.descricao === d.descricao && l.dataVencimento === d.proximoVencimento),
  );

  const faltantes = doMes.filter(
    (d) => !lancsMes.some((l) => l.descricao === d.descricao && l.dataVencimento === d.proximoVencimento),
  );

  const totalMensal = totalMensalComprometido(fixas);
  const pct = doMes.length === 0 ? 0 : Math.round((jaGeradas.length / doMes.length) * 100);

  async function gerarFaltantes() {
    if (faltantes.length === 0) return;
    const total = faltantes.reduce((a, d) => a + d.valor, 0);
    if (!confirm(`Serão criados ${faltantes.length} lançamentos totalizando ${brl(total)}. Confirmar?`)) return;
    const payload = gerarLancamentosDespesasFixas(faltantes, new Date());
    await addBulk.mutateAsync(payload);
    notify.success(`${faltantes.length} lançamentos criados no financeiro`);
  }

  if (fixas.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-vert" />
          <div>
            <div className="font-display font-bold text-base">Despesas fixas do mês</div>
            <div className="text-[11px] text-muted-foreground">
              Total comprometido: <b>{brl(totalMensal)}</b> / mês
            </div>
          </div>
        </div>
        {faltantes.length > 0 && (
          <button
            onClick={gerarFaltantes}
            disabled={addBulk.isPending}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-vert text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Gerar {faltantes.length} faltante{faltantes.length > 1 ? "s" : ""}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-xs font-bold tabular-nums w-[110px] text-right">
          {jaGeradas.length} de {doMes.length} geradas · {pct}%
        </div>
      </div>
    </div>
  );
}

function diasAte(isoDate: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(isoDate);
  alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function DespesasFixasAba() {
  const { data: fixas = [] } = useDespesasFixasQuery();
  const { ini, fim } = isoMesAtual();
  const { data: lancsMes = [] } = useLancamentosQuery({ de: ini, ate: fim, tipo: "despesa" });
  const addBulk = useAddLancamentosBulk();
  const update = useUpdateDespesaFixa();
  const del = useDeleteDespesaFixa();

  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<DespesaFixa | null>(null);

  const totalMensal = totalMensalComprometido(fixas);
  const doMes = fixas.filter((d) => d.ativa && d.proximoVencimento >= ini && d.proximoVencimento <= fim);
  const faltantes = doMes.filter(
    (d) => !lancsMes.some((l) => l.descricao === d.descricao && l.dataVencimento === d.proximoVencimento),
  );

  async function gerarMes() {
    if (faltantes.length === 0) {
      notify.info("Nenhuma despesa fixa pendente para este mês.");
      return;
    }
    const total = faltantes.reduce((a, d) => a + d.valor, 0);
    if (!confirm(`Serão criados ${faltantes.length} lançamentos totalizando ${brl(total)}. Confirmar?`)) return;
    const payload = gerarLancamentosDespesasFixas(faltantes, new Date());
    await addBulk.mutateAsync(payload);
    notify.success(`${faltantes.length} lançamentos criados no financeiro`);
  }

  const mesLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <Repeat className="h-4 w-4 text-vert" /> Despesas Fixas
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Total mensal comprometido: <b className="text-foreground tabular-nums">{brl(totalMensal)}</b>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={gerarMes}
            disabled={addBulk.isPending || faltantes.length === 0}
            className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-border text-sm font-semibold hover:bg-accent disabled:opacity-50"
            title={faltantes.length === 0 ? "Nada a gerar" : `${faltantes.length} pendente(s)`}
          >
            <Plus className="h-4 w-4" /> Gerar lançamentos de {mesLabel}
          </button>
          <button
            onClick={() => {
              setEditando(null);
              setModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-vert text-white text-sm font-semibold hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Nova despesa fixa
          </button>
        </div>
      </div>

      {CONTAS_FINANCEIRAS.map((c) => {
        const lista = fixas.filter((d) => d.conta === c.id);
        if (lista.length === 0) return null;
        return (
          <div key={c.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: c.cor }} />
              <div className="font-display font-bold text-sm">{c.nome}</div>
              <div className="text-[11px] text-muted-foreground ml-auto">
                {lista.filter((d) => d.ativa).length} ativa(s) · {lista.length} total
              </div>
            </div>
            <ul className="divide-y divide-border">
              {lista.map((d) => {
                const dias = diasAte(d.proximoVencimento);
                const cor =
                  dias < 0
                    ? "text-rose-600"
                    : dias <= 7
                      ? "text-amber-600"
                      : "text-emerald-600";
                return (
                  <li
                    key={d.id}
                    className={cn(
                      "px-4 py-3 flex flex-wrap items-center gap-3",
                      !d.ativa && "opacity-60 bg-muted/20",
                    )}
                  >
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{d.descricao}</span>
                        {!d.ativa && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">
                            Pausada
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {CATEGORIA_LABEL[d.categoria]} · {DESPESA_FIXA_FREQUENCIA_LABEL[d.frequencia]} · Dia {d.diaVencimento}
                      </div>
                    </div>
                    <div className={cn("text-xs font-semibold tabular-nums min-w-[140px]", cor)}>
                      Próximo: {dataBR(d.proximoVencimento)}
                      {dias < 0
                        ? ` (${Math.abs(dias)}d em atraso)`
                        : dias === 0
                          ? " (hoje)"
                          : ` (em ${dias}d)`}
                    </div>
                    <div className="font-bold tabular-nums text-rose-600 min-w-[110px] text-right">
                      {brl(d.valor)}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => update.mutate({ id: d.id, patch: { ativa: !d.ativa } })}
                        className="h-7 w-7 inline-flex items-center justify-center rounded border border-border hover:bg-accent"
                        title={d.ativa ? "Pausar" : "Ativar"}
                      >
                        {d.ativa ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => {
                          setEditando(d);
                          setModal(true);
                        }}
                        className="h-7 w-7 inline-flex items-center justify-center rounded border border-border hover:bg-accent"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Excluir a despesa fixa "${d.descricao}"?`)) return;
                          await del.mutateAsync(d.id);
                        }}
                        className="h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground hover:text-rose-600"
                        title="Excluir"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {fixas.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <Repeat className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <div className="font-display font-bold">Nenhuma despesa fixa cadastrada</div>
          <p className="text-xs text-muted-foreground mt-1">
            Cadastre aluguel, software, internet e outras despesas recorrentes para automatizar seu controle.
          </p>
        </div>
      )}

      {modal && (
        <DespesaFixaModal
          inicial={editando}
          onClose={() => {
            setModal(false);
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}

function DespesaFixaModal({
  inicial,
  onClose,
}: {
  inicial: DespesaFixa | null;
  onClose: () => void;
}) {
  const add = useAddDespesaFixa();
  const update = useUpdateDespesaFixa();

  const [conta, setConta] = useState<ContaFinanceiraId>(inicial?.conta ?? "vert_pj");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [valor, setValor] = useState(String(inicial?.valor ?? ""));
  const [categoria, setCategoria] = useState<CategoriaFinanceira>(
    (inicial?.categoria as CategoriaFinanceira) ?? "outros_despesa",
  );
  const [frequencia, setFrequencia] = useState<DespesaFixaFrequencia>(inicial?.frequencia ?? "mensal");
  const [dia, setDia] = useState(String(inicial?.diaVencimento ?? 5));
  const [obs, setObs] = useState(inicial?.observacoes ?? "");

  const diaNum = Math.min(28, Math.max(1, Number(dia) || 1));
  const previewProximo = useMemo(
    () => calcularProximoVencimento(frequencia, diaNum),
    [frequencia, diaNum],
  );

  async function salvar() {
    const valorNum = Number(valor.replace(",", "."));
    if (!descricao.trim() || !valorNum || valorNum <= 0) return;
    const base = {
      conta,
      descricao: descricao.trim(),
      valor: valorNum,
      categoria,
      frequencia,
      diaVencimento: diaNum,
      observacoes: obs || undefined,
    };
    if (inicial) {
      await update.mutateAsync({
        id: inicial.id,
        patch: { ...base, proximoVencimento: previewProximo },
      });
    } else {
      await add.mutateAsync({ ...base, ativa: true });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display font-bold text-lg">
            {inicial ? "Editar despesa fixa" : "Nova despesa fixa"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <Field label="Conta">
            <select
              value={conta}
              onChange={(e) => setConta(e.target.value as ContaFinanceiraId)}
              className="w-full h-10 px-2 rounded-lg border border-border bg-background text-sm"
            >
              {CONTAS_FINANCEIRAS.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Descrição">
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Aluguel do escritório"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                inputMode="decimal"
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
              />
            </Field>
            <Field label="Categoria">
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaFinanceira)}
                className="w-full h-10 px-2 rounded-lg border border-border bg-background text-sm"
              >
                {CATEGORIAS_DESPESA.map((c) => (
                  <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Frequência">
              <select
                value={frequencia}
                onChange={(e) => setFrequencia(e.target.value as DespesaFixaFrequencia)}
                className="w-full h-10 px-2 rounded-lg border border-border bg-background text-sm"
              >
                {(Object.keys(DESPESA_FIXA_FREQUENCIA_LABEL) as DespesaFixaFrequencia[]).map((f) => (
                  <option key={f} value={f}>{DESPESA_FIXA_FREQUENCIA_LABEL[f]}</option>
                ))}
              </select>
            </Field>
            <Field label="Dia do vencimento (1–28)">
              <input
                type="number"
                min={1}
                max={28}
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
              />
            </Field>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-1">
            Recomendamos usar até o dia 28 para evitar problemas em fevereiro.
          </p>
          <Field label="Observações">
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none"
            />
          </Field>
          <div className="bg-muted/40 rounded-lg p-3 text-xs">
            Próximo vencimento previsto:{" "}
            <b className="tabular-nums">{dataBR(previewProximo)}</b>
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm font-semibold">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={add.isPending || update.isPending}
            className="px-4 h-10 rounded-lg bg-vert text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
