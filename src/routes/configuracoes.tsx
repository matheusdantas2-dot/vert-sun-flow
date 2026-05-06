import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useState } from "react";
import { STAGES } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  component: Configuracoes,
  head: () => ({ meta: [{ title: "Configurações — Vert CRM" }] }),
});

function Configuracoes() {
  const empresa = useStore((s) => s.empresa);
  const setEmpresa = useStore((s) => s.setEmpresa);
  const metas = useStore((s) => s.metas);
  const setMetas = useStore((s) => s.setMetas);
  const sla = useStore((s) => s.sla);
  const setSla = useStore((s) => s.setSla);
  const motivos = useStore((s) => s.motivosPerda);
  const addMotivo = useStore((s) => s.addMotivoPerda);
  const removeMotivo = useStore((s) => s.removeMotivoPerda);
  const usuarios = useStore((s) => s.usuarios);
  const addUsuario = useStore((s) => s.addUsuario);
  const updateUsuario = useStore((s) => s.updateUsuario);
  const deleteUsuario = useStore((s) => s.deleteUsuario);
  const resetData = useStore((s) => s.resetData);

  const [novoMotivo, setNovoMotivo] = useState("");
  const inp = "w-full h-9 px-3 rounded-lg bg-muted border border-transparent focus:bg-card focus:border-vert-light text-sm outline-none";

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1100px] mx-auto">
      <header>
        <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Empresa, equipe, metas e SLA</p>
      </header>

      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-base mb-3">Dados da empresa</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block text-xs">Razão social<input className={inp + " mt-1"} value={empresa.razaoSocial} onChange={(e) => setEmpresa({ razaoSocial: e.target.value })} /></label>
          <label className="block text-xs">CNPJ<input className={inp + " mt-1"} value={empresa.cnpj} onChange={(e) => setEmpresa({ cnpj: e.target.value })} /></label>
          <label className="block text-xs md:col-span-2">Endereço<input className={inp + " mt-1"} value={empresa.endereco} onChange={(e) => setEmpresa({ endereco: e.target.value })} /></label>
          <label className="block text-xs">Telefone<input className={inp + " mt-1"} value={empresa.telefone} onChange={(e) => setEmpresa({ telefone: e.target.value })} /></label>
          <label className="block text-xs">E-mail<input className={inp + " mt-1"} value={empresa.email} onChange={(e) => setEmpresa({ email: e.target.value })} /></label>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-base mb-3">Equipe</h2>
        <div className="space-y-2">
          {usuarios.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-border">
              <input type="color" value={u.cor} onChange={(e) => updateUsuario(u.id, { cor: e.target.value })} className="w-9 h-9 rounded cursor-pointer" />
              <input value={u.nome} onChange={(e) => updateUsuario(u.id, { nome: e.target.value })} className={inp + " flex-1 min-w-[160px]"} />
              <input value={u.email} onChange={(e) => updateUsuario(u.id, { email: e.target.value })} className={inp + " flex-1 min-w-[180px]"} />
              <select value={u.perfil} onChange={(e) => updateUsuario(u.id, { perfil: e.target.value as typeof u.perfil })} className={inp + " w-36"}>
                <option value="admin">Admin</option><option value="consultor">Consultor</option><option value="instalador">Instalador</option>
              </select>
              <button onClick={() => deleteUsuario(u.id)} className="p-2 rounded text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <button onClick={() => addUsuario({ nome: "Novo usuário", email: "", perfil: "consultor", cor: "#2d9e64", ativo: true })} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-vert hover:underline">
          <Plus className="h-4 w-4" /> Adicionar usuário
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-display font-bold text-base mb-3">Metas mensais</h2>
          <div className="space-y-3">
            <label className="block text-xs">Faturamento (R$)<input type="number" className={inp + " mt-1"} value={metas.faturamentoMensal} onChange={(e) => setMetas({ faturamentoMensal: +e.target.value })} /></label>
            <label className="block text-xs">Propostas geradas<input type="number" className={inp + " mt-1"} value={metas.propostasMensais} onChange={(e) => setMetas({ propostasMensais: +e.target.value })} /></label>
            <label className="block text-xs">Projetos instalados<input type="number" className={inp + " mt-1"} value={metas.projetosMensais} onChange={(e) => setMetas({ projetosMensais: +e.target.value })} /></label>
            <label className="block text-xs">kWp instalados<input type="number" className={inp + " mt-1"} value={metas.kwpMensais} onChange={(e) => setMetas({ kwpMensais: +e.target.value })} /></label>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-display font-bold text-base mb-3">SLA por etapa (dias)</h2>
          <div className="space-y-2">
            {STAGES.filter((s) => s.id !== "ativado" && s.id !== "perdido").map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.cor }} />
                <span className="flex-1 text-sm">{s.nome}</span>
                <input type="number" value={sla[s.id] ?? 0} onChange={(e) => setSla({ [s.id]: +e.target.value })} className="w-20 h-8 px-2 rounded bg-muted text-sm text-right outline-none border border-transparent focus:border-vert-light" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-base mb-3">Motivos de perda</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
          {motivos.map((m) => (
            <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg border border-border">
              <span className="text-sm flex-1">{m.texto}</span>
              <button onClick={() => removeMotivo(m.id)} className="text-rose-600 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={novoMotivo} onChange={(e) => setNovoMotivo(e.target.value)} placeholder="Novo motivo de perda…" className={inp} />
          <button onClick={() => { if (novoMotivo.trim()) { addMotivo(novoMotivo.trim()); setNovoMotivo(""); } }} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold whitespace-nowrap">Adicionar</button>
        </div>
      </div>

      <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
        <h2 className="font-display font-bold text-base mb-1 text-rose-900">Zona de perigo</h2>
        <p className="text-sm text-rose-800 mb-3">Resetar todos os dados do CRM e voltar à carga inicial de demonstração.</p>
        <button onClick={() => { if (confirm("Tem certeza? Todos os dados do localStorage serão sobrescritos pelo seed.")) resetData(); }} className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700">
          Resetar dados
        </button>
      </div>
    </div>
  );
}
