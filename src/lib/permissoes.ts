import { useAuth, type AppRole } from "./auth";
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
  | "ver_financeiro"
  | "mover_card"
  | "exportar_pdf"
  | "ver_margem";

const MATRIZ: Record<UsuarioPerfil, Acao[]> = {
  admin: [
    "ver_dashboard", "ver_pipeline", "ver_clientes", "editar_cliente",
    "ver_propostas", "criar_proposta", "ver_produtos", "editar_produto",
    "ver_agenda", "ver_relatorios", "ver_configuracoes", "ver_financeiro",
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

// Mapeia papéis do banco (app_role) para perfis usados na UI legada.
// admin/gestor → admin; consultor → consultor; tecnico → instalador.
function rolesParaPerfil(roles: AppRole[]): UsuarioPerfil {
  if (roles.includes("admin") || roles.includes("gestor")) return "admin";
  if (roles.includes("consultor")) return "consultor";
  if (roles.includes("tecnico")) return "instalador";
  return "consultor";
}

export function usePerfil(): UsuarioPerfil {
  const { roles } = useAuth();
  return rolesParaPerfil(roles);
}

export function usePode(acao: Acao): boolean {
  const perfil = usePerfil();
  return MATRIZ[perfil].includes(acao);
}

export function podeAcao(perfil: UsuarioPerfil, acao: Acao): boolean {
  return MATRIZ[perfil].includes(acao);
}
