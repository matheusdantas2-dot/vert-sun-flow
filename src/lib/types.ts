// Domain types for VertCRM

export type StageId =
  | "prospeccao"
  | "qualificacao"
  | "visita"
  | "proposta"
  | "negociacao"
  | "contrato"
  | "homologacao"
  | "instalacao"
  | "ativado"
  | "perdido";

export type ClienteSegmento = "residencial" | "comercial" | "agronegocio" | "industrial";
export type ClienteTipo = "pf" | "pj";
export type LeadOrigem = "trafego" | "indicacao" | "prospeccao" | "reativacao" | "licitacao";
export type RedeTipo = "monofasico" | "bifasico" | "trifasico";

export interface Cliente {
  id: string;
  nome: string;
  tipo: ClienteTipo;
  documento: string; // CPF ou CNPJ
  telefone: string;
  whatsapp: string;
  email: string;
  endereco: {
    cep: string;
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  segmento: ClienteSegmento;
  origem: LeadOrigem;
  // dados energéticos
  concessionaria: string;
  grupoTarifario: string;
  consumoMedio: number; // kWh
  tarifa: number; // R$/kWh
  rede: RedeTipo;
  uc: string;
  ativo: boolean;
  criadoEm: string;
  observacoes?: string;
}

export interface Interacao {
  id: string;
  clienteId: string;
  tipo: "ligacao" | "whatsapp" | "email" | "visita" | "nota" | "etapa" | "proposta";
  titulo: string;
  descricao?: string;
  data: string;
  usuarioId?: string;
}

export interface PipelineCard {
  id: string;
  clienteId: string;
  stage: StageId;
  valorEstimado: number;
  potenciaKwp: number;
  consultorId: string;
  diasNaEtapaDesde: string; // ISO date
  origem: LeadOrigem;
  motivoPerda?: string;
  criadoEm: string;
}

export type ProdutoCategoria =
  | "modulo"
  | "inversor"
  | "estrutura"
  | "cabeamento"
  | "servico";

export interface Produto {
  id: string;
  categoria: ProdutoCategoria;
  nome: string;
  fabricante?: string;
  potenciaW?: number; // para módulo
  potenciaKw?: number; // para inversor
  unidade: "unid" | "metro" | "kWp" | "hora" | "mes" | "ano";
  precoCusto: number;
  precoVenda: number;
  garantiaAnos?: number;
  detalhes?: string;
  ativo: boolean;
}

export type EtapaProjetoId =
  | "contrato"
  | "compra"
  | "homologacao"
  | "agendamento"
  | "instalacao"
  | "ativacao"
  | "posvenda";

export type EtapaStatus = "pendente" | "em_andamento" | "concluida";

export interface EtapaProjeto {
  id: EtapaProjetoId;
  status: EtapaStatus;
  dataPrevista?: string;
  dataReal?: string;
  observacoesInternas?: string;
  // campos por etapa: fornecedor, protocolo, periodo, lider, fotos[], modulos, medidor, geracaoEstimada, pendencia, concessionariaNome, mensagemCliente
  extra?: Record<string, any>;
}

export interface ProjetoCliente {
  id: string;       // token público
  cardId: string;
  clienteId: string;
  consultorId: string;
  potenciaKwp: number;
  valorInvestimento: number;
  criadoEm: string;
  etapas: EtapaProjeto[];
}

export interface PropostaItem {
  produtoId: string;
  quantidade: number;
  precoUnitario: number;
}

export type PropostaStatus =
  | "rascunho"
  | "enviada"
  | "negociacao"
  | "aceita"
  | "recusada"
  | "expirada";

export interface Proposta {
  id: string;
  numero: string;
  clienteId: string;
  consultorId: string;
  criadoEm: string;
  validadeAte: string;
  status: PropostaStatus;
  itens: PropostaItem[];
  // parâmetros do simulador
  irradiacao: number;
  eficiencia: number;
  cobertura: number;
  inflacao: number;
  taxaFinanciamento: number; // % ao mês
  taxaCartao: number; // % ao mês
  versao: number;
  observacoes?: string;
  // kit de geração (opcional)
  kitNome?: string;
  kitConsumoKwh?: number;
  mostrarComoKit?: boolean;
}

export type UsuarioPerfil = "admin" | "consultor" | "instalador";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: UsuarioPerfil;
  cor: string; // hex para avatar
  ativo: boolean;
}

export interface Atividade {
  id: string;
  clienteId?: string;
  cardId?: string;
  tipo: "ligacao" | "whatsapp" | "visita" | "reuniao" | "followup" | "instalacao" | "vistoria";
  titulo: string;
  descricao?: string;
  data: string; // ISO
  duracao?: number; // minutos
  status: "pendente" | "realizada" | "nao_atendeu" | "reagendada";
  responsavelId: string;
}

export interface MotivoPerda {
  id: string;
  texto: string;
}

export interface Empresa {
  razaoSocial: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
}

export interface Metas {
  faturamentoMensal: number;
  propostasMensais: number;
  projetosMensais: number;
  kwpMensais: number;
}

export interface SlaConfig {
  // dias máximos por etapa antes de alerta
  [key: string]: number;
}

export const STAGES: { id: StageId; nome: string; cor: string }[] = [
  { id: "prospeccao", nome: "Prospecção", cor: "var(--stage-prospeccao)" },
  { id: "qualificacao", nome: "Qualificação", cor: "var(--stage-qualificacao)" },
  { id: "visita", nome: "Visita Técnica", cor: "var(--stage-visita)" },
  { id: "proposta", nome: "Proposta Enviada", cor: "var(--stage-proposta)" },
  { id: "negociacao", nome: "Negociação", cor: "var(--stage-negociacao)" },
  { id: "contrato", nome: "Contrato Assinado", cor: "var(--stage-contrato)" },
  { id: "homologacao", nome: "Homologação", cor: "var(--stage-homologacao)" },
  { id: "instalacao", nome: "Em Instalação", cor: "var(--stage-instalacao)" },
  { id: "ativado", nome: "Ativado", cor: "var(--stage-ativado)" },
  { id: "perdido", nome: "Perdido", cor: "var(--stage-perdido)" },
];

export const SEGMENTOS_LABEL: Record<ClienteSegmento, string> = {
  residencial: "Residencial",
  comercial: "Comercial",
  agronegocio: "Agronegócio",
  industrial: "Industrial",
};

export const ORIGEM_LABEL: Record<LeadOrigem, string> = {
  trafego: "Tráfego Pago",
  indicacao: "Indicação",
  prospeccao: "Prospecção Ativa",
  reativacao: "Reativação",
  licitacao: "Licitação Pública",
};

export const STATUS_PROPOSTA_LABEL: Record<PropostaStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  negociacao: "Em negociação",
  aceita: "Aceita",
  recusada: "Recusada",
  expirada: "Expirada",
};

// ─── FINANCEIRO ───────────────────────────────────────────────────────────────

export type ContaFinanceiraId = "vert_pj" | "pessoal_matheus";

export const CONTAS_FINANCEIRAS: { id: ContaFinanceiraId; nome: string; cor: string }[] = [
  { id: "vert_pj", nome: "Vert Energie (PJ)", cor: "#1a7a4a" },
  { id: "pessoal_matheus", nome: "Pessoal (PF)", cor: "#7c3aed" },
];

export type LancamentoTipo = "receita" | "despesa" | "transferencia";
export type LancamentoStatus = "previsto" | "realizado" | "cancelado";

export type ModoRecebimento =
  | "avista"
  | "50_30_20"
  | "cartao_credito"
  | "financiado_sol_agora"
  | "financiado_eos"
  | "financiado_77sol"
  | "financiado_bnb";

export const MODO_RECEBIMENTO_LABEL: Record<ModoRecebimento, string> = {
  avista: "À vista",
  "50_30_20": "50/30/20 (parcelas próprias)",
  cartao_credito: "Cartão de crédito",
  financiado_sol_agora: "Financiado — Sol Agora",
  financiado_eos: "Financiado — EOS Fin",
  financiado_77sol: "Financiado — 77Sol",
  financiado_bnb: "Financiado — BNB FNE Sol",
};

export const FINANCEIRAS_REPASSE_UNICO: ModoRecebimento[] = [
  "financiado_sol_agora",
  "financiado_eos",
  "financiado_77sol",
  "financiado_bnb",
];

export interface Lancamento {
  id: string;
  conta: ContaFinanceiraId;
  tipo: LancamentoTipo;
  descricao: string;
  valor: number;
  categoria: string;
  dataVencimento: string;
  dataRealizacao?: string;
  status: LancamentoStatus;
  cardId?: string;
  propostaId?: string;
  clienteId?: string;
  contaDestino?: ContaFinanceiraId;
  modoRecebimento?: ModoRecebimento;
  parcelaNumero?: number;
  parcelaTotal?: number;
  observacoes?: string;
  criadoEm: string;
}

export type CategoriaFinanceira =
  | "projeto_solar"
  | "servico_manutencao"
  | "consultoria"
  | "prolabore_entrada"
  | "outros_receita"
  | "equipamento"
  | "mao_de_obra"
  | "combustivel"
  | "marketing"
  | "aluguel"
  | "prolabore_saida"
  | "imposto"
  | "software"
  | "outros_despesa";

export const CATEGORIA_LABEL: Record<CategoriaFinanceira, string> = {
  projeto_solar: "Projeto Solar",
  servico_manutencao: "Manutenção",
  consultoria: "Consultoria",
  prolabore_entrada: "Pró-labore recebido",
  outros_receita: "Outras receitas",
  equipamento: "Equipamentos",
  mao_de_obra: "Mão de obra",
  combustivel: "Combustível",
  marketing: "Marketing",
  aluguel: "Aluguel",
  prolabore_saida: "Pró-labore pago",
  imposto: "Impostos e taxas",
  software: "Software / Assinaturas",
  outros_despesa: "Outras despesas",
};

export const CATEGORIAS_RECEITA: CategoriaFinanceira[] = [
  "projeto_solar",
  "servico_manutencao",
  "consultoria",
  "prolabore_entrada",
  "outros_receita",
];

export const CATEGORIAS_DESPESA: CategoriaFinanceira[] = [
  "equipamento",
  "mao_de_obra",
  "combustivel",
  "marketing",
  "aluguel",
  "prolabore_saida",
  "imposto",
  "software",
  "outros_despesa",
];

