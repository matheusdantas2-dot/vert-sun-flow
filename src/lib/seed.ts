import type {
  Cliente,
  PipelineCard,
  Produto,
  Proposta,
  Usuario,
  Atividade,
  MotivoPerda,
  Empresa,
  Metas,
  SlaConfig,
  Interacao,
} from "./types";

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

export const seedUsuarios: Usuario[] = [
  { id: "u1", nome: "Matheus Vert", email: "matheus@vertenergie.com.br", perfil: "admin", cor: "#0d5234", ativo: true },
  { id: "u2", nome: "Camila Souza", email: "camila@vertenergie.com.br", perfil: "consultor", cor: "#2d9e64", ativo: true },
  { id: "u3", nome: "Rafael Lima", email: "rafael@vertenergie.com.br", perfil: "consultor", cor: "#5ee89a", ativo: true },
  { id: "u4", nome: "João Instalador", email: "joao@vertenergie.com.br", perfil: "instalador", cor: "#1a7a4a", ativo: true },
];

export const seedEmpresa: Empresa = {
  razaoSocial: "VertCRM Comércio e Serviços Elétricos Ltda",
  cnpj: "45.517.241/0001-40",
  endereco: "Av. Tancredo Neves, 620 - Salvador/BA",
  telefone: "(71) 99999-0000",
  email: "contato@vertenergie.com.br",
};

export const seedMetas: Metas = {
  faturamentoMensal: 450000,
  propostasMensais: 30,
  projetosMensais: 8,
  kwpMensais: 80,
};

export const seedSla: SlaConfig = {
  prospeccao: 5,
  qualificacao: 3,
  visita: 5,
  proposta: 7,
  negociacao: 10,
  contrato: 5,
  homologacao: 30,
  instalacao: 20,
  ativado: 999,
  perdido: 999,
};

export const seedMotivosPerda: MotivoPerda[] = [
  { id: "m1", texto: "Preço acima do orçamento" },
  { id: "m2", texto: "Optou por concorrente" },
  { id: "m3", texto: "Adiou decisão" },
  { id: "m4", texto: "Sem viabilidade técnica" },
  { id: "m5", texto: "Sem retorno do cliente" },
  { id: "m6", texto: "Mudou de endereço" },
];

export const seedProdutos: Produto[] = [
  // Módulos
  { id: "p1", categoria: "modulo", nome: "Painel 550W Bifacial", fabricante: "Canadian Solar", potenciaW: 550, unidade: "unid", precoCusto: 720, precoVenda: 980, garantiaAnos: 12, ativo: true },
  { id: "p2", categoria: "modulo", nome: "Painel 580W Mono PERC", fabricante: "JA Solar", potenciaW: 580, unidade: "unid", precoCusto: 760, precoVenda: 1040, garantiaAnos: 12, ativo: true },
  { id: "p3", categoria: "modulo", nome: "Painel 605W TOPCon", fabricante: "Trina Solar", potenciaW: 605, unidade: "unid", precoCusto: 820, precoVenda: 1120, garantiaAnos: 15, ativo: true },
  // Inversores
  { id: "p4", categoria: "inversor", nome: "Inversor String 5kW", fabricante: "Growatt", potenciaKw: 5, unidade: "unid", precoCusto: 2800, precoVenda: 4200, garantiaAnos: 10, ativo: true },
  { id: "p5", categoria: "inversor", nome: "Inversor String 8kW", fabricante: "Growatt", potenciaKw: 8, unidade: "unid", precoCusto: 4100, precoVenda: 6200, garantiaAnos: 10, ativo: true },
  { id: "p6", categoria: "inversor", nome: "Inversor String 15kW", fabricante: "Solis", potenciaKw: 15, unidade: "unid", precoCusto: 6800, precoVenda: 10200, garantiaAnos: 10, ativo: true },
  { id: "p7", categoria: "inversor", nome: "Inversor Híbrido 10kW", fabricante: "Deye", potenciaKw: 10, unidade: "unid", precoCusto: 9500, precoVenda: 14500, garantiaAnos: 10, ativo: true },
  // Estruturas
  { id: "p8", categoria: "estrutura", nome: "Estrutura Telha Colonial", unidade: "kWp", precoCusto: 180, precoVenda: 280, ativo: true },
  { id: "p9", categoria: "estrutura", nome: "Estrutura Telha Metálica", unidade: "kWp", precoCusto: 160, precoVenda: 250, ativo: true },
  { id: "p10", categoria: "estrutura", nome: "Estrutura Fibrocimento", unidade: "kWp", precoCusto: 170, precoVenda: 270, ativo: true },
  { id: "p11", categoria: "estrutura", nome: "Estrutura Solo", unidade: "kWp", precoCusto: 320, precoVenda: 480, ativo: true },
  { id: "p12", categoria: "estrutura", nome: "Estrutura Laje", unidade: "kWp", precoCusto: 220, precoVenda: 340, ativo: true },
  // Cabeamento e elétrica
  { id: "p13", categoria: "cabeamento", nome: "Cabo Solar 6mm² Vermelho", unidade: "metro", precoCusto: 6.5, precoVenda: 11, ativo: true },
  { id: "p14", categoria: "cabeamento", nome: "Cabo Solar 6mm² Preto", unidade: "metro", precoCusto: 6.5, precoVenda: 11, ativo: true },
  { id: "p15", categoria: "cabeamento", nome: "Stringbox CC 2E/1S", unidade: "unid", precoCusto: 480, precoVenda: 780, ativo: true },
  { id: "p16", categoria: "cabeamento", nome: "Disjuntor CA 40A", unidade: "unid", precoCusto: 65, precoVenda: 120, ativo: true },
  { id: "p17", categoria: "cabeamento", nome: "Aterramento completo", unidade: "unid", precoCusto: 280, precoVenda: 480, ativo: true },
  // Serviços
  { id: "p18", categoria: "servico", nome: "Mão de obra de instalação", unidade: "kWp", precoCusto: 280, precoVenda: 550, ativo: true },
  { id: "p19", categoria: "servico", nome: "Projeto Elétrico + ART", unidade: "unid", precoCusto: 450, precoVenda: 980, ativo: true },
  { id: "p20", categoria: "servico", nome: "Homologação Concessionária", unidade: "unid", precoCusto: 200, precoVenda: 580, ativo: true },
  { id: "p21", categoria: "servico", nome: "Plano Monitoramento", unidade: "mes", precoCusto: 25, precoVenda: 80, ativo: true },
  { id: "p22", categoria: "servico", nome: "Manutenção Preventiva Anual", unidade: "ano", precoCusto: 350, precoVenda: 780, ativo: true },
];

export const seedClientes: Cliente[] = [
  { id: "c1", nome: "Joana Pereira", tipo: "pf", documento: "12345678901", telefone: "71999990001", whatsapp: "71999990001", email: "joana@email.com", endereco: { cep: "40000-000", rua: "Rua das Flores", numero: "120", bairro: "Pituba", cidade: "Salvador", uf: "BA" }, segmento: "residencial", origem: "trafego", concessionaria: "Neoenergia Coelba", grupoTarifario: "B1", consumoMedio: 450, tarifa: 0.92, rede: "monofasico", uc: "10000001", ativo: true, criadoEm: daysAgo(45) },
  { id: "c2", nome: "Restaurante Sabor da Terra", tipo: "pj", documento: "12345678000190", telefone: "71988880002", whatsapp: "71988880002", email: "contato@saborterra.com", endereco: { cep: "40100-000", rua: "Av. Sete", numero: "850", bairro: "Centro", cidade: "Salvador", uf: "BA" }, segmento: "comercial", origem: "indicacao", concessionaria: "Neoenergia Coelba", grupoTarifario: "B3", consumoMedio: 2800, tarifa: 0.98, rede: "trifasico", uc: "10000002", ativo: true, criadoEm: daysAgo(38) },
  { id: "c3", nome: "Fazenda Boa Vista", tipo: "pj", documento: "23456789000111", telefone: "75977770003", whatsapp: "75977770003", email: "fazenda@boavista.com", endereco: { cep: "44000-000", rua: "Rod. BR-242 km 50", numero: "S/N", bairro: "Zona Rural", cidade: "Feira de Santana", uf: "BA" }, segmento: "agronegocio", origem: "prospeccao", concessionaria: "Neoenergia Coelba", grupoTarifario: "B2", consumoMedio: 5400, tarifa: 0.85, rede: "trifasico", uc: "10000003", ativo: true, criadoEm: daysAgo(60) },
  { id: "c4", nome: "Carlos Andrade", tipo: "pf", documento: "23456789012", telefone: "71966660004", whatsapp: "71966660004", email: "carlos@email.com", endereco: { cep: "40200-000", rua: "Rua Bahia", numero: "45", bairro: "Itaigara", cidade: "Salvador", uf: "BA" }, segmento: "residencial", origem: "indicacao", concessionaria: "Neoenergia Coelba", grupoTarifario: "B1", consumoMedio: 680, tarifa: 0.92, rede: "bifasico", uc: "10000004", ativo: true, criadoEm: daysAgo(20) },
  { id: "c5", nome: "Maria Helena", tipo: "pf", documento: "34567890123", telefone: "71955550005", whatsapp: "71955550005", email: "maria@email.com", endereco: { cep: "40300-000", rua: "Rua do Sol", numero: "302", bairro: "Barra", cidade: "Salvador", uf: "BA" }, segmento: "residencial", origem: "trafego", concessionaria: "Neoenergia Coelba", grupoTarifario: "B1", consumoMedio: 380, tarifa: 0.92, rede: "monofasico", uc: "10000005", ativo: true, criadoEm: daysAgo(15) },
  { id: "c6", nome: "Indústria Metalbahia", tipo: "pj", documento: "34567890000122", telefone: "71944440006", whatsapp: "71944440006", email: "compras@metalbahia.com", endereco: { cep: "43700-000", rua: "Rod. BA-093", numero: "12000", bairro: "CIA", cidade: "Simões Filho", uf: "BA" }, segmento: "industrial", origem: "prospeccao", concessionaria: "Neoenergia Coelba", grupoTarifario: "A4", consumoMedio: 12000, tarifa: 0.65, rede: "trifasico", uc: "10000006", ativo: true, criadoEm: daysAgo(70) },
  { id: "c7", nome: "Pedro Almeida", tipo: "pf", documento: "45678901234", telefone: "71933330007", whatsapp: "71933330007", email: "pedro@email.com", endereco: { cep: "40400-000", rua: "Rua Direta", numero: "88", bairro: "Brotas", cidade: "Salvador", uf: "BA" }, segmento: "residencial", origem: "reativacao", concessionaria: "Neoenergia Coelba", grupoTarifario: "B1", consumoMedio: 520, tarifa: 0.92, rede: "bifasico", uc: "10000007", ativo: true, criadoEm: daysAgo(8) },
  { id: "c8", nome: "Padaria Bom Pão", tipo: "pj", documento: "45678901000133", telefone: "71922220008", whatsapp: "71922220008", email: "bompao@email.com", endereco: { cep: "40500-000", rua: "Rua das Padarias", numero: "200", bairro: "Federação", cidade: "Salvador", uf: "BA" }, segmento: "comercial", origem: "trafego", concessionaria: "Neoenergia Coelba", grupoTarifario: "B3", consumoMedio: 1800, tarifa: 0.98, rede: "trifasico", uc: "10000008", ativo: true, criadoEm: daysAgo(12) },
  { id: "c9", nome: "Luciana Mendes", tipo: "pf", documento: "56789012345", telefone: "71911110009", whatsapp: "71911110009", email: "lu@email.com", endereco: { cep: "40600-000", rua: "Rua Verde", numero: "15", bairro: "Graça", cidade: "Salvador", uf: "BA" }, segmento: "residencial", origem: "indicacao", concessionaria: "Neoenergia Coelba", grupoTarifario: "B1", consumoMedio: 410, tarifa: 0.92, rede: "monofasico", uc: "10000009", ativo: true, criadoEm: daysAgo(5) },
  { id: "c10", nome: "Sítio Recanto Verde", tipo: "pf", documento: "67890123456", telefone: "71900000010", whatsapp: "71900000010", email: "recanto@email.com", endereco: { cep: "44100-000", rua: "Estrada do Sítio", numero: "S/N", bairro: "Rural", cidade: "Camaçari", uf: "BA" }, segmento: "agronegocio", origem: "prospeccao", concessionaria: "Neoenergia Coelba", grupoTarifario: "B2", consumoMedio: 2400, tarifa: 0.85, rede: "trifasico", uc: "10000010", ativo: true, criadoEm: daysAgo(25) },
  { id: "c11", nome: "Clínica Saúde Plus", tipo: "pj", documento: "78901234000144", telefone: "71899990011", whatsapp: "71899990011", email: "clinica@saudeplus.com", endereco: { cep: "40700-000", rua: "Av. ACM", numero: "1500", bairro: "Itaigara", cidade: "Salvador", uf: "BA" }, segmento: "comercial", origem: "trafego", concessionaria: "Neoenergia Coelba", grupoTarifario: "B3", consumoMedio: 3200, tarifa: 0.98, rede: "trifasico", uc: "10000011", ativo: true, criadoEm: daysAgo(3) },
  { id: "c12", nome: "Roberto Cavalcanti", tipo: "pf", documento: "78901234567", telefone: "71888880012", whatsapp: "71888880012", email: "roberto@email.com", endereco: { cep: "40800-000", rua: "Rua Nova", numero: "67", bairro: "Pituba", cidade: "Salvador", uf: "BA" }, segmento: "residencial", origem: "indicacao", concessionaria: "Neoenergia Coelba", grupoTarifario: "B1", consumoMedio: 590, tarifa: 0.92, rede: "bifasico", uc: "10000012", ativo: true, criadoEm: daysAgo(2) },
];

export const seedCards: PipelineCard[] = [
  { id: "k1", clienteId: "c9", stage: "prospeccao", valorEstimado: 18500, potenciaKwp: 3.3, consultorId: "u2", diasNaEtapaDesde: daysAgo(2), origem: "indicacao", criadoEm: daysAgo(5) },
  { id: "k2", clienteId: "c12", stage: "prospeccao", valorEstimado: 26000, potenciaKwp: 4.6, consultorId: "u3", diasNaEtapaDesde: daysAgo(1), origem: "indicacao", criadoEm: daysAgo(2) },
  { id: "k3", clienteId: "c11", stage: "prospeccao", valorEstimado: 145000, potenciaKwp: 24.5, consultorId: "u2", diasNaEtapaDesde: daysAgo(3), origem: "trafego", criadoEm: daysAgo(3) },
  { id: "k4", clienteId: "c5", stage: "qualificacao", valorEstimado: 17000, potenciaKwp: 3.0, consultorId: "u2", diasNaEtapaDesde: daysAgo(4), origem: "trafego", criadoEm: daysAgo(15) },
  { id: "k5", clienteId: "c8", stage: "qualificacao", valorEstimado: 78000, potenciaKwp: 13.5, consultorId: "u3", diasNaEtapaDesde: daysAgo(2), origem: "trafego", criadoEm: daysAgo(12) },
  { id: "k6", clienteId: "c4", stage: "visita", valorEstimado: 31000, potenciaKwp: 5.5, consultorId: "u2", diasNaEtapaDesde: daysAgo(3), origem: "indicacao", criadoEm: daysAgo(20) },
  { id: "k7", clienteId: "c7", stage: "visita", valorEstimado: 23000, potenciaKwp: 4.0, consultorId: "u3", diasNaEtapaDesde: daysAgo(6), origem: "reativacao", criadoEm: daysAgo(8) },
  { id: "k8", clienteId: "c10", stage: "proposta", valorEstimado: 110000, potenciaKwp: 18.0, consultorId: "u3", diasNaEtapaDesde: daysAgo(4), origem: "prospeccao", criadoEm: daysAgo(25) },
  { id: "k9", clienteId: "c1", stage: "proposta", valorEstimado: 22000, potenciaKwp: 3.85, consultorId: "u2", diasNaEtapaDesde: daysAgo(8), origem: "trafego", criadoEm: daysAgo(45) },
  { id: "k10", clienteId: "c2", stage: "negociacao", valorEstimado: 130000, potenciaKwp: 22.0, consultorId: "u3", diasNaEtapaDesde: daysAgo(5), origem: "indicacao", criadoEm: daysAgo(38) },
  { id: "k11", clienteId: "c6", stage: "negociacao", valorEstimado: 580000, potenciaKwp: 95.0, consultorId: "u2", diasNaEtapaDesde: daysAgo(11), origem: "prospeccao", criadoEm: daysAgo(70) },
  { id: "k12", clienteId: "c3", stage: "contrato", valorEstimado: 240000, potenciaKwp: 40.0, consultorId: "u3", diasNaEtapaDesde: daysAgo(2), origem: "prospeccao", criadoEm: daysAgo(60) },
  { id: "k13", clienteId: "c4", stage: "homologacao", valorEstimado: 31000, potenciaKwp: 5.5, consultorId: "u2", diasNaEtapaDesde: daysAgo(15), origem: "indicacao", criadoEm: daysAgo(50) },
  { id: "k14", clienteId: "c1", stage: "instalacao", valorEstimado: 22000, potenciaKwp: 3.85, consultorId: "u2", diasNaEtapaDesde: daysAgo(5), origem: "trafego", criadoEm: daysAgo(60) },
  { id: "k15", clienteId: "c8", stage: "ativado", valorEstimado: 65000, potenciaKwp: 11.0, consultorId: "u3", diasNaEtapaDesde: daysAgo(20), origem: "trafego", criadoEm: daysAgo(90) },
  { id: "k16", clienteId: "c5", stage: "ativado", valorEstimado: 18000, potenciaKwp: 3.2, consultorId: "u2", diasNaEtapaDesde: daysAgo(35), origem: "trafego", criadoEm: daysAgo(120) },
  { id: "k17", clienteId: "c12", stage: "perdido", valorEstimado: 24000, potenciaKwp: 4.2, consultorId: "u3", diasNaEtapaDesde: daysAgo(40), origem: "trafego", motivoPerda: "Preço acima do orçamento", criadoEm: daysAgo(90) },
  { id: "k18", clienteId: "c7", stage: "perdido", valorEstimado: 19000, potenciaKwp: 3.4, consultorId: "u2", diasNaEtapaDesde: daysAgo(60), origem: "trafego", motivoPerda: "Optou por concorrente", criadoEm: daysAgo(110) },
];

export const seedPropostas: Proposta[] = [
  { id: "pr1", numero: "VRT-2026-0001", clienteId: "c1", consultorId: "u2", criadoEm: daysAgo(10), validadeAte: daysAgo(-20), status: "enviada", itens: [{ produtoId: "p1", quantidade: 7, precoUnitario: 980 }, { produtoId: "p4", quantidade: 1, precoUnitario: 4200 }, { produtoId: "p8", quantidade: 3.85, precoUnitario: 280 }, { produtoId: "p18", quantidade: 3.85, precoUnitario: 550 }, { produtoId: "p19", quantidade: 1, precoUnitario: 980 }, { produtoId: "p20", quantidade: 1, precoUnitario: 580 }], irradiacao: 5.2, eficiencia: 0.8, cobertura: 1, inflacao: 8, taxaFinanciamento: 1.49, taxaCartao: 2.99, versao: 1 },
  { id: "pr2", numero: "VRT-2026-0002", clienteId: "c2", consultorId: "u3", criadoEm: daysAgo(7), validadeAte: daysAgo(-23), status: "negociacao", itens: [{ produtoId: "p3", quantidade: 36, precoUnitario: 1120 }, { produtoId: "p6", quantidade: 2, precoUnitario: 10200 }, { produtoId: "p9", quantidade: 22, precoUnitario: 250 }, { produtoId: "p18", quantidade: 22, precoUnitario: 550 }], irradiacao: 5.2, eficiencia: 0.8, cobertura: 1, inflacao: 8, taxaFinanciamento: 1.39, taxaCartao: 2.79, versao: 2 },
  { id: "pr3", numero: "VRT-2026-0003", clienteId: "c5", consultorId: "u2", criadoEm: daysAgo(35), validadeAte: daysAgo(5), status: "aceita", itens: [{ produtoId: "p1", quantidade: 6, precoUnitario: 980 }, { produtoId: "p4", quantidade: 1, precoUnitario: 4200 }, { produtoId: "p8", quantidade: 3.3, precoUnitario: 280 }, { produtoId: "p18", quantidade: 3.3, precoUnitario: 550 }], irradiacao: 5.2, eficiencia: 0.8, cobertura: 1, inflacao: 8, taxaFinanciamento: 1.49, taxaCartao: 2.99, versao: 1 },
  { id: "pr4", numero: "VRT-2026-0004", clienteId: "c10", consultorId: "u3", criadoEm: daysAgo(15), validadeAte: daysAgo(-15), status: "enviada", itens: [{ produtoId: "p3", quantidade: 30, precoUnitario: 1120 }, { produtoId: "p6", quantidade: 1, precoUnitario: 10200 }, { produtoId: "p7", quantidade: 1, precoUnitario: 14500 }, { produtoId: "p11", quantidade: 18, precoUnitario: 480 }, { produtoId: "p18", quantidade: 18, precoUnitario: 550 }], irradiacao: 5.4, eficiencia: 0.8, cobertura: 1, inflacao: 8, taxaFinanciamento: 1.39, taxaCartao: 2.79, versao: 1 },
  { id: "pr5", numero: "VRT-2026-0005", clienteId: "c12", consultorId: "u3", criadoEm: daysAgo(60), validadeAte: daysAgo(30), status: "expirada", itens: [{ produtoId: "p2", quantidade: 8, precoUnitario: 1040 }, { produtoId: "p4", quantidade: 1, precoUnitario: 4200 }, { produtoId: "p8", quantidade: 4.6, precoUnitario: 280 }, { produtoId: "p18", quantidade: 4.6, precoUnitario: 550 }], irradiacao: 5.2, eficiencia: 0.8, cobertura: 1, inflacao: 8, taxaFinanciamento: 1.49, taxaCartao: 2.99, versao: 1 },
  { id: "pr6", numero: "VRT-2026-0006", clienteId: "c8", consultorId: "u3", criadoEm: daysAgo(2), validadeAte: daysAgo(-28), status: "rascunho", itens: [{ produtoId: "p3", quantidade: 24, precoUnitario: 1120 }, { produtoId: "p5", quantidade: 2, precoUnitario: 6200 }, { produtoId: "p9", quantidade: 14.5, precoUnitario: 250 }, { produtoId: "p18", quantidade: 14.5, precoUnitario: 550 }], irradiacao: 5.2, eficiencia: 0.8, cobertura: 1, inflacao: 8, taxaFinanciamento: 1.39, taxaCartao: 2.79, versao: 1 },
];

export const seedAtividades: Atividade[] = [
  { id: "a1", clienteId: "c11", cardId: "k3", tipo: "ligacao", titulo: "Ligar para Clínica Saúde Plus", data: new Date().toISOString(), status: "pendente", responsavelId: "u2" },
  { id: "a2", clienteId: "c4", cardId: "k6", tipo: "visita", titulo: "Visita técnica - telhado", data: new Date(now.getTime() + 86400000).toISOString(), status: "pendente", responsavelId: "u2" },
  { id: "a3", clienteId: "c2", cardId: "k10", tipo: "followup", titulo: "Follow-up proposta Restaurante", data: new Date().toISOString(), status: "pendente", responsavelId: "u3" },
  { id: "a4", clienteId: "c1", cardId: "k14", tipo: "instalacao", titulo: "Instalação Joana Pereira", data: new Date(now.getTime() + 2 * 86400000).toISOString(), status: "pendente", responsavelId: "u4" },
  { id: "a5", clienteId: "c3", cardId: "k12", tipo: "reuniao", titulo: "Assinatura de contrato Fazenda", data: new Date(now.getTime() + 86400000).toISOString(), status: "pendente", responsavelId: "u3" },
];

export const seedInteracoes: Interacao[] = [
  { id: "i1", clienteId: "c1", tipo: "ligacao", titulo: "Primeiro contato", descricao: "Cliente interessada, mora em casa própria", data: daysAgo(45) },
  { id: "i2", clienteId: "c1", tipo: "visita", titulo: "Visita técnica realizada", descricao: "Telhado colonial, boa orientação norte", data: daysAgo(40) },
  { id: "i3", clienteId: "c1", tipo: "proposta", titulo: "Proposta VRT-2026-0001 enviada", descricao: "Sistema 3,85 kWp", data: daysAgo(10) },
  { id: "i4", clienteId: "c1", tipo: "etapa", titulo: "Movido para Em Instalação", data: daysAgo(5) },
];
