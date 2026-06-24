#!/usr/bin/env bash
# Setup de UM COMANDO para a Oracle Cloud (Always Free, Ampere A1 / ARM ou x86).
# Pensado para o fluxo via git: voce da `git clone`, cria o .env, e roda isto.
#   bash deploy/oracle-setup.sh
set -euo pipefail

cd "$(dirname "$0")/.."  # raiz do projeto
echo "==> Projeto: $(pwd)"

# 1) Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "==> Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER" || true
fi
echo "==> Docker: $(sudo docker --version)"

# 2) .env (segredos do Discord)
if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Criei .env a partir do exemplo."
  echo "    Preencha DISCORD_TOKEN e DISCORD_CLIENT_ID e rode de novo:"
  echo "      nano .env  &&  bash deploy/oracle-setup.sh"
  exit 1
fi
if ! grep -q '^DISCORD_TOKEN=.\+' .env || ! grep -q '^DISCORD_CLIENT_ID=.\+' .env; then
  echo "ERRO: preencha DISCORD_TOKEN e DISCORD_CLIENT_ID no .env (nano .env)." >&2
  exit 1
fi

# 3) keys.json + COBALT_API_KEY (gera e sincroniza sozinho)
if [ ! -f keys.json ]; then
  KEY="$(cat /proc/sys/kernel/random/uuid)"
  printf '{\n  "%s": { "name": "discord-bot", "limit": "unlimited", "allowedServices": "all" }\n}\n' "$KEY" > keys.json
  if grep -q '^COBALT_API_KEY=' .env; then
    sed -i "s|^COBALT_API_KEY=.*|COBALT_API_KEY=$KEY|" .env
  else
    echo "COBALT_API_KEY=$KEY" >> .env
  fi
  echo "==> keys.json criado e COBALT_API_KEY sincronizada no .env."
fi

# 4) Sobe a stack (bot + cobalt). 1a vez compila a imagem (alguns minutos).
echo "==> Subindo a stack (build pode demorar na 1a vez)..."
sudo docker compose up -d --build

# 5) Registra o slash command
echo "==> Registrando /baixar..."
sudo docker compose run --rm bot node src/deploy-commands.js

# 6) Status
echo "==> Pronto! Containers:"
sudo docker compose ps
echo "==> Logs do bot:"
sudo docker compose logs --tail 20 bot
echo
echo "✅ Bot online 24/7. Comandos uteis:"
echo "   git pull && bash deploy/oracle-setup.sh   # atualizar para a ultima versao"
echo "   sudo docker compose logs -f bot           # logs ao vivo"
echo "   sudo docker compose restart bot           # reiniciar"
