## Módulo de Homologação Solar (Engenharia)

Implementação completa do módulo descrito no spec, com painel interno autenticado e portal público por token para o cliente enviar documentos e acompanhar o processo junto à COELBA.

### Ordem de implementação

1. **Migração de banco** (`homologacoes` + bucket `homologacao-docs`)
   - Tabela `homologacoes` com token público, tipo, etapa, dados técnicos, datas COELBA, JSONB de documentos, mensagem cliente e observações internas
   - GRANTs para `authenticated` + `anon` (SELECT por token) + `service_role`
   - RLS: leitura pública (por token via filtro client-side); escrita só autenticado
   - Bucket privado `homologacao-docs` (20MB, JPG/PNG/WEBP/PDF) com policies de upload/select
   - Trigger `updated_at`

2. **Tipos** (`src/lib/types.ts`)
   - `HomologacaoTipo`, `HomologacaoEtapa`, `DocStatus`, `HomologacaoDoc`, `HomologacaoProcesso`, `DOCS_POR_TIPO` e labels/cores conforme spec

3. **API/hooks** (`src/lib/homologacao.api.ts`)
   - `useHomologacoesQuery(filtros)`, `useHomologacaoByToken(token)`, `useAddHomologacao`, `useUpdateHomologacao`, `useUploadDocHomologacao`
   - Helpers `gerarTokenHomologacao()` (24 chars) e `urlPortalHomologacao(token)`
   - Signed URLs (1h) para download

4. **Painel interno** (`src/routes/engenharia.homologacao.tsx`)
   - Header com filtros (etapa, tipo, consultor, busca)
   - 4 KPIs (ativo total, aguardando docs, em análise COELBA, aprovados no mês)
   - Tabela com colunas conforme spec; Sheet lateral 600px com 4 abas (Processo, Etapas, Documentos, Documentos técnicos)
   - Campos condicionais por etapa, copiar link, abrir WhatsApp
   - Aba "Documentos técnicos" reaproveita `gerarPdfMemorial` / `gerarPdfUnifilar` do `pdfEngenharia.ts`

5. **Modal de novo processo** (`src/components/homologacao/NovoProcessoModal.tsx`)
   - 3 passos: Tipo+cliente, Dados básicos, Confirmação
   - Inicializa `documentos` com `DOCS_POR_TIPO[tipo]` (status `pendente`)
   - Opção de abrir WhatsApp no fim

6. **Portal público do cliente** (`src/routes/homologacao.$token.tsx`)
   - Rota pública (sem auth), header com logo Vert
   - 3 abas: Meus dados (form ViaCEP + máscaras), Documentos (upload + progresso), Acompanhamento (timeline + status atual + WhatsApp empresa via `config_global`)
   - Mensagem da Vert em destaque quando houver `mensagem_cliente`

7. **Integração no card do pipeline** (`src/routes/pipeline.card.$cardId.tsx`)
   - Bloco "Homologação" visível para stages `contrato`/`homologacao`/`instalacao`/`ativado`
   - Botão "Novo processo" abre modal pré-preenchido; se já houver processo, mostra resumo + link cliente

8. **Navegação** (`src/components/layout/AppSidebar.tsx`)
   - Sub-item "Homologações" sob Engenharia, ícone `ClipboardCheck`, rota `/engenharia/homologacao`

### Detalhes técnicos

- Tokens: `genToken(24)` no client (mesmo padrão de `shareProposta.ts`) — coluna `token` tem default no banco como fallback
- Portal público chama `supabase.from('homologacoes').select().eq('token', token).maybeSingle()` com policy pública de SELECT
- Update via token no portal: usa a mesma policy pública só para o JSONB de documentos e campos de dados do cliente (rota fechada futuramente via RPC, mas por ora policy permite UPDATE com `WITH CHECK (true)` para simplicidade — alinhado ao padrão do projeto)
- Upload no portal: path `${token}/${docId}-${filename}`; bucket privado; URLs sempre via `createSignedUrl(1h)`
- Sem alteração em `pdfProposta.ts`, `pdfContrato.ts`, `cards.api.ts`, `propostas.api.ts`
- Cores e tipografia seguem tokens existentes (`bg-card`, `border-border`, `font-display`)

### Restrições

- A rota `/homologacao/:token` é completamente pública (nada de `_authenticated`)
- `observacoes_internas` nunca trafega para o portal do cliente
- Uploads validam mime e tamanho no cliente antes de subir
