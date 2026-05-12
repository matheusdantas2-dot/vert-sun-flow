import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useClienteQuery, useUpdateCliente, useDeleteCliente } from "@/lib/clientes.api";
import { useInteracoesByClienteQuery, useAddInteracao, useInteracoesRealtime } from "@/lib/interacoes.api";
import { usePropostasQuery } from "@/lib/propostas.api";
import { useCardsQuery } from "@/lib/cards.api";
import { brl, brlPrec, dataBR, dataHoraBR, formatDoc, formatTel, initials, kwh } from "@/lib/format";
import { ORIGEM_LABEL, SEGMENTOS_LABEL, STAGES, STATUS_PROPOSTA_LABEL } from "@/lib/types";
import { Phone, MessageCircle, Pencil, FileText, ArrowLeft, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { ClienteFormModal } from "@/components/clientes/ClienteFormModal";
import { CronogramaProjetoAdmin } from "@/components/projeto/CronogramaProjetoAdmin";

export const Route = createFileRoute("/clientes/$id")({
  component: ClienteDetalhe,
  head: () => ({ meta: [{ title: `Cliente — Vert CRM` }] }),
});

function ClienteDetalhe() {
  const { id } = Route.useParams();
  const { data: cliente, isLoading } = useClienteQuery(id);
  const { data: interacoes = [] } = useInteracoesByClienteQuery(id);
  useInteracoesRealtime(id);
  const { data: todasPropostas = [] } = usePropostasQuery();
  const { data: todosCards = [] } = useCardsQuery();
  const addInteracao = useAddInteracao();
  const updateClienteMut = useUpdateCliente();
  const deleteClienteMut = useDeleteCliente();
  const navigate = useNavigate();

  const [editOpen, setEditOpen] = useState(false);
  const [novaNota, setNovaNota] = useState("");

  const propostas = useMemo(() => todasPropostas.filter((p) => p.clienteId === id), [todasPropostas, id]);
  const cards = useMemo(() => todosCards.filter((c) => c.clienteId === id), [todosCards, id]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando…</div>;
  }
  if (!cliente) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Cliente não encontrado.</p>
        <Link to="/clientes" className="text-vert font-semibold">Voltar</Link>
      </div>
    );
  }

  const calcProposta = (p: typeof propostas[number]) =>
    p.itens.reduce((a, it) => a + (it.precoUnitario ?? 0) * it.quantidade, 0);

  const registrarNota = () => {
    if (!novaNota.trim()) return;
    addInteracao.mutate(
      { cliente_id: id, tipo: "nota", titulo: "Nota interna", descricao: novaNota },
      { onSuccess: () => setNovaNota("") },
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1300px] mx-auto">
      <Link to="/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-vert">
        <ArrowLeft className="h-4 w-4" /> Voltar para lista
      </Link>

      {/* Header card */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-vert-soft text-vert-dark flex items-center justify-center text-xl font-bold shrink-0">
            {initials(cliente.nome)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-extrabold tracking-tight">{cliente.nome}</h1>
            <div className="text-sm text-muted-foreground mt-0.5">
              {formatDoc(cliente.documento)} · {cliente.endereco.cidade}/{cliente.endereco.uf}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="badge-stage bg-vert-soft text-vert-dark">{SEGMENTOS_LABEL[cliente.segmento]}</span>
              <span className="badge-stage bg-muted text-muted-foreground">{ORIGEM_LABEL[cliente.origem]}</span>
              <span className={`badge-stage ${cliente.ativo ? "bg-vert text-white" : "bg-muted text-muted-foreground"}`}>
                {cliente.ativo ? "Ativo" : "Inativo"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`tel:+55${cliente.telefone}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent">
              <Phone className="h-4 w-4" /> {formatTel(cliente.telefone)}
            </a>
            <a href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-vert text-white text-sm hover:opacity-90">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
            <button onClick={() => setEditOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent">
              <Pencil className="h-4 w-4" /> Editar
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coluna esquerda — Dados */}
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-card rounded-xl border border-border p-5">
            <h2 className="font-display font-bold text-sm uppercase tracking-wider text-vert mb-3">Dados energéticos</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Concessionária</dt><dd className="font-medium">{cliente.concessionaria}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Grupo</dt><dd className="font-medium">{cliente.grupoTarifario}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Rede</dt><dd className="font-medium capitalize">{cliente.rede}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Consumo</dt><dd className="font-semibold">{kwh(cliente.consumoMedio)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Tarifa</dt><dd className="font-medium">{brlPrec(cliente.tarifa)}/kWh</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">UC</dt><dd className="font-mono text-xs">{cliente.uc}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Fatura mensal</dt><dd className="font-bold text-vert">{brl(cliente.consumoMedio * cliente.tarifa)}</dd></div>
            </dl>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h2 className="font-display font-bold text-sm uppercase tracking-wider text-vert mb-3">Endereço</h2>
            <p className="text-sm">
              {cliente.endereco.rua}, {cliente.endereco.numero}<br />
              {cliente.endereco.bairro}<br />
              {cliente.endereco.cidade}/{cliente.endereco.uf} · {cliente.endereco.cep}
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h2 className="font-display font-bold text-sm uppercase tracking-wider text-vert mb-3">Status no Pipeline</h2>
            {cards.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum card no pipeline.</p>
            ) : (
              <div className="space-y-2">
                {cards.map((c) => {
                  const stage = STAGES.find((s) => s.id === c.stage);
                  return (
                    <Link key={c.id} to="/pipeline" className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-accent text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: stage?.cor }} />
                        <span>{stage?.nome}</span>
                      </div>
                      <span className="font-semibold">{brl(c.valorEstimado)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => updateClienteMut.mutate({ id: cliente.id, patch: { ativo: !cliente.ativo } })} className="flex-1 px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent">
              {cliente.ativo ? "Marcar inativo" : "Marcar ativo"}
            </button>
            <button onClick={async () => { if (confirm("Excluir este cliente?")) { await deleteClienteMut.mutateAsync(cliente.id); navigate({ to: "/clientes" }); } }} className="px-3 py-2 rounded-lg border border-rose-300 text-rose-700 text-sm hover:bg-rose-50">
              Excluir
            </button>
          </div>
        </div>

        {/* Coluna direita */}
        <div className="space-y-4 lg:col-span-2">
          {/* Propostas */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-base">Propostas ({propostas.length})</h2>
              <Link to="/propostas/nova" search={{ clienteId: cliente.id }} className="inline-flex items-center gap-1.5 text-sm font-semibold text-vert hover:underline">
                <Plus className="h-4 w-4" /> Nova proposta
              </Link>
            </div>
            {propostas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhuma proposta gerada ainda.</p>
            ) : (
              <div className="space-y-2">
                {propostas.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/40">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-vert" />
                      <div>
                        <div className="font-semibold text-sm">{p.numero}</div>
                        <div className="text-[11px] text-muted-foreground">{dataBR(p.criadoEm)} · validade {dataBR(p.validadeAte)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-vert">{brl(calcProposta(p))}</div>
                      <span className="badge-stage bg-muted text-muted-foreground text-[9px]">{STATUS_PROPOSTA_LABEL[p.status]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cronograma do Projeto */}
          {cards.filter((c) => ["contrato", "homologacao", "instalacao", "ativado"].includes(c.stage)).map((c) => (
            <CronogramaProjetoAdmin key={c.id} cardId={c.id} />
          ))}

          {/* Adicionar nota */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h2 className="font-display font-bold text-base mb-3">Registrar interação</h2>
            <textarea
              value={novaNota}
              onChange={(e) => setNovaNota(e.target.value)}
              placeholder="Anote uma observação, retorno do cliente, próximos passos…"
              className="w-full p-3 rounded-lg bg-muted border border-transparent focus:bg-card focus:border-vert-light text-sm outline-none min-h-[70px]"
            />
            <button onClick={registrarNota} className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              Adicionar nota
            </button>
          </div>

          {/* Timeline */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h2 className="font-display font-bold text-base mb-4">Histórico</h2>
            {interacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma interação registrada.</p>
            ) : (
              <ol className="relative border-l-2 border-vert-soft ml-2 space-y-4">
                {interacoes.map((i) => (
                  <li key={i.id} className="ml-5">
                    <span className="absolute -left-[9px] w-4 h-4 rounded-full bg-vert border-2 border-card" />
                    <div className="text-[11px] text-muted-foreground">{dataHoraBR(i.data)} · {i.tipo}</div>
                    <div className="font-semibold text-sm">{i.titulo}</div>
                    {i.descricao && <div className="text-sm text-muted-foreground mt-0.5">{i.descricao}</div>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      <ClienteFormModal open={editOpen} onClose={() => setEditOpen(false)} cliente={cliente} />
    </div>
  );
}
