import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ClipboardCheck, Copy, ExternalLink, MessageCircle, Plus, Download, FileText, Cable, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useClientesQuery } from "@/lib/clientes.api";
import { useProfilesQuery } from "@/lib/profiles.api";
import {
  useHomologacoesQuery,
  useUpdateHomologacao,
  useDeleteHomologacao,
  urlPortalHomologacao,
  signedUrlDoc,
} from "@/lib/homologacao.api";
import {
  HOMOLOGACAO_ETAPA_LABEL,
  HOMOLOGACAO_ETAPA_COR,
  HOMOLOGACAO_ETAPAS_ORDEM,
  HOMOLOGACAO_TIPO_LABEL,
  type HomologacaoEtapa,
  type HomologacaoTipo,
  type HomologacaoProcesso,
  type HomologacaoDoc,
} from "@/lib/types";
import { NovoProcessoModal } from "@/components/homologacao/NovoProcessoModal";
import { notify } from "@/lib/notificacoes";
import { dataBR } from "@/lib/format";

export const Route = createFileRoute("/engenharia/homologacao")({
  component: HomologacaoPage,
  head: () => ({ meta: [{ title: "Homologações — VertCRM" }] }),
});

function HomologacaoPage() {
  const { data: lista = [] } = useHomologacoesQuery();
  const { data: clientes = [] } = useClientesQuery();
  const { data: profiles = [] } = useProfilesQuery();

  const [filtroEtapa, setFiltroEtapa] = useState<HomologacaoEtapa | "_all">("_all");
  const [filtroTipo, setFiltroTipo] = useState<HomologacaoTipo | "_all">("_all");
  const [filtroConsultor, setFiltroConsultor] = useState("_all");
  const [busca, setBusca] = useState("");
  const [openNovo, setOpenNovo] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const clientesById = useMemo(() => Object.fromEntries(clientes.map((c) => [c.id, c])), [clientes]);
  const profilesById = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p])), [profiles]);

  const filtrada = useMemo(() => {
    return lista.filter((h) => {
      if (filtroEtapa !== "_all" && h.etapa !== filtroEtapa) return false;
      if (filtroTipo !== "_all" && h.tipo !== filtroTipo) return false;
      if (filtroConsultor !== "_all" && h.consultorId !== filtroConsultor) return false;
      if (busca) {
        const c = clientesById[h.clienteId];
        const s = `${c?.nome ?? ""} ${h.uc}`.toLowerCase();
        if (!s.includes(busca.toLowerCase())) return false;
      }
      return true;
    });
  }, [lista, filtroEtapa, filtroTipo, filtroConsultor, busca, clientesById]);

  const ativos = lista.filter((h) => h.etapa !== "medidor_trocado");
  const aguardDocs = lista.filter((h) => h.etapa === "documentacao");
  const emAnalise = lista.filter((h) => h.etapa === "em_analise");
  const mesAtual = new Date().toISOString().slice(0, 7);
  const aprovadosMes = lista.filter((h) => h.dataAprovacao?.startsWith(mesAtual));

  const aberto = openId ? lista.find((h) => h.id === openId) ?? null : null;

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-2xl flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-vert" /> Homologações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão dos processos junto à COELBA
          </p>
        </div>
        <Button onClick={() => setOpenNovo(true)} className="bg-vert text-white hover:opacity-90">
          <Plus className="h-4 w-4 mr-1" /> Novo processo
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Total ativo" value={ativos.length} color="text-vert-dark" />
        <Kpi label="Aguardando docs" value={aguardDocs.length} color="text-blue-700" />
        <Kpi label="Em análise COELBA" value={emAnalise.length} color="text-orange-700" />
        <Kpi label="Aprovados este mês" value={aprovadosMes.length} color="text-green-700" />
      </div>

      <div className="bg-card border border-border rounded-xl p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
        <Select value={filtroEtapa} onValueChange={(v) => setFiltroEtapa(v as HomologacaoEtapa | "_all")}>
          <SelectTrigger><SelectValue placeholder="Etapa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas etapas</SelectItem>
            {HOMOLOGACAO_ETAPAS_ORDEM.map((e) => (
              <SelectItem key={e} value={e}>{HOMOLOGACAO_ETAPA_LABEL[e]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as HomologacaoTipo | "_all")}>
          <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos tipos</SelectItem>
            {(Object.keys(HOMOLOGACAO_TIPO_LABEL) as HomologacaoTipo[]).map((t) => (
              <SelectItem key={t} value={t}>{HOMOLOGACAO_TIPO_LABEL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroConsultor} onValueChange={setFiltroConsultor}>
          <SelectTrigger><SelectValue placeholder="Consultor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos consultores</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Buscar cliente ou UC…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>UC</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Protocolo</TableHead>
              <TableHead>Previsão</TableHead>
              <TableHead>Documentos</TableHead>
              <TableHead>Consultor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrada.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum processo encontrado.</TableCell></TableRow>
            )}
            {filtrada.map((h) => {
              const obrig = h.documentos.filter((d) => d.obrigatorio);
              const obrigOk = obrig.filter((d) => d.status === "aprovado" || d.status === "recebido").length;
              const completo = obrigOk === obrig.length && obrig.length > 0;
              return (
                <TableRow key={h.id}>
                  <TableCell>{clientesById[h.clienteId]?.nome ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{h.uc}</TableCell>
                  <TableCell>{HOMOLOGACAO_TIPO_LABEL[h.tipo]}</TableCell>
                  <TableCell>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded ${HOMOLOGACAO_ETAPA_COR[h.etapa]}`}>
                      {HOMOLOGACAO_ETAPA_LABEL[h.etapa]}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{h.numeroProtocolo ?? "—"}</TableCell>
                  <TableCell className="text-xs">{h.dataPrevisaoResposta ? dataBR(h.dataPrevisaoResposta) : "—"}</TableCell>
                  <TableCell className={completo ? "text-green-700 font-medium" : "text-red-600 font-medium"}>
                    {obrigOk}/{obrig.length}
                  </TableCell>
                  <TableCell className="text-xs">{h.consultorId ? profilesById[h.consultorId]?.nome ?? "—" : "—"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => setOpenId(h.id)}>Abrir</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-1"
                      onClick={() => {
                        navigator.clipboard.writeText(urlPortalHomologacao(h.token));
                        notify.success("Link copiado");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <NovoProcessoModal open={openNovo} onOpenChange={setOpenNovo} />
      {aberto && <SheetProcesso processo={aberto} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function SheetProcesso({ processo, onClose }: { processo: HomologacaoProcesso; onClose: () => void }) {
  const { data: clientes = [] } = useClientesQuery();
  const cliente = clientes.find((c) => c.id === processo.clienteId);
  const updateMut = useUpdateHomologacao();
  const deleteMut = useDeleteHomologacao();

  const [etapa, setEtapa] = useState(processo.etapa);
  const [dataProto, setDataProto] = useState(processo.dataProtocolo ?? "");
  const [numProto, setNumProto] = useState(processo.numeroProtocolo ?? "");
  const [previsao, setPrevisao] = useState(processo.dataPrevisaoResposta ?? "");
  const [dataAprov, setDataAprov] = useState(processo.dataAprovacao ?? "");
  const [dataMed, setDataMed] = useState(processo.dataMedidor ?? "");
  const [mensagem, setMensagem] = useState(processo.mensagemCliente ?? "");
  const [obs, setObs] = useState(processo.observacoesInternas ?? "");
  const [docs, setDocs] = useState<HomologacaoDoc[]>(processo.documentos);
  const [rejeitando, setRejeitando] = useState<string | null>(null);
  const [motivoRejeitar, setMotivoRejeitar] = useState("");

  const url = urlPortalHomologacao(processo.token);

  function copiarLink() {
    navigator.clipboard.writeText(url);
    notify.success("Link copiado");
  }

  async function salvarEtapa() {
    if (etapa === "pendencia" && !mensagem.trim()) {
      notify.error("Mensagem para o cliente é obrigatória ao marcar pendência");
      return;
    }
    await updateMut.mutateAsync({
      id: processo.id,
      patch: {
        etapa,
        dataProtocolo: dataProto || undefined,
        numeroProtocolo: numProto || undefined,
        dataPrevisaoResposta: previsao || undefined,
        dataAprovacao: dataAprov || undefined,
        dataMedidor: dataMed || undefined,
        mensagemCliente: mensagem || undefined,
        observacoesInternas: obs || undefined,
      },
    });
    notify.success("Etapa atualizada");
    if (cliente?.whatsapp && confirm("Deseja enviar notificação por WhatsApp ao cliente?")) {
      const tel = cliente.whatsapp.replace(/\D/g, "");
      const msg = `Olá ${cliente.nome}! Atualização do processo de homologação: ${HOMOLOGACAO_ETAPA_LABEL[etapa]}. Acompanhe em ${url}`;
      window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, "_blank");
    }
  }

  async function persistDocs(novos: HomologacaoDoc[]) {
    setDocs(novos);
    await updateMut.mutateAsync({ id: processo.id, patch: { documentos: novos } });
  }

  async function aprovarDoc(id: string) {
    await persistDocs(docs.map((d) => d.id === id ? { ...d, status: "aprovado", observacao: undefined } : d));
    notify.success("Documento aprovado");
  }

  async function confirmarRejeicao() {
    if (!rejeitando || !motivoRejeitar.trim()) return;
    await persistDocs(docs.map((d) => d.id === rejeitando ? { ...d, status: "rejeitado", observacao: motivoRejeitar } : d));
    notify.success("Documento rejeitado");
    setRejeitando(null);
    setMotivoRejeitar("");
  }

  async function baixarDoc(doc: HomologacaoDoc) {
    if (!doc.arquivoPath) return;
    const url = await signedUrlDoc(doc.arquivoPath);
    if (url) window.open(url, "_blank");
  }

  async function adicionarDocExtra() {
    const nome = prompt("Nome do documento adicional:");
    if (!nome) return;
    await persistDocs([
      ...docs,
      { id: crypto.randomUUID(), nome, obrigatorio: false, status: "pendente" },
    ]);
  }

  async function excluir() {
    if (!confirm("Excluir este processo de homologação? Esta ação não pode ser desfeita.")) return;
    await deleteMut.mutateAsync(processo.id);
    notify.success("Processo excluído");
    onClose();
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[640px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="text-sm bg-muted px-2 py-0.5 rounded">{HOMOLOGACAO_TIPO_LABEL[processo.tipo]}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${HOMOLOGACAO_ETAPA_COR[processo.etapa]}`}>
              {HOMOLOGACAO_ETAPA_LABEL[processo.etapa]}
            </span>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="processo" className="mt-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="processo">Processo</TabsTrigger>
            <TabsTrigger value="etapas">Etapas</TabsTrigger>
            <TabsTrigger value="docs">Documentos</TabsTrigger>
            <TabsTrigger value="tec">Técnicos</TabsTrigger>
          </TabsList>

          <TabsContent value="processo" className="space-y-3">
            <Info label="Cliente" value={cliente?.nome ?? "—"} />
            <Info label="UC" value={processo.uc} />
            <Info label="Endereço" value={processo.enderecoInstalacao} />
            <Info label="Potência" value={processo.potenciaKwp ? `${processo.potenciaKwp} kWp` : "—"} />
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={copiarLink}><Copy className="h-3.5 w-3.5 mr-1" />Copiar link</Button>
              <Button size="sm" variant="outline" onClick={() => window.open(url, "_blank")}><ExternalLink className="h-3.5 w-3.5 mr-1" />Abrir portal</Button>
              {cliente?.whatsapp && (
                <Button size="sm" variant="outline" onClick={() => {
                  const tel = cliente.whatsapp.replace(/\D/g, "");
                  const msg = `Olá ${cliente.nome}! Seu processo de homologação está pronto. Acesse: ${url}`;
                  window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, "_blank");
                }}>
                  <MessageCircle className="h-3.5 w-3.5 mr-1" />WhatsApp
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={excluir}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />Excluir
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="etapas" className="space-y-3">
            <div>
              <Label>Etapa atual</Label>
              <Select value={etapa} onValueChange={(v) => setEtapa(v as HomologacaoEtapa)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOMOLOGACAO_ETAPAS_ORDEM.map((e) => (
                    <SelectItem key={e} value={e}>{HOMOLOGACAO_ETAPA_LABEL[e]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(etapa === "protocolo" || numProto) && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Nº protocolo</Label><Input value={numProto} onChange={(e) => setNumProto(e.target.value)} /></div>
                <div><Label>Data protocolo</Label><Input type="date" value={dataProto} onChange={(e) => setDataProto(e.target.value)} /></div>
              </div>
            )}
            {(etapa === "em_analise" || previsao) && (
              <div><Label>Previsão de resposta COELBA</Label><Input type="date" value={previsao} onChange={(e) => setPrevisao(e.target.value)} /></div>
            )}
            {(etapa === "aprovado" || dataAprov) && (
              <div><Label>Data de aprovação</Label><Input type="date" value={dataAprov} onChange={(e) => setDataAprov(e.target.value)} /></div>
            )}
            {(etapa === "medidor_trocado" || dataMed) && (
              <div><Label>Data troca do medidor</Label><Input type="date" value={dataMed} onChange={(e) => setDataMed(e.target.value)} /></div>
            )}
            {etapa === "pendencia" && (
              <div>
                <Label>Mensagem para o cliente *</Label>
                <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={3} placeholder="Descreva a pendência que aparecerá no portal do cliente" />
              </div>
            )}
            <div>
              <Label>Observações internas (não aparece para o cliente)</Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} />
            </div>
            <Button onClick={salvarEtapa} disabled={updateMut.isPending} className="bg-vert text-white hover:opacity-90">
              Salvar e notificar cliente
            </Button>
          </TabsContent>

          <TabsContent value="docs" className="space-y-2">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={adicionarDocExtra}><Plus className="h-3.5 w-3.5 mr-1" />Adicionar documento</Button>
            </div>
            {docs.map((d) => (
              <div key={d.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{d.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.obrigatorio ? "Obrigatório" : "Opcional"} · {d.status}
                    </div>
                    {d.arquivoNome && <div className="text-xs mt-1">📎 {d.arquivoNome}</div>}
                    {d.status === "rejeitado" && d.observacao && (
                      <div className="text-xs text-red-600 mt-1">Motivo: {d.observacao}</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {d.arquivoPath && (
                      <Button size="sm" variant="ghost" onClick={() => baixarDoc(d)}><Download className="h-3.5 w-3.5" /></Button>
                    )}
                    {d.status === "recebido" && (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => aprovarDoc(d.id)}>Aprovar</Button>
                        <Button size="sm" variant="destructive" onClick={() => setRejeitando(d.id)}>Rejeitar</Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="tec" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Os documentos técnicos (Memorial Descritivo e Diagrama Unifilar) são gerados na aba
              <strong> Engenharia</strong> a partir do card vinculado, onde ficam os dados técnicos e responsável.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.open(`/engenharia`, "_blank")}>
                <FileText className="h-4 w-4 mr-1" /> Abrir Engenharia
              </Button>
              <Button variant="outline" onClick={() => window.open(`/engenharia`, "_blank")}>
                <Cable className="h-4 w-4 mr-1" /> Gerar diagrama
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={!!rejeitando} onOpenChange={(v) => !v && setRejeitando(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Motivo da rejeição</DialogTitle></DialogHeader>
            <Textarea value={motivoRejeitar} onChange={(e) => setMotivoRejeitar(e.target.value)} rows={3} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejeitando(null)}>Cancelar</Button>
              <Button onClick={confirmarRejeicao} disabled={!motivoRejeitar.trim()}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
