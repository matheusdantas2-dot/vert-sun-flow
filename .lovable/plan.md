# Plano de Produção — Vert CRM

Roteiro completo para sair do protótipo (dados em `localStorage`, usuário simulado) para um sistema multiusuário, seguro e publicado em domínio próprio.

---

## Fase 1 — Autenticação e papéis (1ª etapa, base de tudo)

**Objetivo:** substituir o "switcher de usuário" demo por login real, com papéis aplicados no banco.

- Criar tela `/login` (e-mail + senha) e `/cadastro` (apenas admin convida — signup público desativado)
- Criar tela `/recuperar-senha` e `/reset-password`
- Login social com Google (opcional, gerenciado pelo Cloud)
- Tabela `profiles` (nome, foto, telefone, cor, ativo) ligada a `auth.users`
- Tabela `user_roles` separada com enum `app_role` (`admin`, `gestor`, `consultor`, `tecnico`)
- Função `has_role(user_id, role)` no banco para uso em RLS
- Trigger que cria `profile` automaticamente no signup
- Layout protegido `_authenticated` no TanStack Router (todas as rotas internas atrás dele)
- Página pública `/cliente/acompanhamento/:token` continua aberta
- Substituir `currentUserId` do Zustand pelo usuário real do Supabase Auth
- Aplicar permissões da `permissoes.ts` usando o papel real

**Resultado:** cada pessoa tem login próprio, papel definido, e ninguém entra sem credencial.

---

## Fase 2 — Migração dos dados para o Lovable Cloud (etapa maior)

**Objetivo:** tudo que hoje vive no `localStorage` passa a viver no banco, com RLS por papel.

Tabelas a criar (com `created_at`, `updated_at`, `created_by`):

- `clientes` — dados cadastrais, endereço, segmento, consultor responsável
- `cards_pipeline` — etapa, dias na etapa, motivo de perda, vínculo com cliente
- `propostas` — número, valor, status, validade, itens, vínculo com cliente
- `proposta_itens` — produtos da proposta
- `projetos` — cronograma, etapas, link do portal, vínculo com card
- `etapas_projeto` — checklist de instalação/homologação
- `atividades` — agenda (visitas, ligações, tarefas)
- `interacoes` — histórico de contato com cliente
- `produtos` — catálogo (módulos, inversores, kits)
- `notificacoes` — substitui o store em memória atual
- `sla_config` — limites por etapa (1 linha global ou por consultor)
- `audit_log` — quem alterou o quê (auditoria básica)

**Regras de acesso (RLS):**
- Admin/gestor: vê tudo
- Consultor: vê apenas clientes/cards/propostas onde é o responsável
- Técnico: vê apenas projetos atribuídos a ele
- Cliente externo (sem login): apenas `/api/public/*` via token

**Migração do código:**
- Reescrever `src/lib/store.ts` para buscar do Supabase via `useQuery` (TanStack Query)
- Mutações via `createServerFn` ou cliente browser conforme o caso
- Realtime em `cards_pipeline` (Kanban atualiza ao vivo) e `notificacoes`
- Manter Zustand apenas para UI local (filtros, seleções, modais)
- Remover `seed.ts` e o `merge` do persist
- Script de importação inicial: CSV → tabelas (cliente cola dados reais uma vez)

---

## Fase 3 — Portal do cliente real

**Objetivo:** o link `/cliente/acompanhamento/:token` deixa de ser mock.

- Tabela `portal_tokens` (token, projeto_id, expira_em, ativo, total_aberturas)
- Geração de token criptograficamente seguro ao mover card para "Contrato Assinado" (ou manualmente)
- Servidor valida token via `createServerFn` pública (sem auth, mas com checagem de expiração)
- Registro de cada abertura (já existe padrão em `proposta_aberturas`)
- Botão "revogar link" e "regenerar"

---

## Fase 4 — E-mails transacionais

**Objetivo:** comunicação automática com clientes e equipe.

Pré-requisito: domínio próprio verificado (Lovable Email)

E-mails a configurar:
- Boas-vindas + verificação de e-mail (signup)
- Recuperação de senha
- Proposta enviada (com link público da proposta)
- Link do portal de acompanhamento gerado
- Notificação de visita técnica agendada
- Alerta de SLA estourado para gestor

---

## Fase 5 — Domínio, publicação e segurança

- Publicar o app (botão Publish)
- Conectar domínio próprio (ex.: `crm.vertenergie.com.br`) — registros A + TXT
- SSL automático
- Rodar **scan de segurança** completo
- Ativar **proteção contra senhas vazadas** (HIBP)
- Revisar todas as RLS manualmente com cenários: "consultor A não vê cliente do consultor B"
- Configurar visibilidade do projeto publicado como **público** (necessário para clientes acessarem o portal)
- Remover badge "Edit with Lovable" (plano Pro+)

---

## Fase 6 — Operação e onboarding

- Cadastrar usuários reais da equipe (admin convida pelo painel)
- Importar base de clientes via CSV
- Importar produtos do catálogo
- Configurar SLAs reais por etapa
- Treinar equipe (15-30 min por perfil)
- Definir backup: Cloud já faz backup diário automático

---

## Detalhes técnicos

**Stack final em produção:**
- Frontend: TanStack Start (já configurado)
- Auth: Supabase Auth via Lovable Cloud (e-mail/senha + Google)
- DB: Postgres com RLS, ~12 tabelas
- Server functions: `createServerFn` com `requireSupabaseAuth`
- Storage: bucket `propostas-pdf` (já existe) + novo bucket `projetos-anexos`
- Realtime: `supabase_realtime` em `cards_pipeline` e `notificacoes`
- E-mail: Lovable Email com domínio próprio
- Deploy: `*.lovable.app` + domínio custom

**O que NÃO muda:**
- Componentes UI (shadcn) ficam iguais
- Design system / tokens em `styles.css` ficam iguais
- Estrutura de rotas existente é preservada (apenas movida para `_authenticated/`)
- `permissoes.ts` continua sendo a fonte da verdade para UI

**Estimativa de esforço (em mensagens):**
- Fase 1: ~6-10 mensagens
- Fase 2: ~15-25 mensagens (a maior — feita por módulo: clientes → pipeline → propostas → projetos → resto)
- Fase 3: ~3-5 mensagens
- Fase 4: ~4-6 mensagens
- Fase 5: ~2-3 mensagens + ações no painel
- Fase 6: feito por você (cadastros e importação)

---

## Ordem recomendada de execução

1. **Fase 1** completa e testada
2. **Fase 2** módulo por módulo (não tudo de uma vez — cada módulo: criar tabela → migrar leitura → migrar escrita → testar)
3. **Fase 3** assim que projetos estiverem migrados
4. **Fase 4** depois que houver domínio verificado
5. **Fase 5** quando tudo acima estiver funcionando
6. **Fase 6** rollout com a equipe

Quando aprovar, começo pela **Fase 1 (autenticação + papéis)**.