import { Client, GatewayIntentBits, Events, Collection, MessageFlags } from 'discord.js';
import { config } from './config.js';
import * as downloadCommand from './commands/download.js';
import { handleButton } from './interactions/buttons.js';
import { startCacheJanitor } from './lib/cache.js';
import { cobaltHealth } from './lib/cobalt.js';
import { ytdlpAvailable } from './lib/ytdlp.js';
import { ensureEmojis, emojiTag } from './lib/emojis.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Registro dos comandos disponiveis (so um, por enquanto).
const commands = new Collection();
commands.set(downloadCommand.data.name, downloadCommand);

client.once(Events.ClientReady, async (c) => {
  console.log(`[bot] ✅ Logado como ${c.user.tag}`);

  const health = await cobaltHealth();
  if (health.ok) {
    console.log(`[cobalt] ✅ Instancia OK — versao ${health.version}, ${health.services} servicos.`);
  } else {
    console.warn(
      `[cobalt] ⚠️ Instancia nao respondeu (${health.error ?? 'HTTP ' + health.status}). ` +
        `O bot sobe mesmo assim, mas os downloads vao falhar ate o cobalt estar de pe. ` +
        `Confira COBALT_BASE_URL / COBALT_API_KEY.`,
    );
  }

  if (ytdlpAvailable()) {
    console.log('[yt-dlp] ✅ Disponivel (YouTube usa yt-dlp).');
  } else {
    console.warn('[yt-dlp] ⚠️ Binario nao encontrado em bin/. Links do YouTube vao falhar. Veja o README.');
  }

  await ensureEmojis(c);
  startCacheJanitor();
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (command) await command.execute(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    }
  } catch (err) {
    console.error('[interaction] erro nao tratado:', err);
    const content = `${emojiTag('error')} Ocorreu um erro inesperado ao processar sua solicitacao.`;
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content, flags: MessageFlags.Ephemeral });
      }
    } catch {
      /* a interacao pode ja ter expirado; nada a fazer */
    }
  }
});

client.login(config.token);
