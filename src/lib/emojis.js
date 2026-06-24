import sharp from 'sharp';

/**
 * Icones monocromaticos (Lucide, licenca ISC) usados em TODA a UI do bot.
 * No startup o bot rasteriza os SVGs (sharp) e sobe como EMOJIS DA APLICACAO
 * (nao precisa de servidor). Depois botoes/embeds referenciam por id.
 *
 * `currentColor` vira um cinza-claro (bom no tema escuro, o padrao).
 */

const COLOR = '#f2f3f5';

// prefixo comum dos SVGs do Lucide
const P = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';

const SVGS = {
  video: `${P}<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>`,
  audio: `${P}<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  download: `${P}<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>`,
  media: `${P}<circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="m8 12 4 4 4-4"/></svg>`,
  error: `${P}<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`,
  gallery: `${P}<path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16"/><path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2"/><circle cx="13" cy="7" r="1" fill="currentColor"/><rect x="8" y="2" width="14" height="14" rx="2"/></svg>`,
  link: `${P}<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  expired: `${P}<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
  success: `${P}<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
  file: `${P}<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/></svg>`,
};

// chave -> nome do emoji na aplicacao
const NAMES = {
  video: 'skol_video',
  audio: 'skol_audio',
  download: 'skol_download',
  media: 'skol_media',
  error: 'skol_error',
  gallery: 'skol_gallery',
  link: 'skol_link',
  expired: 'skol_expired',
  success: 'skol_success',
  file: 'skol_file',
};

// fallback unicode caso o upload falhe / ainda nao tenha rodado
const FALLBACK = {
  video: '🎬', audio: '🎵', download: '⬇️', media: '📥', error: '❌',
  gallery: '🖼️', link: '🔗', expired: '⏳', success: '✅', file: '📁',
};

const cache = {}; // key -> { id, name }

async function toPng(svg) {
  const colored = svg.replace(/currentColor/g, COLOR).replace(/stroke-width="2"/g, 'stroke-width="2.25"');
  return sharp(Buffer.from(colored), { density: 384 })
    .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/** Garante que todos os emojis existem na aplicacao (cria os que faltam). Idempotente. */
export async function ensureEmojis(client) {
  try {
    const existing = await client.application.emojis.fetch();
    const byName = new Map(existing.map((e) => [e.name, e]));
    let created = 0;
    for (const [key, name] of Object.entries(NAMES)) {
      let emoji = byName.get(name);
      if (!emoji) {
        emoji = await client.application.emojis.create({ attachment: await toPng(SVGS[key]), name });
        created++;
      }
      cache[key] = { id: emoji.id, name };
    }
    console.log(`[emojis] ✅ ${Object.keys(NAMES).length} icones custom prontos (${created} criado(s) agora).`);
  } catch (err) {
    console.warn('[emojis] ⚠️ Nao consegui preparar os icones custom (usando fallback):', err?.message || err);
  }
}

/** Resolvable para ButtonBuilder.setEmoji (custom se disponivel, senao unicode). */
export function emojiFor(key) {
  return cache[key] ? { id: cache[key].id, name: cache[key].name } : FALLBACK[key];
}

/** Forma textual `<:name:id>` para usar em embeds/conteudo (senao unicode). */
export function emojiTag(key) {
  return cache[key] ? `<:${cache[key].name}:${cache[key].id}>` : FALLBACK[key];
}
