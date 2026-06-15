import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Circle, Clock, XCircle, Upload, MessageCircle } from "lucide-react";
import { VERT_LOGO_PNG_BASE64 } from "@/assets/vertLogoBase64";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useHomologacaoByToken,
  useUpdateHomologacaoByToken,
  useUploadDocHomologacao,
} from "@/lib/homologacao.api";
import { useConfigGlobalQuery } from "@/lib/config.api";
import {
  HOMOLOGACAO_ETAPAS_ORDEM,
  HOMOLOGACAO_ETAPA_LABEL,
  HOMOLOGACAO_ETAPA_DESC,
  HOMOLOGACAO_ETAPA_COR,
  HOMOLOGACAO_TIPO_LABEL,
  type HomologacaoDadosCliente,
  type HomologacaoDoc,
  type HomologacaoEtapa,
} from "@/lib/types";
import { notify } from "@/lib/notificacoes";
import { dataBR } from "@/lib/format";

export const Route = createFileRoute("/homologacao/$token")({
  component: PortalHomologacao,
  head: () => ({
    meta: [
      { title: "Homologação — Vert Energie" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
  }),
});

function maskCpf(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}
function maskTel(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}
function maskCep(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

function PortalHomologacao() {
  const { token } = Route.useParams();
  const { data: processo, isLoading } = useHomologacaoByToken(token);
  const { data: cfg } = useConfigGlobalQuery();

  if (isLoading) {
    return <div className="min-h-screen bg-[#f6faf7] flex items-center justify-center"><p className="text-sm text-muted-foreground">Carregando…</p></div>;
  }

  if (!processo) {
    return (
      <div className="min-h-screen bg-[#f6faf7] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <img src={VERT_LOGO_PNG_BASE64} alt="Vert Energie" className="h-12 mx-auto mb-6 opacity-50" />
          <h1 className="text-xl font-bold text-[#0d5234] mb-2">Link inválido</h1>
          <p className="text-sm text-muted-foreground">Verifique o link recebido ou entre em contato com a Vert Energie.</p>
        </div>
      </div>
    );
  }

  const empresaTel = (cfg?.empresa as { telefone?: string } | undefined)?.telefone ?? "";

  return (
    <div className="min-h-screen bg-[#f6faf7] pb-24">
      <header className="bg-gradient-to-r from-[#0d5234] to-[#2d9e64] text-white">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
          <img src={VERT_LOGO_PNG_BASE64} alt="Vert Energie" className="h-10 brightness-0 invert" />
          <span className="text-xs opacity-80">Portal do Integrador</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <section>
          <h1 className="text-2xl font-bold text-[#0d5234]">{HOMOLOGACAO_TIPO_LABEL[processo.tipo]}</h1>
          <p className="text-sm text-muted-foreground">UC {processo.uc} · {processo.concessionaria}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Preencha os dados do cliente final e envie os documentos abaixo. A Vert Energie cuida do protocolo junto à COELBA.
          </p>
        </section>

        <Tabs defaultValue="dados">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="dados">Cliente final</TabsTrigger>
            <TabsTrigger value="docs">Documentos</TabsTrigger>
            <TabsTrigger value="track">Acompanhamento</TabsTrigger>
          </TabsList>

          <TabsContent value="dados">
            <AbaDados processo={processo} />
          </TabsContent>
          <TabsContent value="docs">
            <AbaDocs processo={processo} />
          </TabsContent>
          <TabsContent value="track">
            <AbaAcompanhamento processo={processo} />
          </TabsContent>
        </Tabs>
      </main>

      {empresaTel && (
        <a
          href={`https://wa.me/55${empresaTel.replace(/\D/g, "")}`}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 right-5 bg-[#25D366] text-white rounded-full shadow-xl hover:scale-105 transition flex items-center gap-2 px-4 py-3 font-semibold"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Dúvidas? Fale conosco</span>
        </a>
      )}
    </div>
  );
}

function AbaDados({ processo }: { processo: import("@/lib/types").HomologacaoProcesso }) {
  const update = useUpdateHomologacaoByToken();
  const [d, setD] = useState<HomologacaoDadosCliente>(processo.dadosCliente ?? {});
  const preenchido = Object.keys(processo.dadosCliente ?? {}).length > 0;

  function set<K extends keyof HomologacaoDadosCliente>(k: K, v: HomologacaoDadosCliente[K]) {
    setD((s) => ({ ...s, [k]: v }));
  }

  async function buscaCep(cep: string) {
    const onlyDigits = cep.replace(/\D/g, "");
    if (onlyDigits.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${onlyDigits}/json/`);
      const j = await r.json();
      if (!j.erro) {
        setD((s) => ({ ...s, rua: j.logradouro, bairro: j.bairro, cidade: j.localidade, uf: j.uf }));
      }
    } catch { /* ignore */ }
  }

  async function salvar() {
    try {
      await update.mutateAsync({ token: processo.token, patch: { dadosCliente: d } });
      notify.success("Dados salvos com sucesso!");
    } catch (e) {
      notify.error("Falha ao salvar", String(e));
    }
  }

  return (
    <div className="bg-white rounded-xl border border-border p-5 space-y-4 mt-4">
      <div className="text-xs text-muted-foreground">
        Estes dados são do <strong>cliente final</strong> (titular da unidade consumidora).
      </div>
      {preenchido && (
        <div className="text-xs bg-green-100 text-green-800 inline-block px-2 py-1 rounded">Dados preenchidos ✓</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><Label>Nome completo do titular</Label><Input value={d.nome ?? ""} onChange={(e) => set("nome", e.target.value)} /></div>
        <div><Label>CPF</Label><Input value={d.cpf ?? ""} onChange={(e) => set("cpf", maskCpf(e.target.value))} /></div>
        <div><Label>RG</Label><Input value={d.rg ?? ""} onChange={(e) => set("rg", e.target.value)} /></div>
        <div><Label>WhatsApp do cliente</Label><Input value={d.telefone ?? ""} onChange={(e) => set("telefone", maskTel(e.target.value))} /></div>
        <div className="sm:col-span-2"><Label>E-mail do cliente</Label><Input type="email" value={d.email ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
        <div><Label>UC (na conta de energia)</Label><Input value={d.uc ?? processo.uc} onChange={(e) => set("uc", e.target.value)} /></div>
        <div>
          <Label>Tipo de ligação</Label>
          <Select value={d.ligacao ?? ""} onValueChange={(v) => set("ligacao", v as HomologacaoDadosCliente["ligacao"])}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monofasico">Monofásico</SelectItem>
              <SelectItem value="bifasico">Bifásico</SelectItem>
              <SelectItem value="trifasico">Trifásico</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
        <div className="sm:col-span-2">
          <Label>CEP</Label>
          <Input value={d.cep ?? ""} onChange={(e) => { const v = maskCep(e.target.value); set("cep", v); if (v.length === 9) buscaCep(v); }} />
        </div>
        <div className="sm:col-span-4"><Label>Rua</Label><Input value={d.rua ?? ""} onChange={(e) => set("rua", e.target.value)} /></div>
        <div className="sm:col-span-1"><Label>Nº</Label><Input value={d.numero ?? ""} onChange={(e) => set("numero", e.target.value)} /></div>
        <div className="sm:col-span-2"><Label>Bairro</Label><Input value={d.bairro ?? ""} onChange={(e) => set("bairro", e.target.value)} /></div>
        <div className="sm:col-span-2"><Label>Cidade</Label><Input value={d.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} /></div>
        <div className="sm:col-span-1"><Label>UF</Label><Input value={d.uf ?? ""} onChange={(e) => set("uf", e.target.value.toUpperCase().slice(0, 2))} /></div>
      </div>

      <div>
        <Label>Consumo médio mensal (kWh) — últimos 3 meses</Label>
        <div className="grid grid-cols-3 gap-2">
          <Input type="number" placeholder="Mês 1" value={d.consumo1 ?? ""} onChange={(e) => set("consumo1", Number(e.target.value) || undefined)} />
          <Input type="number" placeholder="Mês 2" value={d.consumo2 ?? ""} onChange={(e) => set("consumo2", Number(e.target.value) || undefined)} />
          <Input type="number" placeholder="Mês 3" value={d.consumo3 ?? ""} onChange={(e) => set("consumo3", Number(e.target.value) || undefined)} />
        </div>
      </div>

      {processo.tipo === "aumento" && (
        <div className="grid grid-cols-2 gap-3 border-t pt-3">
          <div><Label>Potência atual (kWp)</Label><Input type="number" step="0.01" value={d.potenciaAtual ?? ""} onChange={(e) => set("potenciaAtual", Number(e.target.value) || undefined)} /></div>
          <div><Label>Potência do aumento (kWp)</Label><Input type="number" step="0.01" value={d.potenciaAumento ?? ""} onChange={(e) => set("potenciaAumento", Number(e.target.value) || undefined)} /></div>
        </div>
      )}

      {processo.tipo === "lista_compensacao" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-3">
          <div><Label>Nome do titular da UC adicional</Label><Input value={d.ucNome ?? ""} onChange={(e) => set("ucNome", e.target.value)} /></div>
          <div><Label>CPF do titular</Label><Input value={d.ucCpf ?? ""} onChange={(e) => set("ucCpf", maskCpf(e.target.value))} /></div>
          <div><Label>Número da UC adicional</Label><Input value={d.ucNumero ?? ""} onChange={(e) => set("ucNumero", e.target.value)} /></div>
          <div><Label>Endereço da UC adicional</Label><Input value={d.ucEndereco ?? ""} onChange={(e) => set("ucEndereco", e.target.value)} /></div>
          <div className="sm:col-span-2">
            <Label>Relação com UC geradora</Label>
            <Select value={d.ucRelacao ?? ""} onValueChange={(v) => set("ucRelacao", v as HomologacaoDadosCliente["ucRelacao"])}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="proprietario">Proprietário</SelectItem>
                <SelectItem value="locatario">Locatário</SelectItem>
                <SelectItem value="conjuge">Cônjuge</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <Button onClick={salvar} disabled={update.isPending} className="bg-[#0d5234] hover:bg-[#0d5234]/90 text-white">
        {update.isPending ? "Salvando…" : "Salvar dados"}
      </Button>
    </div>
  );
}

function statusIcon(s: HomologacaoDoc["status"]) {
  if (s === "aprovado") return <CheckCircle className="h-5 w-5 text-green-600" />;
  if (s === "rejeitado") return <XCircle className="h-5 w-5 text-red-600" />;
  if (s === "recebido") return <Clock className="h-5 w-5 text-yellow-600" />;
  return <Circle className="h-5 w-5 text-gray-400" />;
}

function AbaDocs({ processo }: { processo: import("@/lib/types").HomologacaoProcesso }) {
  const upload = useUploadDocHomologacao();
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [enviando, setEnviando] = useState<string | null>(null);

  const docs = processo.documentos;
  const obrig = docs.filter((d) => d.obrigatorio);
  const obrigOk = obrig.filter((d) => d.status === "aprovado" || d.status === "recebido").length;

  async function onFile(doc: HomologacaoDoc, file: File) {
    if (file.size > 20 * 1024 * 1024) {
      notify.error("Arquivo maior que 20MB");
      return;
    }
    setEnviando(doc.id);
    try {
      await upload.mutateAsync({
        token: processo.token,
        processoId: processo.id,
        docId: doc.id,
        file,
        documentos: docs,
      });
      notify.success("Documento enviado!");
    } catch (e) {
      notify.error("Falha no envio", String(e));
    } finally {
      setEnviando(null);
    }
  }

  return (
    <div className="space-y-3 mt-4">
      {processo.mensagemCliente && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <div className="font-semibold text-amber-900 mb-1">💬 Mensagem da Vert Energie:</div>
          <div className="text-amber-900 whitespace-pre-wrap">{processo.mensagemCliente}</div>
        </div>
      )}

      <div className="bg-white border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-[#0d5234]">Progresso de documentos</h2>
          <span className="text-sm font-semibold text-[#2d9e64]">{obrigOk}/{obrig.length} obrigatórios</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#2d9e64] to-[#5ee89a]" style={{ width: `${obrig.length ? (obrigOk / obrig.length) * 100 : 0}%` }} />
        </div>
      </div>

      {docs.map((d) => (
        <div key={d.id} className="bg-white border border-border rounded-lg p-4">
          <div className="flex items-start gap-3">
            {statusIcon(d.status)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{d.nome}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${d.obrigatorio ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                  {d.obrigatorio ? "Obrigatório" : "Opcional"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 capitalize">Status: {d.status}</div>
              {d.status === "rejeitado" && d.observacao && (
                <div className="text-xs text-red-600 mt-1 bg-red-50 p-2 rounded">⚠ {d.observacao}</div>
              )}
              {d.arquivoNome && d.status !== "rejeitado" && (
                <div className="text-xs text-muted-foreground mt-1">📎 {d.arquivoNome}{d.enviadoEm ? ` · ${dataBR(d.enviadoEm)}` : ""}</div>
              )}
            </div>
            {(d.status === "pendente" || d.status === "rejeitado") && (
              <Button
                size="sm"
                variant="outline"
                disabled={enviando === d.id}
                onClick={() => fileRefs.current[d.id]?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                {enviando === d.id ? "Enviando…" : "Enviar"}
              </Button>
            )}
            <input
              ref={(el) => { fileRefs.current[d.id] = el; }}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(d, f); e.target.value = ""; }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AbaAcompanhamento({ processo }: { processo: import("@/lib/types").HomologacaoProcesso }) {
  const atualIdx = HOMOLOGACAO_ETAPAS_ORDEM.indexOf(processo.etapa);

  function dataDe(e: HomologacaoEtapa): string | undefined {
    if (e === "protocolo") return processo.dataProtocolo;
    if (e === "em_analise") return processo.dataPrevisaoResposta;
    if (e === "aprovado") return processo.dataAprovacao;
    if (e === "medidor_trocado") return processo.dataMedidor;
    return undefined;
  }

  function descDe(e: HomologacaoEtapa) {
    let base = HOMOLOGACAO_ETAPA_DESC[e];
    if (e === "protocolo" && processo.numeroProtocolo) base += ` · Nº ${processo.numeroProtocolo}`;
    if (e === "em_analise" && processo.dataPrevisaoResposta) base += ` · previsão ${dataBR(processo.dataPrevisaoResposta)}`;
    return base;
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="bg-white border border-border rounded-xl p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Status atual</div>
        <span className={`inline-block text-base px-3 py-1.5 rounded-full font-semibold ${HOMOLOGACAO_ETAPA_COR[processo.etapa]}`}>
          {HOMOLOGACAO_ETAPA_LABEL[processo.etapa]}
        </span>
        <p className="text-sm text-muted-foreground mt-2">{descDe(processo.etapa)}</p>
      </div>

      <ol className="relative border-l-2 border-border ml-2 space-y-4 pl-6 py-2">
        {HOMOLOGACAO_ETAPAS_ORDEM.map((e, i) => {
          const concluida = i < atualIdx || processo.etapa === "medidor_trocado";
          const atual = i === atualIdx;
          const d = dataDe(e);
          return (
            <li key={e} className="relative">
              <span
                className={`absolute -left-[33px] top-1 w-4 h-4 rounded-full border-2 ${
                  concluida ? "bg-[#2d9e64] border-[#2d9e64]" :
                  atual ? "bg-amber-400 border-amber-500 animate-pulse" :
                  "bg-white border-gray-300"
                }`}
              />
              <div className="font-semibold text-sm">{HOMOLOGACAO_ETAPA_LABEL[e]}</div>
              <div className="text-xs text-muted-foreground">{descDe(e)}</div>
              {d && <div className="text-xs text-[#0d5234] mt-0.5">{dataBR(d)}</div>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
