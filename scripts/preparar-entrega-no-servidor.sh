#!/usr/bin/env bash
#
# preparar-entrega-no-servidor.sh — prepara o servidor pra receber a entrega
# automática do GitHub Actions. RODE UMA VEZ, no servidor, como root:
#
#   sudo bash /var/www/atacado/scripts/preparar-entrega-no-servidor.sh
#
# O que ele faz:
#   1. Gera um par de chaves SSH dedicado só à entrega.
#   2. Instala a chave pública no authorized_keys do usuário de deploy PRESA a
#      um `command=` — quem usar essa chave só consegue rodar o deploy.sh, e
#      como o usuário certo (foi rodar como root que quebrou o último deploy).
#   3. Imprime os 3 valores pra colar nos Secrets do GitHub.
#
# A chave NÃO dá shell: `restrict` desliga port-forward, agent-forward, pty e
# X11. Mesmo vazando, ela só dispara o deploy.

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/atacado}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
NOME_CHAVE="entrega_atacado"

VERDE='\033[0;32m'; VERM='\033[0;31m'; AZUL='\033[0;34m'; AMAR='\033[1;33m'; NC='\033[0m'

if [ "$(id -u)" != "0" ]; then
  echo -e "${VERM}Rode como root: sudo bash $0${NC}"
  exit 1
fi

if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  echo -e "${VERM}O usuário '$DEPLOY_USER' não existe. Ajuste DEPLOY_USER=... e rode de novo.${NC}"
  exit 1
fi

if [ ! -x "$APP_DIR/deploy.sh" ]; then
  echo -e "${AMAR}Aviso: $APP_DIR/deploy.sh não está executável. Ajustando...${NC}"
  chmod +x "$APP_DIR/deploy.sh"
fi

HOME_DEPLOY="$(getent passwd "$DEPLOY_USER" | cut -d: -f6)"
SSH_DIR="$HOME_DEPLOY/.ssh"
CHAVE_PRIV="$SSH_DIR/$NOME_CHAVE"

install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$SSH_DIR"

echo -e "${AZUL}==> Gerando a chave de entrega${NC}"
if [ -f "$CHAVE_PRIV" ]; then
  echo -e "${AMAR}Já existe $CHAVE_PRIV — reaproveitando (não sobrescrevo pra não derrubar uma entrega ativa).${NC}"
else
  sudo -u "$DEPLOY_USER" ssh-keygen -t ed25519 -N "" -C "entrega-github-actions" -f "$CHAVE_PRIV"
fi

echo -e "${AZUL}==> Prendendo a chave ao deploy (command= + restrict)${NC}"
PUB="$(cat "$CHAVE_PRIV.pub")"
AUTH="$SSH_DIR/authorized_keys"
touch "$AUTH"
LINHA="command=\"cd $APP_DIR && ./deploy.sh\",restrict $PUB"

# Idempotente: tira qualquer linha anterior desta mesma chave antes de inserir.
FINGER="$(awk '{print $3}' "$CHAVE_PRIV.pub")"
if [ -n "$FINGER" ] && grep -q "$FINGER" "$AUTH" 2>/dev/null; then
  grep -v "$FINGER" "$AUTH" > "$AUTH.tmp" || true
  mv "$AUTH.tmp" "$AUTH"
fi
printf '%s\n' "$LINHA" >> "$AUTH"
chown "$DEPLOY_USER:$DEPLOY_USER" "$AUTH"
chmod 600 "$AUTH"

# O dono do diretório precisa ser o usuário de deploy — se um deploy anterior
# rodou como root, os arquivos ficaram de root e o próximo `git pull`/`npm ci`
# falha por permissão.
echo -e "${AZUL}==> Conferindo dono de $APP_DIR${NC}"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

IP_PUB="$(curl -s -4 ifconfig.me 2>/dev/null || echo "SEU_IP")"
HOST_KEY="$(ssh-keyscan -t ed25519 "$IP_PUB" 2>/dev/null || true)"

echo ""
echo -e "${VERDE}========================================================${NC}"
echo -e "${VERDE} PRONTO. Agora crie 3 Secrets no GitHub:${NC}"
echo -e "${VERDE} (repositório > Settings > Secrets and variables > Actions)${NC}"
echo -e "${VERDE}========================================================${NC}"
echo ""
echo -e "${AZUL}1) SSH_DESTINO${NC}"
echo "$DEPLOY_USER@$IP_PUB"
echo ""
echo -e "${AZUL}2) SSH_HOST_CONHECIDO${NC}"
if [ -n "$HOST_KEY" ]; then
  echo "$HOST_KEY"
else
  echo -e "${AMAR}(não consegui detectar — rode na sua máquina: ssh-keyscan -t ed25519 SEU_IP)${NC}"
fi
echo ""
echo -e "${AZUL}3) SSH_CHAVE_ENTREGA  ${AMAR}(a chave PRIVADA inteira, incluindo as linhas BEGIN/END)${NC}"
echo "--------------------------------------------------------"
cat "$CHAVE_PRIV"
echo "--------------------------------------------------------"
echo ""
echo -e "${AMAR}Depois de copiar, considere apagar a cópia impressa do histórico do terminal.${NC}"
echo -e "${AZUL}Teste manual (opcional), da sua máquina:${NC}"
echo "  ssh -i <chave> $DEPLOY_USER@$IP_PUB    # deve rodar o deploy e sair"
