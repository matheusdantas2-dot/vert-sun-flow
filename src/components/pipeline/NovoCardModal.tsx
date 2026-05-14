import { useState, useEffect } from "react";
import { useAddCard } from "@/lib/cards.api";
import { useClientesQuery } from "@/lib/clientes.api";
import { useProfilesQuery } from "@/lib/profiles.api";
import { useAuth } from "@/lib/auth";
import { notify } from "@/lib/notificacoes";
import type { LeadOrigem } from "@/lib/types";
import { ClienteFormModal } from "@/components/clientes/ClienteFormModal";
import { Plus } from "lucide-react";

export function NovoCardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { data: clientes = [] } = useClientesQuery();
  const { data: profiles = [] } = useProfilesQuery();
  const addCard = useAddCard();

  const [clienteId, setClienteId] = useState("");
  const [valorEstimado, setValorEstimado] = useState(0);
  const [potenciaKwp, setPotenciaKwp] = useState(0);
  const [origem, setOrigem] = useState<LeadOrigem>("prospeccao");
  const [consultorId, setConsultorId] = useState("");
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setClienteId("");
      setValorEstimado(0);
      setPotenciaKwp(0);
      setOrigem("prospeccao");
      setConsultorId(user?.id ?? "");
    }
  }, [open, user?.id]);

  if (!open) return null;
  const inp = "w-full h-9 px-3 rounded-lg bg-muted border border-transparent focus:bg-card focus:border-vert-light text-sm outline-none";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) {
      notify.warning("Selecione o cliente");
      return;
    }
    try {
      await addCard.mutateAsync({
        clienteId,
        stage: "prospeccao",
        valorEstimado,
        potenciaKwp,
        consultorId: consultorId || user?.id || "",
        origem,
      });
      notify.success("Card criado", "Lead adicionado ao pipeline.");
      onClose();
    } catch (err: unknown) {
      notify.warning("Falha ao criar", err instanceof Error ? err.message : "Tente novamente");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} className="bg-card rounded-xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display font-bold text-xl mb-1">Novo card no pipeline</h2>
        <p className="text-sm text-muted-foreground mb-4">Crie uma oportunidade na etapa Prospecção.</p>

        <div className="space-y-3">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</span>
            <div className="mt-1 flex gap-2">
              <select className={inp + " flex-1"} value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                <option value="">Selecione…</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setNovoClienteOpen(true)}
                className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-vert text-vert text-xs font-semibold hover:bg-vert-soft whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" /> Novo
              </button>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Potência (kWp)</span>
              <input type="number" step="0.1" className={inp + " mt-1"} value={potenciaKwp || ""} onChange={(e) => setPotenciaKwp(+e.target.value)} />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Valor estimado (R$)</span>
              <input type="number" step="100" className={inp + " mt-1"} value={valorEstimado || ""} onChange={(e) => setValorEstimado(+e.target.value)} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Origem</span>
              <select className={inp + " mt-1"} value={origem} onChange={(e) => setOrigem(e.target.value as LeadOrigem)}>
                <option value="trafego">Tráfego Pago</option>
                <option value="indicacao">Indicação</option>
                <option value="prospeccao">Prospecção</option>
                <option value="reativacao">Reativação</option>
                <option value="licitacao">Licitação</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Consultor</span>
              <select className={inp + " mt-1"} value={consultorId} onChange={(e) => setConsultorId(e.target.value)}>
                <option value="">Eu mesmo</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="flex gap-2 mt-5 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent">Cancelar</button>
          <button type="submit" disabled={addCard.isPending} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">
            {addCard.isPending ? "Salvando…" : "Criar card"}
          </button>
        </div>
      </form>
    </div>
  );
}
