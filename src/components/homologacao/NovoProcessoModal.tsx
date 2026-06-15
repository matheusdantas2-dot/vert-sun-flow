import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClientesQuery } from "@/lib/clientes.api";
import { useCardsQuery } from "@/lib/cards.api";
import { useProfilesQuery } from "@/lib/profiles.api";
import { useAddHomologacao, urlPortalHomologacao } from "@/lib/homologacao.api";
import {
  DOCS_POR_TIPO,
  HOMOLOGACAO_TIPO_DESC,
  HOMOLOGACAO_TIPO_LABEL,
  type HomologacaoTipo,
} from "@/lib/types";
import { notify } from "@/lib/notificacoes";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cardIdPreSelecionado?: string;
  clienteIdPreSelecionado?: string;
  onCriado?: (token: string) => void;
}

export function NovoProcessoModal({
  open,
  onOpenChange,
  cardIdPreSelecionado,
  clienteIdPreSelecionado,
  onCriado,
}: Props) {
  const { data: clientes = [] } = useClientesQuery();
  const { data: cards = [] } = useCardsQuery();
  const { data: profiles = [] } = useProfilesQuery();
  const addMut = useAddHomologacao();

  const [passo, setPasso] = useState(1);
  const [tipo, setTipo] = useState<HomologacaoTipo>("inicial");
  const [clienteId, setClienteId] = useState(clienteIdPreSelecionado ?? "");
  const [cardId, setCardId] = useState(cardIdPreSelecionado ?? "");
  const [consultorId, setConsultorId] = useState("");
  const [uc, setUc] = useState("");
  const [endereco, setEndereco] = useState("");
  const [potencia, setPotencia] = useState("");
  const [procOrigNum, setProcOrigNum] = useState("");
  const [procOrigData, setProcOrigData] = useState("");
  const [enviarWhats, setEnviarWhats] = useState(true);

  const cliente = clientes.find((c) => c.id === clienteId);
  const cardsDoCliente = useMemo(
    () => (clienteId ? cards.filter((c) => c.clienteId === clienteId) : cards),
    [cards, clienteId],
  );

  function preencherDoCliente(id: string) {
    setClienteId(id);
    const c = clientes.find((x) => x.id === id);
    if (c) {
      setUc(c.uc || "");
      const e = c.endereco;
      setEndereco(`${e.rua}, ${e.numero} — ${e.bairro}, ${e.cidade}/${e.uf} — CEP ${e.cep}`.trim());
    }
  }

  function reset() {
    setPasso(1);
    setTipo("inicial");
    setClienteId(clienteIdPreSelecionado ?? "");
    setCardId(cardIdPreSelecionado ?? "");
    setConsultorId("");
    setUc("");
    setEndereco("");
    setPotencia("");
    setProcOrigNum("");
    setProcOrigData("");
  }

  async function criar() {
    if (!clienteId || !uc || !endereco) {
      notify.error("Preencha os campos obrigatórios");
      return;
    }
    try {
      const created = await addMut.mutateAsync({
        tipo,
        clienteId,
        cardId: cardId || undefined,
        consultorId: consultorId || undefined,
        uc,
        enderecoInstalacao: endereco,
        potenciaKwp: potencia ? Number(potencia) : undefined,
        processoOriginalNumero: tipo !== "inicial" ? procOrigNum || undefined : undefined,
        processoOriginalData: tipo !== "inicial" && procOrigData ? procOrigData : undefined,
      });
      notify.success("Processo de homologação criado");
      if (enviarWhats && cliente?.whatsapp) {
        const url = urlPortalHomologacao(created.token);
        const tel = cliente.whatsapp.replace(/\D/g, "");
        const msg = `Olá ${cliente.nome}! Seu processo de homologação está pronto. Acesse o link para enviar seus documentos e acompanhar o andamento: ${url}`;
        window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, "_blank");
      }
      onCriado?.(created.token);
      reset();
      onOpenChange(false);
    } catch (e) {
      notify.error("Falha ao criar processo", String(e));
    }
  }

  const docs = DOCS_POR_TIPO[tipo];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo processo de homologação — Passo {passo} de 3</DialogTitle>
        </DialogHeader>

        {passo === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Tipo de homologação</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as HomologacaoTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(HOMOLOGACAO_TIPO_LABEL) as HomologacaoTipo[]).map((t) => (
                    <SelectItem key={t} value={t}>{HOMOLOGACAO_TIPO_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{HOMOLOGACAO_TIPO_DESC[tipo]}</p>
            </div>
            <div>
              <Label>Integrador (parceiro) *</Label>
              <Select value={clienteId} onValueChange={preencherDoCliente}>
                <SelectTrigger><SelectValue placeholder="Selecione o integrador…" /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                O integrador receberá um link para preencher os dados do cliente final e enviar os documentos.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Card do pipeline (opcional)</Label>
                <Select value={cardId || "_none"} onValueChange={(v) => setCardId(v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhum</SelectItem>
                    {cardsDoCliente.map((c) => (
                      <SelectItem key={c.id} value={c.id}>#{c.id.slice(0, 6)} · {c.stage}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Consultor</Label>
                <Select value={consultorId || "_none"} onValueChange={(v) => setConsultorId(v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhum</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {passo === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>UC (Unidade Consumidora) *</Label>
                <Input value={uc} onChange={(e) => setUc(e.target.value)} />
              </div>
              <div>
                <Label>Potência do sistema (kWp)</Label>
                <Input type="number" step="0.01" value={potencia} onChange={(e) => setPotencia(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Endereço de instalação *</Label>
              <Textarea value={endereco} onChange={(e) => setEndereco(e.target.value)} rows={2} />
            </div>
            {tipo !== "inicial" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nº processo original</Label>
                  <Input value={procOrigNum} onChange={(e) => setProcOrigNum(e.target.value)} />
                </div>
                <div>
                  <Label>Data do processo original</Label>
                  <Input type="date" value={procOrigData} onChange={(e) => setProcOrigData(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}

        {passo === 3 && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-border p-3 bg-muted/30 space-y-1">
              <div><strong>Tipo:</strong> {HOMOLOGACAO_TIPO_LABEL[tipo]}</div>
              <div><strong>Integrador:</strong> {cliente?.nome ?? "—"}</div>
              <div><strong>UC:</strong> {uc}</div>
              <div><strong>Endereço:</strong> {endereco}</div>
              {potencia && <div><strong>Potência:</strong> {potencia} kWp</div>}
            </div>
            <div>
              <div className="font-semibold mb-1">Documentos que serão solicitados ao integrador ({docs.length}):</div>
              <ul className="list-disc pl-5 text-xs space-y-0.5">
                {docs.map((d, i) => (
                  <li key={i}>{d.nome}{d.obrigatorio ? "" : " (opcional)"}</li>
                ))}
              </ul>
            </div>
            <label className="flex items-center gap-2 text-sm pt-2">
              <input type="checkbox" checked={enviarWhats} onChange={(e) => setEnviarWhats(e.target.checked)} />
              Enviar link do portal ao integrador agora via WhatsApp
            </label>
          </div>
        )}
            <div>
              <div className="font-semibold mb-1">Documentos que serão solicitados ({docs.length}):</div>
              <ul className="list-disc pl-5 text-xs space-y-0.5">
                {docs.map((d, i) => (
                  <li key={i}>{d.nome}{d.obrigatorio ? "" : " (opcional)"}</li>
                ))}
              </ul>
            </div>
            <label className="flex items-center gap-2 text-sm pt-2">
              <input type="checkbox" checked={enviarWhats} onChange={(e) => setEnviarWhats(e.target.checked)} />
              Enviar link de documentação ao cliente agora via WhatsApp
            </label>
          </div>
        )}

        <DialogFooter className="gap-2">
          {passo > 1 && (
            <Button variant="outline" onClick={() => setPasso(passo - 1)}>Voltar</Button>
          )}
          {passo < 3 && (
            <Button
              onClick={() => setPasso(passo + 1)}
              disabled={(passo === 1 && !clienteId) || (passo === 2 && (!uc || !endereco))}
            >
              Avançar
            </Button>
          )}
          {passo === 3 && (
            <Button onClick={criar} disabled={addMut.isPending}>
              {addMut.isPending ? "Criando…" : "Criar processo"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
