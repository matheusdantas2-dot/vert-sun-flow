import { useStore } from "./store";
import type { UsuarioPerfil } from "./types";

export type Acao =
  | "ver_dashboard"
  | "ver_pipeline"
  | "ver_clientes"
  | "editar_cliente"
  | "ver_propostas"
  | "criar_proposta"
  | "ver_produtos"
  | "editar_produto"
  | "ver_agenda"
  | "ver_relatorios"
  | "ver_configuracoes"
  | "mover_card"
  | "exportar_pdf"
  | "ver_margem";

const MATRIZ: Record<UsuarioPerfil, Acao[]> = {
  admin: [
    "ver_dashboard", "ver_pipeline", "ver_clientes", "editar_cliente",
    "ver_propostas", "criar_proposta", "ver_produtos", "editar_produto",
    "ver_agenda", "ver_relatorios", "ver_configuracoes",
    "mover_card", "exportar_pdf", "ver_margem",
  ],
  consultor: [
    "ver_dashboard", "ver_pipeline", "ver_clientes", "editar_cliente",
    "ver_propostas", "criar_proposta", "ver_produtos",
    "ver_agenda", "ver_relatorios",
    "mover_card", "exportar_pdf",
  ],
  instalador: [
    "ver_pipeline", "ver_clientes", "ver_agenda",
  ],
};

export function usePerfil(): UsuarioPerfil {
  return useStore((s) => s.usuarios.find((u) => u.id === s.currentUserId)?.perfil ?? "admin");
}

export function usePode(acao: Acao): boolean {
  const perfil = usePerfil();
  return MATRIZ[perfil].includes(acao);
}

export function podeAcao(perfil: UsuarioPerfil, acao: Acao): boolean {
  return MATRIZ[perfil].includes(acao);
}
