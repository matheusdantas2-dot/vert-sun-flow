import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("pwa-banner-dismissed") === "1"
  );

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!prompt || dismissed) return null;

  const handleInstall = async () => {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-banner-dismissed", "1");
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 bg-vert text-white rounded-xl px-4 py-3 shadow-xl max-w-sm mx-auto">
      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
        <Download className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">Instalar Vert CRM</div>
        <div className="text-xs text-white/80">Adicionar à tela inicial do celular</div>
      </div>
      <button
        onClick={handleInstall}
        className="px-3 py-1.5 bg-white text-vert rounded-lg text-xs font-bold shrink-0"
      >
        Instalar
      </button>
      <button onClick={handleDismiss} className="text-white/70 hover:text-white shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
