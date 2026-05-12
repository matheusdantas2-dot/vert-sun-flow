import { useProjetoByCardId, useCriarProjeto, useUpdateEtapa, type EtapaRow } from "@/lib/projetos.api";
import { useCardsQuery } from "@/lib/cards.api";
import { useClientesQuery } from "@/lib/clientes.api";
import { useProfilesQuery } from "@/lib/profiles.api";
import { ETAPAS_INFO, ETAPA_ORDEM, mensagemWhatsAppAtualizacao, urlPortal, whatsappLink } from "@/lib/portalCliente";
import type { EtapaProjetoId } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Copy, MessageCircle, Link2, Upload, X } from "lucide-react";
import { notify } from "@/lib/notificacoes";
import { useState } from "react";

const STATUS_OPTS: { v: "pendente" | "em_andamento" | "concluida"; label: string }[] = [
  { v: "pendente", label: "Pendente" },
  { v: "em_andamento", label: "Em andamento" },
  { v: "concluida", label: "Concluído" },
];

export function CronogramaProjetoAdmin({ cardId }: { cardId: string }) {
  const { data } = useProjetoByCardId(cardId);
  const { data: cards = [] } = useCardsQuery();
  const { data: clientes = [] } = useClientesQuery();
  const { data: profiles = [] } = useProfilesQuery();
  const criarMut = useCriarProjeto();

  const card = cards.find((c) => c.id === cardId);
  const cliente = card ? clientes.find((c) => c.id === card.clienteId) : undefined;

  if (!data) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Nenhum cronograma criado ainda. Gere o portal do cliente para começar a acompanhar este projeto.
        </p>
        <button
          onClick={() => {
            if (!card || !cliente) return;
            criarMut.mutate(
              {
                cardId,
                clienteId: cliente.id,
                consultorId: card.consultorId || null,
                potenciaKwp: card.potenciaKwp,
                valorInvestimento: card.valorEstimado,
                concessionariaNome: cliente.concessionaria,
              },
              { onSuccess: () => notify.success("Portal criado", "Cronograma do projeto iniciado") },
            );
          }}
          disabled={criarMut.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vert text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          <Link2 className="h-4 w-4" /> Criar portal do cliente
        </button>
      </div>
    );
  }

  const { projeto, etapas } = data;
  const consultor = profiles.find((p) => p.id === projeto.consultor_id);
  const link = urlPortal(projeto.token_publico);
  const concluidas = etapas.filter((e) => e.status === "concluida").length;
  const total = etapas.length;
  const pct = total ? Math.round((concluidas / total) * 100) : 0;

  const copiar = async () => {
    await navigator.clipboard.writeText(link);
    notify.success("Link copiado");
  };

  const wa = cliente
    ? whatsappLink(
        cliente.whatsapp || cliente.telefone,
        mensagemWhatsAppAtualizacao(cliente, link, consultor as any),
      )
    : "#";

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="font-display font-bold">Cronograma do Projeto</h3>
            <div className="text-xs text-muted-foreground">
              {concluidas} de {total} etapas concluídas — {pct}%
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={copiar} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent">
              <Copy className="h-4 w-4" /> Copiar link
            </button>
            <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#25D366] text-white text-sm font-semibold hover:opacity-90">
              <MessageCircle className="h-4 w-4" /> Enviar atualização
            </a>
          </div>
        </div>
        <Progress value={pct} className="h-2" />
        <a href={link} target="_blank" rel="noreferrer" className="text-[11px] text-vert hover:underline break-all block mt-2">
          {link}
        </a>
      </div>

      <div className="space-y-3">
        {ETAPA_ORDEM.map((id) => {
          const etapa = etapas.find((e) => e.etapa_id === id);
          if (!etapa) return null;
          const info = ETAPAS_INFO[id];
          return (
            <details key={id} open={etapa.status === "em_andamento"} className="bg-card rounded-xl border border-border">
              <summary className="cursor-pointer p-4 flex items-center justify-between gap-2 list-none">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{info.icone}</span>
                  <span className="font-semibold text-sm">{info.titulo}</span>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                  etapa.status === "concluida" ? "bg-vert text-white" :
                  etapa.status === "em_andamento" ? "bg-vert-light/20 text-vert-dark" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {STATUS_OPTS.find((s) => s.v === etapa.status)?.label}
                </span>
              </summary>
              <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border">
                <EtapaForm etapa={etapa} etapaId={id} />
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

function EtapaForm({ etapa, etapaId }: { etapa: EtapaRow; etapaId: EtapaProjetoId }) {
  const updateMut = useUpdateEtapa();
  const x = etapa.extra ?? {};
  const update = (patch: Parameters<typeof updateMut.mutate>[0]["patch"], extra?: Record<string, any>) =>
    updateMut.mutate({ etapaRowId: etapa.id, patch, mergeExtra: extra });

  const setStatus = (status: any) => {
    if (status === "concluida" && !etapa.data_real) {
      notify.warning("Data necessária", "Preencha a data real de conclusão antes de concluir esta etapa.");
      return;
    }
    update({ status });
  };
  const setExtra = (k: string, v: any) => update(undefined, { [k]: v });

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
        <Field label="Status">
          <select
            value={etapa.status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 w-full px-3 rounded-md border border-input bg-transparent text-sm"
          >
            {STATUS_OPTS.map((o) => (
              <option key={o.v} value={o.v}>{o.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Data prevista">
          <Input
            type="date"
            value={etapa.data_prevista?.slice(0, 10) ?? ""}
            onChange={(e) => update({ data_prevista: e.target.value || null })}
          />
        </Field>
        <Field label="Data real">
          <Input
            type="date"
            value={etapa.data_real?.slice(0, 10) ?? ""}
            onChange={(e) => update({ data_real: e.target.value || null })}
          />
        </Field>
      </div>

      {etapaId === "compra" && (
        <Field label="Fornecedor(es)">
          <Input value={x.fornecedor ?? ""} onChange={(e) => setExtra("fornecedor", e.target.value)} placeholder="Ex: Canadian Solar, Growatt" />
        </Field>
      )}

      {etapaId === "homologacao" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Concessionária">
            <Input value={x.concessionariaNome ?? ""} onChange={(e) => setExtra("concessionariaNome", e.target.value)} placeholder="Ex: Neoenergia Coelba" />
          </Field>
          <Field label="Número do protocolo">
            <Input value={x.protocolo ?? ""} onChange={(e) => setExtra("protocolo", e.target.value)} placeholder="2024-NE-000123" />
          </Field>
          <Field label="Data de envio">
            <Input type="date" value={x.dataEnvio ?? ""} onChange={(e) => setExtra("dataEnvio", e.target.value)} />
          </Field>
          <Field label="Previsão de aprovação">
            <Input type="date" value={x.previsaoAprovacao ?? ""} onChange={(e) => setExtra("previsaoAprovacao", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Pendência (se houver)">
              <Input value={x.pendencia ?? ""} onChange={(e) => setExtra("pendencia", e.target.value)} placeholder="Descrever pendência da concessionária…" />
            </Field>
          </div>
        </div>
      )}

      {etapaId === "agendamento" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Período">
            <select
              value={x.periodo ?? ""}
              onChange={(e) => setExtra("periodo", e.target.value)}
              className="h-9 w-full px-3 rounded-md border border-input bg-transparent text-sm"
            >
              <option value="">—</option>
              <option>Manhã</option>
              <option>Tarde</option>
              <option>Dia todo</option>
            </select>
          </Field>
          <Field label="Líder de campo">
            <Input value={x.lider ?? ""} onChange={(e) => setExtra("lider", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Mensagem ao cliente">
              <Textarea value={x.mensagemCliente ?? ""} onChange={(e) => setExtra("mensagemCliente", e.target.value)} placeholder="Observações visíveis ao cliente…" />
            </Field>
          </div>
        </div>
      )}

      {etapaId === "instalacao" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nº de módulos instalados">
              <Input type="number" value={x.modulos ?? ""} onChange={(e) => setExtra("modulos", e.target.value)} />
            </Field>
          </div>
          <FotosUploader x={x} onChange={(fotos) => setExtra("fotos", fotos)} />
        </>
      )}

      {etapaId === "ativacao" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Medidor bidirecional">
            <Input value={x.medidor ?? ""} onChange={(e) => setExtra("medidor", e.target.value)} />
          </Field>
          <Field label="Geração estimada 1º mês (kWh)">
            <Input type="number" value={x.geracaoEstimada ?? ""} onChange={(e) => setExtra("geracaoEstimada", e.target.value)} />
          </Field>
        </div>
      )}

      <Field label="Observações internas">
        <Textarea
          value={etapa.observacoes_internas ?? ""}
          onChange={(e) => update({ observacoes_internas: e.target.value })}
          placeholder="Notas visíveis apenas no CRM…"
        />
      </Field>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">{label}</div>
      {children}
    </label>
  );
}

function FotosUploader({ x, onChange }: { x: any; onChange: (fotos: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const fotos: string[] = Array.isArray(x.fotos) ? x.fotos : [];

  const handleFile = (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    const promises = Array.from(files).map(
      (f) =>
        new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.readAsDataURL(f);
        }),
    );
    Promise.all(promises).then((nova) => {
      onChange([...fotos, ...nova]);
      setBusy(false);
    });
  };

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">Fotos da instalação</div>
      <div className="grid grid-cols-4 gap-2">
        {fotos.map((src, i) => (
          <div key={i} className="relative group">
            <img src={src} alt="" className="w-full h-20 object-cover rounded-md border border-border" />
            <button
              type="button"
              onClick={() => onChange(fotos.filter((_, k) => k !== i))}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <label className="border-2 border-dashed border-border rounded-md h-20 flex items-center justify-center text-muted-foreground hover:bg-accent cursor-pointer text-xs">
          <Upload className="h-4 w-4 mr-1" /> {busy ? "..." : "Adicionar"}
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFile(e.target.files)} />
        </label>
      </div>
    </div>
  );
}
