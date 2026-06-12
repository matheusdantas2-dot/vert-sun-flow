import type { Cliente, PipelineCard, Proposta } from "./types";
import { ORIGEM_LABEL, SEGMENTOS_LABEL, STAGES, STATUS_PROPOSTA_LABEL } from "./types";
import type { Profile } from "./profiles.api";
import { formatDoc, formatTel, dataBR, brl } from "./format";

function download(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function dateTag() {
  return new Date().toISOString().slice(0, 10);
}

function diffDias(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export function exportClientesCsv(clientes: Cliente[]): void {
  const rows: (string | number)[][] = [
    [
      "Nome",
      "CPF/CNPJ",
      "Segmento",
      "Cidade",
      "UF",
      "Telefone",
      "WhatsApp",
      "E-mail",
      "Consumo médio kWh",
      "Tarifa",
      "Concessionária",
      "Criado em",
    ],
  ];
  clientes.forEach((c) => {
    rows.push([
      c.nome,
      formatDoc(c.documento),
      SEGMENTOS_LABEL[c.segmento],
      c.endereco.cidade,
      c.endereco.uf,
      formatTel(c.telefone),
      formatTel(c.whatsapp),
      c.email,
      c.consumoMedio,
      c.tarifa,
      c.concessionaria,
      dataBR(c.criadoEm),
    ]);
  });
  download(`vert-clientes-${dateTag()}.csv`, rows);
}

export function exportPropostasCsv(propostas: Proposta[], clientes: Cliente[]): void {
  const rows: (string | number)[][] = [
    [
      "Número",
      "Cliente",
      "Segmento",
      "Cidade",
      "Status",
      "Valor total",
      "kWp",
      "Consultor",
      "Criado em",
      "Validade",
    ],
  ];
  propostas.forEach((p) => {
    const cliente = clientes.find((c) => c.id === p.clienteId);
    const valor = p.itens.reduce(
      (a, it) => a + (it.precoUnitario ?? 0) * it.quantidade,
      0,
    );
    rows.push([
      p.numero,
      cliente?.nome ?? "—",
      cliente ? SEGMENTOS_LABEL[cliente.segmento] : "—",
      cliente ? `${cliente.endereco.cidade}/${cliente.endereco.uf}` : "—",
      STATUS_PROPOSTA_LABEL[p.status],
      brl(valor),
      "",
      p.consultorId,
      dataBR(p.criadoEm),
      dataBR(p.validadeAte),
    ]);
  });
  download(`vert-propostas-${dateTag()}.csv`, rows);
}

export function exportPipelineCsv(
  cards: PipelineCard[],
  clientes: Cliente[],
  profiles: Profile[],
): void {
  const rows: (string | number)[][] = [
    [
      "Cliente",
      "Segmento",
      "Cidade",
      "Etapa",
      "Valor estimado",
      "kWp",
      "Consultor",
      "Origem",
      "Dias na etapa",
      "Motivo perda",
    ],
  ];
  cards.forEach((card) => {
    const cliente = clientes.find((c) => c.id === card.clienteId);
    const consultor = profiles.find((p) => p.id === card.consultorId);
    const stage = STAGES.find((s) => s.id === card.stage);
    rows.push([
      cliente?.nome ?? "—",
      cliente ? SEGMENTOS_LABEL[cliente.segmento] : "—",
      cliente ? `${cliente.endereco.cidade}/${cliente.endereco.uf}` : "—",
      stage?.nome ?? card.stage,
      brl(card.valorEstimado),
      card.potenciaKwp,
      consultor?.nome ?? "—",
      ORIGEM_LABEL[card.origem],
      diffDias(card.diasNaEtapaDesde),
      card.motivoPerda ?? "",
    ]);
  });
  download(`vert-pipeline-${dateTag()}.csv`, rows);
}
