// Gerador de PDF da proposta — modelo RESUMO (1 página A4 retrato).
// Layout responsivo: tudo é medido antes da renderização e, se exceder a área útil,
// um fator de escala (`s`) é aplicado a alturas, espaçamentos e fontes para garantir
// que o conteúdo SEMPRE caiba em uma única página A4.
import jsPDF from "jspdf";
import type { Proposta, Cliente, Produto, Empresa, Usuario } from "./types";
import { brl, kwh, kwp, dataBR, formatDoc } from "./format";
import { dimensionarSistema, calcularEconomia, payback, projecao20Anos, tabelaPrice } from "./finance";
import { VERT_LOGO_PNG_BASE64 } from "@/assets/vertLogoBase64";

const LOGO_RATIO = 577 / 351;

const VERT_DARK: [number, number, number] = [13, 82, 52];
const VERT: [number, number, number] = [45, 158, 100];
const VERT_GLOW: [number, number, number] = [94, 232, 154];
const TEXT: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [120, 120, 120];
const SOFT: [number, number, number] = [232, 246, 238];
const BORDER: [number, number, number] = [225, 230, 228];

const W = 210;
const H = 297;
const M = 12;

const HEADER_H = 28;
const FOOTER_H = 16;
const TOP_GAP = 6; // espaço após o header
const BOTTOM_GAP = 4; // respiro antes do footer
const USABLE_H = H - HEADER_H - FOOTER_H - TOP_GAP - BOTTOM_GAP;

interface GerarOpts {
  proposta: Proposta;
  cliente: Cliente;
  consultor?: Usuario;
  produtos: Produto[];
  empresa: Empresa;
  modo?: "save" | "blob" | "blob-data";
}

export function gerarPdfPropostaResumo(opts: GerarOpts): string | void | Blob {
  const { proposta, cliente, consultor, produtos, empresa, modo = "save" } = opts;

  // === Cálculos ===
  const valorVenda = proposta.itens.reduce((a, it) => a + it.precoUnitario * it.quantidade, 0);
  const kwpInst = proposta.itens.reduce((a, it) => {
    const p = produtos.find((x) => x.id === it.produtoId);
    if (p?.categoria === "modulo" && p.potenciaW) return a + (p.potenciaW * it.quantidade) / 1000;
    return a;
  }, 0);
  const qtdModulos = proposta.itens.reduce((a, it) => {
    const p = produtos.find((x) => x.id === it.produtoId);
    return p?.categoria === "modulo" ? a + it.quantidade : a;
  }, 0);
  const inversoresStr = proposta.itens
    .filter((it) => produtos.find((x) => x.id === it.produtoId)?.categoria === "inversor")
    .map((it) => {
      const p = produtos.find((x) => x.id === it.produtoId);
      return `${it.quantidade}x ${p?.nome ?? "Inversor"}`;
    })
    .join(" · ");

  // Itens "extras" (estrutura, cabos, etc.) — listados sucintamente se houver
  const extras = proposta.itens
    .map((it) => {
      const p = produtos.find((x) => x.id === it.produtoId);
      if (!p || p.categoria === "modulo" || p.categoria === "inversor") return null;
      return `${it.quantidade}× ${p.nome}`;
    })
    .filter((x): x is string => !!x);

  const dim = dimensionarSistema(cliente.consumoMedio, proposta.irradiacao, proposta.eficiencia, proposta.cobertura);
  const econ = calcularEconomia({ consumoKwh: cliente.consumoMedio, tarifa: cliente.tarifa, geracaoKwh: dim.geracaoMensal });
  const paybackMeses = valorVenda > 0 ? payback(valorVenda, econ.economiaMes, proposta.inflacao) : 0;
  const economia20 = projecao20Anos(econ.economiaAno, proposta.inflacao);

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const beneficios = [
    "Projeto e ART de engenheiro responsável",
    "Homologação junto à concessionária",
    "Instalação por equipe certificada",
    "Módulos com garantia de 25 anos",
    "Inversor com garantia de fábrica",
    "Monitoramento remoto da geração",
  ];

  // === Medição de blocos dinâmicos ===
  // splitTextToSize precisa de um fontSize ativo para medir corretamente.
  pdf.setFontSize(7.5);
  const invLines = inversoresStr
    ? (pdf.splitTextToSize(`Inversor(es): ${inversoresStr}`, W - 2 * M - 8) as string[])
    : [];
  const extrasStr = extras.join(" · ");
  pdf.setFontSize(7);
  const extrasLines = extrasStr
    ? (pdf.splitTextToSize(`Itens: ${extrasStr}`, W - 2 * M - 8) as string[])
    : [];
  pdf.setFontSize(7);
  const obsLines = proposta.observacoes
    ? (pdf.splitTextToSize(proposta.observacoes, W - 2 * M) as string[])
    : [];

  // === Alturas base (s = 1) ===
  // Bloco cliente
  const H_CLIENTE = 18;
  // Bloco sistema: título(6) + KPIs(14) + linhas de inversor/extras(3.2 mm/linha)
  const linhasInvExtras = invLines.length + extrasLines.length;
  const H_SISTEMA = 6 + 14 + Math.max(4, linhasInvExtras * 3.2) + 4; // padding interno
  // Financeiro: 2 linhas de KPIs (24 cada) + gap interno + margem
  const H_FIN_KPI_ROW = 24;
  const H_FINANCEIRO = H_FIN_KPI_ROW * 2 + 4 + 6;
  // Pagamento: título(6) + 1 linha de cards(22) + 4
  const H_PAGAMENTO = 6 + 22 + 6;
  // Inclusos: título(6) + linhas (em 2 colunas, ceil(n/2) * 5.5)
  const benRows = Math.ceil(beneficios.length / 2);
  const H_INCLUSOS = 6 + benRows * 5.5 + 2;
  // Observações
  const H_OBS = obsLines.length > 0 ? obsLines.length * 3.2 + 3 : 0;

  const HEIGHT_TOTAL =
    H_CLIENTE + H_SISTEMA + H_FINANCEIRO + H_PAGAMENTO + H_INCLUSOS + H_OBS;

  // Fator de escala — entre 0.62 (limite legível) e 1.
  const s = Math.max(0.62, Math.min(1, USABLE_H / HEIGHT_TOTAL));

  // Helpers para tamanhos escaláveis (fontes mantêm mínimo razoável).
  const fz = (base: number, min = 5.5) => Math.max(min, +(base * s).toFixed(2));
  const sp = (base: number) => +(base * s).toFixed(2);

  // ============================================================
  // RENDERIZAÇÃO
  // ============================================================

  // HEADER
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(0, 0, W, HEADER_H, "F");
  const lh = 14;
  const lw = lh * LOGO_RATIO;
  pdf.addImage(VERT_LOGO_PNG_BASE64, "PNG", M, 7, lw, lh, undefined, "FAST");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("PROPOSTA RESUMO", W - M, 13, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.text(`${proposta.numero} · Validade ${dataBR(proposta.validadeAte)}`, W - M, 20, { align: "right" });

  let y = HEADER_H + TOP_GAP;

  // === CLIENTE / CONSUMO ===
  const hCliente = sp(H_CLIENTE);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFontSize(fz(7));
  pdf.setFont("helvetica", "bold");
  pdf.text("CLIENTE", M, y);
  pdf.text("CONSUMO MÉDIO", W / 2, y);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(fz(11, 8));
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.text(cliente.nome, M, y + sp(5), { maxWidth: W / 2 - M - 2 });
  pdf.text(kwh(cliente.consumoMedio) + "/mês", W / 2, y + sp(5));
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(fz(8));
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.text(
    `${cliente.tipo === "pj" ? "CNPJ" : "CPF"}: ${cliente.documento ? formatDoc(cliente.documento) : "—"}`,
    M,
    y + sp(10),
  );
  pdf.text(`Tarifa atual: ${brl(cliente.tarifa)}/kWh`, W / 2, y + sp(10));
  y += hCliente;

  // === SISTEMA ===
  const hSistema = sp(H_SISTEMA);
  pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
  pdf.setDrawColor(VERT[0], VERT[1], VERT[2]);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(M, y, W - 2 * M, hSistema, 2, 2, "FD");

  pdf.setFontSize(fz(8));
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.text("SISTEMA FOTOVOLTAICO RECOMENDADO", M + 4, y + sp(6));

  const colW = (W - 2 * M - 8) / 4;
  const kpis: [string, string][] = [
    ["Potência", kwp(kwpInst)],
    ["Geração estimada", kwh(dim.geracaoMensal) + "/mês"],
    ["Módulos", `${qtdModulos} un`],
    ["Cobertura", `${Math.round((proposta.cobertura ?? 1) * 100)}%`],
  ];
  kpis.forEach(([rotulo, valor], i) => {
    const x = M + 4 + i * colW;
    pdf.setFontSize(fz(7));
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.text(rotulo.toUpperCase(), x, y + sp(12));
    pdf.setFontSize(fz(12, 8));
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.text(valor, x, y + sp(19));
  });

  // Inversor(es) + extras dentro do box, com largura limitada e font escalada
  let yInner = y + sp(6 + 14 + 4);
  if (invLines.length > 0) {
    pdf.setFontSize(fz(7.5));
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.text(invLines, M + 4, yInner);
    yInner += invLines.length * sp(3.2);
  }
  if (extrasLines.length > 0) {
    pdf.setFontSize(fz(7));
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.text(extrasLines, M + 4, yInner);
  }
  y += hSistema + sp(3);

  // === FINANCEIRO ===
  const kpiH = sp(H_FIN_KPI_ROW);
  const kpiW = (W - 2 * M - 6) / 2;
  const gapKpi = sp(4);
  const finKpis: { label: string; value: string; sub?: string; bg: [number, number, number] }[] = [
    { label: "INVESTIMENTO", value: brl(valorVenda), sub: "Sistema completo + instalação", bg: VERT_DARK },
    { label: "ECONOMIA MENSAL", value: brl(econ.economiaMes), sub: `≈ ${brl(econ.economiaAno)} por ano`, bg: VERT },
    {
      label: "PAYBACK",
      value: paybackMeses > 0 && Number.isFinite(paybackMeses) ? `${(paybackMeses / 12).toFixed(1)} anos` : "—",
      sub: "Retorno do investimento",
      bg: VERT_DARK,
    },
    { label: "ECONOMIA EM 20 ANOS", value: brl(economia20), sub: `Inflação ${proposta.inflacao}% a.a.`, bg: VERT },
  ];

  for (let i = 0; i < finKpis.length; i++) {
    const k = finKpis[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * (kpiW + 6);
    const ky = y + row * (kpiH + gapKpi);
    pdf.setFillColor(k.bg[0], k.bg[1], k.bg[2]);
    pdf.roundedRect(x, ky, kpiW, kpiH, 2, 2, "F");
    pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(fz(7));
    pdf.text(k.label, x + 4, ky + sp(6));
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(fz(15, 10));
    pdf.text(k.value, x + 4, ky + sp(14));
    if (k.sub) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(fz(7));
      pdf.setTextColor(220, 240, 230);
      pdf.text(k.sub, x + 4, ky + sp(20));
    }
  }
  y += kpiH * 2 + gapKpi + sp(6);

  // === CONDIÇÕES DE PAGAMENTO ===
  pdf.setFontSize(fz(8));
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.text("CONDIÇÕES DE PAGAMENTO", M, y);
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.setLineWidth(0.2);
  pdf.line(M, y + 1.5, W - M, y + 1.5);
  y += sp(6);

  const fin60 = tabelaPrice(valorVenda, proposta.taxaFinanciamento, 60);
  const fin84 = tabelaPrice(valorVenda, proposta.taxaFinanciamento, 84);
  const cart12 = tabelaPrice(valorVenda, proposta.taxaCartao, 12);

  const opcoes: [string, string, string][] = [
    ["À vista", brl(valorVenda), "Pix ou transferência"],
    ["Cartão 12x", `${brl(cart12)}/mês`, `Taxa ${proposta.taxaCartao}% a.m.`],
    ["Financiamento 60x", `${brl(fin60)}/mês`, `Taxa ${proposta.taxaFinanciamento}% a.m.`],
    ["Financiamento 84x", `${brl(fin84)}/mês`, `Taxa ${proposta.taxaFinanciamento}% a.m.`],
  ];

  const oColW = (W - 2 * M) / 4;
  const oCardH = sp(22);
  opcoes.forEach(([rotulo, valor, sub], i) => {
    const x = M + i * oColW;
    pdf.setFillColor(250, 252, 251);
    pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
    pdf.roundedRect(x + 1, y, oColW - 2, oCardH, 1.5, 1.5, "FD");
    pdf.setFontSize(fz(7));
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.text(rotulo.toUpperCase(), x + 4, y + sp(5));
    pdf.setFontSize(fz(11, 8));
    pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.text(valor, x + 4, y + sp(12));
    pdf.setFontSize(fz(7));
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.text(sub, x + 4, y + sp(18));
  });
  y += oCardH + sp(6);

  // === INCLUSOS ===
  pdf.setFontSize(fz(8));
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.text("INCLUSO NA PROPOSTA", M, y);
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.line(M, y + 1.5, W - M, y + 1.5);
  y += sp(6);

  pdf.setFontSize(fz(8));
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  const bColW = (W - 2 * M) / 2;
  const bRowH = sp(5.5);
  beneficios.forEach((b, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * bColW;
    const by = y + row * bRowH;
    pdf.setTextColor(VERT[0], VERT[1], VERT[2]);
    pdf.text("✓", x, by);
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.text(b, x + 4, by, { maxWidth: bColW - 6 });
  });
  y += benRows * bRowH + sp(2);

  // === OBSERVAÇÕES ===
  if (obsLines.length > 0) {
    pdf.setFontSize(fz(7));
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.text(obsLines, M, y);
  }

  // === FOOTER ===
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(0, H - FOOTER_H, W, FOOTER_H, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(empresa.razaoSocial ?? "Vert Energie", M, H - 9);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.text(
    `CNPJ ${empresa.cnpj ?? "—"} · ${empresa.telefone ?? ""}${empresa.telefone && empresa.email ? " · " : ""}${empresa.email ?? ""}`,
    M,
    H - 5,
  );
  if (consultor?.nome) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`Consultor: ${consultor.nome}`, W - M, H - 9, { align: "right" });
    if (consultor.email) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
      pdf.text(consultor.email, W - M, H - 5, { align: "right" });
    }
  }

  // Salvaguarda: se por qualquer motivo o jsPDF criou páginas extras, descarta-as.
  while (pdf.getNumberOfPages() > 1) {
    pdf.deletePage(pdf.getNumberOfPages());
  }

  if (modo === "blob") return pdf.output("bloburl") as unknown as string;
  if (modo === "blob-data") return pdf.output("blob") as Blob;
  pdf.save(`Proposta-Resumo-${proposta.numero}-${cliente.nome.replace(/\s+/g, "_")}.pdf`);
}
