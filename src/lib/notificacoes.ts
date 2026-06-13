// Centro de notificações persistido em localStorage + helper para emitir toast (sonner)
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { toast } from "sonner";
import { uid } from "./format";

export type NotificacaoTipo = "info" | "success" | "warning" | "error";

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem?: string;
  tipo: NotificacaoTipo;
  criadoEm: string;
  lida: boolean;
  link?: string;
}

interface State {
  itens: Notificacao[];
  dispensados: string[]; // ids de alertas virtuais (SLA/propostas/visitas) marcados como concluídos
  push: (n: Omit<Notificacao, "id" | "criadoEm" | "lida"> & { silent?: boolean }) => void;
  marcarTodasLidas: () => void;
  marcarLida: (id: string) => void;
  limpar: () => void;
  dispensar: (id: string) => void;
  restaurarDispensados: () => void;
}

export const useNotificacoes = create<State>()(
  persist(
    (set) => ({
      itens: [],
      dispensados: [],
      push: ({ silent, ...n }) => {
        const item: Notificacao = {
          id: uid(),
          criadoEm: new Date().toISOString(),
          lida: false,
          ...n,
        };
        set((s) => ({ itens: [item, ...s.itens].slice(0, 50) }));
        if (!silent) {
          const fn = n.tipo === "error" ? toast.error
            : n.tipo === "success" ? toast.success
            : n.tipo === "warning" ? toast.warning
            : toast.info;
          fn(n.titulo, n.mensagem ? { description: n.mensagem } : undefined);
        }
      },
      marcarTodasLidas: () => set((s) => ({ itens: s.itens.map((i) => ({ ...i, lida: true })) })),
      marcarLida: (id) => set((s) => ({ itens: s.itens.map((i) => i.id === id ? { ...i, lida: true } : i) })),
      limpar: () => set({ itens: [] }),
      dispensar: (id) => set((s) => s.dispensados.includes(id) ? s : ({ dispensados: [...s.dispensados, id], itens: s.itens.map((i) => i.id === id ? { ...i, lida: true } : i) })),
      restaurarDispensados: () => set({ dispensados: [] }),
    }),
    {
      name: "vert-notificacoes",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as unknown as Storage))),
      partialize: (s) => ({ itens: s.itens, dispensados: s.dispensados }),
    },
  ),
);

// Atalhos
export const notify = {
  info: (titulo: string, mensagem?: string) => useNotificacoes.getState().push({ tipo: "info", titulo, mensagem }),
  success: (titulo: string, mensagem?: string) => useNotificacoes.getState().push({ tipo: "success", titulo, mensagem }),
  warning: (titulo: string, mensagem?: string) => useNotificacoes.getState().push({ tipo: "warning", titulo, mensagem }),
  error: (titulo: string, mensagem?: string) => useNotificacoes.getState().push({ tipo: "error", titulo, mensagem }),
};
