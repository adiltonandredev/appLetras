# 🎵 Repertório Litúrgico

Plataforma completa para equipes de música da Igreja gerenciarem repertórios, letras e celebrações.

## Estrutura do Projeto

```
repertorio-liturgico/
├── apps/
│   ├── web/          → Next.js 14 (App Web — admin, desktop)
│   └── mobile/       → Expo + React Native (Mobile — celebrações, offline)
├── packages/
│   ├── types/        → Tipos TypeScript compartilhados
│   ├── utils/        → Funções utilitárias compartilhadas
│   └── api-client/   → Cliente Supabase + helpers de API
└── supabase/
    ├── migrations/   → SQL migrations versionadas
    └── seed.sql      → Dados iniciais
```

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Conta no [Supabase](https://supabase.com) (gratuita)
- Expo Go no celular (para testar o mobile)

## Configuração Inicial

### 1. Clonar e instalar dependências

```bash
git clone <repo>
cd repertorio-liturgico
pnpm install
```

### 2. Configurar o Supabase

1. Crie um projeto em https://supabase.com
2. Vá em **SQL Editor** e execute em ordem:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_auth_trigger.sql`
   - `supabase/seed.sql`
3. Vá em **Authentication → Providers** e habilite:
   - **Google** (com Client ID e Secret do Google Cloud Console)
   - **Facebook** (com App ID e Secret do Meta Developers)

### 3. Configurar variáveis de ambiente

```bash
# Na raiz do projeto:
cp .env.example .env

# Em apps/web/:
cp apps/web/.env.example apps/web/.env.local
```

Edite os arquivos com suas chaves do Supabase e OAuth.

**apps/web/.env.local:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**apps/mobile/.env:**
```env
EXPO_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
```

## Rodando em Desenvolvimento

```bash
# Ambos simultaneamente:
pnpm dev

# Só o web:
pnpm dev:web

# Só o mobile:
pnpm dev:mobile
```

O web estará em http://localhost:3000  
O mobile abrirá o Expo DevTools — escaneie o QR com Expo Go.

## Criando o Primeiro Administrador

1. Crie uma conta normalmente pelo app web (login/registro)
2. No **Supabase SQL Editor**, promova o usuário para administrador:

```sql
-- Substitua 'seu@email.com' pelo e-mail cadastrado
UPDATE public.user_role_assignments ura
SET role_id = (SELECT id FROM public.roles WHERE name = 'administrador')
WHERE ura.user_id = (SELECT id FROM public.users WHERE email = 'seu@email.com');
```

## Deploy

### Web (Vercel)

```bash
# Instale a CLI da Vercel
npm i -g vercel

# Na pasta apps/web:
cd apps/web
vercel
```

Configure as variáveis de ambiente no painel da Vercel.

### Mobile (Expo EAS)

```bash
cd apps/mobile

# Instale a CLI do EAS
npm install -g eas-cli

# Login no Expo
eas login

# Build para preview (TestFlight / Play Internal)
eas build --profile preview

# Build para produção
eas build --profile production
```

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Web App | Next.js 14 + TypeScript + Tailwind CSS |
| Mobile | React Native + Expo SDK 51 |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Auth | Google OAuth + Facebook OAuth + E-mail |
| Estado | Zustand + TanStack Query |
| Offline | Expo SQLite + delta sync |
| Deploy Web | Vercel |
| Deploy Mobile | Expo EAS |

## Perfis de Acesso

| Nível | Nome | Permissões principais |
|---|---|---|
| 1 | Padrão | Visualizar, criar repertório, imprimir |
| 2 | Intermediário | + Cadastrar músicas (sujeito à aprovação) |
| 3 | Master | + Aprovar, gerenciar categorias e usuários |
| 4 | Administrador | Acesso total |
