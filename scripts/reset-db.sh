#!/usr/bin/env bash
# ============================================================
# reset-db.sh
# ⚠ CUIDADO: apaga TODOS os dados e re-aplica o schema do zero
# Útil apenas em ambiente de desenvolvimento
# ============================================================

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "\n${RED}${BOLD}⚠ ATENÇÃO: Este script vai APAGAR TODOS OS DADOS do banco.${NC}"
echo -e "${YELLOW}Só use em ambiente de desenvolvimento!${NC}\n"

read -p "Digite 'CONFIRMO' para continuar: " CONFIRM

if [ "$CONFIRM" != "CONFIRMO" ]; then
  echo -e "${YELLOW}Operação cancelada.${NC}"
  exit 0
fi

echo -e "\n${BOLD}→ Fazendo reset do banco...${NC}"
supabase db reset

echo -e "${GREEN}✓ Banco resetado. Migrations e seed re-aplicados.${NC}\n"
