# botinsanoskol

Bot de Discord que baixa vídeos e mídias a partir de um link, usando
**yt-dlp** (para YouTube), [**cobalt**](https://github.com/imputnet/cobalt)
(para os outros serviços) e a API mais nova do Discord (**Components v2**).

Um único slash command: o usuário manda `/baixar link:<url>`. O bot checa a
disponibilidade e responde com **um container (embed v2)** contendo a
**thumbnail** e **botões com os formatos** (vídeo em várias qualidades, áudio
MP3/M4A). Ao clicar num botão, o bot baixa **na hora** e **anexa o arquivo no
Discord** — todos baixam direto da mensagem. Se passar do limite de upload do
servidor, ele avisa (ou, no caso do cobalt, manda o link).

> **Por que dois backends?** O YouTube no cobalt self-hosted é instável (alguns
> vídeos voltam vazios / 0 bytes). O **yt-dlp** é o downloader de YouTube mais
> robusto que existe, então o bot usa ele só para links do YouTube e mantém o
> cobalt para o resto (TikTok, Twitter/X, Instagram, Reddit, etc.).

---

## Como funciona

```
/baixar link:<url>
        │
        ├─ é YouTube?  ──► yt-dlp lê metadados (título/thumb) ──► embed v2 com botões
        │                                                              │ (clique)
        │                                                              ▼
        │                            yt-dlp baixa o arquivo  ──►  ANEXA (se couber)
        │
        └─ outro serviço  ──► cobalt checa ──► embed v2 com botões
                                                     │ (clique)
                                                     ▼
                              cobalt resolve (tunnel fresco) ──► ANEXA (ou link se grande)
```

- **Resolve no clique:** o download só acontece quando o usuário clica — nada de
  link velho/expirado.
- **Thumbnail:** no YouTube vem do próprio yt-dlp; nos outros, derivada do
  `og:image` da página.
- **Botões:** o `custom_id` tem só 100 caracteres, então o botão carrega um
  **token** curto; a URL original fica num cache em memória.

---

## Pré-requisitos

- **Node.js 18.17+** (recomendado 20/22). `fetch` é nativo, sem dependências extras.
- **yt-dlp + ffmpeg** em `bin/` (para YouTube) — veja [Configurar o YouTube](#configurar-o-youtube-yt-dlp).
- **Docker** (para rodar a sua instância do cobalt, usada nos outros serviços).
- Uma aplicação/bot no [Discord Developer Portal](https://discord.com/developers/applications).

---

## Configurar o YouTube (yt-dlp)

O bot procura `yt-dlp.exe` e `ffmpeg.exe` na pasta `bin/` do projeto.

**Windows** (baixa os dois automaticamente):
```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-bin.ps1
```

**Linux (VPS):** instale e aponte os caminhos no `.env` (ou deixe no PATH):
```bash
sudo apt install -y ffmpeg
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
# no .env do bot:
#   YTDLP_PATH=/usr/local/bin/yt-dlp
#   FFMPEG_DIR=/usr/bin
```

> Os binários **não** vão no git (`bin/` está no `.gitignore`) — rode o setup em
> cada máquina. Atualize o yt-dlp de vez em quando (`yt-dlp -U` ou rode o script
> de novo); o YouTube muda e versões velhas quebram.

---

## Passo a passo

### 1. Criar o bot no Discord
1. Acesse https://discord.com/developers/applications → **New Application**.
2. Aba **Bot** → **Reset Token** → copie o token → cole em `DISCORD_TOKEN` no `.env`.
3. Aba **General Information** → copie o **Application ID** → `DISCORD_CLIENT_ID`.
4. Aba **Installation** (ou **OAuth2 → URL Generator**): marque os escopos
   `bot` e `applications.commands`, gere o link e adicione o bot ao seu servidor.
   > Este bot **não** precisa de intents privilegiadas.

### 2. Subir o cobalt (sua própria instância)
A API oficial `api.cobalt.tools` é **proibida para bots de terceiros**
(protegida por Cloudflare Turnstile + chave). Por isso rodamos a nossa:

```bash
docker compose -f docker-compose.cobalt.yml up -d
```

Isso usa o `keys.json` (já vem com uma chave gerada). Teste:

```bash
curl http://localhost:9000/
# deve responder um JSON com { "cobalt": { "version": ... } }
```

> **YouTube:** instâncias públicas costumam estar quebradas para YouTube. Na sua
> instância, se precisar de YouTube, gere um `cookies.json` e descomente
> `COOKIE_PATH` no `docker-compose.cobalt.yml`. Veja a doc do cobalt.

### 3. Configurar e instalar o bot
```bash
# o .env já existe; preencha DISCORD_TOKEN e DISCORD_CLIENT_ID
npm install
npm run deploy   # registra o slash command /baixar
npm start        # liga o bot
```

Pronto — use `/baixar` no seu servidor.

---

## Você precisa de um VPS?

**Sim, para rodar 24/7.** Um bot de Discord mantém uma conexão WebSocket
permanente com o gateway; ele não roda "sob demanda" (serverless não serve).
Enquanto seu PC estiver ligado com `npm start`, funciona — para ficar online
sempre, use um VPS.

Arquitetura recomendada (a que este projeto monta): **bot + cobalt no mesmo
VPS**. O bot fala com o cobalt em `http://localhost:9000/`. Vantagens:

- Você controla auth, limites e uptime.
- É a forma mais confiável de manter o YouTube funcionando (com cookies).
- Não depende de instância de terceiros (que pode cair ou exigir chave a qualquer momento).

Um VPS pequeno (**1–2 GB de RAM**, com Docker) dá conta do bot + cobalt
para uso pessoal/de um servidor.

### Deploy na Oracle Cloud (Always Free) — recomendado p/ de graça

O **Always Free** da Oracle dá uma instância **Ampere A1 (ARM, até 4 vCPU / 24 GB
RAM)** de graça pra sempre — sobra pra rodar bot + cobalt. Todo o stack é
**compatível com ARM64** (cobalt tem imagem arm64; ffmpeg/yt-dlp/sharp também).

**1. Crie a instância**
- Console Oracle → **Compute → Instances → Create**.
- **Image:** Ubuntu 22.04. **Shape:** `VM.Standard.A1.Flex` (**Ampere/ARM**) — pode
  pôr 1–4 OCPUs e 6–24 GB (tudo Always Free). *Evite* a micro AMD (1 GB, pouca RAM).
- Adicione sua **chave SSH** e crie. (Se der "out of capacity", tente outro
  *Availability Domain* ou volte mais tarde — é comum no free.)
- **Não precisa abrir porta nenhuma** no firewall: o bot só faz conexão de saída
  e o cobalt fica interno na rede do Docker.

**2. Clone o repositório (no servidor, via SSH)**
```bash
ssh ubuntu@SEU_IP
sudo apt update && sudo apt install -y git
git clone https://github.com/CEBOLAGG/botinsanoskol
cd botinsanoskol
```

**3. Crie o `.env` com seus segredos**
```bash
cp .env.example .env
nano .env     # preencha DISCORD_TOKEN e DISCORD_CLIENT_ID (e DISCORD_GUILD_ID se quiser)
```
> O `.env`, `keys.json` e `cookies.json` estão no `.gitignore` — por isso não
> vêm no clone. O `keys.json` e a `COBALT_API_KEY` o script gera/sincroniza
> sozinho no próximo passo.

**4. Suba tudo (um comando)**
```bash
bash deploy/oracle-setup.sh
```
O script instala o Docker, gera o `keys.json`, sobe **bot + cobalt**, registra o
`/baixar` e mostra os logs. Pronto — online 24/7 e reinicia sozinho.

**Atualizar depois** (quando houver mudanças no repo):
```bash
cd ~/botinsanoskol && git pull && bash deploy/oracle-setup.sh
```

> **YouTube com cookies (opcional):** se algum vídeo exigir login, gere um
> `cookies.json`, descomente `COOKIE_PATH`/volume no `docker-compose.yml` (serve
> pro cobalt) — o yt-dlp do bot também aceita cookies se você ajustar os args.

### Deploy na VPS (passo a passo)

Funciona em qualquer VPS Linux (Ubuntu 22.04/24.04 como exemplo): Hetzner,
DigitalOcean, Contabo, Oracle Cloud (free tier), etc.

**1. Conecte e atualize**
```bash
ssh root@SEU_IP
apt update && apt upgrade -y
```

**2. Instale o Docker (script oficial)**
```bash
curl -fsSL https://get.docker.com | sh
docker --version   # confirma
```

**3. (Opcional) Firewall — libere só SSH**
```bash
ufw allow OpenSSH && ufw enable
```
> Não precisa abrir a porta 9000: o cobalt fica acessível **só para o bot**, na
> rede interna do Docker.

**4. Envie o projeto pra VPS**

Opção A — via git (suba o repo SEM o `.env`/`keys.json`):
```bash
git clone SEU_REPO botinsanoskol && cd botinsanoskol
```
Opção B — via `scp` (do seu PC):
```bash
scp -r "c:\Users\artur\Desktop\projetos\botinsanoskol" root@SEU_IP:/root/botinsanoskol
```

**5. Garanta os segredos na VPS** (`.env` e `keys.json`)

Se usou git, o `.env` e o `keys.json` não vieram (estão no `.gitignore`). Crie-os
na VPS — copie do seu `.env` local e cole o mesmo UUID em `keys.json`. O
`COBALT_BASE_URL` do `.env` é ignorado no Docker (o compose já aponta para a rede
interna), então pode deixar como está.

**6. Suba tudo**
```bash
docker compose up -d --build
```

**7. Registre o slash command (uma vez)**
```bash
docker compose run --rm bot node src/deploy-commands.js
```

**8. Acompanhe / opere**
```bash
docker compose logs -f bot       # logs ao vivo
docker compose ps                # status
docker compose restart bot       # reinicia o bot
docker compose down              # derruba tudo
docker compose up -d --build     # atualiza apos mudar o codigo
```

Pronto — o bot fica online 24/7 e reinicia sozinho (`restart: unless-stopped`).

> **Só o cobalt na VPS, bot em outro lugar?** Use o `docker-compose.cobalt.yml`,
> exponha a porta 9000 atrás de um reverse proxy com HTTPS (Caddy/nginx), aponte
> `API_URL` para o domínio público (ex.: `https://cobalt.seudominio.com/`) e
> coloque essa URL no `COBALT_BASE_URL` do bot. Mais trabalho — só vale se o bot
> não puder ficar na mesma máquina.

### Deploy no Fly.io

O Fly **não roda `docker-compose`** — cada app é uma imagem. Então viram **2 apps**:
o **bot** (`fly.toml`) e o **cobalt** (`deploy/fly-cobalt.toml`), conversando pela
rede privada do Fly. O Fly **não tem mais free tier** (sai ~US$2–4/mês por máquina).

```bash
fly auth login

# 1) cobalt (privado, só a rede interna usa)
fly launch --no-deploy --copy-config -c deploy/fly-cobalt.toml --name SEU-APP-cobalt
fly deploy -c deploy/fly-cobalt.toml
fly ips list -a SEU-APP-cobalt          # remova os IPs PUBLICOS p/ nao expor:
fly ips release <IP_PUBLICO> -a SEU-APP-cobalt

# 2) bot (ajuste COBALT_BASE_URL no fly.toml para SEU-APP-cobalt.flycast)
fly launch --no-deploy --copy-config --name SEU-APP
fly secrets set DISCORD_TOKEN=xxx DISCORD_CLIENT_ID=yyy   # (DISCORD_GUILD_ID se quiser)
fly deploy

# 3) registra o /baixar (uma vez)
fly ssh console -a SEU-APP -C "node src/deploy-commands.js"
```

**Pontos de atenção no Fly:**
- O `fly.toml` do bot **não tem `[http_service]`** de propósito — é um worker 24/7.
  Se você rodar `fly launch` do zero, ele tenta adicionar um e fazer health-check
  HTTP (que falha, pois não há servidor web). Use o `fly.toml` deste repo.
- **Segredos** vão por `fly secrets set` (o `.env` não é usado no Fly).
- O `keys.json` do cobalt não é necessário aqui (cobalt fica **privado**, sem auth).
- Se 512 MB der OOM no startup do bot (por causa do `sharp`), suba para 1024 MB.

> **Quer de graça com bot + cobalt?** A **Oracle** (acima) roda o `docker-compose`
> inteiro de graça e é mais simples. O Fly compensa se você já usa e não se importa
> com o custo pequeno.

---

## Limitações conhecidas (e decisões já tomadas)

| Tema | Situação |
|---|---|
| **YouTube usa yt-dlp** | Links do YouTube são baixados pelo yt-dlp (não pelo cobalt), bem mais confiável. Precisa do `bin/` configurado (ver acima). Atualize o yt-dlp de vez em quando — o YouTube muda. |
| **Limite de upload do Discord** | O bot **anexa** o arquivo se couber: sem boost ~10 MB; boost nível 2 = 50 MB; nível 3 = 100 MB. Ajuste `MAX_UPLOAD_MB`. Áudio quase sempre cabe; vídeo HD/longo costuma passar. |
| **Vídeo grande** | No YouTube (yt-dlp), se passar do limite o bot **avisa** (não tem link compartilhável). No cobalt, cai para um **link** (fresco, ~90s; em `localhost` só abre na sua máquina). Para anexar vídeos maiores, dê boost e suba o `MAX_UPLOAD_MB`. |
| **Persistência** | O cache de tokens é em memória: ao reiniciar o **bot**, menus antigos expiram. |
| **ToS** | Baixar de plataformas pode violar os termos delas. Mantenha o bot privado/pessoal. |

---

## Estrutura

```
botinsanoskol/
├── .env                       # suas credenciais (NÃO comitar)
├── .env.example
├── bin/                       # yt-dlp.exe + ffmpeg.exe (NÃO versionado; ver setup)
├── scripts/
│   └── setup-bin.ps1          # baixa yt-dlp + ffmpeg para bin/ (Windows)
├── deploy/
│   └── oracle-setup.sh        # setup de 1 comando na Oracle/VPS (Linux)
├── Dockerfile                 # imagem do bot (com ffmpeg + yt-dlp)
├── docker-compose.yml         # stack completa: cobalt + bot (deploy na VPS)
├── docker-compose.cobalt.yml  # só o cobalt (quando o bot roda fora do Docker)
├── keys.json                  # chave de API do cobalt
├── package.json
└── src/
    ├── index.js               # entrada: client + roteamento de eventos
    ├── config.js              # carrega/valida o .env
    ├── deploy-commands.js     # registra o /baixar
    ├── commands/
    │   └── download.js        # /baixar: checa disponibilidade e monta o preview
    ├── interactions/
    │   └── buttons.js         # clique no formato: yt-dlp (YouTube) ou cobalt, e anexa
    └── lib/
        ├── ytdlp.js           # backend de YouTube (yt-dlp + ffmpeg)
        ├── cobalt.js          # cliente da API do cobalt + download com limite
        ├── formats.js         # formatos (specs para yt-dlp e cobalt)
        ├── thumbnail.js       # deriva a thumbnail (YouTube / og:image)
        ├── cache.js           # token -> URL (em memória, com TTL)
        ├── emojis.js          # ícones Lucide (sharp) -> emojis da aplicação
        └── ui.js              # builders de Components v2 (container/seção/botões)
```

> **Ícones da UI:** toda a interface usa ícones monocromáticos (set
> [Lucide](https://lucide.dev), ISC) — vídeo, áudio, download, mídia, erro,
> galeria, link, relógio, check e arquivo. No startup o bot rasteriza os SVGs
> com `sharp` e os sobe como **emojis da aplicação** (`skol_*`) — idempotente,
> não recria a cada restart. Cor ajustada pro tema escuro; mude `COLOR` em
> `src/lib/emojis.js` se usar tema claro.

---

## Serviços suportados pelo cobalt

YouTube, TikTok, Instagram, Twitter/X, Reddit, SoundCloud, Twitch (clips),
Bilibili, Pinterest, Tumblr, Vimeo, entre outros. A lista exata depende da
versão e da configuração da sua instância (veja `GET /` → `services`).
