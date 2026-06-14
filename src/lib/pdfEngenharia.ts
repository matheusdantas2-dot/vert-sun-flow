// Geradores de PDF do módulo de Engenharia:
//  - Memorial Descritivo (multi-páginas A4 retrato)
//  - Diagrama Unifilar simplificado (1 página A4 paisagem)
//
// Usa jsPDF nativo (sem dependências extras).
import jsPDF from "jspdf";
import type { Cliente, Empresa, Produto, Proposta } from "./types";
import { VERT_LOGO_PNG_BASE64 } from "@/assets/vertLogoBase64";
import { dataBR, formatDoc, formatTel, num } from "./format";

const VERT_DARK: [number, number, number] = [13, 82, 52];
const VERT: [number, number, number] = [45, 158, 100];
const VERT_GLOW: [number, number, number] = [94, 232, 154];
const TEXT: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [120, 120, 120];
const SOFT: [number, number, number] = [232, 246, 238];
const BORDER: [number, number, number] = [220, 226, 222];

const LOGO_RATIO = 577 / 351;

export interface ResponsavelTecnico {
  nome: string;
  crea: string;
  art: string;
  titulo?: string; // ex: Engenheiro Eletricista
}

export interface DadosEngenharia {
  empresa: Empresa;
  cliente: Cliente;
  proposta?: Proposta;
  produtos: Produto[];
  potenciaKwp: number;
  responsavel: ResponsavelTecnico;
  observacoes?: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function header(pdf: jsPDF, w: number, titulo: string) {
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(0, 0, w, 16, "F");
  const lh = 8;
  const lw = lh * LOGO_RATIO;
  pdf.addImage(VERT_LOGO_PNG_BASE64, "PNG", 14, 4, lw, lh, undefined, "FAST");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(titulo.toUpperCase(), w / 2, 10, { align: "center" });
}

function footer(pdf: jsPDF, w: number, h: number, empresa: Empresa, pagina: number, total: number) {
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.setLineWidth(0.2);
  pdf.line(14, h - 12, w - 14, h - 12);
  pdf.setFontSize(7);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFont("helvetica", "normal");
  pdf.text(`${empresa.razaoSocial} · CNPJ ${empresa.cnpj}`, 14, h - 7);
  pdf.text(`Página ${pagina} / ${total}`, w - 14, h - 7, { align: "right" });
}

function sectionTitle(pdf: jsPDF, x: number, y: number, texto: string) {
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(x, y, 3, 7, "F");
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(texto, x + 6, y + 5.2);
  return y + 10;
}

function paragraph(pdf: jsPDF, x: number, y: number, maxW: number, texto: string, lineH = 4.5) {
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  const lines = pdf.splitTextToSize(texto, maxW);
  pdf.text(lines, x, y);
  return y + lines.length * lineH;
}

function kvRow(pdf: jsPDF, x: number, y: number, w: number, label: string, valor: string) {
  pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
  pdf.rect(x, y, w * 0.4, 6.5, "F");
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.rect(x, y, w, 6.5);
  pdf.setFontSize(8.5);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.text(label, x + 2, y + 4.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.text(valor || "—", x + w * 0.4 + 2, y + 4.5);
  return y + 6.5;
}

function classifyItens(itens: Proposta["itens"] | undefined, produtos: Produto[]) {
  const map = new Map(produtos.map((p) => [p.id, p]));
  const modulos: { p: Produto; q: number }[] = [];
  const inversores: { p: Produto; q: number }[] = [];
  if (itens) {
    for (const it of itens) {
      const p = map.get(it.produtoId);
      if (!p) continue;
      if (p.categoria === "modulo") modulos.push({ p, q: it.quantidade });
      else if (p.categoria === "inversor") inversores.push({ p, q: it.quantidade });
    }
  }
  return { modulos, inversores };
}

// ─── MEMORIAL DESCRITIVO ─────────────────────────────────────────────────────

export function gerarMemorialDescritivo(d: DadosEngenharia): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const W = 210;
  const H = 297;
  const M = 14;
  const total = 2;

  const { modulos, inversores } = classifyItens(d.proposta?.itens, d.produtos);
  const potTotalKwp =
    modulos.reduce((s, m) => s + ((m.p.potenciaW ?? 0) * m.q) / 1000, 0) || d.potenciaKwp;
  const potInversorKw = inversores.reduce(
    (s, i) => s + (i.p.potenciaKw ?? (i.p.potenciaW ?? 0) / 1000) * i.q,
    0,
  );

  // ── página 1
  header(pdf, W, "Memorial Descritivo — UFV");

  // título principal
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("MEMORIAL DESCRITIVO", M, 28);
  pdf.setFontSize(12);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.text("Sistema Fotovoltaico Conectado à Rede (SFVCR)", M, 34);

  let y = 44;
  y = sectionTitle(pdf, M, y, "1. Identificação do empreendimento");
  const colW = W - M * 2;
  y = kvRow(pdf, M, y, colW, "Titular (UC)", d.cliente.nome);
  y = kvRow(pdf, M, y, colW, "CPF/CNPJ", formatDoc(d.cliente.documento, d.cliente.tipo));
  y = kvRow(
    pdf,
    M,
    y,
    colW,
    "Endereço",
    `${d.cliente.endereco.rua}, ${d.cliente.endereco.numero} — ${d.cliente.endereco.bairro}, ${d.cliente.endereco.cidade}/${d.cliente.endereco.uf} · CEP ${d.cliente.endereco.cep}`,
  );
  y = kvRow(pdf, M, y, colW, "Unidade Consumidora", d.cliente.uc || "—");
  y = kvRow(pdf, M, y, colW, "Concessionária", d.cliente.concessionaria || "—");
  y = kvRow(pdf, M, y, colW, "Grupo / Rede", `${d.cliente.grupoTarifario || "B"} · ${d.cliente.rede}`);

  y += 4;
  y = sectionTitle(pdf, M, y, "2. Responsável técnico");
  y = kvRow(pdf, M, y, colW, "Profissional", d.responsavel.nome || "A definir");
  y = kvRow(pdf, M, y, colW, "Título", d.responsavel.titulo || "Engenheiro Eletricista");
  y = kvRow(pdf, M, y, colW, "CREA", d.responsavel.crea || "—");
  y = kvRow(pdf, M, y, colW, "ART nº", d.responsavel.art || "—");

  y += 4;
  y = sectionTitle(pdf, M, y, "3. Características do sistema");
  y = kvRow(pdf, M, y, colW, "Potência instalada", `${num(potTotalKwp, 2)} kWp`);
  y = kvRow(pdf, M, y, colW, "Potência do(s) inversor(es)", potInversorKw ? `${num(potInversorKw, 2)} kW` : "—");
  y = kvRow(pdf, M, y, colW, "Quantidade de módulos", modulos.reduce((s, m) => s + m.q, 0).toString() || "—");
  y = kvRow(
    pdf,
    M,
    y,
    colW,
    "Geração estimada",
    `${num(potTotalKwp * 5.2 * 0.8 * 30, 0)} kWh/mês (irrad. 5,2; perdas 20%)`,
  );

  y += 4;
  y = sectionTitle(pdf, M, y, "4. Descrição do projeto");
  y = paragraph(
    pdf,
    M,
    y,
    colW,
    "O presente memorial descreve a instalação de uma Usina Fotovoltaica Conectada à Rede (SFVCR), em regime de Compensação de Energia Elétrica conforme Lei 14.300/2022 e REN ANEEL nº 1.000/2021. O sistema é dimensionado para atender o consumo médio da unidade consumidora, com injeção do excedente na rede da concessionária local.",
  );
  y += 2;
  y = paragraph(
    pdf,
    M,
    y,
    colW,
    "Os módulos fotovoltaicos serão fixados em estrutura metálica apropriada para o telhado da edificação, com inclinação e orientação aproveitando a melhor incidência solar disponível no local. A conexão CC/CA será realizada por inversor(es) string, com proteções CC, CA, DPS e disjuntores conforme normas ABNT NBR 16690, NBR 5410 e NBR 16149/16150.",
  );

  footer(pdf, W, H, d.empresa, 1, total);

  // ── página 2
  pdf.addPage();
  header(pdf, W, "Memorial Descritivo — UFV");

  y = 24;
  y = sectionTitle(pdf, M, y, "5. Equipamentos principais");

  // tabela módulos
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(M, y, colW, 6, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.text("Módulos Fotovoltaicos", M + 2, y + 4);
  pdf.text("Qtd.", W - M - 4, y + 4, { align: "right" });
  y += 6;
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont("helvetica", "normal");
  if (modulos.length === 0) {
    pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
    pdf.rect(M, y, colW, 6);
    pdf.text("Sem itens cadastrados na proposta", M + 2, y + 4);
    y += 6;
  } else {
    for (const m of modulos) {
      pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
      pdf.rect(M, y, colW, 6);
      const txt = `${m.p.fabricante ? m.p.fabricante + " — " : ""}${m.p.nome}${m.p.potenciaW ? ` · ${m.p.potenciaW}W` : ""}`;
      pdf.text(txt, M + 2, y + 4);
      pdf.text(String(m.q), W - M - 4, y + 4, { align: "right" });
      y += 6;
    }
  }

  y += 4;
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(M, y, colW, 6, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.text("Inversor(es)", M + 2, y + 4);
  pdf.text("Qtd.", W - M - 4, y + 4, { align: "right" });
  y += 6;
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont("helvetica", "normal");
  if (inversores.length === 0) {
    pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
    pdf.rect(M, y, colW, 6);
    pdf.text("Sem itens cadastrados na proposta", M + 2, y + 4);
    y += 6;
  } else {
    for (const i of inversores) {
      pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
      pdf.rect(M, y, colW, 6);
      const kw = i.p.potenciaKw ?? (i.p.potenciaW ?? 0) / 1000;
      const txt = `${i.p.fabricante ? i.p.fabricante + " — " : ""}${i.p.nome}${kw ? ` · ${num(kw, 2)} kW` : ""}`;
      pdf.text(txt, M + 2, y + 4);
      pdf.text(String(i.q), W - M - 4, y + 4, { align: "right" });
      y += 6;
    }
  }

  y += 6;
  y = sectionTitle(pdf, M, y, "6. Proteções e normas aplicáveis");
  y = paragraph(
    pdf,
    M,
    y,
    colW,
    "• ABNT NBR 16690 — Instalações elétricas de arranjos fotovoltaicos\n• ABNT NBR 16149 / 16150 — Características de interface da conexão\n• ABNT NBR 5410 — Instalações elétricas de baixa tensão\n• PRODIST Módulo 3, Seção 3.7 — Acesso de Micro/Minigeração\n• REN ANEEL 1.000/2021 e Lei 14.300/2022 — SCEE",
    4.8,
  );
  y += 2;
  y = paragraph(
    pdf,
    M,
    y,
    colW,
    "Lado CC: condutores solares 6 mm² c/ dupla isolação, DPS classe II, conectores MC4, eletrodutos UV. Lado CA: disjuntor termomagnético dimensionado pela corrente nominal do inversor, DPS classe II, aterramento equipotencial conforme NBR 5410.",
  );

  if (d.observacoes) {
    y += 4;
    y = sectionTitle(pdf, M, y, "7. Observações");
    y = paragraph(pdf, M, y, colW, d.observacoes);
  }

  // assinatura
  y = H - 50;
  pdf.setDrawColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setLineWidth(0.3);
  pdf.line(M + 30, y, W - M - 30, y);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.text(d.responsavel.nome || "Responsável Técnico", W / 2, y + 5, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.text(`${d.responsavel.titulo || "Engenheiro Eletricista"} — CREA ${d.responsavel.crea || "—"}`, W / 2, y + 10, {
    align: "center",
  });
  pdf.text(`ART nº ${d.responsavel.art || "—"} · ${dataBR(new Date().toISOString())}`, W / 2, y + 15, {
    align: "center",
  });

  footer(pdf, W, H, d.empresa, 2, total);

  return pdf;
}

// ─── DIAGRAMA UNIFILAR ────────────────────────────────────────────────────────

export function gerarDiagramaUnifilar(d: DadosEngenharia): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const W = 297;
  const H = 210;
  const M = 14;
  const colW = W - M * 2;

  const { modulos, inversores } = classifyItens(d.proposta?.itens, d.produtos);
  const qtdModulos = modulos.reduce((s, m) => s + m.q, 0);
  const potModuloW = modulos[0]?.p.potenciaW ?? 0;
  const inv = inversores[0]?.p;
  const invKw = inv ? (inv.potenciaKw ?? (inv.potenciaW ?? 0) / 1000) : 0;

  header(pdf, W, "Diagrama Unifilar — SFVCR");

  // título
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("DIAGRAMA UNIFILAR SIMPLIFICADO", M, 26);
  pdf.setFontSize(9);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    `Titular: ${d.cliente.nome}  ·  UC: ${d.cliente.uc || "—"}  ·  Concessionária: ${d.cliente.concessionaria || "—"}  ·  Rede: ${d.cliente.rede}`,
    M,
    31,
  );

  // canvas área de desenho
  const top = 40;
  const bottom = H - 24;
  const drawW = colW;
  const drawH = bottom - top;
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.setLineWidth(0.3);
  pdf.rect(M, top, drawW, drawH);

  // 5 blocos horizontais: Arranjo FV → SCDC → Inversor → SCCA → Padrão / Rede
  const blocks = [
    {
      titulo: "Arranjo Fotovoltaico",
      l1: `${qtdModulos || "n"} módulos`,
      l2: potModuloW ? `${potModuloW} W cada` : "",
      l3: modulos[0]?.p.fabricante ?? "",
    },
    {
      titulo: "String Box CC",
      l1: "DPS CC classe II",
      l2: "Fusíveis / chave seccionadora",
      l3: "Aterramento",
    },
    {
      titulo: "Inversor",
      l1: inv ? `${inv.fabricante ?? ""} ${inv.nome}` : "Inversor string",
      l2: invKw ? `${num(invKw, 2)} kW` : "",
      l3: d.cliente.rede,
    },
    {
      titulo: "Quadro CA",
      l1: "Disjuntor termomag.",
      l2: "DPS CA classe II",
      l3: "Aterramento",
    },
    {
      titulo: "Padrão / Medidor",
      l1: "Medidor bidirecional",
      l2: d.cliente.concessionaria || "Concessionária",
      l3: `UC ${d.cliente.uc || "—"}`,
    },
  ];

  const bw = drawW / blocks.length;
  const bh = 38;
  const by = top + drawH / 2 - bh / 2 - 6;

  blocks.forEach((b, i) => {
    const bx = M + i * bw + 6;
    const w = bw - 12;
    // caixa
    pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
    pdf.setDrawColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.setLineWidth(0.6);
    pdf.rect(bx, by, w, bh, "FD");
    // título
    pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.rect(bx, by, w, 6, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.text(b.titulo, bx + w / 2, by + 4, { align: "center" });
    // conteudo
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    const lines = [b.l1, b.l2, b.l3].filter(Boolean);
    lines.forEach((ln, idx) => {
      const t = pdf.splitTextToSize(ln, w - 4);
      pdf.text(t[0] ?? "", bx + w / 2, by + 12 + idx * 7, { align: "center" });
    });

    // linha de conexão para o próximo bloco
    if (i < blocks.length - 1) {
      const yLine = by + bh / 2;
      const xStart = bx + w;
      const xEnd = bx + bw + 6;
      pdf.setDrawColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
      pdf.setLineWidth(0.8);
      pdf.line(xStart, yLine, xEnd, yLine);
      // seta
      pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
      pdf.triangle(xEnd, yLine, xEnd - 2.5, yLine - 1.5, xEnd - 2.5, yLine + 1.5, "F");
      // rótulo CC/CA
      pdf.setFontSize(7);
      pdf.setTextColor(VERT[0], VERT[1], VERT[2]);
      pdf.setFont("helvetica", "bold");
      const lbl = i < 2 ? "CC" : "CA";
      pdf.text(lbl, (xStart + xEnd) / 2, yLine - 2, { align: "center" });
    }
  });

  // Símbolo sol acima do arranjo
  pdf.setDrawColor(245, 158, 11);
  pdf.setFillColor(254, 240, 138);
  pdf.setLineWidth(0.5);
  const solX = M + bw / 2 + 6;
  const solY = top + 10;
  pdf.circle(solX, solY, 4, "FD");
  for (let i = 0; i < 8; i++) {
    const ang = (Math.PI / 4) * i;
    pdf.line(solX + Math.cos(ang) * 5.5, solY + Math.sin(ang) * 5.5, solX + Math.cos(ang) * 7.5, solY + Math.sin(ang) * 7.5);
  }
  pdf.setLineWidth(0.6);
  pdf.setDrawColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.line(solX, solY + 4, solX, by);

  // Símbolo aterramento global
  const grdX = M + drawW - bw / 2 - 6;
  const grdY = by + bh + 14;
  pdf.setLineWidth(0.6);
  pdf.line(grdX, by + bh, grdX, grdY);
  pdf.line(grdX - 5, grdY, grdX + 5, grdY);
  pdf.line(grdX - 3.5, grdY + 1.8, grdX + 3.5, grdY + 1.8);
  pdf.line(grdX - 2, grdY + 3.6, grdX + 2, grdY + 3.6);
  pdf.setFontSize(7);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.text("Aterramento equipotencial — NBR 5410", grdX, grdY + 8, { align: "center" });

  // Cartela de dados (canto inferior esquerdo)
  const cardY = bottom + 4;
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.setLineWidth(0.3);
  pdf.rect(M, cardY, colW, 16);
  pdf.setFontSize(8);
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont("helvetica", "bold");
  pdf.text("Resp. técnico:", M + 2, cardY + 4);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    `${d.responsavel.nome || "—"}  ·  CREA ${d.responsavel.crea || "—"}  ·  ART ${d.responsavel.art || "—"}`,
    M + 28,
    cardY + 4,
  );
  pdf.setFont("helvetica", "bold");
  pdf.text("Potência:", M + 2, cardY + 9);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    `${num(d.potenciaKwp, 2)} kWp  ·  Inversor ${invKw ? num(invKw, 2) + " kW" : "—"}  ·  Módulos ${qtdModulos || "—"}`,
    M + 28,
    cardY + 9,
  );
  pdf.setFont("helvetica", "bold");
  pdf.text("Emitido em:", M + 2, cardY + 14);
  pdf.setFont("helvetica", "normal");
  pdf.text(dataBR(new Date().toISOString()), M + 28, cardY + 14);
  pdf.setFont("helvetica", "bold");
  pdf.text(d.empresa.razaoSocial, W - M - 2, cardY + 14, { align: "right" });

  return pdf;
}

// ─── CHECKLIST DE HOMOLOGAÇÃO ────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  texto: string;
  obrigatorio: boolean;
}

export const CHECKLIST_HOMOLOGACAO: ChecklistItem[] = [
  { id: "memorial", texto: "Memorial Descritivo assinado pelo responsável técnico", obrigatorio: true },
  { id: "unifilar", texto: "Diagrama Unifilar assinado", obrigatorio: true },
  { id: "art", texto: "ART (Anotação de Responsabilidade Técnica) registrada e paga", obrigatorio: true },
  { id: "datasheet_modulo", texto: "Datasheet do módulo fotovoltaico", obrigatorio: true },
  { id: "datasheet_inversor", texto: "Datasheet do inversor", obrigatorio: true },
  { id: "certif_inmetro", texto: "Certificação INMETRO do inversor", obrigatorio: true },
  { id: "rg_cpf", texto: "RG e CPF (ou CNPJ + contrato social) do titular da UC", obrigatorio: true },
  { id: "fatura", texto: "Fatura recente da concessionária (com nº da UC)", obrigatorio: true },
  { id: "procuracao", texto: "Procuração para protocolo junto à concessionária", obrigatorio: false },
  { id: "foto_local", texto: "Foto do local de instalação dos módulos", obrigatorio: false },
  { id: "foto_padrao", texto: "Foto do padrão de entrada / medidor", obrigatorio: false },
  { id: "formulario_acesso", texto: "Formulário de solicitação de acesso da concessionária", obrigatorio: true },
];
