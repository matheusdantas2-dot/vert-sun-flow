import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    // Supabase coloca o token de recovery no hash; o client.auth processa automaticamente
    // Esperamos a sessão de recovery aparecer
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setPronto(true);
      }
    });
    // Também checa se já há sessão (caso o link já foi processado)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (senha.length < 8) {
      toast.error("A senha precisa ter no mínimo 8 caracteres");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (error) {
      toast.error("Falha ao redefinir senha", { description: error.message });
      return;
    }
    toast.success("Senha redefinida!");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-vert-glow flex items-center justify-center text-vert-dark">
            <Zap className="h-6 w-6 fill-current" />
          </div>
          <div className="font-display font-extrabold text-2xl tracking-tight">
            VertCRM
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h1 className="font-display text-2xl font-bold mb-1">Nova senha</h1>
          <p className="text-sm text-muted-foreground mb-6">Defina sua nova senha de acesso</p>

          {!pronto ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Validando link…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nova senha (mín. 8)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="mt-1 w-full h-11 px-3 rounded-lg border border-border bg-background focus:border-primary outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Redefinir senha
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
