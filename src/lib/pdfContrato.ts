// Gerador de PDF do contrato — 4 páginas A4 retrato, padrão visual VertCRM
import jsPDF from "jspdf";
import type { PipelineCard, Proposta, Cliente, Produto, Empresa, Usuario } from "./types";
import { brl, formatDoc, formatTel } from "./format";
import { dimensionarSistema, tabelaPrice } from "./finance";
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
const M = 16;
const TOTAL = 4;

function header(pdf: jsPDF, pagina: number, titulo: string) {
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(0, 0, W, 16, "F");
  const lh = 8;
  const lw = lh * LOGO_RATIO;
  pdf.addImage(VERT_LOGO_PNG_BASE64, "PNG", M, 4, lw, lh, undefined, "FAST");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(titulo.toUpperCase(), W / 2, 10, { align: "center" });
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.setFont("helvetica", "bold");
  pdf.text(`${pagina} / ${TOTAL}`, W - M, 10, { align: "right" });
}

function footer(pdf: jsPDF, empresa: Empresa, numeroContrato: string) {
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.setLineWidth(0.2);
  pdf.line(M, H - 14, W - M, H - 14);
  pdf.setFontSize(7);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFont("helvetica", "normal");
  pdf.text(`${empresa.razaoSocial} · CNPJ ${empresa.cnpj}`, M, H - 9);
  pdf.text(`Contrato ${numeroContrato}`, W - M, H - 9, { align: "right" });
  pdf.text(empresa.endereco, M, H - 5);
  pdf.text(`${empresa.telefone} · ${empresa.email}`, W - M, H - 5, { align: "right" });
}

function sectionTitle(pdf: jsPDF, y: number, texto: string) {
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(M, y, 3, 7, "F");
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(texto, M + 6, y + 5.5);
}

function bullets(pdf: jsPDF, y: number, items: string[], maxWidth = W - 2 * M - 8) {
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  items.forEach((t) => {
    pdf.setTextColor(VERT[0], VERT[1], VERT[2]);
    pdf.setFont("helvetica", "bold");
    pdf.text("•", M + 2, y);
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.setFont("helvetica", "normal");
    const lines = pdf.splitTextToSize(t, maxWidth) as string[];
    pdf.text(lines, M + 8, y);
    y += 5.5 * lines.length + 1;
  });
  return y;
}

function paginaCapa(
  pdf: jsPDF,
  numeroContrato: string,
  cliente: Cliente,
  valorTotal: number,
  kwp: number,
) {
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(0, 0, W, H, "F");
  pdf.setFillColor(VERT[0], VERT[1], VERT[2]);
  pdf.circle(W + 30, H - 40, 90, "F");
  pdf.setFillColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.circle(-15, 25, 35, "F");

  const logoH = 40;
  const logoW = logoH * LOGO_RATIO;
  pdf.addImage(VERT_LOGO_PNG_BASE64, "PNG", (W - logoW) / 2, 32, logoW, logoH, undefined, "FAST");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text("CONTRATO", W / 2, 100, { align: "center" });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  const titleLines = pdf.splitTextToSize(
    "FORNECIMENTO E INSTALAÇÃO DE SISTEMA FOTOVOLTAICO",
    W - 2 * M - 20,
  ) as string[];
  pdf.text(titleLines, W / 2, 116, { align: "center" });
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.setFontSize(13);
  pdf.text(numeroContrato, W / 2, 146, { align: "center" });

  // Card cliente
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(M, 165, W - 2 * M, 70, 4, 4, "F");
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFontSize(8);
  pdf.text("CONTRATANTE", M + 6, 174);
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(cliente.nome, M + 6, 184);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.text(`${cliente.tipo === "pj" ? "CNPJ" : "CPF"}: ${formatDoc(cliente.documento)}`, M + 6, 192);
  const end = `${cliente.endereco.rua}, ${cliente.endereco.numero} · ${cliente.endereco.bairro} · ${cliente.endereco.cidade}/${cliente.endereco.uf} · CEP ${cliente.endereco.cep}`;
  const endLines = pdf.splitTextToSize(end, W - 2 * M - 12) as string[];
  pdf.text(endLines, M + 6, 199);
  pdf.text(`${formatTel(cliente.telefone)} · ${cliente.email}`, M + 6, 199 + 5 * endLines.length);

  // Destaques
  pdf.setFillColor(VERT[0], VERT[1], VERT[2]);
  pdf.roundedRect(M, 250, (W - 2 * M - 6) / 2, 26, 3, 3, "F");
  pdf.roundedRect(M + (W - 2 * M - 6) / 2 + 6, 250, (W - 2 * M - 6) / 2, 26, 3, 3, "F");
  pdf.setTextColor(VERT_GLOW[0], VERT_GLOW[1], VERT_GLOW[2]);
  pdf.setFontSize(7);
  pdf.text("VALOR DO CONTRATO", M + 4, 257);
  pdf.text("POTÊNCIA DO SISTEMA", M + (W - 2 * M - 6) / 2 + 10, 257);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text(brl(valorTotal), M + 4, 270);
  pdf.text(`${kwp.toFixed(2)} kWp`, M + (W - 2 * M - 6) / 2 + 10, 270);
}

function paginaObjeto(
  pdf: jsPDF,
  empresa: Empresa,
  numeroContrato: string,
  cliente: Cliente,
  proposta: Proposta,
  produtos: Produto[],
  kwp: number,
) {
  header(pdf, 2, "Objeto e Especificações");
  footer(pdf, empresa, numeroContrato);

  const dim = dimensionarSistema(
    cliente.consumoMedio,
    proposta.irradiacao,
    proposta.eficiencia,
    proposta.cobertura,
  );

  let y = 26;
  sectionTitle(pdf, y, "1. Objeto do Contrato");
  y += 12;
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const objTxt = `O presente instrumento tem por objeto o fornecimento e a instalação, pela CONTRATADA, de um sistema de geração de energia solar fotovoltaica com potência de ${kwp.toFixed(2)} kWp, com geração mensal estimada de ${dim.geracaoMensal} kWh e geração anual estimada de ${(dim.geracaoMensal * 12).toLocaleString("pt-BR")} kWh, dimensionado a partir de uma irradiação média de ${proposta.irradiacao.toString().replace(".", ",")} kWh/m²/dia.`;
  const objLines = pdf.splitTextToSize(objTxt, W - 2 * M) as string[];
  pdf.text(objLines, M, y);
  y += 5.5 * objLines.length + 4;

  sectionTitle(pdf, y, "2. Equipamentos Fornecidos");
  y += 12;

  // Tabela: Item | Qtd | Unid
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(M, y, W - 2 * M, 7, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("DESCRIÇÃO", M + 3, y + 5);
  pdf.text("QTD", W - M - 35, y + 5, { align: "right" });
  pdf.text("UNID", W - M - 3, y + 5, { align: "right" });
  y += 7;

  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  proposta.itens.forEach((it, idx) => {
    const p = produtos.find((x) => x.id === it.produtoId);
    if (idx % 2 === 0) {
      pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
      pdf.rect(M, y, W - 2 * M, 8, "F");
    }
    const nome = p
      ? `${p.nome}${p.fabricante ? " · " + p.fabricante : ""}${p.potenciaW ? ` · ${p.potenciaW}W` : ""}${p.potenciaKw ? ` · ${p.potenciaKw}kW` : ""}`
      : "Item";
    const nomeLines = pdf.splitTextToSize(nome, W - 2 * M - 50) as string[];
    pdf.text(nomeLines[0], M + 3, y + 5.5);
    pdf.text(it.quantidade.toString(), W - M - 35, y + 5.5, { align: "right" });
    pdf.text(p?.unidade ?? "unid", W - M - 3, y + 5.5, { align: "right" });
    y += 8;
    if (y > H - 60) return;
  });

  y += 6;
  sectionTitle(pdf, y, "3. Local de Instalação");
  y += 12;
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const local = `${cliente.endereco.rua}, ${cliente.endereco.numero} · ${cliente.endereco.bairro} · ${cliente.endereco.cidade}/${cliente.endereco.uf} · CEP ${cliente.endereco.cep}`;
  const localLines = pdf.splitTextToSize(local, W - 2 * M) as string[];
  pdf.text(localLines, M, y);
  y += 5.5 * localLines.length + 2;
  pdf.text(
    `Concessionária: ${cliente.concessionaria} · UC: ${cliente.uc} · Rede: ${cliente.rede}`,
    M,
    y,
  );
}

function paginaCondicoes(
  pdf: jsPDF,
  empresa: Empresa,
  numeroContrato: string,
  proposta: Proposta,
  valorTotal: number,
) {
  header(pdf, 3, "Condições Comerciais");
  footer(pdf, empresa, numeroContrato);

  let y = 26;
  sectionTitle(pdf, y, "4. Valor e Condições de Pagamento");
  y += 12;
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("Valor total do contrato:", M, y);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.text(brl(valorTotal), W - M, y, { align: "right" });
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.text("À vista (5% de desconto):", M, y);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(VERT[0], VERT[1], VERT[2]);
  pdf.text(brl(valorTotal * 0.95), W - M, y, { align: "right" });
  y += 8;

  // Tabela financiamento
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(M, y, W - 2 * M, 7, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("FINANCIAMENTO (Tabela Price)", M + 3, y + 5);
  pdf.text(`Taxa: ${proposta.taxaFinanciamento.toString().replace(".", ",")}% a.m.`, W - M - 3, y + 5, { align: "right" });
  y += 9;
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  [24, 36, 48, 60].forEach((n) => {
    const parcela = tabelaPrice(valorTotal, proposta.taxaFinanciamento, n);
    pdf.text(`${n}x de`, M + 3, y);
    pdf.setFont("helvetica", "bold");
    pdf.text(brl(parcela), W - M, y, { align: "right" });
    pdf.setFont("helvetica", "normal");
    y += 6;
  });

  y += 6;
  sectionTitle(pdf, y, "5. Prazo de Execução");
  y += 12;
  y = bullets(pdf, y, [
    "Projeto técnico: 5 dias úteis após assinatura e pagamento da entrada",
    "Homologação na concessionária: 30 a 60 dias",
    "Instalação física: 2 a 5 dias úteis",
    "Ativação do sistema: imediato após a troca do medidor pela concessionária",
  ]);

  y += 4;
  sectionTitle(pdf, y, "6. Obrigações da Contratada");
  y += 12;
  y = bullets(pdf, y, [
    "Fornecer todos os equipamentos especificados, novos e de fabricantes homologados pelo INMETRO",
    "Executar a instalação seguindo as normas técnicas vigentes (NBR 16.690, NBR 5.410)",
    "Elaborar o projeto elétrico assinado por engenheiro responsável",
    "Protocolar e acompanhar a homologação junto à concessionária local",
    "Emitir ART (Anotação de Responsabilidade Técnica) do projeto e da execução",
    "Garantir 1 (um) ano sobre o serviço de instalação executado",
  ]);

  y += 4;
  sectionTitle(pdf, y, "7. Obrigações do Contratante");
  y += 12;
  bullets(pdf, y, [
    "Efetuar o pagamento conforme condição comercial acordada",
    "Liberar o acesso ao local de instalação na data agendada",
    "Comunicar previamente obras ou alterações estruturais que possam afetar o sistema",
    "Manter e operar o sistema conforme as instruções fornecidas pela Contratada",
  ]);
}

function paginaGarantiasAssinaturas(
  pdf: jsPDF,
  empresa: Empresa,
  numeroContrato: string,
  cliente: Cliente,
  consultor?: Usuario,
) {
  header(pdf, 4, "Garantias, Cláusulas e Assinaturas");
  footer(pdf, empresa, numeroContrato);

  let y = 26;
  sectionTitle(pdf, y, "8. Garantias");
  y += 12;
  y = bullets(pdf, y, [
    "Módulos fotovoltaicos: 12 anos contra defeitos de fabricação + 25 anos de eficiência linear",
    "Inversores: 10 anos contra defeitos de fabricação",
    "Estrutura de fixação: 10 anos contra corrosão",
    "Serviço de instalação: 1 ano de garantia",
  ]);

  y += 4;
  sectionTitle(pdf, y, "9. Cláusulas Gerais");
  y += 12;
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const clausulas = [
    "9.1 RESCISÃO — Este contrato poderá ser rescindido por qualquer das partes em caso de descumprimento de cláusulas, mediante notificação prévia de 15 (quinze) dias, ressalvado o direito da parte prejudicada às perdas e danos.",
    "9.2 FORO — Fica eleito o foro da Comarca de Ribeira do Pombal/BA para dirimir quaisquer dúvidas ou litígios decorrentes deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.",
    "9.3 VIGÊNCIA — Este contrato entra em vigor na data da sua assinatura e vigorará até o cumprimento integral das obrigações nele estabelecidas.",
  ];
  clausulas.forEach((c) => {
    const lines = pdf.splitTextToSize(c, W - 2 * M) as string[];
    pdf.text(lines, M, y);
    y += 5 * lines.length + 3;
  });

  // Assinaturas
  y = Math.max(y + 6, H - 70);
  sectionTitle(pdf, y, "10. Assinaturas");
  y += 16;

  const sigW = (W - 2 * M - 8) / 2;
  pdf.setDrawColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setLineWidth(0.3);
  // Linhas pontilhadas
  pdf.setLineDashPattern([1.2, 1.2], 0);
  pdf.line(M, y, M + sigW, y);
  pdf.line(M + sigW + 8, y, W - M, y);
  pdf.setLineDashPattern([], 0);

  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFontSize(7);
  pdf.text("CONTRATANTE", M, y + 5);
  pdf.text("CONTRATADA", M + sigW + 8, y + 5);
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(cliente.nome, M, y + 11);
  pdf.text(empresa.razaoSocial, M + sigW + 8, y + 11);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.text(`${cliente.tipo === "pj" ? "CNPJ" : "CPF"}: ${formatDoc(cliente.documento)}`, M, y + 16);
  pdf.text(`CNPJ: ${empresa.cnpj}`, M + sigW + 8, y + 16);
  if (consultor?.nome) {
    pdf.text(`Resp.: ${consultor.nome}`, M + sigW + 8, y + 21);
  }
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.text("Data: ___/___/_____", M, y + 26);
  pdf.text("Data: ___/___/_____", M + sigW + 8, y + 26);
  pdf.text("Testemunha: __________________________", M, y + 33);
  pdf.text("Testemunha: __________________________", M + sigW + 8, y + 33);
}

interface GerarContratoOpts {
  card: PipelineCard;
  cliente: Cliente;
  proposta: Proposta;
  produtos: Produto[];
  consultor?: Usuario;
  empresa: Empresa;
  modo?: "save" | "blob" | "blob-data";
}

export function gerarPdfContrato(opts: GerarContratoOpts): string | void | Blob {
  const { card, cliente, proposta, produtos, consultor, empresa, modo = "save" } = opts;

  const valorTotal = proposta.itens.reduce((a, it) => a + it.precoUnitario * it.quantidade, 0);
  const kwp = proposta.itens.reduce((a, it) => {
    const p = produtos.find((x) => x.id === it.produtoId);
    if (p?.categoria === "modulo" && p.potenciaW) return a + (p.potenciaW * it.quantidade) / 1000;
    return a;
  }, 0) || card.potenciaKwp;

  const ano = new Date(proposta.criadoEm || new Date()).getFullYear();
  const seq = (proposta.numero || "").replace(/\D/g, "").slice(-4).padStart(4, "0") || "0001";
  const numeroContrato = `CTRV-${ano}-${seq}`;

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  paginaCapa(pdf, numeroContrato, cliente, valorTotal, kwp);
  pdf.addPage();
  paginaObjeto(pdf, empresa, numeroContrato, cliente, proposta, produtos, kwp);
  pdf.addPage();
  paginaCondicoes(pdf, empresa, numeroContrato, proposta, valorTotal);
  pdf.addPage();
  paginaGarantiasAssinaturas(pdf, empresa, numeroContrato, cliente, consultor);

  if (modo === "blob") return pdf.output("bloburl") as unknown as string;
  if (modo === "blob-data") return pdf.output("blob") as Blob;
  pdf.save(`Contrato-${numeroContrato}-${cliente.nome.replace(/\s+/g, "_")}.pdf`);
  void card;
}

