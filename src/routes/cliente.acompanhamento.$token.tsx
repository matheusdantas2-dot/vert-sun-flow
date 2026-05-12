import { createFileRoute } from "@tanstack/react-router";
import { useProjetoPublico } from "@/lib/projetos.api";
import { TimelineEtapas } from "@/components/projeto/TimelineEtapas";
import { brl, formatTel, kwp } from "@/lib/format";
import { VERT_LOGO_PNG_BASE64 } from "@/assets/vertLogoBase64";
import { MessageCircle, Phone } from "lucide-react";

export const Route = createFileRoute("/cliente/acompanhamento/$token")({
  component: PortalCliente,
  head: () => ({
    meta: [
      { title: "Acompanhamento do Projeto — Vert Energie" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
  }),
});

function PortalCliente() {
  const { token } = Route.useParams();
  const { data, isLoading } = useProjetoPublico(token);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6faf7] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#f6faf7] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <img src={VERT_LOGO_PNG_BASE64} alt="Vert Energie" className="h-12 mx-auto mb-6 opacity-50" />
          <h1 className="text-xl font-bold text-[#0d5234] mb-2">Link inválido ou expirado</h1>
          <p className="text-sm text-muted-foreground">
            Verifique o link recebido ou entre em contato com seu consultor da Vert Energie.
          </p>
        </div>
      </div>
    );
  }

  const { projeto, cliente, consultor, etapas, empresa } = data;
  const concluidas = etapas.filter((e) => e.status === "concluida").length;
  const total = etapas.length;
  const pct = total ? Math.round((concluidas / total) * 100) : 0;

  const empresaTel = (empresa?.telefone as string) || "";
  const empresaNome = (empresa?.razaoSocial as string) || "Vert Energie";
  const waConsultor = empresaTel
    ? `https://wa.me/55${empresaTel.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá! Sou ${cliente.nome}, gostaria de tirar uma dúvida sobre meu projeto.`,
      )}`
    : "#";

  return (
    <div className="min-h-screen bg-[#f6faf7] pb-24">
      <header className="bg-gradient-to-r from-[#0d5234] to-[#2d9e64] text-white">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center justify-between">
          <img src={VERT_LOGO_PNG_BASE64} alt="Vert Energie" className="h-10 brightness-0 invert" />
          <span className="text-xs opacity-80">Portal do Cliente</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <section>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0d5234]">
            Olá, {String(cliente.nome).split(" ")[0]}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe abaixo o andamento do seu projeto solar.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-[#2d9e64]/20 p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <ResumoItem label="Potência do sistema" valor={kwp(Number(projeto.potencia_kwp))} />
            <ResumoItem label="Investimento" valor={brl(Number(projeto.valor_investimento))} />
          </div>
          {consultor && (
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Consultor responsável
                </div>
                <div className="font-semibold">{consultor.nome}</div>
              </div>
              {empresaTel && (
                <a
                  href={`tel:+55${empresaTel.replace(/\D/g, "")}`}
                  className="inline-flex items-center gap-1.5 text-sm text-[#0d5234] font-semibold"
                >
                  <Phone className="h-4 w-4" /> {formatTel(empresaTel)}
                </a>
              )}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-[#0d5234]">Progresso geral</h2>
            <span className="text-sm font-semibold text-[#2d9e64]">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2d9e64] to-[#5ee89a] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {concluidas} de {total} etapas concluídas
          </div>
        </section>

        <section>
          <h2 className="font-bold text-[#0d5234] mb-3">Cronograma do projeto</h2>
          <TimelineEtapas etapas={etapas} />
        </section>

        <p className="text-center text-xs text-muted-foreground pt-6">
          {empresaNome} · Energia solar para o seu futuro 🌱
        </p>
      </main>

      <a
        href={waConsultor}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 bg-[#25D366] text-white rounded-full shadow-xl hover:scale-105 transition flex items-center gap-2 px-4 py-3 font-semibold"
        aria-label="Falar com a Vert Energie no WhatsApp"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="hidden sm:inline">Falar com a Vert Energie</span>
      </a>
    </div>
  );
}

function ResumoItem({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-xl font-bold text-[#0d5234] mt-1">{valor}</div>
    </div>
  );
}
