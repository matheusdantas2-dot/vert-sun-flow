import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Kanban,
  Users,
  FileText,
  Package,
  Calendar,
  BarChart3,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const items = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/pipeline", icon: Kanban, label: "Pipeline" },
  { to: "/clientes", icon: Users, label: "Clientes" },
  { to: "/propostas", icon: FileText, label: "Propostas" },
  { to: "/produtos", icon: Package, label: "Produtos" },
  { to: "/agenda", icon: Calendar, label: "Agenda" },
  { to: "/relatorios", icon: BarChart3, label: "Relatórios" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
];

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));

  return (
    <>
      {/* Mobile toggle */}
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
        {/* Logo */}
        <div className={cn("flex items-center gap-2 px-4 py-5 border-b border-sidebar-border", collapsed && "justify-center px-2")}>
          <div className="w-9 h-9 rounded-lg bg-vert-glow flex items-center justify-center text-vert-dark font-bold shrink-0">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          {!collapsed && (
            <div className="font-display font-extrabold text-[19px] tracking-tight leading-none">
              vert.<span className="text-vert-glow">energie</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {items.map((item) => {
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

        {/* Footer collapse btn */}
        <button
          onClick={onToggle}
          className="hidden lg:flex items-center justify-center px-3 py-3 border-t border-sidebar-border text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 text-xs font-medium gap-2"
        >
          {collapsed ? "→" : "← Recolher"}
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
