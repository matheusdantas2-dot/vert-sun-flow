import { useState } from "react";
import { brl } from "@/lib/format";
import { Plus, Trash2, FileSignature } from "lucide-react";

export interface CondicoesContrato {
  formasPagamento: { descricao: string; valor: number }[];
  prazoInstalacaoDias: number;
  multaAtrasoPct: number;
  enderecoContratante: string;
  bairroContratante: string;
  cidadeContratante: string;
  cepContratante: string;
}

export function CondicoesContratoModal({
  open,
  valorTotal,
  enderecoSugerido,
  bairroSugerido,
  cidadeSugerida,
  cepSugerido,
  onClose,
  onConfirm,
}: {
  open: boolean;
  valorTotal: number;
  enderecoSugerido?: string;
  bairroSugerido?: string;
  cidadeSugerida?: string;
  cepSugerido?: string;
  onClose: () => void;
  onConfirm: (c: CondicoesContrato) => void;
}) {
  const [formas, setFormas] = useState<{ descricao: string; valor: number }[]>([
    { descricao: "À vista no ato da assinatura", valor: valorTotal },
  ]);
  const [prazo, setPrazo] = useState(40);
  const [multa, setMulta] = useState(10);
  const [endereco, setEndereco] = useState(enderecoSugerido ?? "");
  const [bairro, setBairro] = useState(bairroSugerido ?? "");
  const [cidade, setCidade] = useState(cidadeSugerida ?? "");
  const [cep, setCep] = useState(cepSugerido ?? "");

  if (!open) return null;

  const total = formas.reduce((a, f) => a + (f.valor || 0), 0);
  const diff = Math.round((valorTotal - total) * 100) / 100;

  const add = () => setFormas([...formas, { descricao: "", valor: 0 }]);
  const upd = (i: number, p: Partial<{ descricao: string; valor: number }>) =>
    setFormas(formas.map((f, idx) => (idx === i ? { ...f, ...p } : f)));
  const rem = (i: number) => setFormas(formas.filter((_, idx) => idx !== i));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-vert" /> Condições do contrato
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Defina forma de pagamento, prazo e dados complementares antes de gerar o PDF.
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">Formas de pagamento</label>
              <button
                onClick={add}
                className="inline-flex items-center gap-1 text-xs font-semibold text-vert hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar linha
              </button>
            </div>
            <div className="space-y-2">
              {formas.map((f, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    placeholder="Ex.: Entrada · Cartão 12x · Boleto 30/60/90 dias"
                    value={f.descricao}
                    onChange={(e) => upd(i, { descricao: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Valor"
                    value={f.valor || ""}
                    onChange={(e) => upd(i, { valor: Number(e.target.value) })}
                    className="w-32 px-3 py-2 rounded-lg border border-border bg-card text-sm text-right"
                  />
                  {formas.length > 1 && (
                    <button
                      onClick={() => rem(i)}
                      className="p-2 rounded-lg text-rose-600 hover:bg-rose-50"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-muted-foreground">Valor da proposta: {brl(valorTotal)}</span>
              <span className={diff === 0 ? "text-vert font-semibold" : "text-rose-600 font-semibold"}>
                Soma: {brl(total)} {diff !== 0 ? `· diferença ${brl(diff)}` : "✓"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Prazo de instalação (dias)
              </label>
              <input
                type="number"
                value={prazo}
                onChange={(e) => setPrazo(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-card text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Multa por atraso (%)
              </label>
              <input
                type="number"
                value={multa}
                onChange={(e) => setMulta(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-card text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Endereço do contratante (local de instalação)
            </label>
            <input
              placeholder="Rua, número"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                placeholder="Bairro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
              />
              <input
                placeholder="Cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
              />
              <input
                placeholder="CEP"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
              />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent">
            Cancelar
          </button>
          <button
            onClick={() =>
              onConfirm({
                formasPagamento: formas.filter((f) => f.descricao.trim()),
                prazoInstalacaoDias: prazo,
                multaAtrasoPct: multa,
                enderecoContratante: endereco,
                bairroContratante: bairro,
                cidadeContratante: cidade,
                cepContratante: cep,
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vert text-white text-sm font-semibold hover:opacity-90"
          >
            <FileSignature className="h-4 w-4" /> Gerar contrato
          </button>
        </div>
      </div>
    </div>
  );
}
