import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  StageId,
  ProjetoCliente,
  EtapaProjeto,
  EtapaProjetoId,
} from "./types";
import {
  seedClientes,
  seedCards,
  seedProdutos,
  seedPropostas,
  seedUsuarios,
  seedAtividades,
  seedMotivosPerda,
  seedEmpresa,
  seedMetas,
  seedSla,
  seedInteracoes,
} from "./seed";
import { uid } from "./format";
import { etapasIniciais } from "./portalCliente";

interface State {
  clientes: Cliente[];
  cards: PipelineCard[];
  produtos: Produto[];
  propostas: Proposta[];
  usuarios: Usuario[];
  atividades: Atividade[];
  interacoes: Interacao[];
  motivosPerda: MotivoPerda[];
  empresa: Empresa;
  metas: Metas;
  sla: SlaConfig;
  projetos: ProjetoCliente[];
  currentUserId: string;

  // actions
  addCliente: (c: Omit<Cliente, "id" | "criadoEm">) => Cliente;
  updateCliente: (id: string, patch: Partial<Cliente>) => void;
  deleteCliente: (id: string) => void;

  addCard: (c: Omit<PipelineCard, "id" | "criadoEm" | "diasNaEtapaDesde">) => PipelineCard;
  moveCard: (id: string, stage: StageId, motivoPerda?: string) => void;
  updateCard: (id: string, patch: Partial<PipelineCard>) => void;
  deleteCard: (id: string) => void;

  addProduto: (p: Omit<Produto, "id">) => void;
  updateProduto: (id: string, patch: Partial<Produto>) => void;
  deleteProduto: (id: string) => void;

  addProposta: (p: Omit<Proposta, "id" | "criadoEm" | "numero" | "versao">) => Proposta;
  updateProposta: (id: string, patch: Partial<Proposta>) => void;
  deleteProposta: (id: string) => void;
  aceitarProposta: (id: string) => void;

  addInteracao: (i: Omit<Interacao, "id">) => void;

  addAtividade: (a: Omit<Atividade, "id">) => void;
  updateAtividade: (id: string, patch: Partial<Atividade>) => void;
  deleteAtividade: (id: string) => void;

  addUsuario: (u: Omit<Usuario, "id">) => void;
  updateUsuario: (id: string, patch: Partial<Usuario>) => void;
  deleteUsuario: (id: string) => void;

  setEmpresa: (e: Partial<Empresa>) => void;
  setMetas: (m: Partial<Metas>) => void;
  setSla: (s: Partial<SlaConfig>) => void;
  addMotivoPerda: (texto: string) => void;
  removeMotivoPerda: (id: string) => void;

  setCurrentUser: (id: string) => void;
  resetData: () => void;

  criarProjetoCliente: (cardId: string) => ProjetoCliente | null;
  getProjetoByCard: (cardId: string) => ProjetoCliente | undefined;
  getProjetoByToken: (token: string) => ProjetoCliente | undefined;
  updateEtapaProjeto: (projetoId: string, etapaId: EtapaProjetoId, patch: Partial<EtapaProjeto>) => void;
}

const initialState = {
  clientes: seedClientes,
  cards: seedCards,
  produtos: seedProdutos,
  propostas: seedPropostas,
  usuarios: seedUsuarios,
  atividades: seedAtividades,
  interacoes: seedInteracoes,
  motivosPerda: seedMotivosPerda,
  empresa: seedEmpresa,
  metas: seedMetas,
  sla: seedSla,
  currentUserId: "u1",
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initialState,

      addCliente: (c) => {
        const novo: Cliente = { ...c, id: uid(), criadoEm: new Date().toISOString() };
        set((s) => ({ clientes: [novo, ...s.clientes] }));
        return novo;
      },
      updateCliente: (id, patch) =>
        set((s) => ({ clientes: s.clientes.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCliente: (id) =>
        set((s) => ({
          clientes: s.clientes.filter((c) => c.id !== id),
          cards: s.cards.filter((k) => k.clienteId !== id),
        })),

      addCard: (c) => {
        const now = new Date().toISOString();
        const novo: PipelineCard = { ...c, id: uid(), criadoEm: now, diasNaEtapaDesde: now };
        set((s) => ({ cards: [novo, ...s.cards] }));
        return novo;
      },
      moveCard: (id, stage, motivoPerda) => {
        const now = new Date().toISOString();
        const card = get().cards.find((c) => c.id === id);
        if (!card) return;
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === id ? { ...c, stage, diasNaEtapaDesde: now, motivoPerda: stage === "perdido" ? motivoPerda : c.motivoPerda } : c,
          ),
          interacoes: [
            { id: uid(), clienteId: card.clienteId, tipo: "etapa", titulo: `Movido para ${stage}`, data: now },
            ...s.interacoes,
          ],
        }));
      },
      updateCard: (id, patch) =>
        set((s) => ({ cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCard: (id) => set((s) => ({ cards: s.cards.filter((c) => c.id !== id) })),

      addProduto: (p) => set((s) => ({ produtos: [{ ...p, id: uid() }, ...s.produtos] })),
      updateProduto: (id, patch) =>
        set((s) => ({ produtos: s.produtos.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deleteProduto: (id) => set((s) => ({ produtos: s.produtos.filter((p) => p.id !== id) })),

      addProposta: (p) => {
        const ano = new Date().getFullYear();
        const seq = (get().propostas.length + 1).toString().padStart(4, "0");
        const novo: Proposta = {
          ...p,
          id: uid(),
          numero: `VRT-${ano}-${seq}`,
          criadoEm: new Date().toISOString(),
          versao: 1,
        };
        set((s) => ({
          propostas: [novo, ...s.propostas],
          interacoes: [
            { id: uid(), clienteId: novo.clienteId, tipo: "proposta", titulo: `Proposta ${novo.numero} criada`, data: novo.criadoEm },
            ...s.interacoes,
          ],
        }));
        return novo;
      },
      updateProposta: (id, patch) =>
        set((s) => ({ propostas: s.propostas.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deleteProposta: (id) => set((s) => ({ propostas: s.propostas.filter((p) => p.id !== id) })),
      aceitarProposta: (id) => {
        const prop = get().propostas.find((p) => p.id === id);
        if (!prop) return;
        set((s) => ({
          propostas: s.propostas.map((p) => (p.id === id ? { ...p, status: "aceita" as const } : p)),
        }));
        // mover card do cliente para "contrato"
        const card = get().cards.find((c) => c.clienteId === prop.clienteId && c.stage !== "ativado" && c.stage !== "perdido");
        if (card) get().moveCard(card.id, "contrato");
      },

      addInteracao: (i) => set((s) => ({ interacoes: [{ ...i, id: uid() }, ...s.interacoes] })),

      addAtividade: (a) => set((s) => ({ atividades: [{ ...a, id: uid() }, ...s.atividades] })),
      updateAtividade: (id, patch) =>
        set((s) => ({ atividades: s.atividades.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      deleteAtividade: (id) => set((s) => ({ atividades: s.atividades.filter((a) => a.id !== id) })),

      addUsuario: (u) => set((s) => ({ usuarios: [...s.usuarios, { ...u, id: uid() }] })),
      updateUsuario: (id, patch) =>
        set((s) => ({ usuarios: s.usuarios.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
      deleteUsuario: (id) => set((s) => ({ usuarios: s.usuarios.filter((u) => u.id !== id) })),

      setEmpresa: (e) => set((s) => ({ empresa: { ...s.empresa, ...e } })),
      setMetas: (m) => set((s) => ({ metas: { ...s.metas, ...m } })),
      setSla: (sla) => set((s) => ({ sla: { ...s.sla, ...sla } as SlaConfig })),
      addMotivoPerda: (texto) => set((s) => ({ motivosPerda: [...s.motivosPerda, { id: uid(), texto }] })),
      removeMotivoPerda: (id) => set((s) => ({ motivosPerda: s.motivosPerda.filter((m) => m.id !== id) })),

      setCurrentUser: (id) => set({ currentUserId: id }),
      resetData: () => set({ ...initialState }),
    }),
    { name: "vert-crm-v1" },
  ),
);

// Selectors helpers
export const useCliente = (id?: string) => useStore((s) => (id ? s.clientes.find((c) => c.id === id) : undefined));
export const useUsuario = (id?: string) => useStore((s) => (id ? s.usuarios.find((u) => u.id === id) : undefined));
export const useProduto = (id?: string) => useStore((s) => (id ? s.produtos.find((p) => p.id === id) : undefined));
