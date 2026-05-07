import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { TimelineEtapas } from "@/components/projeto/TimelineEtapas";
import { brl, formatTel, kwp } from "@/lib/format";
import { progressoProjeto } from "@/lib/portalCliente";
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
  const projeto = useStore((s) => s.projetos.find((p) => p.id === token));
  const cliente = useStore((s) => (projeto ? s.clientes.find((c) => c.id === projeto.clienteId) : undefined));
  const consultor = useStore((s) => (projeto ? s.usuarios.find((u) => u.id === projeto.consultorId) : undefined));
  const empresa = useStore((s) => s.empresa);

  if (!projeto || !cliente) {
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

  const prog = progressoProjeto(projeto);
  const waEmpresa = empresa.telefone?.replace(/\D/g, "") || consultor?.email || "";
  const waConsultor = consultor ? `https://wa.me/55${(empresa.telefone || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Sou ${cliente.nome}, gostaria de tirar uma dúvida sobre meu projeto.`)}` : "#";

  return (
    <div className="min-h-screen bg-[#f6faf7] pb-24">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#0d5234] to-[#2d9e64] text-white">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center justify-between">
          <img src={VERT_LOGO_PNG_BASE64} alt="Vert Energie" className="h-10 brightness-0 invert" />
          <span className="text-xs opacity-80">Portal do Cliente</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Saudação */}
        <section>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0d5234]">
            Olá, {cliente.nome.split(" ")[0]}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe abaixo o andamento do seu projeto solar.
          </p>
        </section>

        {/* Resumo */}
        <section className="bg-white rounded-2xl border border-[#2d9e64]/20 p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <ResumoItem label="Potência do sistema" valor={kwp(projeto.potenciaKwp)} />
            <ResumoItem label="Investimento" valor={brl(projeto.valorInvestimento)} />
          </div>
          {consultor && (
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Consultor responsável</div>
                <div className="font-semibold">{consultor.nome}</div>
              </div>
              {empresa.telefone && (
                <a
                  href={`tel:+55${empresa.telefone.replace(/\D/g, "")}`}
                  className="inline-flex items-center gap-1.5 text-sm text-[#0d5234] font-semibold"
                >
                  <Phone className="h-4 w-4" /> {formatTel(empresa.telefone)}
                </a>
              )}
            </div>
          )}
        </section>

        {/* Progresso */}
        <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-[#0d5234]">Progresso geral</h2>
            <span className="text-sm font-semibold text-[#2d9e64]">{prog.pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2d9e64] to-[#5ee89a] transition-all"
              style={{ width: `${prog.pct}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {prog.concluidas} de {prog.total} etapas concluídas
          </div>
        </section>

        {/* Timeline */}
        <section>
          <h2 className="font-bold text-[#0d5234] mb-3">Cronograma do projeto</h2>
          <TimelineEtapas projeto={projeto} />
        </section>

        <p className="text-center text-xs text-muted-foreground pt-6">
          {empresa.razaoSocial || "Vert Energie"} · Energia solar para o seu futuro 🌱
        </p>
      </main>

      {/* WhatsApp flutuante */}
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
