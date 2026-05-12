import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/recuperar-senha")({
  component: RecuperarSenhaPage,
});

function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error("Erro ao enviar e-mail", { description: error.message });
      return;
    }
    setEnviado(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-vert-glow flex items-center justify-center text-vert-dark">
            <Zap className="h-6 w-6 fill-current" />
          </div>
          <div className="font-display font-extrabold text-2xl tracking-tight">
            vert.<span className="text-vert">energie</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h1 className="font-display text-2xl font-bold mb-1">Recuperar senha</h1>
          <p className="text-sm text-muted-foreground mb-6">Enviaremos um link para redefinir sua senha</p>

          {enviado ? (
            <div className="text-center py-6">
              <div className="text-6xl mb-3">📧</div>
              <p className="text-sm text-muted-foreground">
                Se houver uma conta com <strong>{email}</strong>, você receberá um e-mail com instruções.
              </p>
              <Link to="/login" className="inline-block mt-6 text-vert font-semibold hover:underline">
                Voltar ao login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full h-11 px-3 rounded-lg border border-border bg-background focus:border-primary outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Enviar link
              </button>
              <Link to="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">
                ← Voltar ao login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
