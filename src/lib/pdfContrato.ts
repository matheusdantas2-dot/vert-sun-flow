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
  const colP = 22;
  const colV = 40;
  const colD = CONTENT_W - colN - colV - colP;
  const total = formas.reduce((a, f) => a + f.valor, 0);
  const pct = (v: number) => (total > 0 ? `${((v / total) * 100).toFixed(0)}%` : "—");
  ensureSpace(pdf, cur, 8 + formas.length * 8 + 4, empresa, numero);
  pdf.setFillColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.rect(M, cur.y, CONTENT_W, 7, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("Nº", M + 3, cur.y + 5);
  pdf.text("MOMENTO DO PAGAMENTO", M + colN + 3, cur.y + 5);
  pdf.text("%", W - M - colV - colP / 2, cur.y + 5, { align: "center" });
  pdf.text("VALOR (R$)", W - M - 3, cur.y + 5, { align: "right" });
  cur.y += 7;
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
    pdf.text(pct(f.valor), W - M - colV - colP / 2, cur.y + 5.5, { align: "center" });
    pdf.setFont("helvetica", "bold");
    pdf.text(brl(f.valor), W - M - 3, cur.y + 5.5, { align: "right" });
    pdf.setFont("helvetica", "normal");
    cur.y += 8;
  });
  pdf.setDrawColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setLineWidth(0.4);
  pdf.line(M, cur.y, W - M, cur.y);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.setFontSize(10);
  pdf.text("TOTAL", M + colN + 3, cur.y + 6);
  pdf.text("100%", W - M - colV - colP / 2, cur.y + 6, { align: "center" });
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
  P(pdf, cur, `5.1 A CONTRATANTE pagará à CONTRATADA o valor total de ${brl(valorTotal)} pela prestação dos serviços e fornecimento dos equipamentos, conforme detalhado na proposta comercial.`, empresa, numero);
  P(pdf, cur, `5.2 O pagamento será efetuado da seguinte forma, via Pix (Chave: ${empresa.cnpj}):`, empresa, numero);
  tabelaPagamento(pdf, cur, condicoes.formasPagamento, empresa, numero);
  P(pdf, cur, `5.3 No caso de atraso no pagamento superior a 10 dias, será aplicada multa moratória de ${condicoes.multaAtrasoPct}% sobre o valor em atraso, acrescida de juros de mora de 1% (um por cento) ao mês e atualização monetária pelo IPCA (ou índice que vier a substituí-lo), incidentes desde o vencimento até a data do efetivo pagamento.`, empresa, numero);
  P(pdf, cur, "5.4 A propriedade dos equipamentos fornecidos permanecerá com a CONTRATADA até a quitação integral do valor previsto nesta cláusula, nos termos dos artigos 521 a 528 do Código Civil, ainda que os equipamentos já estejam instalados no imóvel da CONTRATANTE.", empresa, numero, { spaceAfter: 3 });

  // Cláusula 6 — Garantia
  const invMarca = proposta.itens
    .map((it) => produtos.find((x) => x.id === it.produtoId))
    .find((p) => p?.categoria === "inversor")?.fabricante;
  H1(pdf, cur, "Cláusula Sexta – Da Garantia", empresa, numero);
  P(pdf, cur, "6.1 A garantia dos equipamentos será fornecida pelo fabricante, conforme os termos e condições estabelecidos na garantia do fabricante e na legislação aplicável.", empresa, numero);
  P(pdf, cur, "6.2 Das garantias conforme a proposta:", empresa, numero);
  bullets(pdf, cur, [
    "Módulos solares: 25 anos de garantia do fabricante contra queda de eficiência",
    `Inversor${invMarca ? " " + invMarca : ""}: 5 anos de garantia padrão do fabricante`,
    "Infraestrutura (materiais elétricos e outros): 1 ano",
    "Mão de obra: 1 ano a partir da conclusão da instalação",
  ], empresa, numero);
  P(pdf, cur, "6.3 A mão de obra para instalação do sistema terá garantia de 12 meses a partir da conclusão da instalação, cobrindo defeitos de instalação ou funcionamento.", empresa, numero);
  P(pdf, cur, "6.4 A CONTRATANTE fica ciente e concorda que não haverá direito de garantia, tornando a CONTRATADA isenta de qualquer responsabilidade ou obrigação, na hipótese de:", empresa, numero);
  bullets(pdf, cur, [
    "a. Decorrido o prazo de garantia dado à CONTRATANTE;",
    "b. Danos nos equipamentos causados por condições climáticas extremas, tais como tempestades, furacões, granizo, inundação, ou qualquer outro evento natural além do controle da CONTRATADA;",
    "c. Danos causados por mau uso, negligência ou manutenção inadequada por parte do cliente, incluindo interferência não autorizada ou tentativas de reparo por pessoas não autorizadas pela CONTRATADA;",
    "d. Manutenção ou reparo realizado por qualquer pessoa ou entidade que não seja um representante autorizado da CONTRATADA;",
    "e. Modificação feita no sistema solar sem a aprovação prévia por escrito da CONTRATADA, invalidando a garantia para os componentes afetados;",
    "f. Danos causados por terceiros, incluindo vandalismos ou acidentes não relacionados à instalação realizada pela CONTRATADA;",
    "g. Utilização de acessórios, dispositivos ou equipamentos não aprovados pela CONTRATADA, que possam afetar a integridade ou desempenho do sistema solar;",
    "h. Dano causado à estrutura do edifício durante ou após a instalação dos painéis solares, devido a modificações estruturais não autorizadas pela CONTRATADA;",
    "i. Perdas ou danos decorrentes de interrupções no fornecimento de energia elétrica pela concessionária local;",
    "j. Queda de eficiência na produção de energia pelos módulos solares, decorrente de alterações climáticas ou intervenção humana (tempo nublado, sombreamento por árvores ou construções após a instalação, entre outras situações).",
  ], empresa, numero);
  P(pdf, cur, "6.5 Na hipótese do item i da cláusula 6.4, não serão devidos quaisquer reembolsos por ausência ou diminuição na geração de energia no sistema fotovoltaico.", empresa, numero);
  P(pdf, cur, "6.6 A fim de garantir o bom funcionamento do sistema, será realizado pela CONTRATADA um Plano de Manutenção Preditiva e Preventiva durante o prazo de garantia do serviço, conforme condições previamente acordadas entre as partes.", empresa, numero);
  P(pdf, cur, "6.7 Após decorrido o prazo de garantia, a CONTRATANTE fica livre para escolher qualquer profissional ou empresa para realizar manutenções, vistorias ou limpeza nos módulos, ou poderá contratar um plano de manutenção com a CONTRATADA.", empresa, numero, { spaceAfter: 3 });

  // Cláusula 7 — Prazo
  H1(pdf, cur, "Cláusula Sétima – Do Prazo, Execução e Conclusão dos Serviços", empresa, numero);
  P(pdf, cur, "7.1 A CONTRATADA atuará nos serviços contratados de acordo com as especificações técnicas e comerciais constantes da proposta comercial referida na cláusula 1.1 e detalhadas na cláusula quarta deste contrato.", empresa, numero);
  P(pdf, cur, `7.2 O prazo para conclusão do serviço de instalação do sistema fotovoltaico será de ${condicoes.prazoInstalacaoDias} dias, contados a partir da data de assinatura do contrato, podendo ser prorrogado até a integral conclusão de todos os serviços, nas hipóteses de:`, empresa, numero);
  bullets(pdf, cur, [
    "k. Condições climáticas que dificultem e/ou impossibilitem a realização dos serviços no prazo estipulado;",
    "l. Estado de calamidade pública, em que haja grave risco à segurança, saúde ou vida humana;",
    "m. Em caso de greve geral, desde que torne impossível o livre deslocamento para realização dos serviços;",
    "n. Atraso ocasionado por negligência ou morosidade por parte da CONTRATANTE em realizar demandas necessárias na parte elétrica e/ou estrutural do imóvel, ou pendências com a concessionária de energia.",
  ], empresa, numero);
  P(pdf, cur, '7.3 Na hipótese do item "n" da cláusula 7.2, quando tais mudanças forem pré-requisito indispensável para o início do serviço de instalação, o prazo para conclusão começará a contar a partir da finalização de todas as demandas necessárias.', empresa, numero);
  P(pdf, cur, "7.4 A CONTRATADA terá gerência integral na execução do serviço que lhe é destinado, com TOTAL AUTONOMIA, sem cumprimento de horários ou ordens, devendo atender exclusivamente o cronograma firmado entre as partes.", empresa, numero);
  P(pdf, cur, "7.5 Considera-se o cumprimento integral do contrato o momento em que todos os serviços especificados na cláusula quarta tenham sido concluídos e comunicados pela CONTRATADA à CONTRATANTE.", empresa, numero);
  P(pdf, cur, "7.6 A CONTRATANTE terá o prazo de 5 (cinco) dias úteis, contados da comunicação de conclusão pela CONTRATADA, para aprovar os serviços ou apontar, por escrito e de forma fundamentada, pendências específicas relacionadas aos serviços contratados. Decorrido esse prazo sem manifestação expressa, os serviços serão considerados tacitamente aceitos para todos os fins contratuais, inclusive para a exigibilidade do saldo final previsto na cláusula 5.2.", empresa, numero);
  P(pdf, cur, "7.7 Na conclusão dos serviços, as partes firmarão Termo de Entrega e Aceite Técnico, conforme modelo constante ao final deste contrato, que servirá como comprovação formal da conclusão dos serviços para todos os efeitos contratuais, sem prejuízo da regra de aceite tácito prevista na cláusula 7.6.", empresa, numero, { spaceAfter: 3 });

  // Cláusula 8 — Rescisão
  H1(pdf, cur, "Cláusula Oitava – Da Rescisão Contratual", empresa, numero);
  P(pdf, cur, "8.1 Qualquer das partes poderá desistir do presente contrato, sem aplicação de multa, no prazo de até 7 (sete) dias corridos contados da data de assinatura deste instrumento, hipótese em que serão devidas à CONTRATADA apenas as etapas dos serviços já executadas e/ou os materiais já adquiridos até o momento da comunicação da desistência.", empresa, numero);
  P(pdf, cur, "8.2 Decorrido o prazo previsto na cláusula 8.1, a desistência ou renúncia pela CONTRATANTE sem motivo justo, dentro do prazo de instalação previsto na cláusula 7.2, implicará o pagamento à CONTRATADA, a título de reparação e indenização, de 10% (dez por cento) sobre o valor total deste contrato.", empresa, numero);
  P(pdf, cur, "8.3 O descumprimento de qualquer das cláusulas deste contrato por qualquer das partes deverá ser comunicado por escrito à parte inadimplente, que terá o prazo de 10 (dez) dias corridos para sanar o descumprimento apontado. Persistindo o descumprimento após esse prazo, operar-se-á a rescisão imediata do contrato, ficando a parte inadimplente obrigada a pagar à parte prejudicada multa de 10% (dez por cento) sobre o valor total do contrato, sem prejuízo de eventuais perdas e danos apurados.", empresa, numero, { spaceAfter: 3 });

  // Cláusula 9 — Concessionária
  const conc = cliente.concessionaria || "COELBA";
  H1(pdf, cur, "Cláusula Nona – Da Responsabilidade da Concessionária de Energia", empresa, numero);
  P(pdf, cur, `9.1 As partes reconhecem que o fornecimento de energia elétrica, o controle da injeção de energia na rede e a medição da energia injetada e consumida são de responsabilidade exclusiva da concessionária local de distribuição de energia (${conc}), não competindo à CONTRATADA qualquer ingerência sobre tais processos após a conclusão da instalação e a obtenção da homologação do sistema.`, empresa, numero);
  P(pdf, cur, "9.2 A CONTRATADA não se responsabiliza por defeitos, falhas, interrupções, oscilações ou quaisquer outras ocorrências na rede elétrica da concessionária, tampouco por erros de medição, atrasos na troca do medidor, ou indisponibilidade do sistema de compensação de energia, uma vez que tais fatos decorrem exclusivamente da atuação da concessionária, terceira estranha à relação contratual entre as partes.", empresa, numero);
  P(pdf, cur, "9.3 Eventuais reclamações relacionadas à qualidade do fornecimento de energia, à medição de injeção/consumo ou a defeitos na rede de distribuição após a instalação do sistema deverão ser dirigidas pela CONTRATANTE diretamente à concessionária local, não gerando qualquer direito de indenização, abatimento ou acionamento de garantia em face da CONTRATADA.", empresa, numero, { spaceAfter: 3 });

  // Cláusula 10 — Força maior
  H1(pdf, cur, "Cláusula Décima – Da Força Maior", empresa, numero);
  P(pdf, cur, "10.1 Nenhuma das partes será responsabilizada por perdas, danos ou atrasos decorrentes de caso fortuito ou força maior, nos termos do artigo 393 do Código Civil, entendendo-se como tais os eventos imprevistos ou inevitáveis alheios à vontade das partes, incluindo, mas não se limitando a, desastres naturais, atos de autoridade pública, greves gerais, pandemias, e indisponibilidade de insumos por fatores externos ao controle das partes.", empresa, numero);
  P(pdf, cur, "10.2 Ocorrendo evento de força maior, a parte afetada comunicará a outra por escrito em até 5 (cinco) dias úteis do início do evento, ficando suspensas as obrigações diretamente atingidas enquanto perdurar a situação, sem incidência de multas ou penalidades durante esse período.", empresa, numero, { spaceAfter: 3 });

  // Cláusula 11 — Responsabilidade civil
  H1(pdf, cur, "Cláusula Décima Primeira – Da Responsabilidade Civil e Segurança da Instalação", empresa, numero);
  P(pdf, cur, "11.1 A CONTRATADA responderá pelos danos materiais causados diretamente ao imóvel da CONTRATANTE ou a terceiros, decorrentes de ação ou omissão de seus profissionais durante a execução dos serviços de instalação, nos termos da legislação civil aplicável.", empresa, numero);
  P(pdf, cur, "11.2 A CONTRATADA obriga-se a observar as normas regulamentadoras de segurança do trabalho aplicáveis (incluindo, no que couber, NR-10 e NR-35), sendo de sua exclusiva responsabilidade os encargos trabalhistas, previdenciários, fiscais e de segurança relativos à sua equipe, não se estabelecendo qualquer vínculo empregatício ou de responsabilidade solidária com a CONTRATANTE.", empresa, numero);
  P(pdf, cur, "11.3 A responsabilidade prevista nesta cláusula fica limitada aos danos diretamente decorrentes da execução dos serviços contratados, não abrangendo danos pré-existentes no imóvel, vícios estruturais não identificáveis no momento da vistoria, nem fatos exclusivos de terceiros alheios à instalação.", empresa, numero, { spaceAfter: 3 });

  // Cláusula 12 — Tributos
  H1(pdf, cur, "Cláusula Décima Segunda – Dos Tributos e Documentos Fiscais", empresa, numero);
  P(pdf, cur, "12.1 A CONTRATADA emitirá os documentos fiscais correspondentes ao fornecimento dos equipamentos e à prestação dos serviços objeto deste contrato, observada a legislação tributária municipal e estadual aplicável.", empresa, numero);
  P(pdf, cur, "12.2 Cada parte responderá pelo recolhimento dos tributos incidentes sobre sua própria atividade, nos termos da legislação vigente, não respondendo a CONTRATADA por tributos de responsabilidade da CONTRATANTE, nem vice-versa.", empresa, numero, { spaceAfter: 3 });

  // Cláusula 13 — Confidencialidade
  H1(pdf, cur, "Cláusula Décima Terceira – Da Confidencialidade e da Propriedade do Projeto Técnico", empresa, numero);
  P(pdf, cur, "13.1 Os projetos técnicos, memoriais descritivos, diagramas unifilares e demais documentos técnicos elaborados pela CONTRATADA para a execução deste contrato constituem propriedade intelectual da CONTRATADA, podendo a CONTRATANTE utilizá-los exclusivamente para os fins de operação, manutenção e regularização do sistema objeto deste contrato.", empresa, numero);
  P(pdf, cur, "13.2 As partes comprometem-se a manter sigilo sobre informações técnicas, comerciais e financeiras obtidas em razão deste contrato, não as divulgando a terceiros sem autorização prévia e por escrito da outra parte, exceto por determinação legal ou de autoridade competente, obrigação que subsistirá mesmo após a conclusão ou rescisão deste contrato.", empresa, numero, { spaceAfter: 3 });

  // Cláusula 14 — LGPD
  H1(pdf, cur, "Cláusula Décima Quarta – Da Observância à LGPD", empresa, numero);
  P(pdf, cur, "14.1 A CONTRATANTE declara expresso CONSENTIMENTO que a CONTRATADA irá coletar, tratar e compartilhar os dados necessários ao cumprimento do contrato, nos termos do Art. 7º, inc. V da LGPD, os dados necessários para cumprimento de obrigações legais, nos termos do Art. 7º, inc. II da LGPD, bem como os dados, se necessários para proteção ao crédito, conforme autorizado pelo Art. 7º, inc. X da LGPD.", empresa, numero, { spaceAfter: 3 });

  // Cláusula 15 — Foro
  H1(pdf, cur, "Cláusula Décima Quinta – Da Legislação Aplicável e Foro", empresa, numero);
  P(pdf, cur, "15.1 Este contrato será regido e interpretado de acordo com as leis da República Federativa do Brasil.", empresa, numero);
  P(pdf, cur, "15.2 Para dirimir quaisquer controvérsias oriundas deste contrato, as partes elegem o foro da Comarca de Ribeira do Pombal – Bahia.", empresa, numero, { spaceAfter: 4 });

  P(pdf, cur, "Por estarem assim justas e contratadas, as partes assinam o presente contrato, em duas vias de igual teor, na presença das testemunhas abaixo.", empresa, numero);
  const hoje = new Date();
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  P(pdf, cur, `Ribeira do Pombal, ${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}.`, empresa, numero, { spaceAfter: 14 });

  const sigW = (CONTENT_W - 10) / 2;
  const docCli = `${cliente.tipo === "pj" ? "CNPJ" : "CPF"}: ${formatDoc(cliente.documento)}`;
  const assinaturas = () => {
    ensureSpace(pdf, cur, 30, empresa, numero);
    pdf.setDrawColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.setLineWidth(0.3);
    pdf.line(M, cur.y, M + sigW, cur.y);
    pdf.line(M + sigW + 10, cur.y, W - M, cur.y);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
    pdf.text(pdf.splitTextToSize(cliente.nome, sigW)[0], M, cur.y + 5);
    pdf.text("VERT ENERGIE", M + sigW + 10, cur.y + 5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.text(docCli, M, cur.y + 10);
    pdf.text(`CNPJ: ${empresa.cnpj}`, M + sigW + 10, cur.y + 10);
    cur.y += 22;
  };
  assinaturas();

  // Testemunhas
  ensureSpace(pdf, cur, 30, empresa, numero);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.text("TESTEMUNHAS:", M, cur.y);
  cur.y += 14;
  pdf.setDrawColor(VERT_DARK[0], VERT_DARK[1], VERT_DARK[2]);
  pdf.line(M, cur.y, M + sigW, cur.y);
  pdf.line(M + sigW + 10, cur.y, W - M, cur.y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.text("CPF:", M, cur.y + 5);
  pdf.text("CPF:", M + sigW + 10, cur.y + 5);

  // Anexo — Termo de Entrega e Aceite Técnico
  pdf.addPage();
  timbrado(pdf, empresa, numero);
  cur.y = 32;
  H1(pdf, cur, "Anexo — Termo de Entrega e Aceite Técnico", empresa, numero);
  P(pdf, cur, "(referente à cláusula 7.7 do Contrato de Prestação de Serviços e Fornecimento de Materiais e Instalação de Sistema Solar Fotovoltaico)", empresa, numero, { size: 8, spaceAfter: 4 });
  P(pdf, cur, `CONTRATADA: ${empresa.razaoSocial} — CNPJ ${empresa.cnpj}`, empresa, numero, { bold: true });
  P(pdf, cur, `CONTRATANTE: ${cliente.nome} — ${docCli}`, empresa, numero, { bold: true, spaceAfter: 4 });
  P(pdf, cur, "Data de conclusão dos serviços: ____/____/________", empresa, numero, { spaceAfter: 3 });
  P(pdf, cur, `Local da instalação: ${endCli}`, empresa, numero, { spaceAfter: 4 });
  P(pdf, cur, "Declaramos, para os devidos fins contratuais, que os serviços de instalação do sistema de energia solar fotovoltaica descritos na cláusula quarta do contrato acima referido foram concluídos e:", empresa, numero);
  P(pdf, cur, "(   ) ACEITOS integralmente, sem pendências, nos termos da cláusula 7.6;", empresa, numero);
  P(pdf, cur, "(   ) ACEITOS com as seguintes pendências a sanar pela CONTRATADA, listadas abaixo:", empresa, numero, { spaceAfter: 4 });
  ["1)", "2)", "3)"].forEach((n) =>
    P(pdf, cur, `${n} ____________________________________________________________________________`, empresa, numero, { spaceAfter: 4 }),
  );
  P(pdf, cur, "Prazo acordado para solução das pendências, se houver: __________________________________", empresa, numero, { spaceAfter: 4 });
  P(pdf, cur, "Este termo não substitui nem prejudica a garantia prevista na cláusula sexta do contrato, nem a regra de aceite tácito prevista na cláusula 7.6.", empresa, numero, { spaceAfter: 18 });
  assinaturas();

  if (modo === "blob") return pdf.output("bloburl") as unknown as string;
  if (modo === "blob-data") return pdf.output("blob") as Blob;
  pdf.save(`Contrato-${numero}-${cliente.nome.replace(/\s+/g, "_")}.pdf`);
}
