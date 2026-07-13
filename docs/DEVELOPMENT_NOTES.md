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
