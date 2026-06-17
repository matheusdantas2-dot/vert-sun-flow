import { Link } from "@tanstack/react-router";
import { Star, Eye, Download, Share2, FileText, Pencil } from "lucide-react";
import type { Proposta, Cliente, Produto } from "@/lib/types";
import { PROPOSTA_TIER_COR, PROPOSTA_TIER_LABEL, PROPOSTA_TIERS_ORDEM } from "@/lib/types";
import { brl, kwp } from "@/lib/format";
import { dimensionarSistema, calcularEconomia, payback } from "@/lib/finance";

interface Props {
  grupoId: string;
  propostas: Proposta[];
  cliente?: Cliente;
  produtos: Produto[];
  onVisualizar: (id: string) => void;
  onBaixar: (id: string) => void;
  onCompartilhar: (id: string) => void;
  onCompartilharComparativo: (grupoId: string) => void;
  podePdf: boolean;
}

function calcMetricas(p: Proposta, cliente: Cliente | undefined, produtos: Produto[]) {
  const valor = p.itens.reduce((a, it) => a + it.precoUnitario * it.quantidade, 0);
  const kwpInst = p.itens.reduce((a, it) => {
    const prod = produtos.find((x) => x.id === it.produtoId);
    if (prod?.categoria === "modulo" && prod.potenciaW)
      return a + (prod.potenciaW * it.quantidade) / 1000;
    return a;
  }, 0);
  if (!cliente) return { valor, kwpInst, paybackAnos: 0 };
  const dim = dimensionarSistema(cliente.consumoMedio, p.irradiacao, p.eficiencia, p.cobertura);
  const econ = calcularEconomia({
    consumoKwh: cliente.consumoMedio,
    tarifa: cliente.tarifa,
    geracaoKwh: dim.geracaoMensal,
  });
  const pb = valor > 0 ? payback(valor, econ.economiaMes, p.inflacao) : 0;
  return { valor, kwpInst, paybackAnos: Number.isFinite(pb) ? pb / 12 : 0 };
}

export function TierGroupCard({
  grupoId,
  propostas,
  cliente,
  produtos,
  onVisualizar,
  onBaixar,
  onCompartilhar,
  onCompartilharComparativo,
  podePdf,
}: Props) {
  const ordenadas = [...propostas].sort(
    (a, b) =>
      PROPOSTA_TIERS_ORDEM.indexOf((a.tier ?? "ideal")) -
      PROPOSTA_TIERS_ORDEM.indexOf((b.tier ?? "ideal")),
  );
  const numeroBase = ordenadas[0]?.numero ?? "";

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-vert" />
            <span className="font-display font-bold text-sm">
              Proposta comparativa — {cliente?.nome ?? "—"}
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              {numeroBase} · grupo {grupoId.slice(0, 6)}
            </span>
          </div>
        </div>
        <button
          onClick={() => onCompartilharComparativo(grupoId)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-vert text-white text-xs font-semibold hover:bg-vert-dark"
        >
          <Share2 className="h-3.5 w-3.5" />
          Enviar comparativo completo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ordenadas.map((p) => {
          const m = calcMetricas(p, cliente, produtos);
          const tier = p.tier ?? "ideal";
          const isIdeal = tier === "ideal";
          const isPrincipal = !!p.tierPrincipal;
          return (
            <div
              key={p.id}
              className={`rounded-lg border p-3 flex flex-col ${
                isIdeal ? "border-blue-400 bg-blue-50/40" : "border-border bg-muted/20"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`badge-stage ${PROPOSTA_TIER_COR[tier]} text-[10px]`}>
                  {PROPOSTA_TIER_LABEL[tier]}
                </span>
                {isPrincipal && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                    <Star className="h-3 w-3 fill-current" /> Recomendada
                  </span>
                )}
              </div>
              <div className="text-xs font-mono text-muted-foreground mb-2">{p.numero}</div>
              <div className="space-y-0.5 mb-3">
                <div className="text-[10px] text-muted-foreground uppercase">Potência</div>
                <div className="font-display font-bold text-base">{kwp(m.kwpInst)}</div>
                <div className="text-[10px] text-muted-foreground uppercase mt-1">Investimento</div>
                <div className="font-display font-bold text-base text-vert">{brl(m.valor)}</div>
                <div className="text-[10px] text-muted-foreground uppercase mt-1">Payback</div>
                <div className="font-display font-semibold text-sm">
                  {m.paybackAnos > 0 ? `${m.paybackAnos.toFixed(1)} anos` : "—"}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-auto">
                <Link
                  to="/propostas/$id"
                  params={{ id: p.id }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-border hover:bg-accent"
                >
                  <Pencil className="h-3 w-3" /> Editar
                </Link>
                <button
                  onClick={() => onVisualizar(p.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-vert hover:bg-vert-soft"
                >
                  <Eye className="h-3 w-3" /> PDF
                </button>
                <button
                  onClick={() => onCompartilhar(p.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-vert-dark hover:bg-accent"
                >
                  <Share2 className="h-3 w-3" /> Enviar
                </button>
                {podePdf && (
                  <button
                    onClick={() => onBaixar(p.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] hover:bg-accent"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
