// PDF comparativo: capa + tabela das 3 opções (Básico / Ideal / Premium).
// Mantém o padrão visual de pdfProposta.ts.
import jsPDF from "jspdf";
import type { Proposta, Cliente, Produto, Empresa, Usuario, PropostaTier } from "./types";
import { PROPOSTA_TIER_LABEL, PROPOSTA_TIERS_ORDEM } from "./types";
import { brl, kwh, kwp, dataBR, formatDoc, formatTel } from "./format";
import {
  dimensionarSistema,
  calcularEconomia,
  payback,
  projecao20Anos,
  tabelaPrice,
  calcularTIR,
} from "./finance";
import { VERT_LOGO_PNG_BASE64 } from "@/assets/vertLogoBase64";

const LOGO_RATIO = 577 / 351;
const VERT_DARK: [number, number, number] = [13, 82, 52];
const VERT: [number, number, number] = [45, 158, 100];
const VERT_GLOW: [number, number, number] = [94, 232, 154];
const MUTED: [number, number, number] = [120, 120, 120];
const TEXT: [number, number, number] = [30, 30, 30];
const SOFT: [number, number, number] = [232, 246, 238];
const BORDER: [number, number, number] = [225, 230, 228];
const BLUE: [number, number, number] = [33, 102, 196];

const W = 210;
const H = 297;
const M = 14;

interface CalcTier {
  tier: PropostaTier;
  proposta: Proposta;
  kwpInst: number;
  valor: number;
  geracaoMensal: number;
  economiaMes: number;
  economia20: number;
  paybackMeses: number;
  tir: number;
}

function calc(p: Proposta, cliente: Cliente, produtos: Produto[]): CalcTier {
  const valor = p.itens.reduce((a, it) => a + it.precoUnitario * it.quantidade, 0);
  const kwpInst = p.itens.reduce((a, it) => {
    const prod = produtos.find((x) => x.id === it.produtoId);
    if (prod?.categoria === "modulo" && prod.potenciaW)
      return a + (prod.potenciaW * it.quantidade) / 1000;
    return a;
  }, 0);
  const dim = dimensionarSistema(cliente.consumoMedio, p.irradiacao, p.eficiencia, p.cobertura);
  const econ = calcularEconomia({
    consumoKwh: cliente.consumoMedio,
    tarifa: cliente.tarifa,
    geracaoKwh: dim.geracaoMensal,
  });
  const paybackMeses = valor > 0 ? payback(valor, econ.economiaMes, p.inflacao) : 0;
  const economia20 = projecao20Anos(econ.economiaAno, p.inflacao);
  const tir = calcularTIR(valor, econ.economiaAno, p.inflacao);
  return {
    tier: p.tier ?? "ideal",
    proposta: p,
    kwpInst,
    valor,
    geracaoMensal: dim.geracaoMensal,
    economiaMes: econ.economiaMes,
    economia20,
    paybackMeses,
    tir,
  };
}

function header(pdf: jsPDF, pagina: number, total: number, titulo: string) {
  pdf.setFillColor(...VERT_DARK);
  pdf.rect(0, 0, W, 16, "F");
  const lh = 8;
  pdf.addImage(VERT_LOGO_PNG_BASE64, "PNG", M, 4, lh * LOGO_RATIO, lh, undefined, "FAST");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(titulo.toUpperCase(), W / 2, 10, { align: "center" });
  pdf.setTextColor(...VERT_GLOW);
  pdf.setFont("helvetica", "bold");
  pdf.text(`${pagina} / ${total}`, W - M, 10, { align: "right" });
}

function footer(pdf: jsPDF, empresa: Empresa) {
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.2);
  pdf.line(M, H - 14, W - M, H - 14);
  pdf.setFontSize(7);
  pdf.setTextColor(...MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.text(`${empresa.razaoSocial ?? ""} · CNPJ ${empresa.cnpj ?? "—"}`, M, H - 9);
  pdf.text(empresa.endereco || "—", M, H - 5);
  pdf.text(
    `${empresa.telefone || ""}${empresa.telefone && empresa.email ? " · " : ""}${empresa.email || ""}`,
    W - M,
    H - 5,
    { align: "right" },
  );
}

function paginaCapa(
  pdf: jsPDF,
  cliente: Cliente,
  consultor: Usuario | undefined,
  empresa: Empresa,
  calcs: CalcTier[],
) {
  pdf.setFillColor(...VERT_DARK);
  pdf.rect(0, 0, W, H, "F");
  pdf.setFillColor(...VERT);
  pdf.circle(W + 30, H - 40, 90, "F");
  pdf.setFillColor(...VERT_GLOW);
  pdf.circle(-15, 25, 35, "F");

  const logoH = 38;
  pdf.addImage(VERT_LOGO_PNG_BASE64, "PNG", (W - logoH * LOGO_RATIO) / 2, 28, logoH * LOGO_RATIO, logoH, undefined, "FAST");

  pdf.setTextColor(...VERT_GLOW);
  pdf.setFontSize(11);
  pdf.text("3 opções personalizadas para o seu perfil", W / 2, 28 + logoH + 8, { align: "center" });

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text("PROPOSTA COMPARATIVA", W / 2, 120, { align: "center" });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(36);
  pdf.text("Energia Solar", W / 2, 138, { align: "center" });

  // Card cliente
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(M, 152, W - 2 * M, 42, 4, 4, "F");
  pdf.setTextColor(...MUTED);
  pdf.setFontSize(8);
  pdf.text("PREPARADA PARA", M + 6, 161);
  pdf.setTextColor(...VERT_DARK);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(cliente.nome, M + 6, 172);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...TEXT);
  const docFmt = cliente.documento ? formatDoc(cliente.documento) : "—";
  pdf.text(`${cliente.tipo === "pj" ? "CNPJ" : "CPF"}  ${docFmt}`, M + 6, 180);
  pdf.text(`${cliente.telefone ? formatTel(cliente.telefone) : "—"} · ${cliente.email || "—"}`, M + 6, 187);

  // Mini-cards dos 3 tiers
  const cardW = (W - 2 * M - 8) / 3;
  const cy = 205;
  calcs.forEach((c, i) => {
    const x = M + i * (cardW + 4);
    const isIdeal = c.tier === "ideal";
    if (isIdeal) {
      pdf.setFillColor(...VERT_GLOW);
      pdf.roundedRect(x - 1, cy - 1, cardW + 2, 60, 4, 4, "F");
    }
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, cy, cardW, 58, 4, 4, "F");
    pdf.setTextColor(...VERT_DARK);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(PROPOSTA_TIER_LABEL[c.tier].toUpperCase(), x + cardW / 2, cy + 9, { align: "center" });
    if (isIdeal) {
      pdf.setFillColor(...VERT_DARK);
      pdf.roundedRect(x + cardW / 2 - 18, cy + 12, 36, 6, 2, 2, "F");
      pdf.setTextColor(...VERT_GLOW);
      pdf.setFontSize(6);
      pdf.text("RECOMENDADO", x + cardW / 2, cy + 16.2, { align: "center" });
    }
    pdf.setTextColor(...MUTED);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text("POTÊNCIA", x + cardW / 2, cy + 24, { align: "center" });
    pdf.setTextColor(...VERT_DARK);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text(kwp(c.kwpInst), x + cardW / 2, cy + 32, { align: "center" });
    pdf.setTextColor(...MUTED);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text("INVESTIMENTO", x + cardW / 2, cy + 41, { align: "center" });
    pdf.setTextColor(...VERT);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text(brl(c.valor), x + cardW / 2, cy + 50, { align: "center" });
  });

  pdf.setTextColor(...VERT_GLOW);
  pdf.setFontSize(8);
  pdf.text(`Consultor: ${consultor?.nome ?? "—"}  ·  Emitida em ${dataBR(new Date().toISOString())}`, W / 2, 280, { align: "center" });
  void empresa;
}

function paginaTabela(pdf: jsPDF, calcs: CalcTier[], empresa: Empresa) {
  pdf.addPage();
  header(pdf, 2, 2, "Compare as opções");
  footer(pdf, empresa);

  // Cabeçalho da tabela
  const colLabelW = 56;
  const colW = (W - 2 * M - colLabelW) / 3;
  const yStart = 32;

  const drawColHeader = (i: number, c: CalcTier) => {
    const x = M + colLabelW + i * colW;
    const isIdeal = c.tier === "ideal";
    if (isIdeal) {
      pdf.setFillColor(...BLUE);
    } else {
      pdf.setFillColor(...VERT_DARK);
    }
    pdf.rect(x, yStart, colW, 14, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(PROPOSTA_TIER_LABEL[c.tier], x + colW / 2, yStart + 6, { align: "center" });
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.text(c.proposta.numero, x + colW / 2, yStart + 11, { align: "center" });
    if (isIdeal) {
      pdf.setFillColor(...VERT_GLOW);
      pdf.rect(x, yStart + 14, colW, 4, "F");
      pdf.setTextColor(...VERT_DARK);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6);
      pdf.text("RECOMENDADO", x + colW / 2, yStart + 17, { align: "center" });
    }
  };

  // Header
  pdf.setFillColor(...SOFT);
  pdf.rect(M, yStart, colLabelW, 14, "F");
  pdf.setTextColor(...VERT_DARK);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Configuração", M + 3, yStart + 9);
  calcs.forEach((c, i) => drawColHeader(i, c));

  // Linhas
  const linhas: [string, (c: CalcTier) => string][] = [
    ["Potência instalada", (c) => kwp(c.kwpInst)],
    ["Geração mensal", (c) => kwh(c.geracaoMensal)],
    ["Economia mensal", (c) => brl(c.economiaMes)],
    ["Investimento total", (c) => brl(c.valor)],
    ["À vista (5% desc.)", (c) => brl(c.valor * 0.95)],
    ["Parcela 60x", (c) => brl(tabelaPrice(c.valor, c.proposta.taxaFinanciamento, 60))],
    ["Payback estimado", (c) => Number.isFinite(c.paybackMeses) ? `${(c.paybackMeses / 12).toFixed(1)} anos` : "—"],
    ["Economia em 20 anos", (c) => brl(c.economia20)],
    ["TIR (20 anos)", (c) => Number.isFinite(c.tir) ? `${c.tir.toFixed(1)}% a.a.` : "—"],
    ["Garantia do serviço", () => "1 ano"],
  ];

  let y = yStart + 22;
  const rowH = 14;
  linhas.forEach((row, idx) => {
    if (idx % 2 === 1) {
      pdf.setFillColor(248, 250, 249);
      pdf.rect(M, y - 2, W - 2 * M, rowH, "F");
    }
    pdf.setDrawColor(...BORDER);
    pdf.setLineWidth(0.15);
    pdf.line(M, y + rowH - 2, W - M, y + rowH - 2);

    pdf.setTextColor(...MUTED);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(row[0], M + 3, y + 6);

    calcs.forEach((c, i) => {
      const x = M + colLabelW + i * colW;
      const isIdeal = c.tier === "ideal";
      pdf.setTextColor(isIdeal ? BLUE[0] : TEXT[0], isIdeal ? BLUE[1] : TEXT[1], isIdeal ? BLUE[2] : TEXT[2]);
      pdf.setFont("helvetica", isIdeal ? "bold" : "normal");
      pdf.setFontSize(9);
      pdf.text(row[1](c), x + colW / 2, y + 6, { align: "center" });
    });
    y += rowH;
  });

  // Borda destaque coluna Ideal
  const idealIdx = calcs.findIndex((c) => c.tier === "ideal");
  if (idealIdx >= 0) {
    const x = M + colLabelW + idealIdx * colW;
    pdf.setDrawColor(...BLUE);
    pdf.setLineWidth(0.6);
    pdf.rect(x, yStart, colW, y - yStart);
  }

  // Rodapé com chamada
  pdf.setFillColor(...SOFT);
  pdf.roundedRect(M, y + 4, W - 2 * M, 22, 3, 3, "F");
  pdf.setTextColor(...VERT_DARK);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("Pronto para escolher?", M + 6, y + 13);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...TEXT);
  pdf.text(
    "Fale com seu consultor para confirmar a opção desejada. Cada proposta tem PDF detalhado próprio.",
    M + 6,
    y + 19,
  );
}

interface GerarCompOpts {
  propostas: [Proposta, Proposta, Proposta] | Proposta[];
  cliente: Cliente;
  empresa: Empresa;
  consultor?: Usuario;
  produtos: Produto[];
  modo?: "save" | "blob" | "blob-data";
}

export function gerarPdfComparativo(opts: GerarCompOpts): string | void | Blob {
  const { propostas, cliente, empresa, consultor, produtos, modo = "save" } = opts;
  const ordenadas = [...propostas].sort(
    (a, b) =>
      PROPOSTA_TIERS_ORDEM.indexOf((a.tier ?? "ideal")) -
      PROPOSTA_TIERS_ORDEM.indexOf((b.tier ?? "ideal")),
  );
  const calcs = ordenadas.map((p) => calc(p, cliente, produtos));

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  paginaCapa(pdf, cliente, consultor, empresa, calcs);
  paginaTabela(pdf, calcs, empresa);

  const nome = `Comparativo-${cliente.nome.replace(/\s+/g, "_")}.pdf`;
  if (modo === "blob") return pdf.output("bloburl") as unknown as string;
  if (modo === "blob-data") return pdf.output("blob") as Blob;
  pdf.save(nome);
}
