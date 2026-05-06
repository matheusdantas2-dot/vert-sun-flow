import { X, Download, ExternalLink } from "lucide-react";
import { useEffect } from "react";

interface Props {
  url: string;
  titulo: string;
  onClose: () => void;
  onDownload?: () => void;
}

export function PdfPreviewModal({ url, titulo, onClose, onDownload }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-vert-dark text-white shrink-0">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-vert-glow">Pré-visualização</div>
            <div className="font-display font-bold text-lg truncate">{titulo}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg hover:bg-white/10 text-white"
              title="Abrir em nova aba"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            {onDownload && (
              <button onClick={onDownload} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vert-glow text-vert-dark text-sm font-bold hover:brightness-95">
                <Download className="h-4 w-4" /> Baixar
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white" aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>
        <iframe src={url} title={titulo} className="flex-1 w-full bg-muted" />
      </div>
    </div>
  );
}
