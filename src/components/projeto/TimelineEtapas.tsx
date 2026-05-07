import type { ProjetoCliente } from "@/lib/types";
import { ETAPAS_INFO, ETAPA_ORDEM } from "@/lib/portalCliente";
import { dataBR } from "@/lib/format";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABEL = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluído",
} as const;

export function TimelineEtapas({ projeto }: { projeto: ProjetoCliente }) {
  return (
    <ol className="relative space-y-4">
      {ETAPA_ORDEM.map((id, idx) => {
        const etapa = projeto.etapas.find((e) => e.id === id)!;
        const info = ETAPAS_INFO[id];
        const concluida = etapa.status === "concluida";
        const ativa = etapa.status === "em_andamento";
        const isLast = idx === ETAPA_ORDEM.length - 1;

        return (
          <li key={id} className="relative pl-12">
            {/* linha vertical */}
            {!isLast && (
              <span
                className={cn(
                  "absolute left-[18px] top-10 bottom-[-1rem] w-0.5",
                  concluida ? "bg-vert" : "bg-border",
                )}
              />
            )}
            {/* círculo */}
            <span
              className={cn(
                "absolute left-0 top-1 w-9 h-9 rounded-full flex items-center justify-center text-base shadow-sm",
                concluida && "bg-vert text-white",
                ativa && "bg-vert-light text-white animate-pulse",
                !concluida && !ativa && "bg-muted text-muted-foreground border border-border",
              )}
            >
              {concluida ? <CheckCircle2 className="h-5 w-5" /> : ativa ? <Loader2 className="h-5 w-5 animate-spin" /> : <Circle className="h-4 w-4" />}
            </span>

            <div
              className={cn(
                "rounded-xl border p-4 transition",
                concluida && "bg-vert/5 border-vert/30",
                ativa && "bg-card border-vert-light/60 shadow-sm ring-2 ring-vert-light/20",
                !concluida && !ativa && "bg-card border-border opacity-80",
              )}
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg" aria-hidden>{info.icone}</span>
                    <h3 className="font-semibold text-base">{info.titulo}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {info.descricaoCliente(etapa.extra)}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap",
                    concluida && "bg-vert text-white",
                    ativa && "bg-vert-light/20 text-vert-dark",
                    !concluida && !ativa && "bg-muted text-muted-foreground",
                  )}
                >
                  {STATUS_LABEL[etapa.status]}
                </span>
              </div>

              {/* Detalhes específicos visíveis ao cliente */}
              <EtapaDetalhesCliente etapa={etapa} />

              {(etapa.dataReal || etapa.dataPrevista) && (
                <div className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/60">
                  {etapa.dataReal ? (
                    <span>Concluído em <strong className="text-foreground">{dataBR(etapa.dataReal)}</strong></span>
                  ) : (
                    <span>Previsão: <strong className="text-foreground">{dataBR(etapa.dataPrevista)}</strong></span>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function EtapaDetalhesCliente({ etapa }: { etapa: ProjetoCliente["etapas"][number] }) {
  const x = etapa.extra ?? {};
  if (etapa.id === "homologacao" && (x.protocolo || x.previsaoAprovacao)) {
    return (
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {x.protocolo && (
          <div className="bg-muted/60 rounded-md p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Protocolo</div>
            <div className="font-mono">{x.protocolo}</div>
          </div>
        )}
        {x.previsaoAprovacao && (
          <div className="bg-muted/60 rounded-md p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Previsão de aprovação</div>
            <div className="font-medium">{dataBR(x.previsaoAprovacao)}</div>
          </div>
        )}
        {x.pendencia && (
          <div className="sm:col-span-2 bg-amber-50 text-amber-900 rounded-md p-2 text-sm">
            <strong>Pendência: </strong>{x.pendencia}
          </div>
        )}
      </div>
    );
  }
  if (etapa.id === "agendamento" && (x.periodo || x.lider)) {
    return (
      <div className="mt-3 text-sm space-y-1">
        {etapa.dataPrevista && (
          <div>Sua instalação está prevista para <strong>{dataBR(etapa.dataPrevista)}</strong>{x.periodo ? ` — ${x.periodo}` : ""}</div>
        )}
        {x.lider && <div>Líder técnico responsável: <strong>{x.lider}</strong></div>}
        {x.mensagemCliente && <div className="text-muted-foreground">{x.mensagemCliente}</div>}
      </div>
    );
  }
  if (etapa.id === "instalacao" && Array.isArray(x.fotos) && x.fotos.length > 0) {
    return (
      <div className="mt-3">
        <div className="text-[10px] uppercase text-muted-foreground mb-1">Fotos da instalação</div>
        <div className="grid grid-cols-3 gap-2">
          {x.fotos.map((src: string, i: number) => (
            <a key={i} href={src} target="_blank" rel="noreferrer">
              <img src={src} alt={`Instalação ${i + 1}`} className="w-full h-20 object-cover rounded-md border border-border" />
            </a>
          ))}
        </div>
      </div>
    );
  }
  if (etapa.id === "ativacao" && (x.medidor || x.geracaoEstimada)) {
    return (
      <div className="mt-3 text-sm space-y-1">
        {x.geracaoEstimada && (
          <div>Geração estimada no primeiro mês: <strong>{x.geracaoEstimada} kWh</strong></div>
        )}
        {x.medidor && <div>Medidor bidirecional: <span className="font-mono text-xs">{x.medidor}</span></div>}
      </div>
    );
  }
  if (etapa.id === "posvenda") {
    return (
      <div className="mt-3 text-xs text-muted-foreground bg-muted/60 rounded-md p-2">
        <strong className="text-foreground">Garantias:</strong> módulos 25 anos · inversor 5 anos · mão de obra 1 ano
      </div>
    );
  }
  return null;
}
