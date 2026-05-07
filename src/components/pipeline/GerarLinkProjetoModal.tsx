import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { mensagemWhatsAppInicial, urlPortal, whatsappLink } from "@/lib/portalCliente";
import { Copy, MessageCircle, Link2, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { notify } from "@/lib/notificacoes";

export function GerarLinkProjetoModal({
  open,
  onClose,
  cardId,
}: {
  open: boolean;
  onClose: () => void;
  cardId: string | null;
}) {
  const card = useStore((s) => (cardId ? s.cards.find((c) => c.id === cardId) : undefined));
  const cliente = useStore((s) => (card ? s.clientes.find((c) => c.id === card.clienteId) : undefined));
  const consultor = useStore((s) => (card ? s.usuarios.find((u) => u.id === card.consultorId) : undefined));
  const projetoExistente = useStore((s) => (cardId ? s.projetos.find((p) => p.cardId === cardId) : undefined));
  const criarProjetoCliente = useStore((s) => s.criarProjetoCliente);

  const [gerado, setGerado] = useState<string | null>(null);
  const token = projetoExistente?.id ?? gerado;
  const link = useMemo(() => (token ? urlPortal(token) : ""), [token]);

  if (!card || !cliente) return null;

  const handleGerar = () => {
    const novo = criarProjetoCliente(card.id);
    if (novo) {
      setGerado(novo.id);
      notify.success("Link gerado", `Portal do cliente criado para ${cliente.nome}`);
    }
  };

  const handleCopiar = async () => {
    await navigator.clipboard.writeText(link);
    notify.success("Link copiado");
  };

  const msg = mensagemWhatsAppInicial(cliente, link, consultor);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-vert" />
            Projeto confirmado!
          </DialogTitle>
          <DialogDescription>
            Gerar link de acompanhamento para <strong>{cliente.nome}</strong>?
          </DialogDescription>
        </DialogHeader>

        {!token ? (
          <div className="flex flex-col gap-3 pt-2">
            <p className="text-sm text-muted-foreground">
              O cliente poderá acompanhar todas as etapas do projeto em tempo real através de um link público e seguro.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent"
              >
                Pular por enquanto
              </button>
              <button
                onClick={handleGerar}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vert text-white text-sm font-semibold hover:opacity-90"
              >
                <Link2 className="h-4 w-4" /> Gerar Link
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-2">
            <div className="bg-muted rounded-lg p-3 break-all text-sm font-mono">{link}</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopiar}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent flex-1 justify-center"
              >
                <Copy className="h-4 w-4" /> Copiar Link
              </button>
              <a
                href={whatsappLink(cliente.whatsapp || cliente.telefone, msg)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] text-white text-sm font-semibold hover:opacity-90 flex-1 justify-center"
              >
                <MessageCircle className="h-4 w-4" /> Enviar via WhatsApp
              </a>
            </div>
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-vert hover:underline text-center"
            >
              Visualizar portal do cliente →
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
