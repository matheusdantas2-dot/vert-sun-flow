// Gerador de PDF da proposta — 7 páginas em A4 retrato (210x297mm) usando jsPDF nativo.
import jsPDF from "jspdf";
import type { Proposta, Cliente, Produto, Empresa, Usuario } from "./types";
import { brl, brlPrec, kwh, kwp, dataBR, formatDoc, formatTel } from "./format";
import { dimensionarSistema, calcularEconomia, payback, projecao20Anos, tabelaPrice, calcularTIR } from "./finance";
import { VERT_LOGO_PNG_BASE64 } from "@/assets/vertLogoBase64";

// Aspect ratio of the logo PNG (577 x 351)
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
const M = 16;

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

function header(ctx: Ctx, pagina: number, titulo: string, totalPaginas = 7) {
  const { pdf } = ctx;
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(0, 0, W, 16, "F");
  // logo pequeno no header
  const lh = 8;
  const lw = lh * LOGO_RATIO;
  pdf.addImage(VERT_LOGO_PNG_BASE64, "PNG", M, 4, lw, lh, undefined, "FAST");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(titulo.toUpperCase(), W / 2, 10, { align: "center" });
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.setFont("helvetica", "bold");
  pdf.text(`${pagina} / ${totalPaginas}`, W - M, 10, { align: "right" });
}

function footer(ctx: Ctx) {
  const { pdf, empresa, proposta } = ctx;
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.setLineWidth(0.2);
  pdf.line(M, H - 14, W - M, H - 14);
  pdf.setFontSize(7);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFont("helvetica", "normal");
  pdf.text(`${empresa.razaoSocial} · CNPJ ${empresa.cnpj}`, M, H - 9);
  pdf.text(`Proposta ${proposta.numero} · Validade ${dataBR(proposta.validadeAte)}`, W - M, H - 9, { align: "right" });
  pdf.text(empresa.endereco, M, H - 5);
  pdf.text(`${empresa.telefone} · ${empresa.email}`, W - M, H - 5, { align: "right" });
}

function pageFrame(ctx: Ctx, pagina: number, titulo: string, totalPaginas = 7) {
  header(ctx, pagina, titulo, totalPaginas);
  footer(ctx);
}

function sectionTitle(pdf: jsPDF, y: number, texto: string, sub?: string) {
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(M, y, 3, 7, "F");
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(texto, M + 6, y + 5.5);
  if (sub) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.text(sub, W - M, y + 5.5, { align: "right" });
  }
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
  // Fundo verde escuro sólido
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(0, 0, W, H, "F");
  // Elementos decorativos sutis
  pdf.setFillColor(VERT[0], VERT[1], VERT[2]);
  pdf.circle(W + 30, H - 40, 90, "F");
  pdf.setFillColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.circle(-15, 25, 35, "F");

  // LOGO 2x maior — centralizado horizontalmente no topo
  const logoH = 44; // antes era ~22mm; agora dobrado
  const logoW = logoH * LOGO_RATIO;
  pdf.addImage(VERT_LOGO_PNG_BASE64, "PNG", (W - logoW) / 2, 28, logoW, logoH, undefined, "FAST");

  // Tagline
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text("Energia solar fotovoltaica · Comércio e Serviços Elétricos", W / 2, 28 + logoH + 8, { align: "center" });

  // Linha separadora
  pdf.setDrawColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.setLineWidth(0.4);
  pdf.line(W / 2 - 25, 28 + logoH + 14, W / 2 + 25, 28 + logoH + 14);

  // Bloco título "Proposta Comercial"
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text("PROPOSTA COMERCIAL", W / 2, 130, { align: "center" });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(40);
  pdf.text("Energia Solar", W / 2, 148, { align: "center" });
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.setFontSize(13);
  pdf.text(proposta.numero, W / 2, 158, { align: "center" });

  // Card cliente
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(M, 175, W - 2 * M, 58, 4, 4, "F");
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("PREPARADA PARA", M + 6, 184);
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text(cliente.nome, M + 6, 195);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  const docFmt = cliente.documento ? formatDoc(cliente.documento) : "—";
  const cidadeUf = cliente.endereco?.cidade && cliente.endereco?.uf
    ? `${cliente.endereco.cidade}/${cliente.endereco.uf}`
    : (cliente.endereco?.cidade ?? "—");
  const telFmt = cliente.telefone ? formatTel(cliente.telefone) : "—";
  const emailFmt = cliente.email || "—";
  pdf.text(`${cliente.tipo === "pj" ? "CNPJ" : "CPF"}  ${docFmt}`, M + 6, 204);
  pdf.text(cidadeUf, M + 6, 211);
  pdf.text(`${telFmt}  ·  ${emailFmt}`, M + 6, 218);

  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.line(M + 6, 222, W - M - 6, 222);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFontSize(7);
  pdf.text("CONSULTOR", M + 6, 227);
  pdf.text("EMITIDA EM", W - M - 50, 227);
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(consultor?.nome ?? "—", M + 6, 232);
  pdf.text(dataBR(proposta.criadoEm), W - M - 50, 232);

  // Destaques
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text("SISTEMA DIMENSIONADO", M, 250);
  pdf.text("INVESTIMENTO TOTAL", W / 2, 250);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.text(kwp(totais.kwpInst), M, 263);
  pdf.text(brl(totais.valorVenda), W / 2, 263);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.text(`Validade: ${dataBR(proposta.validadeAte)}`, W - M, 263, { align: "right" });
}

function paginaSobre(ctx: Ctx) {
  const { pdf } = ctx;
  pdf.addPage();
  pageFrame(ctx, 2, "Sobre a Vert Energie");

  sectionTitle(pdf, 26, "Sobre nós");
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const txt = pdf.splitTextToSize(
    "A Vert Energie é uma empresa especializada em soluções de energia solar fotovoltaica para residências, comércios, agronegócio e indústrias. Atuamos do projeto à instalação e homologação, com equipe técnica certificada, equipamentos de marcas líderes e suporte pós-venda completo.",
    W - 2 * M,
  );
  pdf.text(txt, M, 40);

  // Indicadores LOGO ABAIXO da introdução
  const cardW = (W - 2 * M - 9) / 4;
  const stats = [["+500", "Projetos"], ["+8 MWp", "Instalados"], ["98%", "Satisfação"], ["10 anos", "De mercado"]];
  stats.forEach(([v, l], i) => {
    const x = M + i * (cardW + 3);
    kvBox(pdf, x, 70, cardW, 22, l, v, true);
  });

  // Diferenciais em duas colunas
  sectionTitle(pdf, 105, "Por que escolher a Vert");
  const itens = [
    ["Equipamentos Tier 1", "Módulos e inversores das principais fabricantes do mundo."],
    ["Garantia estendida", "12 anos de fabricação + 25 anos de eficiência."],
    ["Equipe certificada", "Engenheiros eletricistas e instaladores NR10/NR35."],
    ["Homologação inclusa", "Cuidamos de todo o processo na concessionária."],
    ["Monitoramento 24/7", "App próprio para acompanhar geração em tempo real."],
    ["Suporte pós-venda", "Plano de manutenção preventiva opcional."],
  ];
  const colW = (W - 2 * M - 8) / 2;
  itens.forEach((par, i) => {
    const col = i % 2;
    const linha = Math.floor(i / 2);
    const x = M + col * (colW + 8);
    const y = 122 + linha * 22;
    pdf.setFillColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
    pdf.circle(x + 2, y - 1.5, 1.8, "F");
    pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(par[0], x + 7, y);
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const d = pdf.splitTextToSize(par[1], colW - 8);
    pdf.text(d, x + 7, y + 5);
  });

  // Compromisso
  sectionTitle(pdf, 200, "Nosso compromisso");
  pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
  pdf.roundedRect(M, 210, W - 2 * M, 30, 3, 3, "F");
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Energia limpa, economia real e tranquilidade por décadas.", M + 6, 222);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.text("Cada projeto é dimensionado de forma personalizada para o seu perfil de consumo, garantindo retorno", M + 6, 230);
  pdf.text("financeiro previsível e desempenho máximo do sistema.", M + 6, 235);
}

function paginaConsumo(ctx: Ctx) {
  const { pdf, cliente, econ } = ctx;
  pdf.addPage();
  pageFrame(ctx, 3, "Análise do consumo");

  sectionTitle(pdf, 26, "Perfil energético atual");
  // Tabela em 2 colunas para economizar espaço
  const dados = [
    ["Concessionária", cliente.concessionaria || "—"],
    ["Unidade Consumidora", cliente.uc || "—"],
    ["Grupo / classificação", cliente.grupoTarifario || "—"],
    ["Rede elétrica", cliente.rede.toUpperCase()],
    ["Consumo médio mensal", kwh(cliente.consumoMedio)],
    ["Tarifa praticada", `R$ ${cliente.tarifa.toFixed(2)} / kWh`],
  ];
  const linhaW = (W - 2 * M - 6) / 2;
  let yy = 40;
  dados.forEach(([k, v], i) => {
    const col = i % 2;
    const linha = Math.floor(i / 2);
    const x = M + col * (linhaW + 6);
    const y = yy + linha * 12;
    pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
    pdf.roundedRect(x, y, linhaW, 10, 2, 2, "F");
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(k, x + 4, y + 4);
    pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(v, x + 4, y + 8.5);
  });

  // Comparativo de barras
  sectionTitle(pdf, 90, "Sua fatura hoje vs com energia solar");
  const max = Math.max(econ.faturaAtual, econ.faturaSolar) || 1;
  const barW = (W - 2 * M - 30) / 2;
  const barMaxH = 56;
  const baseY = 110 + barMaxH;

  const drawBar = (x: number, valor: number, label: string, cor: [number, number, number], escuro = false) => {
    // Altura mínima de 8mm para garantir legibilidade da barra "Com solar"
    const h = Math.max(8, (valor / max) * barMaxH);
    pdf.setFillColor(cor[0], cor[1], cor[2]);
    pdf.roundedRect(x, baseY - h, barW, h, 2, 2, "F");
    pdf.setTextColor(escuro ? 255 : VERT_DARK[0], escuro ? 255 : VERT_DARK[1], escuro ? 255 : VERT_DARK[2]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text(brl(valor), x + barW / 2, baseY - 4, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.text(label, x + barW / 2, baseY + 6, { align: "center" });
  };
  drawBar(M + 5, econ.faturaAtual, "Sem solar", [220, 100, 90], true);
  drawBar(M + 20 + barW, econ.faturaSolar, "Com solar", VERT, true);

  // Nota explicativa da taxa de disponibilidade
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(7);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.text(
    `* ${brl(econ.faturaSolar)} corresponde à taxa de disponibilidade da concessionária (mínimo faturável)`,
    M + 20 + barW + barW / 2,
    baseY + 11,
    { align: "center" },
  );

  // Highlight economia
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.roundedRect(M, baseY + 18, W - 2 * M, 32, 3, 3, "F");
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.setFontSize(8);
  pdf.text("ECONOMIA MENSAL ESTIMADA", M + 6, baseY + 27);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.text(brl(econ.economiaMes), M + 6, baseY + 42);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`equivalente a ${brl(econ.economiaAno)} no primeiro ano`, W - M - 6, baseY + 42, { align: "right" });
}

/**
 * Retorna quantas páginas extras a tabela de itens vai precisar.
 * Usado para calcular totalPaginas antes de renderizar o PDF.
 */
function contarPaginasSistema(proposta: Ctx["proposta"], produtos: Ctx["produtos"]): number {
  if (proposta.mostrarComoKit) return 1;
  const LIMITE_Y = H - 55; // margem para o bloco de total
  const INICIO_Y = 84; // y inicial da tabela (após headers técnicos)
  let y = INICIO_Y;
  const ordem: Record<string, number> = { modulo: 1, inversor: 2, estrutura: 3, cabeamento: 4, servico: 5 };
  const itensComProd = proposta.itens
    .map((it) => ({ it, prod: produtos.find((p) => p.id === it.produtoId) }))
    .filter((x) => x.prod);
  const grupos = new Map<string, typeof itensComProd>();
  itensComProd.forEach(({ it, prod }) => {
    const cat = prod!.categoria;
    if (!grupos.has(cat)) grupos.set(cat, []);
    grupos.get(cat)!.push({ it, prod });
  });
  const catsOrdenadas = Array.from(grupos.keys()).sort((a, b) => (ordem[a] ?? 99) - (ordem[b] ?? 99));
  let paginas = 1;
  catsOrdenadas.forEach((cat) => {
    y += 7; // header categoria
    grupos.get(cat)!.forEach(() => {
      if (y > LIMITE_Y) { paginas++; y = 30; } // nova página
      y += 7;
    });
  });
  return paginas;
}

function paginaSistema(ctx: Ctx, paginaInicio: number, totalPaginas: number) {
  const { pdf, proposta, produtos, totais, dim } = ctx;
  pdf.addPage();
  pageFrame(ctx, paginaInicio, "Sistema proposto", totalPaginas);

  sectionTitle(pdf, 26, "Configuração técnica");
  const cardW = (W - 2 * M - 6) / 3;
  kvBox(pdf, M, 36, cardW, 22, "Potência instalada", kwp(totais.kwpInst || dim.potenciaKwp), true);
  kvBox(pdf, M + cardW + 3, 36, cardW, 22, "Geração mensal", kwh(dim.geracaoMensal));
  kvBox(pdf, M + 2 * (cardW + 3), 36, cardW, 22, "Geração anual", kwh(dim.geracaoMensal * 12));

  sectionTitle(pdf, 66, "Componentes inclusos");

  // Cabeçalho da tabela
  const colX = { item: M + 4, qtd: M + 110, unit: M + 132, total: W - M - 4 };

  // Helper: imprime cabeçalho de colunas em y
  function drawTableHeader(yh: number) {
    pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.rect(M, yh - 5, W - 2 * M, 8, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("ITEM", colX.item, yh);
    pdf.text("QTD", colX.qtd, yh, { align: "right" });
    pdf.text("UNIT.", colX.unit, yh, { align: "right" });
    pdf.text("TOTAL", colX.total, yh, { align: "right" });
  }

  let y = 78;
  drawTableHeader(y);
  y += 6;

  // Limite antes do rodapé (deixa espaço para o bloco total)
  const LIMITE_Y = H - 55;
  let paginaAtual = paginaInicio;

  // Helper: nova página quando transborda
  function novaPaginaSeNecessario() {
    if (y > LIMITE_Y) {
      paginaAtual++;
      pdf.addPage();
      pageFrame(ctx, paginaAtual, "Sistema proposto (cont.)", totalPaginas);
      y = 28;
      drawTableHeader(y);
      y += 6;
    }
  }

  // Modo "kit": exibe apenas uma linha agregada
  if (proposta.mostrarComoKit) {
    const totalKit = proposta.itens.reduce((a, it) => a + it.precoUnitario * it.quantidade, 0);
    const nomeKit = proposta.kitNome || "Kit Solar";
    pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
    pdf.rect(M, y - 4, W - 2 * M, 7, "F");
    pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("KIT DE GERAÇÃO", M + 4, y);
    y += 9;
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(nomeKit, colX.item, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("1", colX.qtd, y, { align: "right" });
    pdf.text(brlPrec(totalKit), colX.unit, y, { align: "right" });
    pdf.setFont("helvetica", "bold");
    pdf.text(brlPrec(totalKit), colX.total, y, { align: "right" });
    y += 6;
    if (proposta.kitConsumoKwh) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Sistema dimensionado para ~${proposta.kitConsumoKwh} kWh/mês de consumo`, colX.item, y);
      y += 6;
    }
  } else {
    // Agrupar por categoria
    const ordem: Record<string, number> = { modulo: 1, inversor: 2, estrutura: 3, cabeamento: 4, servico: 5 };
    const labels: Record<string, string> = {
      modulo: "Painéis solares",
      inversor: "Inversores",
      estrutura: "Estrutura de fixação",
      cabeamento: "Cabeamento e proteções",
      servico: "Serviços",
    };
    const itensComProd = proposta.itens
      .map((it) => ({ it, prod: produtos.find((p) => p.id === it.produtoId) }))
      .filter((x) => x.prod);
    const grupos = new Map<string, typeof itensComProd>();
    itensComProd.forEach(({ it, prod }) => {
      const cat = prod!.categoria;
      if (!grupos.has(cat)) grupos.set(cat, []);
      grupos.get(cat)!.push({ it, prod });
    });
    const catsOrdenadas = Array.from(grupos.keys()).sort((a, b) => (ordem[a] ?? 99) - (ordem[b] ?? 99));

    let zebra = 0;
    catsOrdenadas.forEach((cat) => {
      novaPaginaSeNecessario();
      // header de categoria
      pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
      pdf.rect(M, y - 4, W - 2 * M, 7, "F");
      pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text(labels[cat]?.toUpperCase() ?? cat.toUpperCase(), M + 4, y);
      y += 7;

      grupos.get(cat)!.forEach(({ it, prod }) => {
        novaPaginaSeNecessario();
        if (zebra % 2 === 1) {
          pdf.setFillColor(250, 252, 251);
          pdf.rect(M, y - 4, W - 2 * M, 8, "F");
        }
        zebra++;
        const nome = `${prod!.nome}${prod!.fabricante ? ` · ${prod!.fabricante}` : ""}`;
        pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        const nomeLines = pdf.splitTextToSize(nome, 95);
        pdf.text(nomeLines[0], colX.item, y);
        pdf.text(`${it.quantidade}`, colX.qtd, y, { align: "right" });
        pdf.text(brlPrec(it.precoUnitario), colX.unit, y, { align: "right" });
        pdf.setFont("helvetica", "bold");
        pdf.text(brlPrec(it.precoUnitario * it.quantidade), colX.total, y, { align: "right" });
        y += 7;
      });
    });
  }

  // Bloco total — vai para nova página se não couber
  if (y + 20 > H - 20) {
    paginaAtual++;
    pdf.addPage();
    pageFrame(ctx, paginaAtual, "Sistema proposto (cont.)", totalPaginas);
    y = 28;
  }

  y += 4;
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.roundedRect(M, y, W - 2 * M, 16, 2, 2, "F");
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("INVESTIMENTO TOTAL", M + 5, y + 10);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.text(brl(totais.valorVenda), W - M - 5, y + 11, { align: "right" });
}

function paginaRetorno(ctx: Ctx, pagina: number, totalPaginas: number) {
  const { pdf, econ, totais, paybackMeses, economia20, proposta } = ctx;
  pdf.addPage();
  pageFrame(ctx, pagina, "Retorno do investimento", totalPaginas);

  sectionTitle(pdf, 26, "Indicadores financeiros");
  const cardW = (W - 2 * M - 12) / 5;
  const tir = calcularTIR(totais.valorVenda, econ.economiaAno, proposta.inflacao);
  kvBox(pdf, M + 0 * (cardW + 3), 36, cardW, 24, "Investimento", brl(totais.valorVenda));
  kvBox(pdf, M + 1 * (cardW + 3), 36, cardW, 24, "Economia / mês", brl(econ.economiaMes), true);
  kvBox(pdf, M + 2 * (cardW + 3), 36, cardW, 24, "Payback",
    Number.isFinite(paybackMeses) ? `${(paybackMeses / 12).toFixed(1)} anos` : "—");
  kvBox(pdf, M + 3 * (cardW + 3), 36, cardW, 24, "Economia 20 anos", brl(economia20), true);
  kvBox(pdf, M + 4 * (cardW + 3), 36, cardW, 24, "TIR 20 anos",
    Number.isFinite(tir) ? `${tir.toFixed(1)}% a.a.` : "—");

  // Curva acumulada
  sectionTitle(pdf, 70, "Projeção de economia em 20 anos", `Reajuste tarifário ${proposta.inflacao.toFixed(1)}% a.a.`);
  const chartX = M + 12;
  const chartY = 88;
  const chartW = W - 2 * M - 14;
  const chartH = 90;

  const inflMes = Math.pow(1 + proposta.inflacao / 100, 1 / 12) - 1;
  let acum = -totais.valorVenda;
  let mensal = econ.economiaMes;
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

  const yFor = (v: number) => chartY + chartH - ((v - min) / range) * chartH;
  const xFor = (m: number) => chartX + (m / meses) * chartW;

  // Eixos com ticks
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.setLineWidth(0.2);
  for (let g = 0; g <= 4; g++) {
    const v = min + (range / 4) * g;
    const y = yFor(v);
    pdf.line(chartX, y, chartX + chartW, y);
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.setFontSize(7);
    pdf.text(brl(v), chartX - 2, y + 1, { align: "right" });
  }

  // Linha zero destacada
  const zeroY = yFor(0);
  pdf.setDrawColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setLineWidth(0.3);
  pdf.setLineDashPattern([1.5, 1.5], 0);
  pdf.line(chartX, zeroY, chartX + chartW, zeroY);
  pdf.setLineDashPattern([], 0);

  // Curva
  pdf.setDrawColor(VERT[0], VERT[1], VERT[2]);
  pdf.setLineWidth(0.7);
  for (let i = 1; i < serie.length; i++) {
    pdf.line(xFor(i - 1), yFor(serie[i - 1]), xFor(i), yFor(serie[i]));
  }

  // Marcador payback
  if (Number.isFinite(paybackMeses) && paybackMeses < meses) {
    const px = xFor(paybackMeses);
    pdf.setDrawColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.setLineWidth(0.4);
    pdf.line(px, chartY, px, chartY + chartH);
    pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.circle(px, zeroY, 1.6, "F");
    pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Payback ${(paybackMeses / 12).toFixed(1)}a`, px + 2, chartY + 5);
  }

  // Eixo X anos
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  for (let a = 0; a <= 20; a += 5) {
    const x = xFor(a * 12);
    pdf.text(`${a}a`, x, chartY + chartH + 5, { align: "center" });
  }

  // Marcos
  sectionTitle(pdf, 200, "Marcos do investimento");
  const marcos = [
    ["1 ano", brl(econ.economiaAno)],
    ["5 anos", brl(serie[60] + totais.valorVenda)],
    ["10 anos", brl(serie[120] + totais.valorVenda)],
    ["20 anos", brl(economia20)],
  ];
  const mw = (W - 2 * M - 9) / 4;
  marcos.forEach(([l, v], i) => {
    kvBox(pdf, M + i * (mw + 3), 210, mw, 24, l, v, i === 3);
  });
}

function paginaPagamento(ctx: Ctx, pagina: number, totalPaginas: number) {
  const { pdf, totais, proposta } = ctx;
  pdf.addPage();
  pageFrame(ctx, pagina, "Formas de pagamento", totalPaginas);

  sectionTitle(pdf, 26, "Opções flexíveis");
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFontSize(9);
  pdf.text("Escolha a modalidade que melhor se adapta ao seu fluxo de caixa.", M, 38);

  // ── Parcelamento próprio Vert (50/30/20)
  let y = 46;
  pdf.setFillColor(VERT[0], VERT[1], VERT[2]);
  pdf.roundedRect(M, y, W - 2 * M, 30, 3, 3, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("PARCELAMENTO VERT · SEM JUROS", M + 6, y + 8);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("50% na assinatura · 30% na entrega · 20% na ativação", M + 6, y + 14);
  const e50 = totais.valorVenda * 0.5;
  const e30 = totais.valorVenda * 0.3;
  const e20 = totais.valorVenda * 0.2;
  const colP = (W - 2 * M - 12) / 3;
  const yp = y + 18;
  [["Entrada", e50], ["Entrega", e30], ["Ativação", e20]].forEach(([l, v], i) => {
    const xx = M + 6 + i * (colP + 3);
    pdf.setFontSize(7);
    pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
    pdf.text(String(l).toUpperCase(), xx, yp);
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.text(brl(Number(v)), xx, yp + 7);
    pdf.setFont("helvetica", "normal");
  });

  // ── À vista
  y += 36;
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.roundedRect(M, y, W - 2 * M, 22, 3, 3, "F");
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("À VISTA · 5% DE DESCONTO", M + 6, y + 9);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.text(brl(totais.valorVenda * 0.95), W - M - 6, y + 16, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.text(`Economia de ${brl(totais.valorVenda * 0.05)}`, M + 6, y + 18);

  y += 30;
  // ── Financiamento
  sectionTitle(pdf, y, "Financiamento bancário", `${proposta.taxaFinanciamento.toFixed(2)}% a.m. · sujeito à aprovação`);
  y += 10;
  const planosFin = [24, 36, 48, 60, 72, 84];
  const colW = (W - 2 * M - 6) / 3;
  planosFin.forEach((n, i) => {
    const col = i % 3;
    const linha = Math.floor(i / 3);
    const x = M + col * (colW + 3);
    const yy = y + linha * 22;
    pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
    pdf.roundedRect(x, yy, colW, 20, 2, 2, "F");
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(`${n}x`, x + 4, yy + 6);
    pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    const parc = tabelaPrice(totais.valorVenda, proposta.taxaFinanciamento, n);
    pdf.text(brlPrec(parc), x + colW - 4, yy + 11, { align: "right" });
    // Total e juros
    const total = parc * n;
    const juros = total - totais.valorVenda;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.text(`Total ${brl(total)} · Juros ${brl(juros)}`, x + 4, yy + 17);
  });

  y += 22 * 2 + 6;
  sectionTitle(pdf, y, "Cartão de crédito", `${proposta.taxaCartao.toFixed(2)}% a.m. · até 21 vezes`);
  y += 10;
  const planosCart = [10, 12, 18, 21];
  planosCart.forEach((n, i) => {
    const col = i % 2;
    const linha = Math.floor(i / 2);
    const cw = (W - 2 * M - 3) / 2;
    const x = M + col * (cw + 3);
    const yy = y + linha * 22;
    pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
    pdf.roundedRect(x, yy, cw, 20, 2, 2, "F");
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(`${n}x`, x + 4, yy + 6);
    pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    const parc = tabelaPrice(totais.valorVenda, proposta.taxaCartao, n);
    pdf.text(brlPrec(parc), x + cw - 4, yy + 11, { align: "right" });
    const total = parc * n;
    const juros = total - totais.valorVenda;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.text(`Total ${brl(total)} · Juros ${brl(juros)}`, x + 4, yy + 17);
  });
}

function paginaContrato(ctx: Ctx, pagina: number, totalPaginas: number) {
  const { pdf, cliente, consultor, empresa, proposta } = ctx;
  pdf.addPage();
  pageFrame(ctx, pagina, "Aceite e próximos passos", totalPaginas);

  sectionTitle(pdf, 26, "Etapas após aceite");
  const etapas = [
    ["1. Assinatura do contrato", "Envio digital · até 1 dia útil"],
    ["2. Projeto técnico", "Elaboração e ART · 5 dias úteis"],
    ["3. Homologação", "Protocolo na concessionária · 30-60 dias"],
    ["4. Instalação", "Equipe técnica em campo · 2-5 dias"],
    ["5. Vistoria e ativação", "Sistema gerando · após troca do medidor"],
  ];
  let y = 40;
  etapas.forEach(([t, d]) => {
    pdf.setFillColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
    pdf.circle(M + 3, y - 1, 2.2, "F");
    pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(t, M + 9, y);
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(d, M + 9, y + 5);
    y += 13;
  });

  y += 6;
  sectionTitle(pdf, y, "Garantias");
  y += 12;
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
    pdf.setFont("helvetica", "bold");
    pdf.text("✓", M + 2, y);
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.setFont("helvetica", "normal");
    pdf.text(t, M + 8, y);
    y += 6;
  });

  y += 10;
  sectionTitle(pdf, y, "Aceite da proposta");
  y += 14;
  pdf.setFontSize(9);
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.text(`Eu, ${cliente.nome}, declaro estar de acordo com os termos da proposta ${proposta.numero}.`, M, y);
  y += 22;

  const sigW = (W - 2 * M - 8) / 2;
  pdf.setDrawColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setLineWidth(0.4);
  pdf.line(M, y, M + sigW, y);
  pdf.line(M + sigW + 8, y, W - M, y);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFontSize(8);
  pdf.text(`${cliente.nome} · ${formatDoc(cliente.documento)}`, M, y + 5);
  pdf.text(`${empresa.razaoSocial}`, M + sigW + 8, y + 5);
  pdf.text(`Data: ___/___/_____`, M, y + 11);
  pdf.text(`${consultor?.nome ?? ""}`, M + sigW + 8, y + 11);
}

interface GerarOpts {
  proposta: Proposta;
  cliente: Cliente;
  consultor?: Usuario;
  produtos: Produto[];
  empresa: Empresa;
  /** "save" baixa o arquivo, "blob" retorna URL p/ preview, "blob-data" retorna Blob para upload */
  modo?: "save" | "blob" | "blob-data";
}

export function gerarPdfProposta(opts: GerarOpts): string | void | Blob {
  const { proposta, cliente, consultor, produtos, empresa, modo = "save" } = opts;

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

  // Calcula total de páginas antes de renderizar para o header ficar correto
  const paginasSistema = contarPaginasSistema(proposta, produtos);
  const totalPaginas = 6 + paginasSistema; // capa+sobre+consumo+pagamento+retorno+contrato + sistema(s)

  paginaCapa(ctx);
  paginaSobre(ctx);
  paginaConsumo(ctx);
  paginaSistema(ctx, 4, totalPaginas);
  paginaRetorno(ctx, 4 + paginasSistema, totalPaginas);
  paginaPagamento(ctx, 5 + paginasSistema, totalPaginas);
  paginaContrato(ctx, 6 + paginasSistema, totalPaginas);

  if (modo === "blob") {
    return pdf.output("bloburl") as unknown as string;
  }
  if (modo === "blob-data") {
    return pdf.output("blob") as Blob;
  }
  pdf.save(`Proposta-${proposta.numero}-${cliente.nome.replace(/\s+/g, "_")}.pdf`);
}
