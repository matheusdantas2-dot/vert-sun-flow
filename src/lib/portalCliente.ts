import type { Cliente, EtapaProjeto, EtapaProjetoId, ProjetoCliente, Usuario } from "./types";

export const ETAPAS_INFO: Record<
  EtapaProjetoId,
  { titulo: string; descricaoCliente: (extra?: any) => string; icone: string }
> = {
  contrato: {
    titulo: "Contrato Assinado",
    descricaoCliente: () => "Seu contrato foi assinado e o projeto está oficialmente iniciado.",
    icone: "✅",
  },
  compra: {
    titulo: "Compra do Material",
    descricaoCliente: () =>
      "Estamos adquirindo os equipamentos do seu sistema solar: módulos fotovoltaicos, inversor, estrutura e materiais elétricos.",
    icone: "🛒",
  },
  homologacao: {
    titulo: "Homologação na Concessionária",
    descricaoCliente: (extra) =>
      `Enviamos o projeto técnico para aprovação junto à ${extra?.concessionariaNome || "concessionária"}. Esse processo é necessário para conectar seu sistema à rede elétrica.`,
    icone: "⚡",
  },
  agendamento: {
    titulo: "Agendamento da Instalação",
    descricaoCliente: () =>
      "Nossa equipe técnica entrará em contato para confirmar a data de instalação.",
    icone: "📅",
  },
  instalacao: {
    titulo: "Instalação do Sistema",
    descricaoCliente: () =>
      "Nossa equipe realizou a instalação dos painéis solares, inversor e toda a infraestrutura elétrica no seu imóvel.",
    icone: "🔧",
  },
  ativacao: {
    titulo: "Ativação e Conexão à Rede",
    descricaoCliente: () =>
      "A concessionária liberou a conexão do seu sistema à rede elétrica. Seu sistema está gerando energia!",
    icone: "🌞",
  },
  posvenda: {
    titulo: "Pós-venda e Suporte",
    descricaoCliente: () =>
      "Seu sistema está em plena operação. Estamos à disposição para qualquer dúvida ou manutenção preventiva.",
    icone: "🌱",
  },
};

export const ETAPA_ORDEM: EtapaProjetoId[] = [
  "contrato",
  "compra",
  "homologacao",
  "agendamento",
  "instalacao",
  "ativacao",
  "posvenda",
];

export function etapasIniciais(concessionariaNome?: string): EtapaProjeto[] {
  const hoje = new Date().toISOString();
  return ETAPA_ORDEM.map((id, idx) => ({
    id,
    status: idx === 0 ? "concluida" : idx === 1 ? "em_andamento" : "pendente",
    dataReal: idx === 0 ? hoje : undefined,
    extra: id === "homologacao" ? { concessionariaNome: concessionariaNome ?? "" } : {},
  }));
}

export function progressoProjeto(p: ProjetoCliente) {
  const total = p.etapas.length;
  const concluidas = p.etapas.filter((e) => e.status === "concluida").length;
  return { concluidas, total, pct: Math.round((concluidas / total) * 100) };
}

export function urlPortal(token: string) {
  if (typeof window === "undefined") return `/cliente/acompanhamento/${token}`;
  return `${window.location.origin}/cliente/acompanhamento/${token}`;
}

export function mensagemWhatsAppInicial(cliente: Cliente, link: string, consultor?: Usuario) {
  return `Olá ${cliente.nome}! 👋\n\nSeu projeto solar com a *Vert Energie* está confirmado! 🌱⚡\n\nAcesse o link abaixo para acompanhar cada etapa do seu projeto em tempo real:\n\n👉 ${link}\n\nQualquer dúvida, estou à disposição!\n${consultor?.nome ?? "Equipe Vert Energie"} — Vert Energie`;
}

export function mensagemWhatsAppAtualizacao(cliente: Cliente, link: string, consultor?: Usuario) {
  return `Olá ${cliente.nome}! 👋\n\nSeu projeto solar com a *Vert Energie* teve uma atualização! 🌱⚡\n\nConfira o andamento em tempo real:\n\n👉 ${link}\n\nQualquer dúvida, estou à disposição!\n${consultor?.nome ?? "Equipe Vert Energie"} — Vert Energie`;
}

export function whatsappLink(telefone: string, mensagem: string) {
  const tel = telefone.replace(/\D/g, "");
  return `https://wa.me/55${tel}?text=${encodeURIComponent(mensagem)}`;
}
