import { useMemo, useState } from "react";
import { CheckCircle2, Circle, AlertTriangle, Plus } from "lucide-react";
import {
  gerarParcelasRecebimento,
  useLancamentosQuery,
  useAddLancamentosBulk,
  useUpdateLancamento,
  useDeleteLancamento,
} from "@/lib/lancamentos.api";
import {
  MODO_RECEBIMENTO_LABEL,
  type ModoRecebimento,
  type Lancamento,
} from "@/lib/types";
import { brl, dataBR } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  cardId: string;
  clienteId: string;
  clienteNome: string;
  propostaId?: string;
  valorTotal: number;
}

const MODOS: ModoRecebimento[] = [
  "avista",
  "50_30_20",
  "cartao_credito",
  "financiado_sol_agora",
  "financiado_eos",
  "financiado_77sol",
  "financiado_bnb",
];

function statusParcela(l: Lancamento): "realizado" | "vencido" | "previsto" {
  if (l.status === "realizado") return "realizado";
  const hoje = new Date().toISOString().slice(0, 10);
  if (l.status === "previsto" && l.dataVencimento < hoje) return "vencido";
  return "previsto";
}

export function RecebimentosProjeto({ cardId, clienteId, clienteNome, propostaId, valorTotal }: Props) {
  const { data: lancs = [] } = useLancamentosQuery({ cardId });
  const addBulk = useAddLancamentosBulk();
  const update = useUpdateLancamento();
  const del = useDeleteLancamento();

  const [modo, setModo] = useState<ModoRecebimento>("50_30_20");
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [dataConfirm, setDataConfirm] = useState(new Date().toISOString().slice(0, 10));

  const parcelas = useMemo(
    () =>
      [...lancs].sort((a, b) =>
        (a.parcelaNumero ?? 0) - (b.parcelaNumero ?? 0) ||
        a.dataVencimento.localeCompare(b.dataVencimento),
      ),
    [lancs],
  );

  const totalRecebido = parcelas
    .filter((l) => l.status === "realizado")
    .reduce((a, l) => a + l.valor, 0);
  const totalPrevisto = parcelas.reduce((a, l) => a + l.valor, 0);
  const progressoPct = totalPrevisto > 0 ? (totalRecebido / totalPrevisto) * 100 : 0;

  async function handleGerar() {
    if (parcelas.length > 0) {
      if (!confirm("Já existem parcelas para este card. Deseja gerar parcelas adicionais?")) return;
    }
    const partials = gerarParcelasRecebimento({
      valor: valorTotal,
      modo,
      cardId,
      propostaId,
      clienteId,
      descricaoBase: `Projeto Solar — ${clienteNome}`,
    });
    if (!partials.length) return;
    if (!confirm(`Isso vai criar ${partials.length} lançamento(s) no financeiro. Confirmar?`)) return;
    await addBulk.mutateAsync(partials);
  }

  async function confirmarRecebimento(id: string) {
    await update.mutateAsync({
      id,
      patch: { status: "realizado", dataRealizacao: dataConfirm },
    });
    setConfirmando(null);
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-display font-bold text-lg">Recebimentos do projeto</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Parcelas e modo de pagamento vinculados a este card.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Modo de recebimento
          </label>
          <select
            value={modo}
            onChange={(e) => setModo(e.target.value as ModoRecebimento)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
          >
            {MODOS.map((m) => (
              <option key={m} value={m}>{MODO_RECEBIMENTO_LABEL[m]}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleGerar}
          disabled={addBulk.isPending}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-vert text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Gerar parcelas
        </button>
      </div>

      {parcelas.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6 border-2 border-dashed border-border rounded-lg">
          Nenhuma parcela cadastrada. Selecione o modo e clique em "Gerar parcelas".
        </div>
      ) : (
        <div className="space-y-2">
          {parcelas.map((l) => {
            const st = statusParcela(l);
            return (
              <div
                key={l.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  st === "realizado" && "border-emerald-200 bg-emerald-50/60",
                  st === "vencido" && "border-rose-200 bg-rose-50/60",
                  st === "previsto" && "border-border bg-muted/30",
                )}
              >
                <div className="shrink-0">
                  {st === "realizado" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : st === "vencido" ? (
                    <AlertTriangle className="h-5 w-5 text-rose-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{l.descricao}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Venc. {dataBR(l.dataVencimento)}
                    {l.dataRealizacao && ` · Recebido ${dataBR(l.dataRealizacao)}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold tabular-nums">{brl(l.valor)}</div>
                  {l.parcelaTotal && l.parcelaTotal > 1 && (
                    <div className="text-[10px] text-muted-foreground">
                      Parcela {l.parcelaNumero}/{l.parcelaTotal}
                    </div>
                  )}
                </div>
                {st !== "realizado" ? (
                  confirmando === l.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        value={dataConfirm}
                        onChange={(e) => setDataConfirm(e.target.value)}
                        className="h-8 px-2 rounded border border-border bg-background text-xs"
                      />
                      <button
                        onClick={() => confirmarRecebimento(l.id)}
                        className="h-8 px-2 rounded bg-emerald-600 text-white text-xs font-semibold"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setConfirmando(null)}
                        className="h-8 px-2 rounded border border-border text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setDataConfirm(new Date().toISOString().slice(0, 10));
                        setConfirmando(l.id);
                      }}
                      className="h-8 px-2 rounded-lg border border-emerald-300 text-emerald-700 text-xs font-semibold hover:bg-emerald-50"
                    >
                      ✓ Recebi
                    </button>
                  )
                ) : (
                  <button
                    onClick={async () => {
                      if (!confirm("Reverter este recebimento para 'previsto'?")) return;
                      await update.mutateAsync({ id: l.id, patch: { status: "previsto", dataRealizacao: undefined } });
                    }}
                    className="h-8 px-2 rounded-lg border border-border text-xs hover:bg-accent"
                  >
                    Desfazer
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (!confirm("Excluir este lançamento?")) return;
                    await del.mutateAsync(l.id);
                  }}
                  className="h-8 px-2 rounded-lg text-muted-foreground hover:text-rose-600 text-xs"
                  title="Excluir"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {parcelas.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Total recebido</span>
            <span className="font-bold tabular-nums">
              {brl(totalRecebido)} <span className="text-muted-foreground font-normal">/ {brl(totalPrevisto)}</span>
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(100, progressoPct)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
