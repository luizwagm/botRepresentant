#!/usr/bin/env bash
#
# deploy.sh — Deploy de produção do Jeans Hunter (app "atacado").
# Roda no servidor. Uso:  ./deploy.sh
#
# Para na primeira falha e informa em qual etapa parou.

set -euo pipefail

APP_DIR="/var/www/atacado"
PM2_APP="atacado"

# Cores pro log
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "\n${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] ==> $1${NC}"; }
ok()  { echo -e "${GREEN}✓ $1${NC}"; }

# Se qualquer comando falhar, mostra a etapa e aborta
trap 'echo -e "\n${RED}✗ DEPLOY FALHOU na etapa: ${STEP:-?}${NC}"; exit 1' ERR

STEP="Acessar diretório do projeto"
log "$STEP ($APP_DIR)"
cd "$APP_DIR"
ok "Diretório atual: $(pwd)"

STEP="Atualizar código (git pull)"
log "$STEP"
git pull
ok "Código atualizado"

STEP="Instalar dependências (npm ci)"
log "$STEP"
npm ci
ok "Dependências instaladas"

STEP="Aplicar migrações no banco (prisma migrate deploy)"
log "$STEP"
npx prisma migrate deploy
ok "Migrações aplicadas"

STEP="Build de produção (npm run build)"
log "$STEP"
npm run build
ok "Build concluído"

STEP="Reiniciar aplicação (pm2 restart $PM2_APP)"
log "$STEP"
pm2 restart "$PM2_APP"
ok "Aplicação reiniciada"

# Backfills rodam DEPOIS do restart de propósito: eles gravam valores de enum
# novos, e o processo antigo (com o PrismaClient já carregado em memória) não
# os conhece — rodar antes abriria uma janela de 500 no painel durante o build.
# Ambos são idempotentes: em deploys seguintes não acham nada e saem na hora.
STEP="Backfill de leads (zap / fabricante)"
log "$STEP"
npm run backfill:sem-whatsapp
npm run backfill:business-kind
ok "Backfills concluídos"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ DEPLOY CONCLUÍDO COM SUCESSO${NC}"
echo -e "${GREEN}========================================${NC}"
