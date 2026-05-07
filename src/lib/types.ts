// Domain types for Vert CRM

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
