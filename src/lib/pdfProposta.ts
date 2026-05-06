// Gerador de PDF da proposta — 7 páginas em A4 retrato (210x297mm) usando jsPDF nativo.
import jsPDF from "jspdf";
import type { Proposta, Cliente, Produto, Empresa, Usuario } from "./types";
import { brl, brlPrec, kwh, kwp, dataBR, formatDoc, formatTel } from "./format";
import { dimensionarSistema, calcularEconomia, payback, projecao20Anos, tabelaPrice } from "./finance";
import { VERT_LOGO_PNG_BASE64 } from "@/assets/vertLogoBase64";

// Aspect ratio of the logo PNG (577 x 351)
const LOGO_RATIO = 577 / 351;

const VERT_DARK: [number, number, number] = [13, 82, 52];
const VERT: [number, number, number] = [45, 158, 100];
const VERT_GLOW: [number, number, number] = [94, 232, 154];
const TEXT: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [120, 120, 120];
const SOFT: [number, number, number] = [232, 246, 238];

const W = 210;
const H = 297;
const M = 14;

interface Ctx {
  pdf: jsPDF;
  empresa: Empresa;
  cliente: Cliente;
  consultor?: Usuario;
  proposta: Proposta;
  produtos: Produto[];
  totais: { valorVenda: number; kwpInst: number };
  econ: ReturnType<typeof calcularEconomia>;
  dim: ReturnType<typeof dimensionarSistema>;
  paybackMeses: number;
  economia20: number;
}

function header(ctx: Ctx, pagina: number, titulo: string) {
  const { pdf } = ctx;
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(0, 0, W, 18, "F");
  pdf.setFillColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.circle(M + 4, 9, 3, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("vert.energie", M + 10, 11);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(titulo, W - M, 9, { align: "right" });
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.text(`Página ${pagina} de 7`, W - M, 14, { align: "right" });
}

function footer(ctx: Ctx) {
  const { pdf, empresa, proposta } = ctx;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(M, H - 14, W - M, H - 14);
  pdf.setFontSize(7);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFont("helvetica", "normal");
  pdf.text(`${empresa.razaoSocial} · CNPJ ${empresa.cnpj}`, M, H - 9);
  pdf.text(`Proposta ${proposta.numero} · Validade ${dataBR(proposta.validadeAte)}`, W - M, H - 9, { align: "right" });
  pdf.text(empresa.endereco, M, H - 5);
  pdf.text(`${empresa.telefone} · ${empresa.email}`, W - M, H - 5, { align: "right" });
}

function pageFrame(ctx: Ctx, pagina: number, titulo: string) {
  header(ctx, pagina, titulo);
  footer(ctx);
}

function sectionTitle(pdf: jsPDF, y: number, texto: string) {
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(M, y, 3, 7, "F");
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(texto, M + 6, y + 5.5);
}

function kvBox(pdf: jsPDF, x: number, y: number, w: number, h: number, label: string, valor: string, destaque = false) {
  const bg: [number, number, number] = destaque ? VERT_DARK : SOFT;
  const lc: [number, number, number] = destaque ? VERT_GLOW : MUTED;
  const vc: [number, number, number] = destaque ? [255, 255, 255] : VERT_DARK;
  pdf.setFillColor(bg[0], bg[1], bg[2]);
  pdf.roundedRect(x, y, w, h, 2, 2, "F");
  pdf.setTextColor(lc[0], lc[1], lc[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text(label.toUpperCase(), x + 4, y + 6);
  pdf.setTextColor(vc[0], vc[1], vc[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(valor, x + 4, y + h - 4);
}

// ---- Páginas ----

function paginaCapa(ctx: Ctx) {
  const { pdf, cliente, proposta, totais, consultor } = ctx;
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(0, 0, W, H, "F");
  // arc decorativo
  pdf.setFillColor(VERT[0], VERT[1], VERT[2]);
  pdf.circle(W + 20, H - 30, 80, "F");
  pdf.setFillColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.circle(-10, 30, 40, "F");

  // Logomarca da Vert Energie (PNG branco com transparência)
  const logoH = 22;
  const logoW = logoH * LOGO_RATIO;
  pdf.addImage(VERT_LOGO_PNG_BASE64, "PNG", M, 36, logoW, logoH, undefined, "FAST");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Energia solar fotovoltaica", M, 36 + logoH + 6);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(36);
  pdf.text("Proposta", M, 110);
  pdf.text("Comercial", M, 124);
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.setFontSize(14);
  pdf.text(proposta.numero, M, 134);

  // Card cliente
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(M, 160, W - 2 * M, 70, 4, 4, "F");
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFontSize(8);
  pdf.text("PREPARADA PARA", M + 6, 170);
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(cliente.nome, M + 6, 180);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.text(`${cliente.tipo === "pj" ? "CNPJ" : "CPF"}: ${formatDoc(cliente.documento)}`, M + 6, 188);
  pdf.text(`${cliente.endereco.cidade}/${cliente.endereco.uf}`, M + 6, 195);
  pdf.text(`Telefone: ${formatTel(cliente.telefone)}  ·  ${cliente.email}`, M + 6, 202);
  pdf.setDrawColor(SOFT[0], SOFT[1], SOFT[2]);
  pdf.line(M + 6, 208, W - M - 6, 208);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFontSize(8);
  pdf.text("CONSULTOR", M + 6, 215);
  pdf.text("DATA", W - M - 50, 215);
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(consultor?.nome ?? "—", M + 6, 222);
  pdf.text(dataBR(proposta.criadoEm), W - M - 50, 222);

  // Destaques
  pdf.setFillColor(255, 255, 255, 0.1);
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.setFontSize(8);
  pdf.text("SISTEMA DIMENSIONADO", M, 250);
  pdf.text("INVESTIMENTO", M + 70, 250);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text(kwp(totais.kwpInst), M, 262);
  pdf.text(brl(totais.valorVenda), M + 70, 262);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.text(`Validade desta proposta: ${dataBR(proposta.validadeAte)}`, M, H - 12);
}

function paginaSobre(ctx: Ctx) {
  const { pdf } = ctx;
  pdf.addPage();
  pageFrame(ctx, 2, "Sobre a Vert Energie");

  sectionTitle(pdf, 28, "Sobre nós");
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const txt = pdf.splitTextToSize(
    "A Vert Energie é uma empresa especializada em soluções de energia solar fotovoltaica para residências, comércios, agronegócio e indústrias. Atuamos do projeto à instalação e homologação, com equipe técnica certificada, equipamentos de marcas líderes e suporte pós-venda completo.",
    W - 2 * M,
  );
  pdf.text(txt, M, 42);

  // Diferenciais
  sectionTitle(pdf, 80, "Por que escolher a Vert");
  const itens = [
    ["Equipamentos Tier 1", "Trabalhamos apenas com módulos e inversores das principais fabricantes do mundo."],
    ["Garantia estendida", "12 anos de garantia de fabricação e até 25 anos de eficiência dos painéis."],
    ["Equipe certificada", "Engenheiros eletricistas e instaladores NR10/NR35."],
    ["Homologação inclusa", "Cuidamos de todo o processo junto à concessionária local."],
    ["Monitoramento 24/7", "App próprio para acompanhar geração em tempo real."],
    ["Suporte pós-venda", "Plano de manutenção preventiva opcional."],
  ];
  let y = 95;
  itens.forEach(([t, d]) => {
    pdf.setFillColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
    pdf.circle(M + 2, y - 1.5, 1.5, "F");
    pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(t, M + 7, y);
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(d, M + 7, y + 5);
    y += 14;
  });

  // Indicadores
  sectionTitle(pdf, 195, "Em números");
  const cardW = (W - 2 * M - 9) / 4;
  const stats = [["+500", "Projetos"], ["+8 MWp", "Instalados"], ["98%", "Satisfação"], ["10 anos", "De mercado"]];
  stats.forEach(([v, l], i) => {
    const x = M + i * (cardW + 3);
    kvBox(pdf, x, 205, cardW, 22, l, v, true);
  });
}

function paginaConsumo(ctx: Ctx) {
  const { pdf, cliente, econ } = ctx;
  pdf.addPage();
  pageFrame(ctx, 3, "Análise do consumo");

  sectionTitle(pdf, 28, "Perfil energético atual");
  const dados = [
    ["Concessionária", cliente.concessionaria || "—"],
    ["Unidade Consumidora", cliente.uc || "—"],
    ["Grupo / classificação", cliente.grupoTarifario || "—"],
    ["Rede elétrica", cliente.rede.toUpperCase()],
    ["Consumo médio mensal", kwh(cliente.consumoMedio)],
    ["Tarifa praticada", `R$ ${cliente.tarifa.toFixed(2)} / kWh`],
  ];
  let y = 42;
  dados.forEach(([k, v]) => {
    pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
    pdf.rect(M, y, W - 2 * M, 8, "F");
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(k, M + 4, y + 5.5);
    pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.setFont("helvetica", "bold");
    pdf.text(v, W - M - 4, y + 5.5, { align: "right" });
    y += 10;
  });

  sectionTitle(pdf, y + 8, "Sua fatura hoje vs com energia solar");
  y += 22;
  // Barras comparativas
  const max = Math.max(econ.faturaAtual, econ.faturaSolar) || 1;
  const barW = (W - 2 * M - 30) / 2;
  const barMaxH = 60;
  const baseY = y + barMaxH;

  const drawBar = (x: number, valor: number, label: string, cor: [number, number, number]) => {
    const h = (valor / max) * barMaxH;
    pdf.setFillColor(...cor);
    pdf.rect(x, baseY - h, barW, h, "F");
    pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text(brl(valor), x + barW / 2, baseY - h - 3, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.text(label, x + barW / 2, baseY + 6, { align: "center" });
  };
  drawBar(M + 5, econ.faturaAtual, "Sem solar", [220, 100, 90]);
  drawBar(M + 20 + barW, econ.faturaSolar, "Com solar", VERT);

  // Highlight economia
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.roundedRect(M, baseY + 18, W - 2 * M, 26, 3, 3, "F");
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.setFontSize(8);
  pdf.text("ECONOMIA MENSAL ESTIMADA", M + 6, baseY + 27);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text(brl(econ.economiaMes), M + 6, baseY + 40);
  pdf.setFontSize(11);
  pdf.text(`(${brl(econ.economiaAno)} no primeiro ano)`, W - M - 6, baseY + 40, { align: "right" });
}

function paginaSistema(ctx: Ctx) {
  const { pdf, proposta, produtos, totais, dim } = ctx;
  pdf.addPage();
  pageFrame(ctx, 4, "Sistema proposto");

  sectionTitle(pdf, 28, "Configuração técnica");
  const cardW = (W - 2 * M - 6) / 3;
  kvBox(pdf, M, 38, cardW, 22, "Potência instalada", kwp(totais.kwpInst || dim.potenciaKwp), true);
  kvBox(pdf, M + cardW + 3, 38, cardW, 22, "Geração mensal", kwh(dim.geracaoMensal));
  kvBox(pdf, M + 2 * (cardW + 3), 38, cardW, 22, "Geração anual", kwh(dim.geracaoMensal * 12));

  sectionTitle(pdf, 70, "Componentes inclusos");
  // tabela
  const head = ["Item", "Qtd", "Unit.", "Total"];
  const colX = [M + 2, M + 110, M + 135, M + 165];
  let y = 80;
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(M, y - 5, W - 2 * M, 8, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  head.forEach((h, i) => pdf.text(h, colX[i], y));
  y += 6;

  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  proposta.itens.forEach((it, idx) => {
    const prod = produtos.find((p) => p.id === it.produtoId);
    if (!prod) return;
    if (idx % 2 === 0) {
      pdf.setFillColor(245, 250, 247);
      pdf.rect(M, y - 4, W - 2 * M, 8, "F");
    }
    const nome = `${prod.nome}${prod.fabricante ? ` · ${prod.fabricante}` : ""}`;
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    const nomeLines = pdf.splitTextToSize(nome, 100);
    pdf.text(nomeLines[0], colX[0], y);
    pdf.text(String(it.quantidade), colX[1], y);
    pdf.text(brlPrec(it.precoUnitario), colX[2], y);
    pdf.setFont("helvetica", "bold");
    pdf.text(brlPrec(it.precoUnitario * it.quantidade), colX[3], y);
    pdf.setFont("helvetica", "normal");
    y += 8;
    if (y > H - 40) return;
  });

  // Total
  y += 4;
  pdf.setDrawColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setLineWidth(0.5);
  pdf.line(M, y, W - M, y);
  y += 8;
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.roundedRect(M, y, W - 2 * M, 14, 2, 2, "F");
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("INVESTIMENTO TOTAL", M + 5, y + 9);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.text(brl(totais.valorVenda), W - M - 5, y + 10, { align: "right" });

  // Inclusos
  y += 22;
  if (y < H - 40) {
    sectionTitle(pdf, y, "Serviços inclusos");
    y += 10;
    const inc = ["Projeto técnico e ART", "Homologação na concessionária", "Instalação completa", "Configuração e testes", "Treinamento de uso do app"];
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.setFontSize(9);
    inc.forEach((t) => {
      pdf.setTextColor(VERT[0], VERT[1], VERT[2]);
      pdf.text("✓", M + 2, y);
      pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
      pdf.text(t, M + 8, y);
      y += 6;
    });
  }
}

function paginaRetorno(ctx: Ctx) {
  const { pdf, econ, totais, paybackMeses, economia20, proposta } = ctx;
  pdf.addPage();
  pageFrame(ctx, 5, "Retorno do investimento");

  sectionTitle(pdf, 28, "Indicadores financeiros");
  const cardW = (W - 2 * M - 9) / 4;
  kvBox(pdf, M, 38, cardW, 22, "Investimento", brl(totais.valorVenda));
  kvBox(pdf, M + cardW + 3, 38, cardW, 22, "Economia mês", brl(econ.economiaMes), true);
  kvBox(pdf, M + 2 * (cardW + 3), 38, cardW, 22, "Payback",
    Number.isFinite(paybackMeses) ? `${(paybackMeses / 12).toFixed(1)} anos` : "—");
  kvBox(pdf, M + 3 * (cardW + 3), 38, cardW, 22, "Economia 20 anos", brl(economia20), true);

  // Curva acumulada
  sectionTitle(pdf, 72, "Projeção de economia em 20 anos");
  const chartX = M;
  const chartY = 90;
  const chartW = W - 2 * M;
  const chartH = 90;

  pdf.setDrawColor(220, 220, 220);
  pdf.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);
  pdf.line(chartX, chartY, chartX, chartY + chartH);

  const inflMes = Math.pow(1 + proposta.inflacao / 100, 1 / 12) - 1;
  let acum = -totais.valorVenda;
  let mensal = econ.economiaMes;
  const pontos: { x: number; y: number; ano: number; valor: number }[] = [];
  const meses = 240;
  let max = 0, min = -totais.valorVenda;
  const serie: number[] = [];
  for (let m = 0; m <= meses; m++) {
    if (m > 0) { acum += mensal; mensal *= 1 + inflMes; }
    serie.push(acum);
    if (acum > max) max = acum;
    if (acum < min) min = acum;
  }
  const range = max - min || 1;
  serie.forEach((v, i) => {
    const x = chartX + (i / meses) * chartW;
    const y = chartY + chartH - ((v - min) / range) * chartH;
    pontos.push({ x, y, ano: i / 12, valor: v });
  });

  // área positiva
  pdf.setFillColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.setDrawColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setLineWidth(0.6);
  for (let i = 1; i < pontos.length; i++) {
    pdf.line(pontos[i - 1].x, pontos[i - 1].y, pontos[i].x, pontos[i].y);
  }
  // linha zero
  const zeroY = chartY + chartH - ((0 - min) / range) * chartH;
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineDashPattern([1, 1], 0);
  pdf.line(chartX, zeroY, chartX + chartW, zeroY);
  pdf.setLineDashPattern([], 0);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFontSize(7);
  pdf.text("R$ 0", chartX + chartW + 1, zeroY + 1);

  // Eixo X anos
  for (let a = 0; a <= 20; a += 5) {
    const x = chartX + (a / 20) * chartW;
    pdf.text(`${a}a`, x, chartY + chartH + 5, { align: "center" });
  }

  // Tabela anos-chave
  sectionTitle(pdf, 195, "Marcos do investimento");
  const marcos = [
    ["1 ano", brl(econ.economiaAno)],
    ["5 anos", brl(serie[60] + totais.valorVenda)],
    ["10 anos", brl(serie[120] + totais.valorVenda)],
    ["20 anos", brl(economia20)],
  ];
  const mw = (W - 2 * M - 9) / 4;
  marcos.forEach(([l, v], i) => {
    kvBox(pdf, M + i * (mw + 3), 205, mw, 22, l, v, i === 3);
  });
}

function paginaPagamento(ctx: Ctx) {
  const { pdf, totais, proposta } = ctx;
  pdf.addPage();
  pageFrame(ctx, 6, "Formas de pagamento");

  sectionTitle(pdf, 28, "Opções flexíveis");
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFontSize(9);
  pdf.text("Escolha a modalidade que melhor se adapta ao seu fluxo de caixa.", M, 38);

  // À vista
  let y = 48;
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.roundedRect(M, y, W - 2 * M, 24, 3, 3, "F");
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("À VISTA · 5% DE DESCONTO", M + 6, y + 9);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.text(brl(totais.valorVenda * 0.95), W - M - 6, y + 18, { align: "right" });

  y += 32;
  // Financiamento
  sectionTitle(pdf, y, "Financiamento bancário");
  y += 8;
  pdf.setFontSize(8);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Taxa simulada: ${proposta.taxaFinanciamento.toFixed(2)}% ao mês · sujeito à aprovação`, M, y);
  y += 5;
  const planosFin = [24, 36, 48, 60, 72, 84];
  planosFin.forEach((n, i) => {
    const col = i % 2;
    const linha = Math.floor(i / 2);
    const x = M + col * ((W - 2 * M) / 2 + 2);
    const yy = y + linha * 16;
    const w = (W - 2 * M) / 2 - 2;
    pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
    pdf.roundedRect(x, yy, w, 14, 2, 2, "F");
    pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(`${n}x`, x + 5, yy + 9);
    pdf.setFontSize(11);
    const parc = tabelaPrice(totais.valorVenda, proposta.taxaFinanciamento, n);
    pdf.text(brlPrec(parc), x + w - 5, yy + 9, { align: "right" });
  });

  y += 16 * 3 + 8;
  sectionTitle(pdf, y, "Cartão de crédito");
  y += 8;
  pdf.setFontSize(8);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.text(`Taxa: ${proposta.taxaCartao.toFixed(2)}% ao mês · até 21 vezes`, M, y);
  y += 5;
  const planosCart = [10, 12, 18, 21];
  planosCart.forEach((n, i) => {
    const col = i % 2;
    const linha = Math.floor(i / 2);
    const x = M + col * ((W - 2 * M) / 2 + 2);
    const yy = y + linha * 16;
    const w = (W - 2 * M) / 2 - 2;
    pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
    pdf.roundedRect(x, yy, w, 14, 2, 2, "F");
    pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(`${n}x`, x + 5, yy + 9);
    pdf.setFontSize(11);
    const parc = tabelaPrice(totais.valorVenda, proposta.taxaCartao, n);
    pdf.text(brlPrec(parc), x + w - 5, yy + 9, { align: "right" });
  });
}

function paginaContrato(ctx: Ctx) {
  const { pdf, cliente, consultor, empresa, proposta } = ctx;
  pdf.addPage();
  pageFrame(ctx, 7, "Aceite e próximos passos");

  sectionTitle(pdf, 28, "Etapas após aceite");
  const etapas = [
    ["1. Assinatura do contrato", "Envio digital · até 1 dia útil"],
    ["2. Projeto técnico", "Elaboração e ART · 5 dias úteis"],
    ["3. Homologação", "Protocolo na concessionária · 30-60 dias"],
    ["4. Instalação", "Equipe técnica em campo · 2-5 dias"],
    ["5. Vistoria e ativação", "Sistema gerando · após troca do medidor"],
  ];
  let y = 42;
  etapas.forEach(([t, d]) => {
    pdf.setFillColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
    pdf.circle(M + 3, y - 1, 2, "F");
    pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(t, M + 9, y);
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(d, M + 9, y + 5);
    y += 14;
  });

  y += 8;
  sectionTitle(pdf, y, "Garantias");
  y += 10;
  const gs = [
    "Módulos: 12 anos de fabricação + 25 anos de eficiência",
    "Inversores: 10 anos de fabricação",
    "Estrutura: 10 anos contra corrosão",
    "Instalação: 1 ano de garantia de serviço",
  ];
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFontSize(9);
  gs.forEach((t) => {
    pdf.setTextColor(VERT[0], VERT[1], VERT[2]);
    pdf.text("✓", M + 2, y);
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.text(t, M + 8, y);
    y += 6;
  });

  y += 10;
  sectionTitle(pdf, y, "Aceite da proposta");
  y += 12;
  pdf.setFontSize(9);
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.text(`Eu, ${cliente.nome}, declaro estar de acordo com os termos da proposta ${proposta.numero}.`, M, y);
  y += 18;

  const sigW = (W - 2 * M - 8) / 2;
  pdf.setDrawColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.line(M, y, M + sigW, y);
  pdf.line(M + sigW + 8, y, W - M, y);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFontSize(8);
  pdf.text(`${cliente.nome} · ${formatDoc(cliente.documento)}`, M, y + 5);
  pdf.text(`${empresa.razaoSocial}`, M + sigW + 8, y + 5);
  pdf.text(`Data: ___/___/_____`, M, y + 11);
  pdf.text(`${consultor?.nome ?? ""}`, M + sigW + 8, y + 11);
}

export function gerarPdfProposta(opts: {
  proposta: Proposta;
  cliente: Cliente;
  consultor?: Usuario;
  produtos: Produto[];
  empresa: Empresa;
}) {
  const { proposta, cliente, consultor, produtos, empresa } = opts;

  const valorVenda = proposta.itens.reduce((a, it) => a + it.precoUnitario * it.quantidade, 0);
  const kwpInst = proposta.itens.reduce((a, it) => {
    const p = produtos.find((x) => x.id === it.produtoId);
    if (p?.categoria === "modulo" && p.potenciaW) return a + (p.potenciaW * it.quantidade) / 1000;
    return a;
  }, 0);
  const dim = dimensionarSistema(cliente.consumoMedio, proposta.irradiacao, proposta.eficiencia, proposta.cobertura);
  const econ = calcularEconomia({ consumoKwh: cliente.consumoMedio, tarifa: cliente.tarifa, geracaoKwh: dim.geracaoMensal });
  const paybackMeses = valorVenda > 0 ? payback(valorVenda, econ.economiaMes, proposta.inflacao) : 0;
  const economia20 = projecao20Anos(econ.economiaAno, proposta.inflacao);

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const ctx: Ctx = {
    pdf, empresa, cliente, consultor, proposta, produtos,
    totais: { valorVenda, kwpInst }, econ, dim, paybackMeses, economia20,
  };

  paginaCapa(ctx);
  paginaSobre(ctx);
  paginaConsumo(ctx);
  paginaSistema(ctx);
  paginaRetorno(ctx);
  paginaPagamento(ctx);
  paginaContrato(ctx);

  pdf.save(`Proposta-${proposta.numero}-${cliente.nome.replace(/\s+/g, "_")}.pdf`);
}
