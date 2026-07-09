# NitroADS Tracker — Guia Rápido

## Credenciais padrão
- **Admin:** admin@nitroads.com.br
- **Senha:** nitroads2025

## Comandos

```bash
# Desenvolvimento
npm run dev           # Inicia em http://localhost:3000

# Banco de dados
npm run db:seed       # Popula com dados de exemplo
npm run db:migrate    # Aplica migrações

# Produção
npm run build
npm run start
```

## URLs

| Rota | Descrição |
|------|-----------|
| `/r/[slug]` | Formulário público de NPS do cliente |
| `/r/autoforce-sp` | Cliente de exemplo (seed) |
| `/admin/login` | Login da Torre de Comando |
| `/admin/dashboard` | Telemetria geral + respostas |
| `/admin/clientes` | Gestão de Pilotos (clientes) |
| `/admin/tripulacao` | Gestão de Colaboradores |

## Fluxo de uso

1. Acesse `/admin/clientes` → crie um cliente → copie o link `/r/[slug]`
2. Envie o link para o cliente responder o Pit Stop Report
3. Veja as respostas no Dashboard em `/admin/dashboard`

## Stack
- Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui
- Prisma v7 + SQLite (better-sqlite3)
- NextAuth.js v4 (credentials provider)
- Zod v4 + react-hook-form + Sonner
