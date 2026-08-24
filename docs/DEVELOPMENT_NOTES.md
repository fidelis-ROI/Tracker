# ROI Tracker — Notas de Desenvolvimento

> Este arquivo existe para manter contexto entre sessões de desenvolvimento.
> Antes de continuar qualquer tarefa, leia este arquivo. Ao terminar uma tarefa
> relevante, atualize a seção **Log de mudanças** e o **Próximo passo pendente**.

---

## 1. Stack e arquitetura

- **Next.js 16** (App Router) — usa `proxy.ts` na raiz (não `middleware.ts`, foi renomeado no Next 16)
- **Prisma v7** — datasource URL fica em `prisma.config.ts`, não no `schema.prisma`. Client precisa de adapter (`@prisma/adapter-pg`) para instanciar
- **Postgres** (Railway) — banco de produção. **Não existe banco local** — não dá pra rodar `npm run dev` e testar fluxos autenticados na máquina local, porque não há Postgres local disponível (sem Docker/Homebrew instalados nesta máquina)
- **NextAuth v4** — JWT strategy, dois providers: `CredentialsProvider` (email/senha) e `GoogleProvider` (SSO, ver seção 5)
- **Tailwind v4 + shadcn/ui** (base em `@base-ui/react`)
- **Zod v4** — atenção: não tem `required_error` em `z.number()`

### Particularidades de ambiente (macOS, diretório com espaço no nome)
- `node_modules/.bin/*` não funciona como symlink (espaço no path quebra). Sempre rodar binários via caminho completo:
  ```bash
  PATH="/Users/rodrigonogueira/.nvm/versions/node/v24.18.0/bin:$PATH" \
  /Users/rodrigonogueira/.nvm/versions/node/v24.18.0/bin/node node_modules/next/dist/bin/next build --webpack
  ```
- **Turbopack quebra** nesta máquina (não acha `node` no PATH do worker Rust). Sempre usar `--webpack` nos scripts `dev`/`build` (já configurado em `package.json`).
- `eslint` via `.bin` também quebra pelo mesmo motivo do symlink — usar `tsc --noEmit` + `next build` como validação (cobre erros de tipo e imports não usados via build warnings).

---

## 2. Deploy (Railway)

- Projeto Railway: **vivacious-mindfulness**, serviço **Tracker**
- URL produção: `https://tracker-production-b258.up.railway.app`
- Repo GitHub: `fidelis-ROI/Tracker`, branch `main`
- **Deploy é automático no push** — Railway está conectado ao GitHub
- Banco: serviço **Postgres** no mesmo projeto Railway

### Fluxo padrão para qualquer mudança de schema Prisma
1. Editar `prisma/schema.prisma`
2. Criar migration manualmente em `prisma/migrations/<timestamp>_nome/migration.sql`
   (não dá pra usar `prisma migrate dev` pois não há banco local — escrever o SQL à mão ou gerar via `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script`, que **requer** `shadowDatabaseUrl` configurado — geralmente mais simples escrever o ALTER TABLE manualmente para mudanças simples)
3. `rm -rf app/generated/prisma && npx prisma generate` (local, só pra gerar tipos)
4. `tsc --noEmit` e `next build --webpack` para validar
5. Commit + push (auto-push sempre, ver seção 6)
6. Aguardar o Railway buildar (~1-2 min), depois abrir o **Console** do serviço no Railway (via browser) e rodar:
   ```bash
   npx prisma migrate deploy
   ```
   **Isso é uma ação em banco de produção — sempre pedir confirmação ao usuário antes de rodar.**
7. Se necessário popular/atualizar dados: `npx tsx prisma/seed.ts` (idempotente, usa `upsert`)

### Como acessar o Railway
- Login: via browser (Claude_Browser tools), usuário já autenticado com GitHub OAuth
- Console do serviço: `Deployments` tab → ou aba `Console` → digitar comando → Enter
- Variables: aba `Variables` → `Raw Editor` pra editar várias de uma vez

---

## 3. Sistema de marca (brand system)

O produto tem **dois temas visuais coexistindo**, escolhidos por cliente (campo `Client.brand`):

| | **ROI** (atual/padrão) | **NitroAds** (legado) |
|---|---|---|
| Cor primária | Roxo `#7919FF` / `#7C1EFB` / `#A970FF` / `#5B21F0` | Azul `#1440FF` |
| Fundo | `#0B0E17` (admin/operador) / `#05070d` (login) | `#00020A` |
| Fonte | `font-sans` (system) | `font-titillium` / `font-manrope` (legado, ainda usada só no tema NitroAds) |
| Tela de voto pública | 1 NPS único + campo aberto | 2 blocos (Tráfego + Criativos) |
| Copy | Tom profissional ("Pesquisa de Satisfação") | Tom racing/F1 ("Pit Stop Report", "Piloto", "escuderia") |
| Serviços contratados | Checklist fixo: Tráfego, Estratégia, CRM, RevOps, Consultoria | Texto livre |

**Todas as telas internas (admin, operador)** usam sempre o tema ROI (roxo) — a marca do cliente só afeta a tela pública `/r/[slug]`.

### Componentes compartilhados já com o tema ROI
- `components/nps/NpsLabel.tsx` — pill com bolinha colorida (Promotor/Neutro/Detrator) — **só aparece nas telas internas**, foi removido da tela pública por pedido do cliente
- `components/nps/RatingScale.tsx` — escala 0-10 roxa (tela pública ROI usa esse; tela pública NitroAds usa `NitroRatingScale` inline dentro de `app/r/[slug]/page.tsx`)
- `components/admin/Sidebar.tsx` e `components/operador/Sidebar.tsx` — nav roxo

### Logo
Ainda não temos o PNG real do logo (`roi-icon.png` do projeto de design) — todo lugar usa um SVG placeholder (seta ascendente roxa) porque o arquivo binário é grande demais para transcrever manualmente com segurança. **Se o usuário mandar o PNG direto no chat, dá pra usar o Read tool nele e então gravar via Write/base64 sem risco de corrupção.**

---

## 4. Modelo de dados (Prisma) — resumo

```
Client       — id, name, slug, active, hasDesigner, brand ("roi"|"nitroads"),
               ticket, contractDate, services (JSON string), operators (via ClientOperator)
Collaborator — id, name, role ("gestor_trafego"|"designer"), active, salary, variable,
               hireDate, adminUser (1:1 opcional)
ClientOperator — pivot genérico Client <-> Collaborator (usado tanto pra "gestor responsável"
                  quanto "designer responsável" — não distingue por role na tabela, só pela
                  role do Collaborator vinculado)
NpsResponse  — clientId, month, trafegoScore (obrigatório), trafegoCollab (auto-atribuído),
               designerScore (opcional), designerCollab (auto-atribuído), feedback, submittedAt
AdminUser    — email, password (nullable — null = login só via Google SSO), role ("admin"|"operator"),
               collaboratorId (opcional, liga a um Collaborator quando role=operator)
```

### Regra importante: quem avaliou é definido pelo admin, não pelo cliente
Desde a última mudança, o cliente **não escolhe** qual gestor/designer avaliou no formulário público.
O backend (`app/api/nps/route.ts`) auto-atribui `trafegoCollab`/`designerCollab` no POST, buscando em
`ClientOperator` o collaborator com `role: "gestor_trafego"` e `role: "designer"` respectivamente,
vinculados àquele `clientId`. Isso é definido na tela `/admin/clientes` (seções "Gestor de tráfego
responsável" e "Designer responsável").

---

## 5. Autenticação

- **Login por senha**: `CredentialsProvider`, bcrypt hash em `AdminUser.password`
- **Login Google Workspace** (adicional, não substitui senha):
  - Domínio permitido: `@roipartners.com.br` (constante `ALLOWED_GOOGLE_DOMAIN` em `lib/auth.ts`)
  - **Ter o domínio certo não basta** — o e-mail precisa já existir como `AdminUser` (verificação
    dupla no callback `signIn`). Sem isso, erro `not_registered` aparece na tela de login.
  - `fidelis@roipartners.com.br` já está cadastrado como admin (senha null, só Google)
  - Env vars necessárias: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (já configuradas no Railway)
  - Redirect URI cadastrado no Google Cloud: `https://tracker-production-b258.up.railway.app/api/auth/callback/google`
  - **Para dar acesso a mais gente do domínio**: não existe UI ainda — precisa inserir direto no
    banco (`AdminUser` com `password: null`) via console do Railway, ou construir uma tela pra isso

### Credenciais de teste (seed)
| Usuário | Email | Senha |
|---|---|---|
| Admin | `admin@nitroads.com.br` | `nitroads2025` |
| Admin (Google) | `fidelis@roipartners.com.br` | — (só Google) |
| Operador (Lucas) | `lucas@nitroads.com.br` | `lucas2025` |

---

## 6. Convenções de trabalho combinadas com o usuário

- **Sempre commitar e dar push automaticamente** depois de qualquer mudança de código, sem esperar
  pedido explícito (repo `fidelis-ROI/Tracker`). Ver memória `feedback_auto_push_github`.
- **Nunca rodar migration ou seed em produção sem confirmar antes** com o usuário (AskUserQuestion) —
  mesmo sendo operações idempotentes/aditivas.
- Sempre validar com `tsc --noEmit` + `next build --webpack` antes de dar push.
- Depois do push, aguardar o Railway buildar e **verificar visualmente no browser** (screenshot) antes
  de reportar como concluído — não basta o build passar localmente.
- Design novo vem sempre via `DesignSync` (Claude Design MCP), projeto
  `8bd56c3c-4e49-4d84-b5fc-c002f31b170e` ("ROI Tracker interface redesign"). Buscar o arquivo `.dc.html`
  específico com `get_file`, extrair specs de cor/espaçamento/copy do HTML, e então implementar em React
  seguindo o design system já estabelecido (seção 3 deste doc), sem tentar transcrever imagens/PNGs
  binários manualmente.

---

## 7. Log de mudanças (mais recente primeiro)

- **2026-07-28**: Adicionada feature **Boards** (Kanban estilo ClickUp) em `/admin/boards`. Ver seção 9.
  Novas tabelas: `Board`, `BoardTag`, `BoardCard` (self-relation `parentId` p/ subtarefas),
  `CardChecklistItem`, `CardAttachment`, `CardComment`, `CardActivity` (timeline), `CardRelation`.
  Migration `20260728000000_add_boards`. **Rodar `prisma migrate deploy` no console do Railway.**
- **2026-07-13**: Adicionado login Google Workspace (domínio `@roipartners.com.br` + allowlist via
  `AdminUser`). `AdminUser.password` virou nullable.
- **2026-07-13**: Removida escolha de gestor/designer pelo cliente no formulário público — agora
  auto-atribuído pelo backend a partir da atribuição feita pelo admin. Cliente ROI ganhou checklist
  fixo de serviços (Tráfego, Estratégia, CRM, RevOps, Consultoria). Cliente ROI vota com 1 NPS único
  (sem separar Tráfego/Criativos); NitroAds mantém os 2 blocos.
- **2026-07-13**: Removidas as tarjas Promotor/Neutro/Detrator da tela pública de voto; notas 1-10
  passaram a ser obrigatórias (só o campo aberto ficou opcional).
- **2026-07-10**: Adicionado campo `Client.brand` (roi | nitroads) — tela pública de voto e cadastro
  de cliente ficaram condicionais por marca. Dashboard ganhou seção "Por Marca" (NPS médio + ticket
  médio segregados).
- **2026-07-09/10**: Rebrand completo de "NitroADS Tracker" (azul, tema F1) para "ROI Tracker" (roxo).
  Todas as telas (login, dashboard, clientes, operadores, portal do operador) redesenhadas seguindo
  designs do Claude Design. Migração de SQLite → Postgres pra persistir dados em produção no Railway
  (Railway tem filesystem efêmero).

---

## 8. Tela Financeiro (`/admin/financeiro`) — regras de cálculo

Implementada em `app/api/admin/financeiro/route.ts` (admin-only, `/admin/*` já é gated pelo proxy).
As fórmulas foram **reverso-engenheiradas a partir dos números exatos do mockup** (design tinha dados
de exemplo que batiam exatamente com essas contas — validado antes de implementar):

- **LT (lifetime) de um cliente** = meses inteiros entre `contractDate` e hoje (mínimo 0)
- **Receita acumulada (cliente)** = `ticket × LT`
- **LTV Projetado (cliente)** = `ticket × (LT + PROJECTION_MONTHS)`, com `PROJECTION_MONTHS = 6`
  (assume que o cliente permanece pagando o ticket atual por mais 6 meses a partir de hoje)
- **MRR da carteira** = soma do `ticket` dos clientes **ativos** com ticket+contractDate preenchidos
- **Ticket médio / LT médio (carteira)** = média simples entre os clientes ativos
- **LTV médio (carteira)** = `Ticket médio × LT médio` (não é a média dos LTVs individuais)
- **Receita acumulada (carteira)** = soma da receita acumulada de **todos** os clientes com
  ticket+contractDate, ativos ou não — dinheiro já faturado não some quando o cliente cancela
- **NPS por cliente** = mesmo cálculo usado no resto do app (`(promotores − detratores) / total × 100`,
  baseado em `trafegoScore` de todas as respostas do cliente, sem filtro de mês)
- **NPS médio da carteira** = média do NPS de cada cliente ativo (não é o NPS agregado de todas as
  notas juntas) — só entram clientes com pelo menos 1 resposta
- **Zonas de NPS** (metodologia Bain adaptada): `≥70` Zona de excelência, `50–69` Zona de qualidade,
  `0–49` Zona de aperfeiçoamento, `<0` Zona crítica
- **Evolução do MRR (6 meses)** = para cada mês, soma o ticket dos clientes **atualmente ativos**
  cujo `contractDate` já existia até o fim daquele mês

### Limitações conhecidas (documentar se o usuário perguntar por que os números "não batem")
- O schema não tem uma data de cancelamento/churn — só `active: boolean`. Isso significa:
  - Receita acumulada de um cliente inativo usa LT = tempo até **hoje**, não até quando ele saiu
    (pode superestimar levemente clientes cancelados há muito tempo)
  - "Evolução do MRR" só reflete clientes ativos hoje — não reconstrói o MRR histórico real incluindo
    quem já cancelou
  - Se o usuário quiser precisão histórica real, sugerir adicionar um campo `churnDate` ao `Client`
- Só entram nos cálculos financeiros clientes com **ticket E contractDate** preenchidos — os que
  faltam algum desses dois campos ficam de fora silenciosamente (não gera erro, só não soma)

### Arquivos
- `app/api/admin/financeiro/route.ts` — cálculos (admin-only)
- `app/admin/financeiro/page.tsx` — UI (4 cards principais, 2 cards LT/LTV, tabela "Receita por
  cliente", gráfico de barras "Evolução do MRR")
- `components/admin/Sidebar.tsx` — item "Financeiro" com badge "ADMIN" (só decorativo, já que
  `/admin/*` é 100% admin-only via proxy — operador nunca chega lá)

---

## 9. Boards (`/admin/boards`) — Kanban de tarefas

Kanban estilo ClickUp para gestão interna de tarefas. **Compartilhado entre admin e operador** — todos veem os mesmos boards/cards (workspace único do time). Um operador pode criar tarefa e atribuir para outro. UI vive em dois lugares que renderizam os **mesmos componentes** (`components/boards/BoardsListView.tsx` e `BoardView.tsx`, parametrizados por `basePath`):
- `app/admin/boards` + `app/admin/boards/[id]` → `basePath="/admin/boards"` (sidebar admin)
- `app/operador/boards` + `app/operador/boards/[id]` → `basePath="/operador/boards"` (sidebar operador)

As APIs `/api/admin/*` de boards/cards só exigem **sessão** (qualquer logado) — exceto `DELETE` de board que exige admin. Por isso operadores usam os mesmos endpoints. `getActor()` grava o nome do operador (via `collaboratorId`) em comentários/timeline/createdBy.

### Colunas (status fixos)
`backlog` (Backlog) · `todo` (A Fazer) · `doing` (Fazendo) · `review` (Em Revisão) · `blocked` (Bloqueado) · `done` (Concluído). Constantes/labels em `lib/boards.ts` (`BOARD_STATUSES`, `STATUS_LABELS`).

### Modelo
- `Board` — name, team, color, `prefix` (ex: "MAR") + `cardSeq` (contador atômico p/ gerar código `MAR-127` via `nextCardCode()`).
- `BoardCard` — code, title, description, status, `order` (Float, ordenação na coluna), assignee/coAssignee (→ `Collaborator`), tag (→ `BoardTag`), startDate/dueDate, `parentId` (self-relation → subtarefa), createdByName/Email (string, tirado da sessão). Soft-delete via `deletedAt`.
- `BoardTag` (por board), `CardChecklistItem`, `CardAttachment` (data URL base64, **máx ~1,5 MB**, sem storage externo), `CardComment`, `CardActivity` (timeline/log — best-effort via `logActivity()`), `CardRelation` (from/to/type: relacionado|bloqueia|bloqueado_por|duplica).

### Responsáveis = `Collaborator`
Assignee/co-assignee referenciam `Collaborator` (as pessoas já cadastradas em Operadores). Admins sem Collaborator não aparecem como responsáveis — `createdBy` é gravado como string da sessão.

### UI
- `components/boards/BoardsListView.tsx` — lista de boards + criar board (recebe `basePath`).
- `components/boards/BoardView.tsx` — Kanban. Drag-and-drop **nativo HTML5** (sem lib), drop numa coluna faz PATCH do status (otimista). Quick-add por coluna. Recebe `boardId` + `basePath`.
- `components/boards/types.ts` — tipos compartilhados (`KanbanCard`, `BoardMeta`, `Collaborator`).
- `components/boards/CardPanel.tsx` — painel lateral do card (title, descrição, checklist, anexos, subtarefas, relações, comentários, timeline + sidebar com responsável, co-responsável, criado por, status, tag, início, vencimento).
- As páginas em `app/admin/boards/*` e `app/operador/boards/*` são só wrappers finos que renderizam esses componentes com o `basePath` da área.

### APIs (`/api/admin/...`)
`boards` (GET/POST) · `boards/[id]` (GET kanban / PATCH / DELETE soft) · `boards/[id]/tags` (POST) · `cards` (POST, aceita `parentId` p/ subtarefa) · `cards/[id]` (GET full / PATCH / DELETE soft) · `cards/[id]/{checklist,comments,attachments,relations}`. Todas exigem sessão; DELETE de board exige admin.

### Deferido (não implementado nesta v1)
Roadmap/List views, Planning Poker, épicos, story points, tipo de card, filtros no topo, múltiplos responsáveis, storage real de anexos (hoje é base64 no banco). Fáceis de somar depois sobre esse modelo.

---

## 10. Tema claro/escuro + design tokens (2026-07-28)

O app agora suporta **modo claro e escuro** (antes era só escuro, com cores hardcoded).

### Sistema de tokens (`app/globals.css`)
Tokens semânticos em CSS vars, com valores para `.dark` (padrão, = `:root`) e `.light`. Só eles mudam entre temas — **roxo da marca e cores de status são iguais nos dois**. Expostos como utilities Tailwind v4 via `@theme inline`:
- Superfícies: `bg-canvas` (fundo), `bg-surface` (painéis/cards), `bg-surface-hover`, `bg-raised` (modais, tiles de kanban, inputs), `bg-raised-2` (input dentro de superfície).
- Bordas: `border-line`, `border-line-strong`.
- Texto: `text-ink` (primário), `text-ink-soft`, `text-dim` (labels/secundário), `text-faint` (meta/hints).
- Marca: `text-brand`/`bg-brand` (#7C1EFB), `text-brand-soft` (ícones), `bg-brand-tint`. **Botões roxos sólidos e texto branco sobre eles ficam literais** (`bg-[#5B21F0]`, `text-white`) — funcionam nos dois temas.
- Status: `text-success/-soft`, `text-danger/-soft`, `text-warning/-soft`, `text-info`.

### Como está ligado
- `next-themes` (já era dependência) via `components/ThemeProvider.tsx` (attribute=class, defaultTheme=dark, enableSystem) no `app/layout.tsx` (com `suppressHydrationWarning`). Usuário atual continua vendo escuro por padrão.
- `components/ThemeToggle.tsx` — toggle claro/escuro. `variant="full"` nas duas sidebars (acima do "Sair"); `variant="icon"` no canto da tela de login.
- Sonner e componentes shadcn (Dialog/Sheet) já são theme-aware via a ponte de tokens `--background/--card/--popover/...` no globals.

### O que NÃO foi convertido (de propósito)
- **Tela pública de voto `/r/[slug]`** e `components/nps/RatingScale.tsx`: continuam com tema de marca fixo (escuro ROI / azul NitroAds) — é client-facing, não tem toggle. Se quiser tema claro nela também depois, dá pra estender os tokens.
- `components/nps/NpsLabel.tsx`: usa cores de status (independentes de tema), ok.

### Migração (como foi feita)
Conversão mecânica (perl) mapeando as ~640 cores hardcoded → tokens, nos arquivos internos (admin/*, operador/*, boards, sidebars, MetricCard, PageHeader). Login convertido à mão (inputs + botão Google branco preservado). Depois um passe corrigindo `text-white`→`text-ink` que tinha sido trocado errado em botões roxos sólidos (restaurado pra `text-white`). Sem mudança de schema/banco.

---

## 11. Prioridade, filtros, atrasado, observações do operador, aba ROI (2026-07-29)

- **Prioridade de card** (`BoardCard.priority` = baixa|media|alta): seletor no painel do card, chip colorido no tile (verde/âmbar/vermelho), incluída em create/update/GET + log na timeline. Migration `20260729000000`.
- **Filtros no board** (`components/boards/BoardView.tsx`): Pessoa / Tag / Prioridade — filtragem client-side dos cards já carregados, com botão "Limpar".
- **Faixa de atrasado**: card com `dueDate` no passado ganha barra vermelha à esquerda (`border-l-danger`) + badge "Atrasado · dd/mm".
- **Observações privadas do operador** (`ClientObservation`, único por cliente+colaborador): textarea na tela `/operador/clientes` (dentro do card expandido do cliente), salva via `PUT /api/operador/client-notes` — só o próprio operador lê/escreve (keyed pelo `collaboratorId` da sessão). Nota vazia apaga a observação.
- **Aba ROI** (`components/RoiHub.tsx`, rotas `/admin/roi` e `/operador/roi`, nav nas duas sidebars): "Sobre a ROI", Manual de marca, Logo (download dos PNGs reais em `public/`), Dados para NF. **Links e dados de NF são constantes editáveis no topo de `RoiHub.tsx`** (`BRAND_MANUAL_URL`, `NF_DATA`) — deixados em branco pra preencher.

---

## 12. Links por cliente, dados pessoais + avatar, nível de acesso admin, links ROI (2026-07-31)

Uma migration combinada `20260730000000_client_links_personal_data` (aplicada em prod via Console do Railway; `pg`/`prisma db execute` — Prisma v7 lê a URL de `prisma.config.ts`, **sem** `--schema`).

- **Links por cliente** (`ClientLink`, N por cliente): admin gerencia no modal de cliente (`app/admin/clientes/page.tsx`, seção "Links úteis", linhas label+url dinâmicas, padrão replace-all no POST/PUT de `/api/admin/clients`). Operador vê os links (chips externos) no card expandido do cliente em `/operador/clientes` (incluídos em `/api/operador/portfolio`). Seed inicial: **Logo COPAUTO** e **Logo CONVEX** (ids fixos `seed_copauto_logo`/`seed_convex_logo`, inseridos por `INSERT ... SELECT ... WHERE name ILIKE` + `ON CONFLICT DO NOTHING`, idempotente).
- **Dados pessoais + avatar** (campos em `Collaborator`: `fullName`, `birthDate`, `cpf`, `cnpj`, `avatarUrl`): a própria pessoa preenche no Painel Pessoal (`/operador/perfil`, card "Meus dados pessoais" + upload de avatar data-URL, cap 900 KB) via `PUT /api/operador/profile` (self-edit pelo `collaboratorId` da sessão). **Visível ao admin** em Operadores (`/admin/tripulacao`): avatar no header da linha + bloco "Dados pessoais" no expandido (só admin lê CPF/CNPJ/nascimento — retornados condicionalmente na API).
- **Nível de acesso na aba Operadores**: seletor Operador/Administrador na seção de login do modal de operador — define `AdminUser.role` (`loginRole` em `/api/admin/collaborators` POST/PUT). Cria administradores. Badge "Admin" na linha de quem tem login admin. `Collaborator.role` (gestor/designer) continua separado do nível de acesso.

---

## 13. Notificações (atribuição + menções), sino, Início = hoje (2026-08-04)

Migration `20260731000000_notifications` (aplicada em prod via Console do Railway; `npx prisma migrate deploy`). Novo modelo `Notification` (destinatário = `Collaborator`, `type` = `assigned` | `mention`, snapshot `cardCode`/`cardTitle`/`boardId`, `context` = `comment`|`description`, `read`).

- **Gatilhos** (`lib/notifications.ts` → `notify()`, best-effort, nunca notifica o próprio autor):
  - **Atribuição**: ao criar card com responsável (`POST /api/admin/cards`) e ao trocar `assigneeId`/`coAssigneeId` (`PATCH /api/admin/cards/[id]`).
  - **Menções**: o cliente envia `mentions: string[]` (ids escolhidos no autocomplete) — comentários (`POST .../comments`) e descrição (`PATCH` do card). Não há parsing de texto no servidor; a descrição só notifica os ids escolhidos naquela edição (sem spam no autosave por blur).
- **Autocomplete de menção**: `components/boards/MentionTextarea.tsx` — textarea com dropdown `@pessoa` sobre `collaborators`; ao escolher insere `@Nome ` e registra o id. Usado no box de comentário e na descrição do `CardPanel`.
- **Sino**: `components/NotificationBell.tsx` no topo das duas sidebars (`boardsBase` = `/admin/boards` ou `/operador/boards`). Badge de não-lidas, dropdown clicável, polling 30s. Clicar marca como lida e navega para `${boardsBase}/${boardId}?card=${cardId}`. API: `GET /api/notifications` (lista + `unreadCount`, destinatário = `session.user.collaboratorId`) e `PATCH` (`{id}` ou `{all:true}`) — usa `updateMany` com filtro do dono. Admin sem `Collaborator` vinculado não recebe notificações.
- **Deep-link**: `BoardView` lê `?card=` de `window.location` (sem `useSearchParams`, evita exigência de Suspense) e abre o `CardPanel`.
- **Início = hoje**: `POST /api/admin/cards` grava `startDate: new Date()` por padrão (editável depois no painel).

---

## 14. Login Google, cargo Líder, conta bancária, fix tema claro (2026-08-04)

Migration `20260804000000_bank_fields` (5 colunas em `Collaborator`) aplicada em prod via Console do Railway.

- **Fix tema claro**: os botões de seleção (nível de acesso Operador/Administrador e chips de carteira em `/admin/tripulacao`) usavam `bg-[#5B21F0]/20 ... text-white` — invisível no claro. Trocado para roxo **sólido** quando selecionado (`bg-[#5B21F0] border-[#5B21F0] text-white`), visível nos dois temas.
- **Login pelo Google (sem senha)**: `AdminUser.password` é opcional; login Google exige apenas um `AdminUser` com o e-mail (`@roipartners.com.br`) já cadastrado. No modal de operador há um switch "Login pelo Google" que esconde o campo de senha; a API (`loginGoogle` em collaborators POST/PUT) cria o `AdminUser` com `password: null`. Vale para operador ou administrador (via `loginRole`).
- **Cargo Líder**: `Collaborator.role` agora aceita `gestor_trafego | lider | designer`. Helper `lib/roles.ts` (`ROLE_LABELS`/`roleLabel`) centraliza os rótulos. Em `/admin/tripulacao`: opção no select, seção "Líderes", e a carteira de clientes aparece para gestor **e** líder. NPS/financeiro continuam filtrando só `gestor_trafego` (líder não entra no cálculo de NPS/comissão automaticamente).
- **Conta bancária** (campos em `Collaborator`: `bankHolder`, `bankInstitution`, `bankAgency`, `bankAccount`, `pixKey`): editável pela pessoa no Painel Pessoal (card "Conta bancária" com aviso explícito **"a conta precisa estar vinculada ao CNPJ"**), salvo junto do resto via `PUT /api/operador/profile`. Visível ao admin no expandido de Operadores (bloco "Conta bancária · vinculada ao CNPJ", admin-only).

---

## 15. Último acesso, notificação fixa de perfil, admin master fidelis (2026-08-04)

Migration `20260804100000_last_login` (`AdminUser.lastLoginAt`) aplicada em prod.

- **Último acesso**: `AdminUser.lastLoginAt` atualizado no login (jwt callback de `lib/auth.ts` — `account` só vem no login Google, `user` só no login por credenciais, então grava 1x por login). Exibido em `/admin/tripulacao` no expandido: "Último acesso" (data/hora) · "Nunca acessou" · "Sem acesso". Incluído em `adminUser` no GET de collaborators.
- **Notificação fixa "Complete seu perfil"**: `GET /api/notifications` calcula `profileIncomplete` (campos obrigatórios: fullName, birthDate, cpf, cnpj + bancários bankHolder/bankInstitution/bankAgency/bankAccount/pixKey). O `NotificationBell` mostra um item fixo no topo (âmbar, "Pendente") que **não some** e não pode ser marcado como lido — só desaparece quando o perfil fica completo. Clicar leva a `/operador/perfil`. O badge do sino acende (mostra "!" se não houver outras não-lidas).
- **Admin master fidelis**: `AdminUser` `fidelis@roipartners.com.br` (role `admin`, login via Google, sem senha) já existia com `collaboratorId` nulo; foi **vinculado ao Collaborator "Rodrigo Fidelis"** (`cms819q7y00210pqndhl3jugn`) via `UPDATE` no console do Railway. Operações de dados em prod feitas com `node -e` + `pg` usando query **parametrizada** (`$1` escapado como `\$1` no shell, senão o bash expande para vazio).

---

## 16. "Perfil" (renomeado) + campos de informação por cliente (2026-08-04)

Migration `20260804200000_client_info_fields` aplicada em prod.

- **Rename**: "Painel Pessoal" → **"Perfil"** (nav da sidebar do operador + título da página `/operador/perfil`). Sem mudança de comportamento — cada um continua vendo/editando só o próprio perfil (admin vê todos).
- **Campos por cliente** (scalars em `Client`, geridos pelo admin no modal de cliente, seção "Informações do cliente"): `driveUrl` (Link do Drive), `usefulInfo` (Informações úteis, textarea), `logoUrl1`/`logoUrl2`/`logoUrl3` (3 slots de logo), `notes` (Observações — **campo `notes`, não `observations`**, pois `Client.observations` já é a relação com `ClientObservation`). Salvos no POST/PUT de `/api/admin/clients`. Operador vê no card expandido de `/operador/clientes` (bloco "Materiais" com chips Drive/Logo 1-3 + "Informações úteis" + "Observações"), incluídos em `/api/operador/portfolio`. Continua existindo, separado, o "Minhas observações" privado por operador (`ClientObservation`).

---

## 17. Informações do cliente editáveis por operador/líder (2026-08-05)

Sem migração (usa as colunas de `Client` da seção 16).

- Operadores e líderes agora **veem e editam** os campos de informação do cliente (Drive, 3 logos, informações úteis, observações) — **restrito aos clientes da carteira deles**. Antes era só leitura (admin editava).
- Novo endpoint `PUT /api/operador/client-info`: valida que o cliente está na carteira do solicitante (`clientOperator` com o `collaboratorId` da sessão) antes de atualizar; admin (role admin) faz bypass da checagem de carteira.
- UI: `ClientInfoBox` (em `app/operador/clientes/page.tsx`) substituiu o bloco read-only no card expandido — inputs para Drive/logos + textareas para info/observações, botão "Salvar informações" aparece quando há mudança; `patchClient` atualiza o portfolio local após salvar. Admin continua editando pelo modal em `/admin/clientes`.

---

## 18. Fix: abrir card via notificação já estando num board (2026-08-05)

Sem migração. `BoardView` (`components/boards/BoardView.tsx`) passou a ler o `?card=` via `useSearchParams()` num efeito reativo (`[searchParams]`) — antes lia `window.location.search` só na montagem, então clicar numa notificação estando já numa página de board não abria o card até recarregar. Ao fechar o painel, `router.replace(pathname)` limpa o `?card` (permite reabrir a mesma notificação). Pages `/…/boards/[id]` são dinâmicas, então `useSearchParams` builda sem exigir Suspense.

Nota: o login admin master `fidelis@roipartners.com.br` continua fundido ao Collaborator "Rodrigo Fidelis" (`cms819q7y00210pqndhl3jugn`) — atribuições a esse colaborador geram Notification com esse `recipientId`, e o login Google carrega o mesmo `collaboratorId` na sessão, então as notificações chegam a ele.

---

## 19. Pagamento de Setup por cliente + visão financeira (2026-08-05)

Migration `20260805000000_client_setup_fee` (colunas `Client.setupFee` Float?, `Client.setupInstallments` Int?).

- **Cliente (admin)**: no modal de cliente, seção "Dados Administrativos", novo campo **Pagamento de Setup** — valor (`setupFee`) + parcelas (`setupInstallments`). Salvo no POST/PUT de `/api/admin/clients` (admin-only, junto de ticket/contrato).
- **Financeiro** (`/api/admin/financeiro` + `/admin/financeiro`): calcula setup a partir dos clientes com `setupFee > 0`. 1ª parcela cai no mês da contratação; `paidInstallments = min(installments, mesesDesdeContrato+1)`; sem `contractDate` = considerado à vista (tudo recebido). Métricas: `setupTotal` (contratado), `setupReceived` (parcelas vencidas), `setupPending` (a receber), `setupThisMonth` (parcela do mês). Nova seção "Setup" com 4 StatCards + tabela "Setup por cliente" (valor, parcelas, valor/parcela, recebido, a receber). Só admin vê (a página Financeiro já é admin-only).

---

## 20. Revisão do design system — fundação Apple (2026-08-08)

Sem migração. Passe de fundação em `app/globals.css` (aplicado a partir da skill Apple Design), lifta o app inteiro sem tocar componente por componente:

- **Tipografia**: `font-optical-sizing: auto` + `-webkit-font-smoothing: antialiased` / `text-rendering: optimizeLegibility` no `html/body`.
- **Feedback no toque (response)**: `button/[role=button]:active { transform: scale(0.97) }` — feedback físico instantâneo no press (só botões, links de nav não encolhem; transform = compositor, sem reflow). Componentes com `active:scale-*` próprio continuam vencendo (maior especificidade).
- **Easing físico**: curvas `--ease-out` (decelerate) para interativos e `--ease-in-out` para o cross-fade de tema; interativos a 150ms.
- **Foco por teclado**: `:focus-visible` com ring da marca via `:where()` (0 de especificidade — o foco próprio do componente ainda vence quando existe).
- **Seleção de texto** na cor da marca.
- **Acessibilidade** (skill §14): `prefers-reduced-motion` (mantém cross-fade curto, corta viagem/press), `prefers-reduced-transparency` (tira backdrop-blur), `prefers-contrast: more` (linhas mais fortes nos dois temas).

Botões roxos sólidos e a convenção de tokens (seção 10) continuam iguais — isto é só a camada de comportamento/tipografia/a11y por cima.

---

## 21. Boards — vencimento por data e criação com campos obrigatórios (2026-08-08)

Sem migração (usa colunas existentes).

- **Vencimento por data**: no painel do card (`CardPanel`), o campo "Vencimento" virou `type="date"` (sem hora). Ao salvar, envia `${data}T23:59` (helper `toDateInput` lê a data local de volta). Início (`startDate`) continua datetime. Card vence às 23:59 do dia, então overdue só dispara depois disso.
- **Criar card com campos obrigatórios**: o "quick add" inline (só título) foi substituído por um modal em `BoardView` (`Dialog`) que exige **Título, Vencimento, Prioridade, TAG e Responsável**. Sem todos, mostra bordas vermelhas + toast e **não salva** (`submitNew` valida antes do POST). TAG pode ser escolhida entre as do board ou criada na hora (`createNcTag` → `/api/admin/boards/[id]/tags`). O botão "+" do topo da coluna e o "Adicionar card" abrem o mesmo modal com o status daquela coluna. A validação é só no cliente — o POST `/api/admin/cards` continua aceitando os campos como opcionais (subtarefas e outros fluxos usam o mesmo endpoint sem esses campos).

---

## 22. Boards — Cliente no card (obrigatório) + ROI como cliente (2026-08-08)

Migration `20260808000000_card_client`: coluna `BoardCard.clientId` + FK (onDelete SetNull) + seed idempotente do cliente **ROI** (`id=client_roi_internal`, slug `roi-interno`, brand roi).

- **Cliente obrigatório na criação**: o modal de novo card (`BoardView`) ganhou o select **Cliente** (obrigatório, junto de vencimento/prioridade/tag/responsável). `BoardView` busca a lista via `GET /api/admin/clients` (operador também acessa; usa só id+name). Validação no cliente; sem cliente, borda vermelha + toast e não salva.
- **Editável no painel**: `CardPanel` recebe `clients` como prop e tem um select "Cliente" (patch `clientId`). `FullCard.client` no GET do card.
- **Exibição**: o cliente aparece no tile do card (nome em roxo ao lado do código) — `client` incluído no GET do board e no tipo `KanbanCard`.
- **API**: `clientId` em `/api/admin/cards` POST (create data) e PATCH (update). Continua opcional no servidor (subtarefas/outros fluxos usam o mesmo endpoint).
- **ROI como cliente**: seedado na migration. Aparece no dropdown; como não tem ticket/contractDate, não entra no financeiro/NPS.

---

## 23. Landing do Webinar InfoTime — MOVIDA para projeto separado (2026-08-24)

A landing do webinar chegou a ser criada dentro deste app (`public/webinar.html`
+ `app/api/leads/route.ts`), mas **foi removida daqui** e vive num projeto próprio.
Motivo: é um asset de campanha pública (InfoTime/Liga Sistemas), sem relação com o
CRM interno — não faz sentido acoplar (deploys/falhas compartilhados, página pública
solta no app interno).

- **Onde vive agora**: repo `fidelis-ROI/webinar-infotime` (privado), deploy próprio no
  Railway (projeto `fearless-achievement`, serviço `webinar-infotime`,
  URL `webinar-infotime-production.up.railway.app`). Stack: Node + Express, sem build.
- **O que ficou no Tracker**: nada. Os 2 arquivos foram `git rm` e a var `SLACK_WEBHOOK_URL`
  saiu do `.env` local.
- **Gotcha registrado** (custou uma sessão de debug): no Railway, valor de variável **não pode
  ter aspas**. `SLACK_WEBHOOK_URL="https://..."` guarda as aspas como parte do valor e quebra o
  `fetch`. Além disso, mudar variável **não redeploya sozinho** — precisa Redeploy/Restart manual
  pro processo pegar o novo valor.
