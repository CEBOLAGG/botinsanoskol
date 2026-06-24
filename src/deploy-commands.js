import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import * as downloadCommand from './commands/download.js';

/**
 * Registra os slash commands no Discord.
 * Rode uma vez (e novamente sempre que mudar a definicao do comando):
 *   npm run deploy
 *
 * Com DISCORD_GUILD_ID definido: registra no servidor (aparece na hora).
 * Sem ele: registra globalmente (pode levar ate ~1h para propagar).
 */

const commands = [downloadCommand.data.toJSON()];
const rest = new REST({ version: '10' }).setToken(config.token);

try {
  console.log(`[deploy] Registrando ${commands.length} comando(s)...`);

  if (config.guildId) {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
    console.log(`[deploy] ✅ Comandos registrados no servidor ${config.guildId} (instantaneo).`);
  } else {
    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
    console.log('[deploy] ✅ Comandos globais registrados (pode levar ate ~1h para aparecer).');
  }
} catch (err) {
  console.error('[deploy] ❌ erro ao registrar comandos:', err);
  process.exit(1);
}
