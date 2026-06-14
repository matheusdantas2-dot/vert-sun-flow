import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Kanban,
  Users,
  FileText,
  Package,
  Calendar,
  BarChart3,
  Wallet,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { usePerfil, podeAcao, type Acao } from "@/lib/permissoes";

const items: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; acao: Acao }[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", acao: "ver_dashboard" },
  { to: "/pipeline", icon: Kanban, label: "Pipeline", acao: "ver_pipeline" },
  { to: "/clientes", icon: Users, label: "Clientes", acao: "ver_clientes" },
  { to: "/propostas", icon: FileText, label: "Propostas", acao: "ver_propostas" },
  { to: "/produtos", icon: Package, label: "Produtos", acao: "ver_produtos" },
  { to: "/agenda", icon: Calendar, label: "Agenda", acao: "ver_agenda" },
  { to: "/relatorios", icon: BarChart3, label: "Relatórios", acao: "ver_relatorios" },
  { to: "/financeiro", icon: Wallet, label: "Financeiro", acao: "ver_financeiro" },
  { to: "/configuracoes", icon: Settings, label: "Configurações", acao: "ver_configuracoes" },
];

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const perfil = usePerfil();

  const isActive = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));
  const itensVisiveis = items.filter((i) => podeAcao(perfil, i.acao));

  return (
    <>
      <button
        className="fixed top-3 left-3 z-50 lg:hidden bg-sidebar text-sidebar-foreground p-2 rounded-lg shadow"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Menu"
      >
        <Kanban className="h-5 w-5" />
      </button>

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border z-40 transition-all duration-200",
          collapsed ? "w-[68px]" : "w-[232px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className={cn("flex items-center gap-2 px-4 py-5 border-b border-sidebar-border", collapsed && "justify-center px-2")}>
          <div className="w-9 h-9 rounded-lg bg-vert-glow flex items-center justify-center text-vert-dark font-bold shrink-0">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          {!collapsed && (
            <div className="font-display font-extrabold text-[19px] tracking-tight leading-none">
              VertCRM
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {itensVisiveis.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  collapsed && "justify-center px-0",
                )}
                title={collapsed ? item.label : undefined}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-vert-glow" />
                )}
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-sidebar-foreground/50 border-t border-sidebar-border">
            Perfil ativo: <span className="text-vert-glow font-bold">{perfil}</span>
          </div>
        )}

        <button
          onClick={onToggle}
          className="hidden lg:flex items-center justify-center px-3 py-3 border-t border-sidebar-border text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 text-xs font-medium gap-2"
        >
          {collapsed ? "→" : "← Recolher"}
        </button>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
