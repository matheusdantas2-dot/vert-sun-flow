import { useState } from "react";
import { useMotivosPerdaQuery } from "@/lib/motivosPerda.api";

export function MotivoPerdaModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}) {
  const { data: motivos = [] } = useMotivosPerdaQuery();
  const [sel, setSel] = useState("");
  const [outro, setOutro] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display font-bold text-lg mb-1">Motivo da perda</h2>
        <p className="text-sm text-muted-foreground mb-4">Selecione o motivo para mover este card para "Perdido".</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {motivos.map((m) => (
            <label key={m.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-accent cursor-pointer">
              <input type="radio" name="motivo" value={m.texto} checked={sel === m.texto} onChange={(e) => setSel(e.target.value)} />
              <span className="text-sm">{m.texto}</span>
            </label>
          ))}
          <label className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-accent cursor-pointer">
            <input type="radio" name="motivo" value="__outro__" checked={sel === "__outro__"} onChange={(e) => setSel(e.target.value)} />
            <span className="text-sm">Outro motivo…</span>
          </label>
          {sel === "__outro__" && (
            <input
              autoFocus
              placeholder="Descreva o motivo"
              value={outro}
              onChange={(e) => setOutro(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-card text-sm"
            />
          )}
        </div>
        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent">
            Cancelar
          </button>
          <button
            disabled={!sel || (sel === "__outro__" && !outro.trim())}
            onClick={() => onConfirm(sel === "__outro__" ? outro.trim() : sel)}
            className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-50"
          >
            Confirmar perda
          </button>
        </div>
      </div>
    </div>
  );
}
