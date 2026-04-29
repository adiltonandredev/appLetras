# Guia de Setup — Repertório Litúrgico

Este guia cobre tudo desde a criação do projeto Supabase até o servidor rodando localmente.

---

## Pré-requisitos

| Ferramenta | Versão mínima | Instalação |
|---|---|---|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| pnpm | 9+ | `npm install -g pnpm` |
| Supabase CLI | 1.170+ | `npm install -g supabase` |
| Git | qualquer | [git-scm.com](https://git-scm.com) |

---

## Passo 1 — Criar o projeto Supabase

1. Acesse **[supabase.com](https://supabase.com)** e crie uma conta (gratuita).
2. Clique em **New project**.
3. Preencha:
   - **Organization**: crie ou selecione uma existente
   - **Name**: `repertorio-liturgico` (ou o nome que preferir)
   - **Database Password**: gere uma senha forte e **guarde-a** — você vai precisar
   - **Region**: escolha a mais próxima (ex: `South America (São Paulo)`)
4. Aguarde ~2 minutos enquanto o projeto é provisionado.

---

## Passo 2 — Obter as credenciais

No **Dashboard do seu projeto**:

1. Vá em **Settings → API**
2. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ nunca exponha no client

---

## Passo 3 — Configurar variáveis de ambiente

### Web app

```bash
cp apps/web/.env.example apps/web/.env.local
```

Abra `apps/web/.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Mobile app

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
```

Abra `apps/mobile/.env.local` e preencha:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## Passo 4 — Aplicar o banco de dados

### Opção A — Script automático (recomendado)

```bash
cd repertorio-liturgico
pnpm supabase:setup
```

O script vai:
1. Verificar o Supabase CLI
2. Vincular ao seu projeto remoto
3. Aplicar as 3 migrations em ordem
4. Aplicar o seed (roles, permissões, categorias)

### Opção B — Manual via Dashboard

Se preferir fazer manualmente, abra o **SQL Editor** no Dashboard e execute os arquivos nesta ordem:

```
1. supabase/migrations/001_initial_schema.sql
2. supabase/migrations/002_rls_policies.sql
3. supabase/migrations/003_auth_trigger.sql
4. supabase/seed.sql
```

### Opção C — Supabase CLI diretamente

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
supabase db execute --file supabase/seed.sql
```

> O **Project Ref** é o ID do projeto, encontrado em **Settings → General** ou na URL do Dashboard: `https://supabase.com/dashboard/project/SEU_PROJECT_REF`

---

## Passo 5 — Promover o primeiro Administrador

Após criar sua conta no app, você precisa promovê-la a Administrador manualmente.

No **SQL Editor** do Dashboard, execute `scripts/create-admin.sql` com seu e-mail:

```sql
-- Substitua pelo seu e-mail
UPDATE public.user_role_assignments ura
SET role_id = (SELECT id FROM public.roles WHERE name = 'administrador')
WHERE ura.user_id = (SELECT id FROM public.users WHERE email = 'seu@email.com');
```

> **Importante:** você precisa ter feito login ao menos uma vez para o usuário existir na tabela `users`.

---

## Passo 6 — Configurar OAuth (opcional)

### Google

1. Acesse [console.cloud.google.com](https://console.cloud.google.com/)
2. Crie um projeto → **APIs & Services → Credentials → Create OAuth 2.0 Client**
3. Tipo: **Web application**
4. Authorized redirect URIs:
   ```
   https://SEU_PROJETO.supabase.co/auth/v1/callback
   ```
5. Copie o **Client ID** e **Client Secret**
6. No Supabase Dashboard → **Auth → Providers → Google** → cole as credenciais e habilite

### Facebook

1. Acesse [developers.facebook.com](https://developers.facebook.com/) → **My Apps → Create App**
2. Tipo: **Consumer**
3. Em **Facebook Login → Settings → Valid OAuth Redirect URIs**:
   ```
   https://SEU_PROJETO.supabase.co/auth/v1/callback
   ```
4. Copie o **App ID** e **App Secret**
5. No Supabase Dashboard → **Auth → Providers → Facebook** → cole as credenciais e habilite

---

## Passo 7 — Instalar dependências e iniciar

```bash
# Na raiz do monorepo
pnpm install

# Iniciar web + packages em modo dev
pnpm dev

# OU somente web
pnpm dev:web

# OU somente mobile
pnpm dev:mobile
```

O web estará em **http://localhost:3000**.  
O mobile estará disponível via **Expo Go** (escanear QR code).

---

## Comandos úteis

| Comando | O que faz |
|---|---|
| `pnpm supabase:setup` | Aplica migrations + seed no projeto remoto |
| `pnpm supabase:push` | Envia novas migrations para o remoto |
| `pnpm supabase:pull` | Baixa o schema atual do remoto |
| `pnpm supabase:diff` | Gera migration a partir das mudanças locais |
| `pnpm supabase:start` | Inicia Supabase local (Docker) |
| `pnpm supabase:studio` | Abre o Studio local em localhost:54323 |
| `pnpm supabase:reset` | ⚠️ Reset total do banco (só dev) |
| `pnpm type-check` | Verifica TypeScript em todos os pacotes |
| `pnpm lint` | ESLint em todo o monorepo |
| `pnpm build` | Build de produção de todos os apps |

---

## Desenvolvimento local com Supabase local (avançado)

Se quiser rodar o Supabase completamente local (requer Docker):

```bash
# Iniciar todos os serviços locais
pnpm supabase:start

# O CLI vai exibir as URLs e chaves locais, ex:
# API URL:   http://localhost:54321
# anon key:  eyJ...
# Studio:    http://localhost:54323
```

Substitua as variáveis no `.env.local` pelas locais enquanto desenvolve.

---

## Estrutura do banco de dados

| Tabela | Descrição |
|---|---|
| `users` | Perfis dos usuários (criados automaticamente no signup) |
| `roles` | Níveis de acesso (padrao, intermediario, master, administrador) |
| `user_role_assignments` | Relação usuário ↔ role |
| `songs` | Músicas com letra, cifra, metadados |
| `song_revisions` | Histórico de versões de cada música |
| `song_approvals` | Fluxo de aprovação (draft → pending → approved) |
| `song_categories` | Relação música ↔ categoria litúrgica |
| `liturgical_categories` | Categorias (Entrada, Ofertório, Comunhão, etc.) |
| `repertories` | Repertórios de celebrações |
| `repertory_items` | Músicas dentro de cada repertório |
| `audit_logs` | Log de auditoria de todas as ações |

---

## Solução de problemas

**`supabase: command not found`**
```bash
npm install -g supabase
# ou
brew install supabase/tap/supabase
```

**Erro ao vincular o projeto**
```bash
supabase login   # autenticar primeiro
supabase link --project-ref SEU_PROJECT_REF
```

**Erro de RLS / permissões negadas**
- Verifique se o seed foi aplicado (roles e permissões precisam existir)
- Verifique se o usuário tem o role correto em `user_role_assignments`

**Migrations já aplicadas (erro de tabela existente)**
```bash
# Ver estado atual das migrations
supabase db diff
# Ou reset completo em dev
pnpm supabase:reset
```

**OAuth não funciona em localhost**
- Adicione `http://localhost:3000/auth/callback` nas URIs autorizadas do Google/Facebook
- No Supabase Dashboard → Auth → URL Configuration → adicione `http://localhost:3000` em Site URL
