## Portal do Cliente — Plano de Implementação

Funcionalidade de portal público de acompanhamento de projeto, ativada quando um card do pipeline vai para "Contrato Assinado".

### 1. Modelo de dados (local — Zustand store)

Estender `Proposta`/`PipelineCard` ou criar novo tipo `ProjetoCronograma` no `src/lib/types.ts`:

```ts
type EtapaStatus = "pendente" | "em_andamento" | "concluida";

type EtapaProjeto = {
  id: "contrato" | "compra" | "homologacao" | "agendamento" | "instalacao" | "ativacao" | "posvenda";
  status: EtapaStatus;
  dataPrevista?: string;
  dataReal?: string;
  observacoesInternas?: string;
  // campos específicos por etapa (fornecedor, protocolo, periodo, lider, fotos[], modulos, medidor, geracaoEstimada, pendencia, concessionariaNome)
  extra?: Record<string, any>;
};

type ProjetoCliente = {
  id: string;            // = token do link
  cardId: string;
  clienteId: string;
  consultorId: string;
  potenciaKwp: number;
  valorInvestimento: number;
  criadoEm: string;
  etapas: EtapaProjeto[];
};
```

Persistido no Zustand (já usa `persist` em localStorage). Ações: `criarProjetoCliente(cardId)`, `updateEtapa(projetoId, etapaId, patch)`.

### 2. Trigger ao mover para "Contrato Assinado"

Em `src/components/pipeline/KanbanColumn.tsx` (ou onde `moveCard` é chamado no DndContext do `pipeline.tsx`), interceptar quando `stage === "contrato"` e o card ainda não tem projeto associado:

- Abrir `GerarLinkProjetoModal` com:
  - Texto "Projeto confirmado! Gerar link de acompanhamento para o cliente?"
  - Botão "Gerar Link" → chama `criarProjetoCliente(card.id)`, gera token (`uid()`), retorna URL `/cliente/acompanhamento/{token}`
  - Mostra link + botão "Copiar Link" + botão "Enviar via WhatsApp" (abre `https://wa.me/55{tel}?text=...` com mensagem pronta)
- Botão "Pular" (caso o admin não queira gerar agora) — link pode ser gerado depois pela aba Cronograma.

### 3. Página pública do portal

Criar rota `src/routes/cliente.acompanhamento.$token.tsx` (TanStack file-based routing, dot-separated).

- Sem autenticação (usa store local — funciona pois é app single-tenant local; o token serve como chave de busca).
- Layout sem `AppSidebar`/`Topbar` — header próprio só com logo Vert.
- Componentes:
  - `<HeaderPortal>` — logo, "Olá, {nome}!", subtítulo
  - `<ResumoProjeto>` — kWp, valor (brl com 2 casas), consultor + telefone
  - `<TimelineEtapas>` — stepper vertical, 7 etapas, cada uma com ícone, título, descrição, badge de status, data, campos visíveis ao cliente
  - `<BotaoWhatsAppFlutuante>` — fixed bottom-right verde
- Cores: usa tokens existentes (`vert`, `vert-dark`) já definidos no design system.
- Reativo: como usa `useStore` (Zustand), atualiza automaticamente quando admin edita.

### 4. Aba "Cronograma do Projeto" no CRM

Adicionar em `src/routes/clientes.$id.tsx` (e/ou modal a partir do card do pipeline) uma nova aba/seção `<CronogramaProjetoAdmin projetoId={...} />`:

- Listagem das 7 etapas em accordion ou cards expansíveis
- Cada etapa: dropdown de status, inputs de data (date), campos específicos, textarea de observações internas
- Validação: status só vai para "concluida" se `dataReal` preenchida (mostrar toast caso contrário)
- Barra de progresso geral (`x de 7 — y%`) usando `<Progress>`
- Botões topo: "Copiar link do cliente", "Enviar atualização via WhatsApp"
- Upload de fotos da instalação: usar input file local convertendo para base64 e armazenando no `extra.fotos[]` do etapa "instalacao" (mantém tudo client-side, consistente com o resto do app)

### 5. Estilo visual

- Etapa concluída: fundo `bg-vert/10`, borda `border-vert`, ícone check verde
- Etapa atual (em_andamento): borda `border-vert-light` + animação `animate-pulse` sutil
- Etapa pendente: cinza (`text-muted-foreground`, `border-border`)
- Mobile-first: timeline vertical em coluna única, padding generoso, botões grandes

### 6. Helpers

`src/lib/portalCliente.ts`:
- `gerarMensagemWhatsAppInicial(cliente, link, consultor)`
- `gerarMensagemWhatsAppAtualizacao(cliente, link, consultor)`
- `etapasIniciais()` — retorna array com 7 etapas em status "pendente" (exceto "contrato" já "concluida" com data atual)
- `progressoProjeto(projeto)` — `{ concluidas, total, pct }`

### 7. Arquivos a criar/editar

**Criar:**
- `src/lib/portalCliente.ts`
- `src/components/pipeline/GerarLinkProjetoModal.tsx`
- `src/components/projeto/TimelineEtapas.tsx`
- `src/components/projeto/CronogramaProjetoAdmin.tsx`
- `src/routes/cliente.acompanhamento.$token.tsx`

**Editar:**
- `src/lib/types.ts` — adicionar tipos
- `src/lib/store.ts` — adicionar `projetos`, ações
- `src/lib/seed.ts` — opcional, deixar vazio
- `src/routes/pipeline.tsx` — interceptar mudança para "contrato"
- `src/routes/clientes.$id.tsx` — adicionar aba Cronograma

### Observações técnicas

- O acesso "sem login" funciona porque o app inteiro é client-side (Zustand + localStorage). O cliente abrindo o link pelo navegador **dele** não terá os dados — para um portal real cross-device seria preciso backend (Supabase). Vou implementar usando o storage local existente para manter consistência com o restante do CRM (propostas, clientes etc. todos no Zustand). Se quiser sincronia entre dispositivos, posso migrar para Supabase em uma segunda etapa.
