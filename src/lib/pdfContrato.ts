// Gerador de PDF do contrato — modelo Vert Energie (timbrado em todas as páginas, sem capa)
import jsPDF from "jspdf";
import type { PipelineCard, Proposta, Cliente, Produto, Empresa, Usuario } from "./types";
import { brl, formatDoc } from "./format";
import { dimensionarSistema } from "./finance";
import { VERT_LOGO_COLOR_BASE64, VERT_LOGO_WHITE_BASE64 } from "@/assets/vertLogoBase64";
import type { CondicoesContrato } from "@/components/pipeline/CondicoesContratoModal";

const LOGO_RATIO = 573 / 332;
const VERT_DARK: [number, number, number] = [13, 82, 52];
const VERT: [number, number, number] = [45, 158, 100];
const TEXT: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [120, 120, 120];
const BORDER: [number, number, number] = [225, 230, 228];
const SOFT: [number, number, number] = [232, 246, 238];

const W = 210;
const H = 297;
const M = 18;
const CONTENT_W = W - 2 * M;

function timbrado(pdf: jsPDF, empresa: Empresa, numeroContrato: string) {
  // faixa verde escura no topo
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(0, 0, W, 22, "F");
  // logo branco
  const lh = 12;
  const lw = lh * LOGO_RATIO;
  pdf.addImage(VERT_LOGO_WHITE_BASE64, "PNG", M, 5, lw, lh, undefined, "FAST");
  // dados da empresa à direita
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("VERT ENERGIE", W - M, 9, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text(`CNPJ ${empresa.cnpj}`, W - M, 13, { align: "right" });
  pdf.text(empresa.endereco, W - M, 16.5, { align: "right" });
  pdf.text(`${empresa.telefone} · ${empresa.email}`, W - M, 20, { align: "right" });

  // linha de acento
  pdf.setFillColor(VERT[0], VERT[1], VERT[2]);
  pdf.rect(0, 22, W, 1.2, "F");

  // rodapé
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.setLineWidth(0.2);
  pdf.line(M, H - 14, W - M, H - 14);
  pdf.setFontSize(7);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Contrato ${numeroContrato}`, M, H - 9);
  pdf.text("Vert Energie · energia solar fotovoltaica", W / 2, H - 9, { align: "center" });
  const page = pdf.getNumberOfPages();
  pdf.text(`Pág. ${page}`, W - M, H - 9, { align: "right" });
}

interface Cursor {
  y: number;
}

function ensureSpace(pdf: jsPDF, cur: Cursor, need: number, empresa: Empresa, numero: string) {
  if (cur.y + need > H - 20) {
    pdf.addPage();
    timbrado(pdf, empresa, numero);
    cur.y = 32;
  }
}

function H1(pdf: jsPDF, cur: Cursor, texto: string, empresa: Empresa, numero: string) {
  ensureSpace(pdf, cur, 14, empresa, numero);
  pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
  pdf.rect(M, cur.y - 4, CONTENT_W, 8, "F");
  pdf.setFillColor(VERT[0], VERT[1], VERT[2]);
  pdf.rect(M, cur.y - 4, 2.5, 8, "F");
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(texto.toUpperCase(), M + 5, cur.y + 1.5);
  cur.y += 9;
}

function P(
  pdf: jsPDF,
  cur: Cursor,
  texto: string,
  empresa: Empresa,
  numero: string,
  opts?: { bold?: boolean; size?: number; spaceAfter?: number },
) {
  const size = opts?.size ?? 9;
  pdf.setFont("helvetica", opts?.bold ? "bold" : "normal");
  pdf.setFontSize(size);
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  const lines = pdf.splitTextToSize(texto, CONTENT_W) as string[];
  const lh = size * 0.45 + 1.2;
  ensureSpace(pdf, cur, lines.length * lh + (opts?.spaceAfter ?? 2), empresa, numero);
  pdf.text(lines, M, cur.y);
  cur.y += lines.length * lh + (opts?.spaceAfter ?? 2);
}

function bullets(pdf: jsPDF, cur: Cursor, items: string[], empresa: Empresa, numero: string) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  items.forEach((t) => {
    const lines = pdf.splitTextToSize(t, CONTENT_W - 8) as string[];
    ensureSpace(pdf, cur, lines.length * 5 + 1, empresa, numero);
    pdf.setTextColor(VERT[0], VERT[1], VERT[2]);
    pdf.setFont("helvetica", "bold");
    pdf.text("•", M + 2, cur.y);
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.setFont("helvetica", "normal");
    pdf.text(lines, M + 8, cur.y);
    cur.y += lines.length * 5 + 0.8;
  });
  cur.y += 1.5;
}

function tabelaPagamento(
  pdf: jsPDF,
  cur: Cursor,
  formas: CondicoesContrato["formasPagamento"],
  empresa: Empresa,
  numero: string,
) {
  const colN = 12;
  const colV = 40;
  const colD = CONTENT_W - colN - colV;
  ensureSpace(pdf, cur, 8 + formas.length * 8 + 4, empresa, numero);
  // header
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(M, cur.y, CONTENT_W, 7, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("Nº", M + 3, cur.y + 5);
  pdf.text("FORMA DE PAGAMENTO", M + colN + 3, cur.y + 5);
  pdf.text("VALOR", W - M - 3, cur.y + 5, { align: "right" });
  cur.y += 7;
  // rows
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  formas.forEach((f, i) => {
    if (i % 2 === 0) {
      pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
      pdf.rect(M, cur.y, CONTENT_W, 8, "F");
    }
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.text(`${i + 1}`, M + 3, cur.y + 5.5);
    const desc = pdf.splitTextToSize(f.descricao, colD - 6) as string[];
    pdf.text(desc[0], M + colN + 3, cur.y + 5.5);
    pdf.setFont("helvetica", "bold");
    pdf.text(brl(f.valor), W - M - 3, cur.y + 5.5, { align: "right" });
    pdf.setFont("helvetica", "normal");
    cur.y += 8;
  });
  // total
  const total = formas.reduce((a, f) => a + f.valor, 0);
  pdf.setDrawColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setLineWidth(0.4);
  pdf.line(M, cur.y, W - M, cur.y);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setFontSize(10);
  pdf.text("TOTAL", M + 3, cur.y + 6);
  pdf.text(brl(total), W - M - 3, cur.y + 6, { align: "right" });
  cur.y += 10;
}

interface GerarContratoOpts {
  card: PipelineCard;
  cliente: Cliente;
  proposta: Proposta;
  produtos: Produto[];
  consultor?: Usuario;
  empresa: Empresa;
  condicoes: CondicoesContrato;
  modo?: "save" | "blob" | "blob-data";
}

export function gerarPdfContrato(opts: GerarContratoOpts): string | void | Blob {
  const { card, cliente, proposta, produtos, empresa, condicoes, modo = "save" } = opts;
  void VERT_LOGO_COLOR_BASE64;

  const valorTotal = proposta.itens.reduce((a, it) => a + it.precoUnitario * it.quantidade, 0);
  const kwpSistema =
    proposta.itens.reduce((a, it) => {
      const p = produtos.find((x) => x.id === it.produtoId);
      if (p?.categoria === "modulo" && p.potenciaW) return a + (p.potenciaW * it.quantidade) / 1000;
      return a;
    }, 0) || card.potenciaKwp;

  const dim = dimensionarSistema(
    cliente.consumoMedio,
    proposta.irradiacao,
    proposta.eficiencia,
    proposta.cobertura,
  );

  const ano = new Date(proposta.criadoEm || new Date()).getFullYear();
  const seq = (proposta.numero || "").replace(/\D/g, "").slice(-4).padStart(4, "0") || "0001";
  const numero = `CTRV-${ano}-${seq}`;

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  timbrado(pdf, empresa, numero);
  const cur: Cursor = { y: 32 };

  // Título
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("CONTRATO DE PRESTAÇÃO DE SERVIÇOS E FORNECIMENTO DE MATERIAIS", W / 2, cur.y, { align: "center" });
  cur.y += 5;
  pdf.text("E INSTALAÇÃO DE SISTEMA SOLAR FOTOVOLTAICO", W / 2, cur.y, { align: "center" });
  cur.y += 8;

  // Identificação das partes
  H1(pdf, cur, "Identificação das Partes Contratantes", empresa, numero);
  P(
    pdf,
    cur,
    `CONTRATADA: ${empresa.razaoSocial}, com sede em ${empresa.endereco}, inscrita no CNPJ nº ${empresa.cnpj}.`,
    empresa,
    numero,
  );
  const endCli = condicoes.enderecoContratante
    ? `${condicoes.enderecoContratante}, bairro ${condicoes.bairroContratante || "—"}, na cidade de ${condicoes.cidadeContratante || cliente.endereco.cidade}, CEP ${condicoes.cepContratante || cliente.endereco.cep}`
    : `${cliente.endereco.rua}, ${cliente.endereco.numero}, bairro ${cliente.endereco.bairro}, na cidade de ${cliente.endereco.cidade}/${cliente.endereco.uf}, CEP ${cliente.endereco.cep}`;
  P(
    pdf,
    cur,
    `CONTRATANTE: ${cliente.nome}, inscrito no ${cliente.tipo === "pj" ? "CNPJ" : "CPF"} nº ${formatDoc(cliente.documento)}, estabelecido no endereço ${endCli}.`,
    empresa,
    numero,
  );
  P(
    pdf,
    cur,
    "As partes acima identificadas têm, entre si, justas e acordadas o presente contrato de prestação de serviços de instalação de energia solar e venda de equipamentos, que se regerá mediante as cláusulas e condições adiante estipuladas.",
    empresa,
    numero,
    { spaceAfter: 4 },
  );

  // Cláusula 1
  H1(pdf, cur, "Cláusula Primeira – Do Objeto", empresa, numero);
  P(
    pdf,
    cur,
    `1.1 O presente contrato tem como OBJETO a prestação de serviços de instalação de sistema de energia solar fotovoltaica de ${kwpSistema.toFixed(2)} kWp e a venda dos respectivos equipamentos, conforme apresentado na proposta nº ${proposta.numero} e nos termos e condições detalhados neste contrato.`,
    empresa,
    numero,
    { spaceAfter: 3 },
  );

  // Cláusula 2
  H1(pdf, cur, "Cláusula Segunda – Obrigações da Contratante", empresa, numero);
  P(pdf, cur, "2.1 A CONTRATANTE se compromete a fornecer todas as informações necessárias e autorizações para a instalação do sistema de energia solar, incluindo, mas não se limitando a acesso à propriedade, permissões das autoridades competentes e documentação necessária.", empresa, numero);
  P(pdf, cur, "2.2 A CONTRATANTE será responsável por qualquer obra civil necessária para a instalação do sistema, incluindo alterações na estrutura do telhado ou edifício, se necessário.", empresa, numero);
  P(pdf, cur, "2.3 A CONTRATANTE deverá efetuar o pagamento na forma e condições estabelecidas na Cláusula Quinta.", empresa, numero, { spaceAfter: 3 });

  // Cláusula 3
  H1(pdf, cur, "Cláusula Terceira – Obrigações da Contratada", empresa, numero);
  P(pdf, cur, "3.1 A CONTRATADA deverá fornecer todos os equipamentos necessários para a instalação do sistema de energia solar, conforme descrito na proposta comercial e nos padrões de qualidade e segurança exigidos pela legislação vigente.", empresa, numero);
  P(pdf, cur, "3.2 A CONTRATADA será responsável por todos os serviços de instalação, incluindo montagem, conexão elétrica, testes de funcionamento e obtenção das devidas aprovações e homologações junto à concessionária de energia local.", empresa, numero);
  P(pdf, cur, "3.3 A CONTRATADA se compromete a seguir todas as normas e regulamentações aplicáveis à instalação de sistemas de energia solar, garantindo a conformidade com os padrões de segurança e qualidade.", empresa, numero, { spaceAfter: 3 });

  // Cláusula 4 — Equipamentos
  H1(pdf, cur, "Cláusula Quarta – Dos Equipamentos e Serviços", empresa, numero);
  P(pdf, cur, "4.1 Os equipamentos a serem fornecidos pela CONTRATADA incluem, mas não estão limitados a:", empresa, numero);
  const itensTxt = proposta.itens.map((it) => {
    const p = produtos.find((x) => x.id === it.produtoId);
    const nome = p?.nome ?? "Item";
    const fab = p?.fabricante ? ` da marca ${p.fabricante}` : "";
    const pot = p?.potenciaW ? ` de ${p.potenciaW} W` : p?.potenciaKw ? ` de ${p.potenciaKw} kW` : "";
    return `${it.quantidade} ${p?.unidade ?? "un"} de ${nome}${pot}${fab}`;
  });
  bullets(pdf, cur, itensTxt, empresa, numero);
  P(pdf, cur, "4.2 Os serviços a serem prestados pela CONTRATADA incluem, mas não estão limitados a:", empresa, numero);
  bullets(
    pdf,
    cur,
    [
      "Projeto detalhado do sistema, incluindo especificações técnicas e elétricas",
      "Instalação dos painéis solares",
      "Instalação do inversor e demais componentes elétricos",
      "Testes de funcionamento e comissionamento do sistema",
      `Obtenção das aprovações e homologações junto à ${cliente.concessionaria}`,
    ],
    empresa,
    numero,
  );

  // Cláusula 5 — Pagamento
  H1(pdf, cur, "Cláusula Quinta – Do Preço e das Condições de Pagamento", empresa, numero);
  P(
    pdf,
    cur,
    `5.1 A CONTRATANTE pagará à CONTRATADA o valor total de ${brl(valorTotal)} pela prestação dos serviços e fornecimento dos equipamentos, conforme detalhado na proposta comercial.`,
    empresa,
    numero,
  );
  P(pdf, cur, "5.2 O pagamento será efetuado da seguinte forma:", empresa, numero);
  tabelaPagamento(pdf, cur, condicoes.formasPagamento, empresa, numero);
  P(
    pdf,
    cur,
    `5.3 No caso de atraso no pagamento superior a 10 dias, será aplicada uma multa moratória de ${condicoes.multaAtrasoPct}% sobre o valor em atraso.`,
    empresa,
    numero,
    { spaceAfter: 3 },
  );

  // Cláusula 6 — Garantia
  H1(pdf, cur, "Cláusula Sexta – Da Garantia", empresa, numero);
  P(pdf, cur, "6.1 A garantia dos equipamentos será fornecida pelo fabricante, conforme os termos e condições estabelecidos na garantia do fabricante e na legislação aplicável.", empresa, numero);
  P(pdf, cur, "6.2 Das garantias conforme a proposta:", empresa, numero);
  bullets(
    pdf,
    cur,
    [
      "Módulos solares: 25 anos de garantia do fabricante contra queda de eficiência em 20%",
      "Inversor: 5 anos de garantia padrão do fabricante",
      "Infraestrutura (materiais elétricos e outros): 1 ano",
      "Mão de obra: 1 ano a partir da conclusão da instalação",
    ],
    empresa,
    numero,
  );
  P(pdf, cur, "6.3 A mão de obra para instalação do sistema terá garantia de 12 meses a partir da conclusão da instalação, cobrindo defeitos de instalação ou funcionamento.", empresa, numero);
  P(pdf, cur, "6.4 A CONTRATANTE fica ciente e concorda que não haverá direito de garantia, tornando a CONTRATADA isenta de qualquer responsabilidade ou obrigação, na hipótese de:", empresa, numero);
  bullets(
    pdf,
    cur,
    [
      "Decorrido o prazo de garantia dado à CONTRATANTE;",
      "Danos por condições climáticas extremas (tempestades, granizo, inundação) ou eventos naturais além do controle da CONTRATADA;",
      "Danos por mau uso, negligência ou manutenção inadequada do cliente, incluindo intervenção por pessoas não autorizadas;",
      "Manutenção ou reparo por entidade que não seja representante autorizado da CONTRATADA;",
      "Modificação no sistema sem aprovação prévia por escrito da CONTRATADA;",
      "Danos por terceiros, incluindo vandalismo ou acidentes alheios à instalação;",
      "Uso de acessórios ou equipamentos não aprovados pela CONTRATADA;",
      "Dano à estrutura do edifício por modificações estruturais não autorizadas;",
      "Perdas decorrentes de interrupções no fornecimento de energia pela concessionária;",
      "Queda de eficiência por alterações climáticas, sombreamento por árvores/construções após a instalação.",
    ],
    empresa,
    numero,
  );
  P(pdf, cur, "6.5 Na hipótese de interrupções no fornecimento pela concessionária, não serão devidos reembolsos por ausência ou diminuição de geração.", empresa, numero);
  P(pdf, cur, "6.6 A fim de garantir o bom funcionamento do sistema, será realizado pela CONTRATADA um Plano de Manutenção Preditiva e Preventiva, durante o prazo de garantia do serviço.", empresa, numero);
  P(pdf, cur, "6.7 Após decorrido o prazo de garantia, a CONTRATANTE fica livre para escolher qualquer profissional ou empresa para realizar manutenções, ou poderá contratar um plano com a CONTRATADA.", empresa, numero, { spaceAfter: 3 });

  // Cláusula 7 — Prazo
  H1(pdf, cur, "Cláusula Sétima – Do Prazo, Execução e Conclusão dos Serviços", empresa, numero);
  P(pdf, cur, "7.1 A CONTRATADA atuará nos serviços contratados de acordo com as especificações descritas no ANEXO I, parte integrante deste contrato.", empresa, numero);
  P(
    pdf,
    cur,
    `7.2 O prazo para conclusão da instalação do sistema fotovoltaico será de ${condicoes.prazoInstalacaoDias} dias, contados a partir da assinatura do contrato, podendo ser prorrogado nas hipóteses de:`,
    empresa,
    numero,
  );
  bullets(
    pdf,
    cur,
    [
      "Condições climáticas que dificultem e/ou impossibilitem a realização dos serviços;",
      "Estado de calamidade pública;",
      "Greve geral que torne impossível o livre deslocamento;",
      "Atraso por negligência ou morosidade da CONTRATANTE em demandas elétricas, estruturais ou da concessionária.",
    ],
    empresa,
    numero,
  );
  P(pdf, cur, "7.3 Quando tais mudanças forem pré-requisito indispensável para o início do serviço, o prazo para conclusão começará a contar a partir da finalização de todas as demandas necessárias.", empresa, numero);
  P(pdf, cur, "7.4 A CONTRATADA terá gerência integral na execução do serviço, com total autonomia, atendendo exclusivamente o cronograma firmado entre as partes.", empresa, numero);
  P(pdf, cur, "7.5 Considera-se o cumprimento integral do contrato no momento em que todos os serviços tenham sido concluídos, mediante aprovação e revisão final da CONTRATANTE.", empresa, numero, { spaceAfter: 3 });

  // Cláusula 8 — Rescisão
  H1(pdf, cur, "Cláusula Oitava – Da Rescisão Contratual", empresa, numero);
  P(pdf, cur, "8.1 Poderá o presente instrumento ser rescindido por qualquer das partes, em até 7 (sete) dias, devendo então somente ser finalizadas e pagas as etapas que já estiverem em andamento.", empresa, numero);
  P(pdf, cur, "8.2 Em caso de desistência ou renúncia pela CONTRATANTE sem motivo justo, dentro do prazo de instalação, será devido à CONTRATADA, a título de reparação, 10% do valor deste contrato, caso a desistência seja comunicada após decorridos 7 (sete) dias da assinatura.", empresa, numero);
  P(pdf, cur, "8.3 O descumprimento de qualquer cláusula implicará rescisão imediata deste contrato, obrigando a parte que rescindiu a pagar multa de 10% sobre o valor total do contrato.", empresa, numero, { spaceAfter: 3 });

  // Cláusula 9 — LGPD
  H1(pdf, cur, "Cláusula Nona – Da Observância à LGPD", empresa, numero);
  P(pdf, cur, "9.1 A CONTRATANTE declara expresso CONSENTIMENTO para que a CONTRATADA colete, trate e compartilhe os dados necessários ao cumprimento do contrato, nos termos do Art. 7º, inc. V da LGPD, bem como os dados necessários para cumprimento de obrigações legais (Art. 7º, inc. II) e proteção ao crédito.", empresa, numero, { spaceAfter: 3 });

  // Cláusula 10 — Foro
  H1(pdf, cur, "Cláusula Décima – Da Legislação Aplicável e Foro", empresa, numero);
  P(pdf, cur, "10.1 Este contrato será regido e interpretado de acordo com as leis da República Federativa do Brasil.", empresa, numero);
  P(pdf, cur, "10.2 Para dirimir quaisquer controvérsias oriundas deste contrato, as partes elegem o foro da Comarca de Ribeira do Pombal – Bahia.", empresa, numero, { spaceAfter: 4 });

  P(
    pdf,
    cur,
    "Por estarem assim justas e contratadas, as partes assinam o presente contrato, em duas vias de igual teor, na presença das testemunhas abaixo.",
    empresa,
    numero,
  );
  const hoje = new Date();
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  P(
    pdf,
    cur,
    `Ribeira do Pombal, ${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}.`,
    empresa,
    numero,
    { spaceAfter: 10 },
  );

  // Assinaturas
  ensureSpace(pdf, cur, 60, empresa, numero);
  const sigW = (CONTENT_W - 10) / 2;
  pdf.setDrawColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setLineWidth(0.3);
  pdf.line(M, cur.y, M + sigW, cur.y);
  pdf.line(M + sigW + 10, cur.y, W - M, cur.y);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.text(cliente.nome, M, cur.y + 5);
  pdf.text("VERT ENERGIE", M + sigW + 10, cur.y + 5);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.text(`${cliente.tipo === "pj" ? "CNPJ" : "CPF"}: ${formatDoc(cliente.documento)}`, M, cur.y + 10);
  pdf.text(`CNPJ: ${empresa.cnpj}`, M + sigW + 10, cur.y + 10);
  cur.y += 22;

  // Testemunhas
  ensureSpace(pdf, cur, 25, empresa, numero);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.text("TESTEMUNHAS:", M, cur.y);
  cur.y += 8;
  pdf.setDrawColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.line(M, cur.y, M + sigW, cur.y);
  pdf.line(M + sigW + 10, cur.y, W - M, cur.y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.text("CPF:", M, cur.y + 5);
  pdf.text("CPF:", M + sigW + 10, cur.y + 5);

  // Anexo I — manutenção
  pdf.addPage();
  timbrado(pdf, empresa, numero);
  cur.y = 32;
  H1(pdf, cur, "Anexo I – Programa de Manutenção Preventiva e Preditiva", empresa, numero);
  P(pdf, cur, "O plano de manutenção será realizado pela CONTRATADA conforme períodos preestabelecidos na Tabela 1, com o objetivo de preservar a garantia da instalação e da produção do sistema.", empresa, numero);
  P(pdf, cur, "O valor a ser cobrado por manutenção, após um ano de cortesia, será acordado entre as partes quando esta for executada, desde que haja a necessidade de alguma troca ou instalação.", empresa, numero);
  P(
    pdf,
    cur,
    `A produção estimada e garantida do sistema será de ${dim.geracaoMensal.toLocaleString("pt-BR")} kWh/mês e ${(dim.geracaoMensal * 12).toLocaleString("pt-BR")} kWh/ano, considerando variação de 9% em relação ao valor apresentado na proposta.`,
    empresa,
    numero,
  );
  P(pdf, cur, "Os resultados apresentados são projeções baseadas em valores especificados pelos fabricantes e na irradiação média histórica do local. A contratada não se responsabiliza pela exatidão dos dados, já que a fonte solar é intermitente e depende de fatores meteorológicos.", empresa, numero, { spaceAfter: 4 });

  // Tabela 1
  ensureSpace(pdf, cur, 30, empresa, numero);
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(M, cur.y, CONTENT_W, 7, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("ELEMENTO", M + 3, cur.y + 5);
  pdf.text("PLANO DE AÇÃO", M + 55, cur.y + 5);
  pdf.text("PERÍODO", W - M - 3, cur.y + 5, { align: "right" });
  cur.y += 7;
  pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
  pdf.rect(M, cur.y, CONTENT_W, 16, "F");
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Sistema Fotovoltaico", M + 3, cur.y + 6);
  const acao = pdf.splitTextToSize(
    "Vistoria e inspeção do sistema, analisando todos os componentes (cabos, módulos, inversor, etc.). Realização de manutenção corretiva se necessário.",
    CONTENT_W - 75,
  ) as string[];
  pdf.text(acao, M + 55, cur.y + 5);
  pdf.text("6 meses", W - M - 3, cur.y + 6, { align: "right" });

  if (modo === "blob") return pdf.output("bloburl") as unknown as string;
  if (modo === "blob-data") return pdf.output("blob") as Blob;
  pdf.save(`Contrato-${numero}-${cliente.nome.replace(/\s+/g, "_")}.pdf`);
}
