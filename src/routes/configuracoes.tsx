import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { STAGES } from "@/lib/types";
import { Plus, Trash2, Loader2, UserPlus } from "lucide-react";
import { useConfigGlobalQuery, useUpdateConfigGlobal } from "@/lib/config.api";
import {
  useMotivosPerdaQuery,
  useAddMotivoPerda,
  useRemoveMotivoPerda,
} from "@/lib/motivosPerda.api";
import {
  useProfilesWithRolesQuery,
  useUpdateProfile,
  useSetUserRole,
  useInviteUser,
} from "@/lib/profiles.api";
import { useAuth, type AppRole } from "@/lib/auth";
import { toast } from "sonner";

const ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "gestor", label: "Gestor" },
  { value: "consultor", label: "Consultor" },
  { value: "tecnico", label: "Técnico" },
];

export const Route = createFileRoute("/configuracoes")({
  component: Configuracoes,
  head: () => ({ meta: [{ title: "Configurações — Vert CRM" }] }),
});

function Configuracoes() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const cfgQuery = useConfigGlobalQuery();
  const updateCfg = useUpdateConfigGlobal();

  const motivosQuery = useMotivosPerdaQuery();
  const addMotivo = useAddMotivoPerda();
  const removeMotivo = useRemoveMotivoPerda();

  const profilesQuery = useProfilesWithRolesQuery();
  const updateProfile = useUpdateProfile();
  const setRole = useSetUserRole();
  const inviteUser = useInviteUser();

  const [novoMotivo, setNovoMotivo] = useState("");
  const [empresa, setEmpresa] = useState({ razaoSocial: "", cnpj: "", endereco: "", telefone: "", email: "" });
  const [metas, setMetas] = useState({ faturamentoMensal: 0, propostasMensais: 0, projetosMensais: 0, kwpMensais: 0 });
  const [sla, setSla] = useState<Record<string, number>>({});

  const [convite, setConvite] = useState({ open: false, nome: "", email: "", senha: "", role: "consultor" as AppRole });

  useEffect(() => {
    if (!cfgQuery.data) return;
    setEmpresa((p) => ({ ...p, ...cfgQuery.data.empresa }));
    setMetas((p) => ({ ...p, ...cfgQuery.data.metas }));
    setSla(cfgQuery.data.sla);
  }, [cfgQuery.data]);

  const inp = "w-full h-9 px-3 rounded-lg bg-muted border border-transparent focus:bg-card focus:border-vert-light text-sm outline-none";

  const salvarEmpresa = () => {
    updateCfg.mutate({ empresa }, { onSuccess: () => toast.success("Dados da empresa salvos") });
  };
  const salvarMetas = () => {
    updateCfg.mutate({ metas }, { onSuccess: () => toast.success("Metas atualizadas") });
  };
  const salvarSla = () => {
    updateCfg.mutate({ sla }, { onSuccess: () => toast.success("SLA atualizado") });
  };

  const handleInvite = () => {
    if (!convite.nome || !convite.email || convite.senha.length < 6) {
      toast.error("Preencha nome, e-mail e senha (mín. 6 caracteres)");
      return;
    }
    inviteUser.mutate(
      { nome: convite.nome, email: convite.email, password: convite.senha, role: convite.role },
      {
        onSuccess: () => {
          toast.success("Usuário criado com sucesso");
          setConvite({ open: false, nome: "", email: "", senha: "", role: "consultor" });
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1100px] mx-auto">
      <header>
        <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Empresa, equipe, metas e SLA</p>
      </header>

      {/* Empresa */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-base">Dados da empresa</h2>
          <button
            disabled={!isAdmin || updateCfg.isPending}
            onClick={salvarEmpresa}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block text-xs">Razão social
            <input className={inp + " mt-1"} value={empresa.razaoSocial} onChange={(e) => setEmpresa({ ...empresa, razaoSocial: e.target.value })} disabled={!isAdmin} />
          </label>
          <label className="block text-xs">CNPJ
            <input className={inp + " mt-1"} value={empresa.cnpj} onChange={(e) => setEmpresa({ ...empresa, cnpj: e.target.value })} disabled={!isAdmin} />
          </label>
          <label className="block text-xs md:col-span-2">Endereço
            <input className={inp + " mt-1"} value={empresa.endereco} onChange={(e) => setEmpresa({ ...empresa, endereco: e.target.value })} disabled={!isAdmin} />
          </label>
          <label className="block text-xs">Telefone
            <input className={inp + " mt-1"} value={empresa.telefone} onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })} disabled={!isAdmin} />
          </label>
          <label className="block text-xs">E-mail
            <input className={inp + " mt-1"} value={empresa.email} onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })} disabled={!isAdmin} />
          </label>
        </div>
      </div>

      {/* Equipe */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-base">Equipe</h2>
          {isAdmin && (
            <button
              onClick={() => setConvite({ ...convite, open: true })}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
            >
              <UserPlus className="h-3.5 w-3.5" /> Novo usuário
            </button>
          )}
        </div>

        {profilesQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        ) : (
          <div className="space-y-2">
            {(profilesQuery.data ?? []).map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-border">
                <input
                  type="color"
                  value={u.cor}
                  disabled={!isAdmin}
                  onChange={(e) => updateProfile.mutate({ id: u.id, patch: { cor: e.target.value } })}
                  className="w-9 h-9 rounded cursor-pointer disabled:opacity-50"
                />
                <input
                  defaultValue={u.nome}
                  disabled={!isAdmin}
                  onBlur={(e) => {
                    if (e.target.value !== u.nome) updateProfile.mutate({ id: u.id, patch: { nome: e.target.value } });
                  }}
                  className={inp + " flex-1 min-w-[160px]"}
                />
                <span className={inp + " flex-1 min-w-[180px] flex items-center text-muted-foreground"}>{u.email}</span>
                <div className="flex flex-wrap gap-1">
                  {ROLES.map((r) => {
                    const active = u.roles.includes(r.value);
                    return (
                      <button
                        key={r.value}
                        disabled={!isAdmin || setRole.isPending}
                        onClick={() => setRole.mutate({ userId: u.id, role: r.value, enabled: !active })}
                        className={
                          "px-2 py-1 rounded text-[11px] font-semibold border transition " +
                          (active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-transparent hover:border-border")
                        }
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
                <button
                  disabled={!isAdmin}
                  onClick={() => updateProfile.mutate({ id: u.id, patch: { ativo: !u.ativo } })}
                  className={
                    "px-2 py-1 rounded text-[11px] font-semibold " +
                    (u.ativo ? "bg-green-100 text-green-800" : "bg-rose-100 text-rose-800")
                  }
                >
                  {u.ativo ? "Ativo" : "Inativo"}
                </button>
              </div>
            ))}
          </div>
        )}

        {convite.open && (
          <div className="mt-4 p-4 rounded-lg border border-vert-light/40 bg-vert-light/10 space-y-3">
            <h3 className="font-semibold text-sm">Convidar novo usuário</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input className={inp} placeholder="Nome" value={convite.nome} onChange={(e) => setConvite({ ...convite, nome: e.target.value })} />
              <input className={inp} placeholder="E-mail" type="email" value={convite.email} onChange={(e) => setConvite({ ...convite, email: e.target.value })} />
              <input className={inp} placeholder="Senha temporária" type="text" value={convite.senha} onChange={(e) => setConvite({ ...convite, senha: e.target.value })} />
              <select className={inp} value={convite.role} onChange={(e) => setConvite({ ...convite, role: e.target.value as AppRole })}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConvite({ ...convite, open: false })} className="px-3 py-1.5 rounded-lg text-sm">Cancelar</button>
              <button
                disabled={inviteUser.isPending}
                onClick={handleInvite}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
              >
                {inviteUser.isPending ? "Criando…" : "Criar usuário"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metas e SLA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-base">Metas mensais</h2>
            <button disabled={!isAdmin || updateCfg.isPending} onClick={salvarMetas} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50">Salvar</button>
          </div>
          <div className="space-y-3">
            <label className="block text-xs">Faturamento (R$)
              <input type="number" disabled={!isAdmin} className={inp + " mt-1"} value={metas.faturamentoMensal} onChange={(e) => setMetas({ ...metas, faturamentoMensal: +e.target.value })} />
            </label>
            <label className="block text-xs">Propostas geradas
              <input type="number" disabled={!isAdmin} className={inp + " mt-1"} value={metas.propostasMensais} onChange={(e) => setMetas({ ...metas, propostasMensais: +e.target.value })} />
            </label>
            <label className="block text-xs">Projetos instalados
              <input type="number" disabled={!isAdmin} className={inp + " mt-1"} value={metas.projetosMensais} onChange={(e) => setMetas({ ...metas, projetosMensais: +e.target.value })} />
            </label>
            <label className="block text-xs">kWp instalados
              <input type="number" disabled={!isAdmin} className={inp + " mt-1"} value={metas.kwpMensais} onChange={(e) => setMetas({ ...metas, kwpMensais: +e.target.value })} />
            </label>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-base">SLA por etapa (dias)</h2>
            <button disabled={!isAdmin || updateCfg.isPending} onClick={salvarSla} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50">Salvar</button>
          </div>
          <div className="space-y-2">
            {STAGES.filter((s) => s.id !== "ativado" && s.id !== "perdido").map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.cor }} />
                <span className="flex-1 text-sm">{s.nome}</span>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={sla[s.id] ?? 0}
                  onChange={(e) => setSla({ ...sla, [s.id]: +e.target.value })}
                  className="w-20 h-8 px-2 rounded bg-muted text-sm text-right outline-none border border-transparent focus:border-vert-light"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Motivos de perda */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-base mb-3">Motivos de perda</h2>
        {motivosQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            {(motivosQuery.data ?? []).map((m) => (
              <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg border border-border">
                <span className="text-sm flex-1">{m.texto}</span>
                {isAdmin && (
                  <button onClick={() => removeMotivo.mutate(m.id)} className="text-rose-600 hover:text-rose-700">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {isAdmin && (
          <div className="flex gap-2">
            <input value={novoMotivo} onChange={(e) => setNovoMotivo(e.target.value)} placeholder="Novo motivo de perda…" className={inp} />
            <button
              disabled={addMotivo.isPending}
              onClick={() => {
                const t = novoMotivo.trim();
                if (!t) return;
                addMotivo.mutate(t, { onSuccess: () => setNovoMotivo("") });
              }}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold whitespace-nowrap inline-flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </div>
        )}
      </div>

      {!isAdmin && (
        <p className="text-xs text-muted-foreground text-center">
          Apenas administradores podem alterar estas configurações.
        </p>
      )}
    </div>
  );
}
