import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useState, useMemo, useEffect } from "react";
import { brl, brlPrec, kwh, kwp } from "@/lib/format";
import { dimensionarSistema, calcularEconomia, payback, projecao20Anos, tabelaPrice } from "@/lib/finance";
import { ArrowLeft, Trash2, Plus, ExternalLink, Download, Zap, Eye } from "lucide-react";
import { gerarPdfProposta } from "@/lib/pdfProposta";
import { usePode } from "@/lib/permissoes";
import { notify } from "@/lib/notificacoes";
import { PdfPreviewModal } from "@/components/propostas/PdfPreviewModal";
import { z } from "zod";

const search = z.object({ clienteId: z.string().optional() });

export const Route = createFileRoute("/propostas/nova")({
  component: NovaProposta,
  validateSearch: (s) => search.parse(s),
  head: () => ({ meta: [{ title: "Nova Proposta — Vert CRM" }] }),
});

function NovaProposta() {
  const { clienteId } = Route.useSearch();
  const navigate = useNavigate();
  const clientes = useStore((s) => s.clientes);
  const produtos = useStore((s) => s.produtos);
  const usuarios = useStore((s) => s.usuarios);
  const empresa = useStore((s) => s.empresa);
  const currentUserId = useStore((s) => s.currentUserId);
  const addProposta = useStore((s) => s.addProposta);
  const podePdf = usePode("exportar_pdf");

  const [selCliente, setSelCliente] = useState(clienteId ?? clientes[0]?.id ?? "");
  const cliente = clientes.find((c) => c.id === selCliente);

  const [irradiacao, setIrradiacao] = useState(5.2);
  const [eficiencia, setEficiencia] = useState(0.8);
  const [cobertura, setCobertura] = useState(1);
  const [inflacao, setInflacao] = useState(8);
  const [taxaFin, setTaxaFin] = useState(1.49);
  const [taxaCart, setTaxaCart] = useState(2.99);
  const [validadeDias, setValidadeDias] = useState(30);

  const [itens, setItens] = useState<{ produtoId: string; quantidade: number; precoUnitario: number }[]>([]);

  const dim = cliente ? dimensionarSistema(cliente.consumoMedio, irradiacao, eficiencia, cobertura) : { potenciaKwp: 0, geracaoMensal: 0 };

  const totais = useMemo(() => {
    const valorVenda = itens.reduce((a, it) => a + it.precoUnitario * it.quantidade, 0);
    const custo = itens.reduce((a, it) => {
      const p = produtos.find((x) => x.id === it.produtoId);
      return a + (p?.precoCusto ?? 0) * it.quantidade;
    }, 0);
    const kwpInst = itens.reduce((a, it) => {
      const p = produtos.find((x) => x.id === it.produtoId);
      if (p?.categoria === "modulo" && p.potenciaW) return a + (p.potenciaW * it.quantidade) / 1000;
      return a;
    }, 0);
    const margem = valorVenda > 0 ? ((valorVenda - custo) / valorVenda) * 100 : 0;
    return { valorVenda, custo, kwpInst, margem };
  }, [itens, produtos]);

  const econ = cliente
    ? calcularEconomia({ consumoKwh: cliente.consumoMedio, tarifa: cliente.tarifa, geracaoKwh: dim.geracaoMensal })
    : { faturaAtual: 0, faturaSolar: 0, economiaMes: 0, economiaAno: 0 };

  const paybackMeses = totais.valorVenda > 0 ? payback(totais.valorVenda, econ.economiaMes, inflacao) : 0;
  const economia20 = projecao20Anos(econ.economiaAno, inflacao);
  const retornoAno = totais.valorVenda > 0 ? (econ.economiaAno / totais.valorVenda) * 100 : 0;

  const parcelasFin = [24, 36, 48, 60].map((n) => ({ n, valor: totais.valorVenda > 0 ? tabelaPrice(totais.valorVenda, taxaFin, n) : 0 }));
  const parcelasCart = [10, 12, 18, 21].map((n) => ({ n, valor: totais.valorVenda > 0 ? tabelaPrice(totais.valorVenda, taxaCart, n) : 0 }));

  // Quantidade ideal de módulos para atender a potência dimensionada
  const qtdModulosIdeal = (potenciaW: number) => {
    if (!potenciaW || potenciaW <= 0 || dim.potenciaKwp <= 0) return 1;
    return Math.max(1, Math.ceil((dim.potenciaKwp * 1000) / potenciaW));
  };

  const addItem = () => {
    const prod = produtos.find((p) => p.ativo);
    if (!prod) return;
    const qtd = prod.categoria === "modulo" && prod.potenciaW ? qtdModulosIdeal(prod.potenciaW) : 1;
    setItens([...itens, { produtoId: prod.id, quantidade: qtd, precoUnitario: prod.precoVenda }]);
  };

  const updateItem = (i: number, patch: Partial<{ produtoId: string; quantidade: number; precoUnitario: number }>) => {
    setItens(itens.map((it, idx) => {
      if (idx !== i) return it;
      const next = { ...it, ...patch };
      if (patch.produtoId && patch.produtoId !== it.produtoId) {
        const p = produtos.find((x) => x.id === patch.produtoId);
        if (p) {
          next.precoUnitario = p.precoVenda;
          // Auto-calcula quantidade para módulos baseado no dimensionamento
          if (p.categoria === "modulo" && p.potenciaW) {
            next.quantidade = qtdModulosIdeal(p.potenciaW);
          }
        }
      }
      return next;
    }));
  };
  const removeItem = (i: number) => setItens(itens.filter((_, idx) => idx !== i));

  // Recalcula automaticamente a quantidade dos módulos quando o dimensionamento muda
  useEffect(() => {
    if (dim.potenciaKwp <= 0) return;
    setItens((prev) => {
      let mudou = false;
      const next = prev.map((it) => {
        const p = produtos.find((x) => x.id === it.produtoId);
        if (p?.categoria === "modulo" && p.potenciaW) {
          const ideal = qtdModulosIdeal(p.potenciaW);
          if (ideal !== it.quantidade) {
            mudou = true;
            return { ...it, quantidade: ideal };
          }
        }
        return it;
      });
      return mudou ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dim.potenciaKwp, produtos]);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const salvar = (acao: "save" | "savePdf" | "preview" = "save") => {
    if (!cliente) {
      notify.warning("Selecione um cliente", "Escolha o cliente antes de salvar a proposta.");
      return;
    }
    if (itens.length === 0) {
      notify.warning("Adicione itens", "Inclua módulos, inversor e serviços para gerar a proposta.");
      return;
    }
    const validade = new Date();
    validade.setDate(validade.getDate() + validadeDias);
    const nova = addProposta({
      clienteId: cliente.id,
      consultorId: currentUserId,
      validadeAte: validade.toISOString(),
      status: "rascunho",
      itens,
      irradiacao,
      eficiencia,
      cobertura,
      inflacao,
      taxaFinanciamento: taxaFin,
      taxaCartao: taxaCart,
    });
    const consultor = usuarios.find((u) => u.id === currentUserId);

    if (acao === "savePdf") {
      gerarPdfProposta({ proposta: nova, cliente, consultor, produtos, empresa, modo: "save" });
      notify.success("Proposta salva", `${nova.numero} criada e PDF baixado.`);
      navigate({ to: "/propostas" });
      return;
    }
    if (acao === "preview") {
      const url = gerarPdfProposta({ proposta: nova, cliente, consultor, produtos, empresa, modo: "blob" });
      if (typeof url === "string") setPreviewUrl(url);
      notify.success("Proposta salva", `${nova.numero} pronta para visualização.`);
      return;
    }
    notify.success("Proposta salva", `${nova.numero} criada como rascunho.`);
    navigate({ to: "/propostas" });
  };

  const visualizarPreviewSemSalvar = () => {
    if (!cliente) {
      notify.warning("Selecione um cliente para visualizar.");
      return;
    }
    if (itens.length === 0) {
      notify.warning("Adicione itens para visualizar a proposta.");
      return;
    }
    const validade = new Date();
    validade.setDate(validade.getDate() + validadeDias);
    const consultor = usuarios.find((u) => u.id === currentUserId);
    // Proposta temporária só para preview
    const temp = {
      id: "preview",
      numero: "PRÉVIA",
      versao: 1,
      criadoEm: new Date().toISOString(),
      clienteId: cliente.id,
      consultorId: currentUserId,
      validadeAte: validade.toISOString(),
      status: "rascunho" as const,
      itens,
      irradiacao,
      eficiencia,
      cobertura,
      inflacao,
      taxaFinanciamento: taxaFin,
      taxaCartao: taxaCart,
    };
    const url = gerarPdfProposta({ proposta: temp, cliente, consultor, produtos, empresa, modo: "blob" });
    if (typeof url === "string") setPreviewUrl(url);
  };

  const abrirGerador = () => {
    if (!cliente) return;
    const params = new URLSearchParams({
      nome: cliente.nome, consumo: String(cliente.consumoMedio), tarifa: String(cliente.tarifa),
      kwp: String(totais.kwpInst || dim.potenciaKwp), valor: String(totais.valorVenda),
    });
    window.open(`/gerador-proposta.html?${params.toString()}`, "_blank");
  };

  const inp = "w-full h-9 px-3 rounded-lg bg-muted border border-transparent focus:bg-card focus:border-vert-light text-sm outline-none";

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1500px] mx-auto">
      <Link to="/propostas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-vert">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Nova Proposta</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monte o sistema e simule retorno financeiro</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={abrirGerador} disabled={!cliente} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-accent disabled:opacity-50">
            <ExternalLink className="h-4 w-4" /> Gerador HTML
          </button>
          <button onClick={visualizarPreviewSemSalvar} disabled={!cliente || itens.length === 0} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-vert text-vert text-sm font-semibold hover:bg-vert-soft disabled:opacity-50">
            <Eye className="h-4 w-4" /> Visualizar PDF
          </button>
          {podePdf && (
            <button onClick={() => salvar("savePdf")} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vert-dark text-white text-sm font-semibold">
              <Download className="h-4 w-4" /> Salvar e baixar
            </button>
          )}
          <button onClick={() => salvar("save")} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Salvar proposta</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coluna esquerda — config */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <h2 className="font-display font-bold text-sm uppercase tracking-wider text-vert">Cliente</h2>
            <select value={selCliente} onChange={(e) => setSelCliente(e.target.value)} className={inp}>
              <option value="">Selecione…</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            {cliente && (
              <div className="text-xs text-muted-foreground space-y-0.5 pt-2 border-t border-border">
                <div>Consumo: <span className="font-semibold text-foreground">{kwh(cliente.consumoMedio)}</span></div>
                <div>Tarifa: <span className="font-semibold text-foreground">R$ {cliente.tarifa.toFixed(2)}/kWh</span></div>
                <div>Fatura atual: <span className="font-semibold text-vert">{brl(econ.faturaAtual)}/mês</span></div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-vert-dark to-vert text-white rounded-xl p-5 space-y-3">
            <h2 className="font-display font-bold text-sm uppercase tracking-wider text-vert-glow">Dimensionamento</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label>Irradiação<input type="number" step="0.1" value={irradiacao} onChange={(e) => setIrradiacao(+e.target.value)} className="w-full mt-1 h-8 px-2 rounded bg-white/10 border border-white/20 text-white text-sm outline-none" /></label>
              <label>Eficiência<input type="number" step="0.05" value={eficiencia} onChange={(e) => setEficiencia(+e.target.value)} className="w-full mt-1 h-8 px-2 rounded bg-white/10 border border-white/20 text-white text-sm outline-none" /></label>
              <label>Cobertura<input type="number" step="0.05" value={cobertura} onChange={(e) => setCobertura(+e.target.value)} className="w-full mt-1 h-8 px-2 rounded bg-white/10 border border-white/20 text-white text-sm outline-none" /></label>
              <label>Inflação %a.a.<input type="number" step="0.5" value={inflacao} onChange={(e) => setInflacao(+e.target.value)} className="w-full mt-1 h-8 px-2 rounded bg-white/10 border border-white/20 text-white text-sm outline-none" /></label>
            </div>
            <div className="pt-3 border-t border-white/15 grid grid-cols-2 gap-3">
              <div><div className="text-[10px] text-white/60 uppercase">Potência ideal</div><div className="font-display font-extrabold text-xl text-vert-glow">{kwp(dim.potenciaKwp)}</div></div>
              <div><div className="text-[10px] text-white/60 uppercase">Geração/mês</div><div className="font-display font-extrabold text-xl text-vert-glow">{kwh(dim.geracaoMensal)}</div></div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <h2 className="font-display font-bold text-sm uppercase tracking-wider text-vert">Taxas (interno)</h2>
            <label className="block text-xs">Taxa Financiamento (% mês)<input type="number" step="0.01" value={taxaFin} onChange={(e) => setTaxaFin(+e.target.value)} className={inp + " mt-1"} /></label>
            <label className="block text-xs">Taxa Cartão (% mês)<input type="number" step="0.01" value={taxaCart} onChange={(e) => setTaxaCart(+e.target.value)} className={inp + " mt-1"} /></label>
            <label className="block text-xs">Validade (dias)<input type="number" value={validadeDias} onChange={(e) => setValidadeDias(+e.target.value)} className={inp + " mt-1"} /></label>
          </div>
        </div>

        {/* Coluna direita */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-sm uppercase tracking-wider text-vert">Sistema (itens do catálogo)</h2>
              <button onClick={addItem} className="inline-flex items-center gap-1 text-sm font-semibold text-vert hover:underline">
                <Plus className="h-4 w-4" /> Adicionar item
              </button>
            </div>
            <div className="space-y-2">
              {itens.map((it, i) => {
                const prod = produtos.find((x) => x.id === it.produtoId);
                return (
                  <div key={i} className="space-y-1">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <select value={it.produtoId} onChange={(e) => updateItem(i, { produtoId: e.target.value })} className={inp + " col-span-6"}>
                        {produtos.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome}{p.fabricante ? ` · ${p.fabricante}` : ""}</option>)}
                      </select>
                      <input type="number" step="0.01" value={it.quantidade} onChange={(e) => updateItem(i, { quantidade: +e.target.value })} className={inp + " col-span-2"} />
                      <input type="number" step="0.01" value={it.precoUnitario} onChange={(e) => updateItem(i, { precoUnitario: +e.target.value })} className={inp + " col-span-3"} />
                      <button onClick={() => removeItem(i)} className="col-span-1 p-2 rounded hover:bg-rose-50 text-rose-600"><Trash2 className="h-4 w-4 mx-auto" /></button>
                    </div>
                    {prod?.categoria === "modulo" && prod.potenciaW && (
                      <div className="flex items-center gap-1.5 text-[11px] text-vert pl-1">
                        <Zap className="h-3 w-3" />
                        <span>
                          Quantidade calculada para atender {kwp(dim.potenciaKwp)} ({prod.potenciaW}W cada).
                        </span>
                        {it.quantidade !== qtdModulosIdeal(prod.potenciaW) && (
                          <button
                            onClick={() => updateItem(i, { quantidade: qtdModulosIdeal(prod.potenciaW!) })}
                            className="ml-1 underline font-semibold"
                          >
                            Recalcular ({qtdModulosIdeal(prod.potenciaW)})
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {itens.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Adicione módulos, inversor, estrutura e serviços.</p>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 pt-4 border-t border-border text-xs">
              <div className="bg-muted rounded p-2"><div className="text-muted-foreground">Custo</div><div className="font-bold text-base">{brl(totais.custo)}</div></div>
              <div className="bg-muted rounded p-2"><div className="text-muted-foreground">Venda</div><div className="font-bold text-base text-vert">{brl(totais.valorVenda)}</div></div>
              <div className="bg-muted rounded p-2"><div className="text-muted-foreground">Margem</div><div className="font-bold text-base">{totais.margem.toFixed(1)}%</div></div>
              <div className="bg-muted rounded p-2"><div className="text-muted-foreground">Sistema</div><div className="font-bold text-base">{kwp(totais.kwpInst)}</div></div>
            </div>
          </div>

          {/* Simulação ROI */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h2 className="font-display font-bold text-sm uppercase tracking-wider text-vert mb-3">Retorno do investimento</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><div className="text-[11px] text-muted-foreground uppercase">Fatura sem solar</div><div className="font-display font-extrabold text-lg">{brl(econ.faturaAtual)}</div></div>
              <div><div className="text-[11px] text-muted-foreground uppercase">Fatura com solar</div><div className="font-display font-extrabold text-lg text-vert">{brl(econ.faturaSolar)}</div></div>
              <div><div className="text-[11px] text-muted-foreground uppercase">Economia/mês</div><div className="font-display font-extrabold text-lg text-vert">{brl(econ.economiaMes)}</div></div>
              <div><div className="text-[11px] text-muted-foreground uppercase">Economia 1º ano</div><div className="font-display font-extrabold text-lg">{brl(econ.economiaAno)}</div></div>
              <div><div className="text-[11px] text-muted-foreground uppercase">Retorno anual</div><div className="font-display font-extrabold text-lg">{retornoAno.toFixed(1)}%</div></div>
              <div><div className="text-[11px] text-muted-foreground uppercase">Payback</div><div className="font-display font-extrabold text-lg">{Number.isFinite(paybackMeses) ? `${(paybackMeses / 12).toFixed(1)} anos` : "—"}</div></div>
              <div className="col-span-2"><div className="text-[11px] text-muted-foreground uppercase">Economia 20 anos</div><div className="font-display font-extrabold text-2xl text-vert-dark">{brl(economia20)}</div></div>
            </div>
          </div>

          {/* Parcelas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-display font-bold text-sm mb-2">Financiamento</h3>
              <div className="space-y-1.5 text-sm">
                {parcelasFin.map((p) => (
                  <div key={p.n} className="flex justify-between border-b border-border/50 pb-1.5">
                    <span className="text-muted-foreground">{p.n}x</span>
                    <span className="font-semibold tabular-nums">{brlPrec(p.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-display font-bold text-sm mb-2">Cartão de Crédito</h3>
              <div className="space-y-1.5 text-sm">
                {parcelasCart.map((p) => (
                  <div key={p.n} className="flex justify-between border-b border-border/50 pb-1.5">
                    <span className="text-muted-foreground">{p.n}x</span>
                    <span className="font-semibold tabular-nums">{brlPrec(p.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {previewUrl && (
        <PdfPreviewModal
          url={previewUrl}
          titulo={cliente ? `Prévia · ${cliente.nome}` : "Prévia da proposta"}
          onClose={() => setPreviewUrl(null)}
        />
      )}
    </div>
  );
}
