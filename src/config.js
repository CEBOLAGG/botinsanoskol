import 'dotenv/config';

/**
 * Carrega e valida todas as variaveis de ambiente em um unico lugar.
 * Falha cedo (com mensagem clara) se algo obrigatorio estiver faltando.
 */

function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    console.error(`[config] ❌ Variavel de ambiente obrigatoria ausente: ${name}`);
    console.error('[config]    Copie .env.example para .env e preencha os valores.');
    process.exit(1);
  }
  return value.trim();
}

// Garante exatamente uma barra no final da URL base do cobalt.
function withTrailingSlash(url) {
  return url.replace(/\/*$/, '/');
}

export const config = {
  token: required('DISCORD_TOKEN'),
  clientId: required('DISCORD_CLIENT_ID'),
  // Opcional: registrar comandos em um servidor especifico (atualizacao instantanea).
  guildId: process.env.DISCORD_GUILD_ID?.trim() || null,

  cobalt: {
    baseUrl: withTrailingSlash(process.env.COBALT_BASE_URL?.trim() || 'http://localhost:9000/'),
    apiKey: process.env.COBALT_API_KEY?.trim() || null,
  },

  // Limite para o bot ANEXAR o arquivo no Discord (MB). Acima disso, manda link.
  // Servidor sem boost: ~10. Boost nivel 2: 50. Nivel 3: 100.
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 10),

  // Por quanto tempo o token de um menu (botoes) continua valido.
  cacheTtlMs: Number(process.env.CACHE_TTL_MINUTES || 15) * 60 * 1000,
};
