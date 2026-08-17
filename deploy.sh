#!/usr/bin/env bash
#
# deploy.sh — Deploy de produção do Jeans Hunter (app "atacado").
# Roda no servidor. Uso:  ./deploy.sh
#
# Para na primeira falha e informa em qual etapa parou.

set -euo pipefail

APP_DIR="/var/www/atacado"
PM2_APP="atacado"
PM2_WORKER="outreach-worker"

# Cores pro log
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "\n${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] ==> $1${NC}"; }
ok()  { echo -e "${GREEN}✓ $1${NC}"; }

# Se qualquer comando falhar, mostra a etapa e aborta
trap 'echo -e "\n${RED}✗ DEPLOY FALHOU na etapa: ${STEP:-?}${NC}"; exit 1' ERR

# O processo do pm2 pertence ao usuário DEPLOY_USER (o pm2 é por usuário:
# cada um tem o seu ~/.pm2). Rodar isto como root sobe um daemon vazio em
# /root/.pm2 e o `pm2 restart` falha com "Process or Namespace not found" —
# depois de já ter migrado o banco e trocado o .next embaixo do app no ar.
# Já aconteceu; por isso o deploy para aqui em vez de seguir.
DEPLOY_USER="${DEPLOY_USER:-deploy}"
ATUAL="$(id -un)"
if [ "$ATUAL" != "$DEPLOY_USER" ]; then
  echo -e "${RED}✗ Este deploy precisa rodar como '$DEPLOY_USER' (você está como '$ATUAL').${NC}"
  echo -e "  Use:  su - $DEPLOY_USER -c 'cd $APP_DIR && ./deploy.sh'"
  exit 1
fi

STEP="Acessar diretório do projeto"
log "$STEP ($APP_DIR)"
cd "$APP_DIR"
ok "Diretório atual: $(pwd)"

STEP="Atualizar código (git pull)"
log "$STEP"
# --ff-only: se alguém tiver commitado direto no servidor, o deploy para em vez
# de abrir um merge (que travaria pedindo editor numa sessão SSH sem tty).
git pull --ff-only
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

# O worker da prospecção roda o motor de mensagens; sem reiniciar, ele seguiria
# com o código antigo. Só reinicia se já estiver registrado no pm2 — quem ainda
# não subiu o worker não vê o deploy falhar por causa disso.
STEP="Reiniciar worker de prospecção (se existir)"
log "$STEP"
if pm2 describe "$PM2_WORKER" >/dev/null 2>&1; then
  pm2 restart "$PM2_WORKER"
  ok "Worker reiniciado"
else
  echo "  (worker '$PM2_WORKER' não registrado no pm2 — pulando)"
fi

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
