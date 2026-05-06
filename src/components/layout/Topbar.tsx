import { Bell, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { initials } from "@/lib/format";

export function Topbar() {
  const [q, setQ] = useState("");
  const clientes = useStore((s) => s.clientes);
  const usuario = useStore((s) => s.usuarios.find((u) => u.id === s.currentUserId));
  const cards = useStore((s) => s.cards);
  const sla = useStore((s) => s.sla);

  const alertasCount = useMemo(() => {
    return cards.filter((c) => {
      if (c.stage === "ativado" || c.stage === "perdido") return false;
      const limite = sla[c.stage] ?? 999;
      const dias = Math.floor((Date.now() - new Date(c.diasNaEtapaDesde).getTime()) / 86400000);
      return dias > limite;
    }).length;
  }, [cards, sla]);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const s = q.toLowerCase();
    return clientes
      .filter((c) => c.nome.toLowerCase().includes(s) || c.endereco.cidade.toLowerCase().includes(s))
      .slice(0, 6);
  }, [q, clientes]);

  return (
    <header className="sticky top-0 z-20 bg-card/80 backdrop-blur border-b border-border">
      <div className="flex items-center gap-3 px-4 lg:px-6 h-[60px]">
        <div className="relative flex-1 max-w-xl ml-12 lg:ml-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente, cidade…"
            className="w-full h-10 pl-10 pr-3 rounded-lg bg-muted text-sm border border-transparent focus:border-primary focus:bg-card outline-none transition"
          />
          {results.length > 0 && (
            <div className="absolute top-12 left-0 right-0 bg-card border border-border rounded-lg shadow-xl py-1 z-30">
              {results.map((c) => (
                <Link
                  key={c.id}
                  to="/clientes/$id"
                  params={{ id: c.id }}
                  onClick={() => setQ("")}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-accent text-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-vert-soft text-vert-dark flex items-center justify-center text-xs font-bold">
                    {initials(c.nome)}
                  </div>
                  <div>
                    <div className="font-medium">{c.nome}</div>
                    <div className="text-xs text-muted-foreground">{c.endereco.cidade}/{c.endereco.uf}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <button className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {alertasCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {alertasCount}
            </span>
          )}
        </button>

        {usuario && (
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: usuario.cor }}
            >
              {initials(usuario.nome)}
            </div>
            <div className="hidden md:block leading-tight">
              <div className="text-sm font-semibold">{usuario.nome}</div>
              <div className="text-[11px] text-muted-foreground capitalize">{usuario.perfil}</div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
