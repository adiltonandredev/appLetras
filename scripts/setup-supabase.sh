#!/usr/bin/env bash
# ============================================================
# setup-supabase.sh
# Aplica migrations + seed no projeto Supabase via CLI
# Uso:  bash scripts/setup-supabase.sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "\n${BOLD}${BLUE}🎵 Repertório Litúrgico — Setup Supabase${NC}\n"

# ── 1. Verificar Supabase CLI ─────────────────────────────────────────────────
if ! command -v supabase &> /dev/null; then
  echo -e "${RED}✗ Supabase CLI não encontrado.${NC}"
  echo -e "  Instale com: ${YELLOW}npm install -g supabase${NC}"
  echo -e "  Ou via brew: ${YELLOW}brew install supabase/tap/supabase${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Supabase CLI: $(supabase --version)${NC}"

# ── 2. Verificar variáveis de ambiente ───────────────────────────────────────
ENV_FILE="apps/web/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}✗ Arquivo $ENV_FILE não encontrado.${NC}"
  echo -e "  Copie o exemplo: ${YELLOW}cp apps/web/.env.example apps/web/.env.local${NC}"
  echo -e "  E preencha com as chaves do seu projeto Supabase."
  exit 1
fi

source "$ENV_FILE"

if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" || "$NEXT_PUBLIC_SUPABASE_URL" == *"SEU_PROJETO"* ]]; then
  echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_URL não configurado em $ENV_FILE${NC}"
  exit 1
fi

if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" || "$SUPABASE_SERVICE_ROLE_KEY" == "SUA_SERVICE_ROLE_KEY" ]]; then
  echo -e "${RED}✗ SUPABASE_SERVICE_ROLE_KEY não configurado em $ENV_FILE${NC}"
  exit 1
fi

# Extrair project ref da URL (https://abcdef.supabase.co → abcdef)
PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed 's|https://||' | cut -d'.' -f1)

echo -e "${GREEN}✓ Projeto detectado: ${BOLD}$PROJECT_REF${NC}"
echo ""

# ── 3. Link com o projeto remoto ──────────────────────────────────────────────
echo -e "${BLUE}→ Conectando ao projeto Supabase...${NC}"

supabase link --project-ref "$PROJECT_REF" --password ""

echo -e "${GREEN}✓ Projeto vinculado.${NC}\n"

# ── 4. Aplicar migrations ─────────────────────────────────────────────────────
echo -e "${BLUE}→ Aplicando migrations...${NC}"

MIGRATION_COUNT=$(ls supabase/migrations/*.sql 2>/dev/null | wc -l)
echo -e "  ${MIGRATION_COUNT} arquivo(s) de migration encontrado(s)"

supabase db push

echo -e "${GREEN}✓ Migrations aplicadas com sucesso.${NC}\n"

# ── 5. Aplicar seed ───────────────────────────────────────────────────────────
echo -e "${BLUE}→ Aplicando seed (roles, permissões, categorias)...${NC}"

if [ -f "supabase/seed.sql" ]; then
  # Usar psql via supabase db execute
  supabase db execute --file supabase/seed.sql
  echo -e "${GREEN}✓ Seed aplicado.${NC}\n"
else
  echo -e "${YELLOW}⚠ seed.sql não encontrado — pulando.${NC}\n"
fi

# ── 6. Verificar extensões ────────────────────────────────────────────────────
echo -e "${BLUE}→ Verificando extensão pg_trgm (busca de texto)...${NC}"

supabase db execute --sql "CREATE EXTENSION IF NOT EXISTS pg_trgm;" 2>/dev/null && \
  echo -e "${GREEN}✓ pg_trgm ativa.${NC}\n" || \
  echo -e "${YELLOW}⚠ pg_trgm já estava ativa ou requer permissão de superuser.${NC}\n"

# ── 7. Resumo final ───────────────────────────────────────────────────────────
echo -e "${BOLD}${GREEN}════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}  ✅ Setup concluído com sucesso!${NC}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════════${NC}"
echo ""
echo -e "  Projeto:     ${BOLD}$PROJECT_REF${NC}"
echo -e "  URL:         ${BOLD}$NEXT_PUBLIC_SUPABASE_URL${NC}"
echo -e "  Dashboard:   ${BOLD}https://supabase.com/dashboard/project/$PROJECT_REF${NC}"
echo ""
echo -e "  ${YELLOW}Próximos passos:${NC}"
echo -e "  1. Promova o primeiro administrador (veja SETUP.md)"
echo -e "  2. Configure Google/Facebook OAuth no Dashboard"
echo -e "  3. Inicie o servidor: ${BOLD}pnpm dev${NC}"
echo ""
