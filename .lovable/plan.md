## Vert CRM — Sistema completo de gestão para Vert Energie

CRM inspirado no Ploomes, com 8 módulos integrados, foco em energia solar fotovoltaica. Visual limpo na identidade Vert (verde escuro #0d5234 + verde claro #5ee89a), tipografia Syne + DM Sans.

### Estratégia de entrega

Por ser um sistema muito grande, vou entregar em **2 fases**:

**FASE 1 (esta entrega) — Core do CRM funcional ponta-a-ponta:**
1. Layout base: sidebar fixa colapsável + header com busca/notificações
2. Dashboard executiva com KPIs, gráficos e alertas
3. Pipeline Kanban com drag-and-drop completo (10 etapas)
4. Clientes — CRUD completo + perfil com timeline
5. Propostas — listagem + criação com simulador financeiro (Tabela Price)
6. Produtos & Serviços — catálogo com cálculo de margem
7. Configurações básicas (empresa, usuários, motivos de perda, SLA, metas)
8. Persistência total via **localStorage** (com seed inicial de demonstração)
9. Integração com o gerador de proposta enviado: copio o HTML para `public/gerador-proposta.html` e abro em nova aba pré-preenchido com query string do cliente

**FASE 2 (próxima mensagem, se aprovado):**
- Agenda/Atividades com calendário (mês/semana/dia)
- Relatórios avançados com exportação CSV
- Geração de PDF da proposta nas 7 páginas (jsPDF + html2canvas)
- Permissões granulares por perfil (admin/consultor/instalador)

Essa divisão garante que tudo entregue na Fase 1 funciona de verdade — não ficam telas pela metade.

### Arquitetura técnica

```text
src/
  styles.css                    → tokens Vert (verde, Syne+DM Sans), classes utilitárias
  routes/
    __root.tsx                  → SidebarProvider + Topbar + Outlet
    index.tsx                   → Dashboard
    pipeline.tsx                → Kanban
    clientes.tsx                → Lista de clientes
    clientes.$id.tsx            → Perfil do cliente
    propostas.tsx               → Lista de propostas
    propostas.nova.tsx          → Criar proposta (simulador)
    propostas.$id.tsx           → Detalhe/edição
    produtos.tsx                → Catálogo
    relatorios.tsx              → Stub Fase 2
    agenda.tsx                  → Stub Fase 2
    configuracoes.tsx           → Empresa/usuários/SLA/metas
  components/
    layout/AppSidebar.tsx, Topbar.tsx
    dashboard/KpiCard.tsx, FunilChart.tsx, ReceitaChart.tsx,
              SegmentoPie.tsx, RankingConsultores.tsx, Alertas.tsx
    pipeline/KanbanBoard.tsx, KanbanColumn.tsx, KanbanCard.tsx,
              MotivoPerdaModal.tsx, FiltrosPipeline.tsx
    clientes/ClienteForm.tsx, ClienteTimeline.tsx, ClienteAcoesRapidas.tsx
    propostas/SimuladorFinanceiro.tsx, MontagemSistema.tsx,
              ParcelasTable.tsx
    produtos/ProdutoForm.tsx, ProdutoTabela.tsx
    ui/EmptyState.tsx, ConfirmDialog.tsx, AvatarInicial.tsx
  lib/
    store.ts                    → Zustand + persist (localStorage chave "vert-crm-v1")
    seed.ts                     → Dados de demonstração realistas
    finance.ts                  → Tabela Price, payback, ROI 20 anos, dimensionamento
    format.ts                   → BRL, kWh, kWp, datas pt-BR, CPF/CNPJ
    types.ts                    → Tipos: Cliente, Card, Proposta, Produto, Usuario, Atividade
public/
  gerador-proposta.html         → Cópia do HTML enviado pelo usuário
```

### Decisões técnicas-chave

- **Estado**: Zustand + middleware `persist` no localStorage. Uma única store com slices por domínio. Hidratação automática no boot.
- **Drag-and-drop Kanban**: `@dnd-kit/core` + `@dnd-kit/sortable` (leves, acessíveis, sem react-beautiful-dnd que está deprecado).
- **Gráficos**: `recharts` (já no stack shadcn). Funil = BarChart horizontal; receita = LineChart; segmento = PieChart.
- **Formulários**: react-hook-form + zod (já instalados).
- **Datas**: `date-fns` com locale pt-BR.
- **Cálculos financeiros**: módulo `finance.ts` puro com Tabela Price, payback, projeção 20 anos com inflação energética.
- **Integração com gerador**: o HTML enviado vira `public/gerador-proposta.html`. Botão "Abrir Gerador" passa dados via querystring (`?nome=&consumo=&tarifa=&kwp=&valor=`) — o HTML já é autocontido.
- **Seed**: ao primeiro boot, popula 12 clientes, 18 cards distribuídos no funil, 6 propostas, 24 produtos do catálogo, 3 consultores. Botão "Resetar dados" em Configurações.
- **Mobile**: sidebar colapsa para ícones; Kanban vira scroll horizontal; tabelas viram cards empilhados.

### Identidade visual aplicada

- Sidebar `#0d5234` com logo "vert.⚡energie" no topo, item ativo com barra `#5ee89a` à esquerda
- Cards Kanban brancos com badge colorido por etapa (10 cores distintas no design system)
- KPIs com número em Syne 32px, label em DM Sans uppercase
- Alerta de SLA: borda esquerda vermelha + ícone relógio
- Ícone de origem do lead: 4 ícones distintos (Megaphone/UserPlus/Phone/RefreshCw)

### O que NÃO entrego nesta fase (e por quê)

- **Geração de PDF da proposta nas 7 páginas**: complexa, melhor isolar na Fase 2 reaproveitando o layout do HTML enviado.
- **Calendário completo de agenda**: precisa lib pesada (FullCalendar ou react-big-calendar) — fica para Fase 2.
- **Permissões granulares por perfil**: nesta fase todos os usuários veem tudo (modo admin). Estrutura de perfis já fica no cadastro.
- **Supabase/multi-usuário real**: localStorage atende perfeitamente para uso individual/POC. Migração para Cloud quando o usuário pedir.

Após aprovação, começo pela base (styles + store + seed + layout) e vou módulo por módulo.