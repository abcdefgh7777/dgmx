/**
 * DigimonX Auto-Reply Agent
 * - Polls X (Twitter) mentions every 60s
 * - Parses Digimon commands: tame, feed, check, battle, activity
 * - Replies with Digimon info + card images via X API v2 (OAuth 1.0a)
 *
 * Required .env vars:
 *   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET, X_BOT_USERNAME
 *   KIMI_API_KEY (Moonshot/Kimi AI)
 */

const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const cardGen = require('./card-generator');
const digiData = require('./digivolution-data');

const X_API_KEY             = process.env.X_API_KEY;
const X_API_SECRET          = process.env.X_API_SECRET;
const X_ACCESS_TOKEN        = process.env.X_ACCESS_TOKEN;
const X_ACCESS_TOKEN_SECRET = process.env.X_ACCESS_TOKEN_SECRET;
const BOT_USERNAME          = (process.env.X_BOT_USERNAME || '').toLowerCase();
const POLL_MS               = parseInt(process.env.AUTOREPLY_INTERVAL_MS || '60000');

// ── State ──
let pollerActive = false;
let pollerTimer = null;
let pollBusy = false;
let botUserId = null;
let consecutiveErrors = 0;
let db = null;
let openai = null;

const stats = {
  repliesTotal: 0,
  repliesToday: 0,
  lastChecked: null,
  lastReplied: null,
  lastError: null
};

function init(database, aiClient) {
  db = database;
  openai = aiClient || null;
}

// ── Digimon data for taming (all 433 sprites) ──
const DIGIMON_ELEMENTS = {
  // === Baby ===
  'botamon': 'Dark', 'budmon': 'Nature', 'calumon': 'Light', 'chibomon': 'Dragon',
  'chicchimon': 'Light', 'chocomon': 'Dark', 'dorimon': 'Dragon', 'gigimon': 'Fire',
  'gumymon': 'Nature', 'kapurimon': 'Machine', 'koromon': 'Fire', 'kuramon': 'Dark',
  'minomon': 'Nature', 'moonmon': 'Dark', 'pagumon': 'Dark', 'poyomon': 'Light',
  'puttimon': 'Light', 'sunmon': 'Fire', 'tanemon': 'Nature', 'tokomon': 'Light',
  'tsumemon': 'Dark', 'tsunomon': 'Earth', 'wanyamon': 'Earth',

  // === Child (Rookie) ===
  'agumon': 'Fire', 'alraumon': 'Nature', 'armademon': 'Earth', 'bakumon': 'Light',
  'bearmon': 'Earth', 'betamon': 'Water', 'biyomon': 'Wind', 'blackagumon': 'Fire',
  'candmon': 'Fire', 'coronamon': 'Fire', 'dokunemon': 'Virus', 'dorumon': 'Dragon',
  'dotagumon': 'Fire', 'dotfalcomon': 'Wind', 'dracmon': 'Dark', 'falcomon': 'Wind',
  'floramon': 'Nature', 'gabumon': 'Ice', 'ganimon': 'Water', 'gaomon': 'Earth',
  'gizamon': 'Water', 'goblimon': 'Earth', 'gomamon': 'Water', 'gotsumon': 'Earth',
  'guilmon': 'Fire', 'hagurumon': 'Machine', 'hawkmon': 'Wind', 'impmon': 'Dark',
  'kamemon': 'Water', 'keramon': 'Dark', 'kokuwamon': 'Electric', 'kotemon': 'Earth',
  'kudamon': 'Light', 'kunemon': 'Electric', 'lopmon': 'Earth', 'lunamon': 'Ice',
  'monodramon': 'Dragon', 'muchomon': 'Wind', 'mushmon': 'Nature', 'otamamon': 'Water',
  'palmon': 'Nature', 'patamon': 'Light', 'pawnchessmonblack': 'Dark',
  'pawnchessmonwhite': 'Light', 'penmon': 'Ice', 'picodevimon': 'Dark',
  'plotmon': 'Light', 'raramon': 'Nature', 'renamon': 'Light', 'shakomon': 'Water',
  'shamamon': 'Earth', 'snowgoblimon': 'Ice', 'solarmon': 'Machine', 'tentomon': 'Electric',
  'terriermon': 'Wind', 'toyagumon': 'Machine', 'toyagumonblack': 'Dark',
  'tsukaimon': 'Dark', 'v-mon': 'Dragon', 'wormmon': 'Nature', 'yukiagumon': 'Ice',

  // === Adult (Champion) ===
  'airdramon': 'Wind', 'akatorimon': 'Wind', 'angemon': 'Light', 'ankylomon': 'Earth',
  'apemon': 'Earth', 'aquilamon': 'Wind', 'bakemon': 'Dark', 'birdramon': 'Fire',
  'bombernanimon': 'Machine', 'centarumon': 'Earth', 'chrysalimon': 'Dark',
  'clockmon': 'Machine', 'coelamon': 'Water', 'darklizardmon': 'Fire',
  'darktyrannomon': 'Fire', 'deputymon': 'Machine', 'devidramon': 'Dark',
  'devimon': 'Dark', 'diatrymon': 'Wind', 'dinohumon': 'Earth', 'dokugumon': 'Virus',
  'dolphmon': 'Water', 'dorugamon': 'Dragon', 'drimogemon': 'Earth', 'ebidramon': 'Water',
  'evilmon': 'Dark', 'firamon': 'Fire', 'flarelizardmon': 'Fire', 'flymon': 'Nature',
  'frigimon': 'Ice', 'fugamon': 'Earth', 'galgomon': 'Machine', 'gaogamon': 'Earth',
  'garurumon': 'Ice', 'gekomon': 'Water', 'geogreymon': 'Fire', 'geremon': 'Virus',
  'gesomon': 'Water', 'golemon': 'Earth', 'greymon': 'Fire', 'grizzmon': 'Earth',
  'growlmon': 'Fire', 'guardromon': 'Machine', 'gwappamon': 'Water', 'hookmon': 'Machine',
  'hyogamon': 'Ice', 'icedevimon': 'Ice', 'icemon': 'Ice', 'igamon': 'Earth',
  'ikkakumon': 'Water', 'j-mojyamon': 'Ice', 'kabuterimon': 'Electric',
  'karatsukinumemon': 'Virus', 'kiwimon': 'Nature', 'knightchessmonblack': 'Dark',
  'knightchessmonwhite': 'Light', 'kokatorimon': 'Wind', 'kougamon': 'Dark',
  'kuwagamon': 'Nature', 'kyubimon': 'Fire', 'lekismon': 'Ice', 'leomon': 'Earth',
  'leppamon': 'Light', 'mechanorimon': 'Machine', 'minotarumon': 'Dark',
  'mojyamon': 'Ice', 'monochromon': 'Earth', 'morishellmon': 'Water',
  'mudfrigimon': 'Earth', 'musyamon': 'Earth', 'nanimon': 'Earth',
  'nisedrimogemon': 'Earth', 'numemon': 'Virus', 'octomon': 'Water', 'ogremon': 'Earth',
  'omekamon': 'Machine', 'peckmon': 'Wind', 'platinumsukamon': 'Machine',
  'raptordramon': 'Machine', 'raremon': 'Virus', 'redveggiemon': 'Nature',
  'roachmon': 'Virus', 'saberdramon': 'Wind', 'sandyanmamon': 'Wind',
  'sangloupmon': 'Dark', 'seadramon': 'Water', 'seasarmon': 'Light', 'shellmon': 'Water',
  'snimon': 'Nature', 'sorcerymon': 'Light', 'starmon': 'Light', 'stingmon': 'Nature',
  'sukamon': 'Virus', 'sunflowmon': 'Nature', 'tailmon': 'Light', 'tankmon': 'Machine',
  'thundermon': 'Electric', 'togemon': 'Nature', 'tortomon': 'Earth', 'tyranomon': 'Fire',
  'unimon': 'Wind', 'v-dramon': 'Dragon', 'veggiemon': 'Nature', 'weedmon': 'Nature',
  'wendimon': 'Dark', 'wizarmon': 'Light', 'woodmon': 'Nature', 'xv-mon': 'Dragon',
  'yanmamon': 'Wind',

  // === Perfect (Ultimate) ===
  'aeroveedramon': 'Dragon', 'allomon': 'Fire', 'alturkabuterimonred': 'Electric',
  'andromon': 'Machine', 'angewomon': 'Light', 'antiramon': 'Light',
  'arachnemon': 'Dark', 'argomonperfect': 'Dark', 'bigmamemon': 'Machine',
  'bishopchessmon': 'Light', 'blackrapidmon': 'Dark', 'blackwargrowlmon': 'Dark',
  'blossomon': 'Nature', 'brachiomon': 'Water', 'cherrymon': 'Nature',
  'crescemon': 'Dark', 'cyberdramon': 'Dragon', 'deramon': 'Wind',
  'digitamamon': 'Virus', 'dinobeemon': 'Nature', 'divermon': 'Water',
  'dorugreymon': 'Dragon', 'dragomon': 'Dark', 'etemon': 'Virus',
  'flamedramon': 'Fire', 'flaremon': 'Fire', 'garbagemon': 'Virus',
  'garudamon': 'Wind', 'gigadramon': 'Machine', 'giromon': 'Machine',
  'grappleomon': 'Earth', 'holyangemon': 'Light', 'infermon': 'Dark',
  'kabukimon': 'Nature', 'karatenmon': 'Wind', 'kenkimon': 'Machine',
  'knightmon': 'Machine', 'kongoumon': 'Machine', 'kyukimon': 'Wind',
  'ladydevimon': 'Dark', 'lilamon': 'Nature', 'lilymon': 'Nature',
  'lucemonfdm': 'Dark', 'lynxmon': 'Fire', 'machgaogamon': 'Earth',
  'magnamon': 'Light', 'mamemon': 'Machine', 'mametyramon': 'Fire',
  'mammothmon': 'Ice', 'marinedevimon': 'Dark', 'matadormon': 'Dark',
  'megadramon': 'Dark', 'megakabuterimonblue': 'Electric', 'megaseadramon': 'Water',
  'metalgreymon': 'Fire', 'metalmamemon': 'Machine', 'metaltyrannomon': 'Machine',
  'meteormon': 'Earth', 'monzaemon': 'Light', 'mummymon': 'Dark',
  'nanomon': 'Machine', 'okuwamon': 'Nature', 'owlmon': 'Wind',
  'paildramon': 'Dragon', 'pandamon': 'Earth', 'parrotmon': 'Electric',
  'phantomon': 'Dark', 'pipismon': 'Dark', 'piximon': 'Light',
  'ponchomon': 'Dark', 'prariemon': 'Earth', 'qilinmon': 'Light',
  'rapidmon': 'Light', 'rizegreymon': 'Fire', 'rookchessmon': 'Machine',
  'scorpiomon': 'Earth', 'seahomon': 'Water', 'shadramon': 'Fire',
  'shakkoumon': 'Light', 'shaujingmon': 'Water', 'shogungekomon': 'Water',
  'shurimon': 'Nature', 'silphymon': 'Wind', 'sinduramon': 'Fire',
  'skullgreymon': 'Dark', 'superstarmon': 'Light', 'taomon': 'Light',
  'tekkamon': 'Machine', 'toucanmon': 'Wind', 'triceramon': 'Earth',
  'tylomon': 'Water', 'vademon': 'Dark', 'vajramon': 'Earth',
  'vamdemon': 'Dark', 'vermilimon': 'Fire', 'volcamon': 'Fire',
  'wargrowlmon': 'Fire', 'weregarurumon': 'Earth', 'weregarurumonblack': 'Dark',
  'whamon': 'Water', 'xtyrannomon': 'Fire', 'yatagaramon': 'Wind', 'zudomon': 'Water',

  // === Ultimate (Mega) ===
  'alphamon': 'Light', 'anubismon': 'Dark', 'apocalymon': 'Dark', 'apollomon': 'Fire',
  'argomonultimate': 'Dark', 'armageddemon': 'Dark', 'babamon': 'Nature',
  'baihumon': 'Holy Beast', 'bantyoleomon': 'Earth', 'barbamon': 'Dark',
  'beelzebumon': 'Dark', 'beelzebumonblaster': 'Dark', 'belialvamdemon': 'Dark',
  'belphemon': 'Dark', 'blacksaintgalgomon': 'Dark', 'blackwargreymon': 'Fire',
  'boltmon': 'Electric', 'cannondramon': 'Machine', 'chaosdukemon': 'Dark',
  'chaosdukemoncore': 'Dark', 'chaosgrimmon': 'Dark', 'chaosmon': 'Dragon',
  'cherubimon': 'Light', 'cherubimonvirus': 'Dark', 'chronomon': 'Light',
  'chronomondm': 'Dark', 'creepymon': 'Dark', 'daemon': 'Dark', 'darkdramon': 'Machine',
  'deathmon': 'Dark', 'deathmonblack': 'Dark', 'devitamamon': 'Dark',
  'diaboromon': 'Dark', 'dianamon': 'Ice', 'dorugoramon': 'Dragon',
  'duftmon': 'Light', 'dukemon': 'Light', 'dukemoncm': 'Light',
  'eaglemon': 'Wind', 'ebemon': 'Machine', 'exogrimmon': 'Dark',
  'gaiomon': 'Fire', 'galfmon': 'Dark', 'gigaseadramon': 'Water',
  'goldramon': 'Holy Dragon', 'grandracmon': 'Dark', 'grankuwagamon': 'Nature',
  'granlocomon': 'Machine', 'grimmon': 'Dark', 'gryphonmon': 'Wind',
  'herculeskabuterimon': 'Electric', 'hiandromon': 'Machine',
  'imperialdramon': 'Dragon', 'imperialdramondmblack': 'Dragon',
  'imperialdramonfighter': 'Dragon', 'imperialdramonpaladin': 'Light',
  'jijimon': 'Earth', 'jumbogamemon': 'Water', 'justimon': 'Machine',
  'kingchessmon': 'Machine', 'kuzuhamon': 'Dark', 'lampmon': 'Fire',
  'leviamon': 'Water', 'lilithmon': 'Dark', 'lotusmon': 'Nature',
  'machinedramon': 'Machine', 'magnadramon': 'Holy Dragon', 'marineangemon': 'Water',
  'megidramon': 'Dragon', 'merukimon': 'Earth', 'metaletemon': 'Machine',
  'metalgarurumon': 'Ice', 'metalseadramon': 'Water', 'milleniummon': 'Dark',
  'minervamon': 'Earth', 'miragegaogamon': 'Earth', 'miragegaogamonburst': 'Earth',
  'moonmilleniummon': 'Dark', 'neptunmon': 'Water', 'omegamon': 'Light',
  'ophanimon': 'Light', 'ophanimoncore': 'Dark', 'parasimon': 'Virus',
  'pharaohmon': 'Dark', 'phoenixmon': 'Fire', 'piedmon': 'Dark',
  'plesiomon': 'Water', 'princemamemon': 'Machine', 'pukumon': 'Water',
  'puppetmon': 'Nature', 'queenchessmon': 'Machine', 'quinglongmon': 'Holy Dragon',
  'ravemon': 'Wind', 'ravemonburst': 'Wind', 'rosemon': 'Nature',
  'rosemonburst': 'Nature', 'saberleomon': 'Earth', 'saintgalgomon': 'Machine',
  'sakuyamon': 'Light', 'seraphimon': 'Light', 'shinegreymon': 'Fire',
  'shinegreymonburst': 'Fire', 'shinegreymonruin': 'Dark', 'skullbarukimon': 'Dark',
  'skullmammon': 'Dark', 'slashangemon': 'Light', 'sleipmon': 'Light',
  'spinomon': 'Earth', 'susanoomon': 'Light', 'valkyrimon': 'Wind',
  'varodurumon': 'Light', 'venommyotismon': 'Dark', 'vikemon': 'Ice',
  'wargreymon': 'Fire', 'waruseadramon': 'Water', 'xuanwumon': 'Holy Beast',
  'zanbamon': 'Dark', 'zeedmillenniummon': 'Dark', 'zhuqiaomon': 'Holy Beast',

  // === Additions ===
  'aegisdramon': 'Machine', 'bastemon': 'Dark', 'beelzemonxros': 'Dark',
  'blastmon': 'Earth', 'bluemeramon': 'Fire', 'bommon': 'Machine',
  'cerberumon': 'Dark', 'chaosdramon': 'Machine', 'daipenmon': 'Ice',
  'dondokomon': 'Fire', 'gaossmon': 'Fire', 'greymonxw': 'Fire',
  'lucemon': 'Light', 'madleomon': 'Dark', 'nefertimon': 'Light',
  'skullscorpiomon': 'Dark', 'shoutmonb': 'Fire', 'tactimon': 'Dark',
};

// Type effectiveness chart (attacker -> defender)
const TYPE_CHART = {
  Fire:     { Nature: 2, Machine: 2, Dark: 0.5, Water: 0.5, Fire: 0.5 },
  Water:    { Fire: 2, Earth: 2, Water: 0.5, Nature: 0.5 },
  Light:    { Dark: 2, Virus: 2, Light: 0.5 },
  Dark:     { Light: 2, 'Holy Dragon': 0.5, 'Holy Beast': 0.5 },
  'Holy Dragon': { Dark: 2, Fire: 2, 'Holy Beast': 0.5, Machine: 0.5 },
  'Holy Beast':  { Dark: 2, Virus: 2, Light: 0.5 },
  Machine:  { Nature: 2, Wind: 2, Fire: 0.5, Water: 0.5, Electric: 0.5, Machine: 0.5 },
  Wind:     { Nature: 2, Earth: 2, Machine: 0.5, Electric: 0.5 },
  Virus:    { Light: 2, Nature: 2, Dark: 0.5, Virus: 0.5 },
  Special:  { Dark: 2, Machine: 0.5 },
  Nature:   { Water: 2, Earth: 2, Fire: 0.5, Virus: 0.5 },
  Earth:    { Fire: 2, Electric: 2, Machine: 2, Water: 0.5, Nature: 0.5 },
  Electric: { Water: 2, Wind: 2, Earth: 0, Electric: 0.5 },
  Ice:      { Nature: 2, Wind: 2, Dragon: 2, Fire: 0.5, Water: 0.5, Ice: 0.5 },
  Dragon:   { Dragon: 2, Machine: 0.5 },
};

function getTypeMultiplier(attackType, defendType) {
  return (TYPE_CHART[attackType] && TYPE_CHART[attackType][defendType]) || 1;
}

// ── Persist lastSeenId ──
async function getLastSeenId() {
  return db ? await db.getSetting('autoreply_last_seen_id') : null;
}

async function saveLastSeenId(id) {
  if (!id || !db) return;
  const current = await getLastSeenId();
  if (!current || BigInt(id) > BigInt(current)) {
    await db.setSetting('autoreply_last_seen_id', id);
  }
}

// ── OAuth 1.0a ──
function oauthHeader(method, baseUrl, queryParams = {}) {
  const p = {
    oauth_consumer_key:     X_API_KEY,
    oauth_nonce:            crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        String(Math.floor(Date.now() / 1000)),
    oauth_token:            X_ACCESS_TOKEN,
    oauth_version:          '1.0',
    ...queryParams,
  };

  const sorted = Object.keys(p).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(p[k])}`)
    .join('&');

  const base = [method.toUpperCase(), encodeURIComponent(baseUrl), encodeURIComponent(sorted)].join('&');
  const key  = `${encodeURIComponent(X_API_SECRET)}&${encodeURIComponent(X_ACCESS_TOKEN_SECRET)}`;

  p.oauth_signature = crypto.createHmac('sha1', key).update(base).digest('base64');

  const oauthOnly = Object.entries(p)
    .filter(([k]) => k.startsWith('oauth_'))
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(', ');

  return `OAuth ${oauthOnly}`;
}

// ── X API v2 helpers ──
async function getBotUserId() {
  const url = 'https://api.twitter.com/2/users/me';
  try {
    const res = await axios.get(url, { headers: { Authorization: oauthHeader('GET', url) } });
    return res.data?.data?.id;
  } catch (err) {
    console.error('[DIGIMONX] Auth failed. HTTP', err.response?.status);
    console.error('[DIGIMONX] Response:', JSON.stringify(err.response?.data));
    throw err;
  }
}

async function fetchMentions(userId) {
  const base = `https://api.twitter.com/2/users/${userId}/mentions`;
  const qp = {
    'tweet.fields': 'author_id,created_at,text,conversation_id',
    expansions: 'author_id',
    'user.fields': 'username,profile_image_url',
    max_results: '100',
  };
  const lastSeenId = await getLastSeenId();
  if (lastSeenId) {
    qp.since_id = lastSeenId;
  } else {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    qp.start_time = fiveMinAgo;
    console.log(`[DIGIMONX] First run — only fetching mentions since ${fiveMinAgo}`);
  }

  const query = new URLSearchParams(qp).toString();
  const fullUrl = `${base}?${query}`;

  const res = await axios.get(fullUrl, {
    headers: { Authorization: oauthHeader('GET', base, qp) },
  });

  const tweets = res.data?.data || [];
  const users  = res.data?.includes?.users || [];
  const userMap = Object.fromEntries(users.map(u => [u.id, { username: u.username, avatar: u.profile_image_url || '' }]));

  // Return tweets sorted oldest-first so we process in order
  // This prevents skipping tweets when lastSeenId advances past unprocessed ones
  return tweets.map(t => ({
    id:             t.id,
    text:           t.text,
    authorUsername: userMap[t.author_id]?.username || 'unknown',
    authorAvatar:   userMap[t.author_id]?.avatar || '',
    createdAt:      t.created_at,
    conversationId: t.conversation_id || t.id,
  })).sort((a, b) => {
    // Sort by ID ascending (oldest first) so we don't skip any
    if (BigInt(a.id) < BigInt(b.id)) return -1;
    if (BigInt(a.id) > BigInt(b.id)) return 1;
    return 0;
  });
}

async function uploadMedia(imageBuffer) {
  const url = 'https://upload.twitter.com/1.1/media/upload.json';

  const boundary = '----DigimonXUpload' + crypto.randomBytes(8).toString('hex');
  const parts = [];
  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="media_data"\r\n\r\n${imageBuffer.toString('base64')}\r\n`);
  parts.push(`--${boundary}--\r\n`);
  const bodyStr = parts.join('');

  const res = await axios.post(url, bodyStr, {
    headers: {
      Authorization: oauthHeader('POST', url),
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    maxBodyLength: 10 * 1024 * 1024,
  });

  return res.data?.media_id_string;
}

async function postReply(text, inReplyToTweetId, mediaId, conversationId) {
  const url  = 'https://api.twitter.com/2/tweets';
  const body = { text, reply: { in_reply_to_tweet_id: inReplyToTweetId } };
  if (mediaId) {
    body.media = { media_ids: [mediaId] };
  }

  try {
    const res = await axios.post(url, body, {
      headers: { Authorization: oauthHeader('POST', url), 'Content-Type': 'application/json' },
    });
    return res.data?.data;
  } catch (err) {
    // If reply fails, try without reply threading (sometimes conversation is restricted)
    if (err.response?.status === 403 && err.response?.data?.detail?.includes('reply')) {
      console.warn(`[DIGIMONX] Reply threading failed, posting as quote-style mention`);
      const fallbackBody = { text };
      if (mediaId) fallbackBody.media = { media_ids: [mediaId] };
      const res2 = await axios.post(url, fallbackBody, {
        headers: { Authorization: oauthHeader('POST', url), 'Content-Type': 'application/json' },
      });
      return res2.data?.data;
    }
    throw err;
  }
}

// ── Command parser (regex fast pass) ──
function parseCommandRegex(text) {
  const lower = text.toLowerCase();
  const body = lower.replace(/@\w+/g, '').trim();

  // Questions about rules/limits/how-it-works → always chat, never a command
  const isQuestion = /\?/.test(body) && /\b(can i|how many|what('?s| is| are)|is it|is there|already|max|limit|most|allowed|rules?|explain|tell me about|how does|how do)\b/.test(body);
  if (isQuestion) return null;

  // Tame — wants to tame a Digimon (must be DIRECT intent, not asking how)
  // "how to get/tame" or "how do i" = question → falls through to help/chat
  if (/\b(how|what|where|why|can)\b/.test(body)) {
    // skip tame — let it fall to help or chat
  } else if (/\b(tame|catch|scan|digivice|wild|encounter|spawn|claim|hatch)\b/.test(body) ||
      /\b(give|get|want|need|gimme)\b.*\b(digimon|digi|one|mon)\b/.test(body) ||
      /\bnew\s+(digimon|digi|mon)\b/.test(body) ||
      /\bi\s+want\s+(a\s+)?(digimon|digi|mon)\b/.test(body)) {
    return 'tame';
  }

  // Feed — wants to feed their Digimon
  if (/\b(feed|fed|food|hungry|starving|eat|snack|treat|data|nourish|meal|energy)\b/.test(body) ||
      /\bgive\b.*\b(food|data|treat)\b/.test(body) ||
      /\bneeds?\s+(food|to\s+eat|feeding|data)\b/.test(body)) {
    return 'feed';
  }

  // Help — wants to know commands / how to play
  if (/\b(help|commands?|how\s*(to|do\s*i)|guide|tutorial|instructions?|what\s*can)\b/.test(body)) {
    return 'help';
  }

  // Format Device — wants to reset/delete their Digimon and start over
  if (/\b(format|reset|wipe|delete|erase|clear)\b.*\b(device|digivice|data|all|everything)\b/.test(body) ||
      /\b(format|reset|wipe)\b/.test(body) && /\b(device|digivice)\b/.test(body) ||
      /\b(release|kick|remove|let\s*go|get\s*rid|discard|abandon|swap\s*out)\b/.test(body)) {
    return 'format';
  }

  // Battle — wants to battle
  if (/\b(battle|fight|challenge|pvp|versus|vs|duel|attack|combat)\b/.test(body) ||
      /\b(1v1|1\s*v\s*1)\b/.test(body) ||
      /\bsend\b.*\b(out|to\s*(battle|fight)|into)\b/.test(body) ||
      /\b(go|use|choose|pick)\b.*\b(battle|fight)\b/.test(body)) {
    return 'battle';
  }

  // Digivolve — wants to digivolve (not available yet)
  if (/\b(digivolve|evolve|evolution|digivolution|mega|transform|final\s*form|next\s*form|warp)\b/.test(body)) {
    return 'digivolve';
  }

  // Activity — wants Digimon to do something
  if (/\b(walk|stroll|play|adventure|explore|hang\s*out|activity|trip|train|exercise|run)\b/.test(body) ||
      /\b(take|bring|let|send)\b.*\b(out|walk|outside|around|play|somewhere|adventure)\b/.test(body) ||
      /\b(bored|boring|lonely|alone|nothing\s+to\s+do)\b/.test(body) ||
      /\b(digital\s+world|go\s+outside|fresh\s+air)\b/.test(body)) {
    return 'activity';
  }

  // Check — wants to see Digimon status
  if (/\b(check|status|stats|info|digidex|digicheck)\b/.test(body) ||
      /\bhow('?s|\s+is|\s+are)\b/.test(body) ||
      /\b(look|view|see|show|tell)\b.*\b(digimon|digi|my|him|her|it)\b/.test(body) ||
      /\bmy\s+(digimon|digi|mon|team)\b/.test(body)) {
    return 'check';
  }

  // Invite — user is trying to bring a friend
  const afterPrefix = lower.replace(/^(\s*@\w+\s*)+/, '');
  const hasIntentionalMention = /@\w+/.test(afterPrefix);
  if (hasIntentionalMention &&
      /\b(teach|invite|bring|show|tell|get|convince|introduce|recruit)\b/.test(body) &&
      /\b(digimon|digi|join|tame|play|try|start|how)\b/.test(body)) {
    return 'invite';
  }

  return null;
}

// ── AI model ──
const AI_MODEL = process.env.KIMI_API_KEY ? 'kimi-k2-0905-preview' : 'gpt-4o-mini';

// ── AI command parser (fallback) ──
async function parseCommandAI(text) {
  if (!openai) return null;

  try {
    const body = text.replace(/@\w+/g, '').trim();
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You classify messages sent to a Digimon bot on X. Commands:
- "tame" = user DIRECTLY wants to tame/catch/scan/get a new Digimon RIGHT NOW (like "tame digimon" or "give me a digimon")
- "feed" = user wants to feed their Digimon, give data, mentions food
- "check" = user wants to check Digimon status, see stats
- "battle" = user wants to battle, fight, challenge, pvp
- "activity" = user wants Digimon to do something fun, go outside, play, train
- "format" = user wants to FORMAT DEVICE / reset / delete / wipe their Digimon to start over
- "help" = user wants to know commands, how to play, what they can do
- "digivolve" = user wants to digivolve their Digimon
- "invite" = user is trying to get someone else to join
- "chat" = ANYTHING else: questions about rules/limits, greetings, opinions, complaints, confusion, asking HOW to get/tame

IMPORTANT: if the user is asking a QUESTION like "how do i get a digimon" or "how to tame" or "what is this", that is ALWAYS "chat" NOT "tame". Only classify as "tame" when the user is giving a DIRECT command to tame right now.

Respond with ONLY one word: tame, feed, check, battle, activity, format, help, digivolve, invite, or chat`
        },
        { role: 'user', content: body }
      ],
      max_tokens: 10,
      temperature: 0
    });

    const cmd = completion.choices[0].message.content.trim().toLowerCase();
    if (['tame', 'feed', 'check', 'battle', 'activity', 'format', 'help', 'digivolve', 'invite', 'chat'].includes(cmd)) return cmd;
    if (cmd === 'release') return 'format';
    return 'chat';
  } catch (err) {
    console.error('[DIGIMONX] AI command parse failed:', err.message);
    return null;
  }
}

async function parseCommand(text) {
  const regexResult = parseCommandRegex(text);
  if (regexResult) return regexResult;

  console.log('[DIGIMONX] Regex miss, asking AI for:', text.replace(/@\w+/g, '').trim().slice(0, 60));
  const aiResult = await parseCommandAI(text);
  return aiResult || 'chat';
}

// ── AI-powered feed parsing ──
async function aiFeedParse(tweetText, petName, petType) {
  if (!openai) return { foodItem: null, reaction: null };

  try {
    const body = tweetText.replace(/@\w+/g, '').trim();
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You help parse Digimon feeding commands. Extract what food/data/item the user wants to give their Digimon, and write a short fun reaction.

STRICT RULES:
- NEVER use emoji or emoticons. zero. none.
- NEVER use dashes like -- or - between words
- use lowercase only
- use simple short words only. no big vocabulary.
- dont say words like "delightful" "magnificent" "wonderful" "fantastic" "incredible" "adorable" or any fancy words
- keep it natural like texting a friend
- Respond with ONLY valid JSON.`
        },
        {
          role: 'user',
          content: `User said: "${body}"
Digimon name: ${petName} (${petType})

Extract what they're feeding the Digimon. If they just say "feed" with no specific item, set foodItem to null.
Write a short fun reaction (1 sentence, max 60 chars). no emoji. no dashes. lowercase. simple words.

Respond with ONLY this JSON (no markdown):
{"foodItem": "the item or null", "reaction": "short fun reaction"}`
        }
      ],
      max_tokens: 80,
      temperature: 0.8
    });

    let text = completion.choices[0].message.content.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    const data = JSON.parse(text);
    return {
      foodItem: data.foodItem && data.foodItem !== 'null' ? data.foodItem : null,
      reaction: data.reaction || null
    };
  } catch (err) {
    console.error('[DIGIMONX] AI feed parse failed:', err.message);
    return { foodItem: null, reaction: null };
  }
}

// ── Evolution stage folders ──
const STAGE_FOLDERS = ['Baby', 'Child', 'Adult', 'Perfect', 'Ultimate', 'Additions'];

// Map folder to evolution stage name
const STAGE_NAMES = {
  'Baby': 'Baby',
  'Child': 'Rookie',
  'Adult': 'Champion',
  'Perfect': 'Ultimate',
  'Ultimate': 'Mega',
  'Additions': 'Variable',
};

// ── Get random Digimon from GIF files (all stage folders) ──
function getRandomDigimon() {
  try {
    let gifFiles = [];

    for (const folder of STAGE_FOLDERS) {
      const dir = path.join(__dirname, 'public', 'digimon', folder);
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.gif'));
        gifFiles = gifFiles.concat(files.map(f => ({ file: f, folder, stage: STAGE_NAMES[folder] || 'Unknown' })));
      }
    }

    if (gifFiles.length === 0) return null;

    const pick = gifFiles[Math.floor(Math.random() * gifFiles.length)];
    const name = pick.file.replace('.gif', '');
    const element = DIGIMON_ELEMENTS[name.toLowerCase()] || 'Unknown';

    return {
      gifPath: `/digimon/${pick.folder}/${pick.file}`,
      name: name,
      element: element,
      stage: pick.stage,
    };
  } catch (err) {
    console.error('[DIGIMONX] Error getting random Digimon:', err.message);
    return null;
  }
}

// ── Get random Digimon from a specific stage ──
function getRandomDigimonFromStage(stageName) {
  try {
    // Map stage name to folder
    const stageToFolder = {
      'baby': 'Baby', 'in-training': 'Baby',
      'child': 'Child', 'rookie': 'Child',
      'adult': 'Adult', 'champion': 'Adult',
      'perfect': 'Perfect', 'ultimate': 'Perfect',
      'ultimate-mega': 'Ultimate', 'mega': 'Ultimate',
    };
    const folder = stageToFolder[stageName.toLowerCase()] || stageName;
    const dir = path.join(__dirname, 'public', 'digimon', folder);
    if (!fs.existsSync(dir)) return null;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.gif'));
    if (files.length === 0) return null;

    const pick = files[Math.floor(Math.random() * files.length)];
    const name = pick.replace('.gif', '');
    const element = DIGIMON_ELEMENTS[name.toLowerCase()] || 'Unknown';

    return {
      gifPath: `/digimon/${folder}/${pick}`,
      name: name,
      element: element,
      stage: STAGE_NAMES[folder] || 'Unknown',
    };
  } catch (err) {
    console.error('[DIGIMONX] Error getting stage Digimon:', err.message);
    return null;
  }
}

// ── Battle simulation (narrative style) ──
function simulateBattle(pet1, pet2) {
  const type1 = pet1.race || 'Unknown';
  const type2 = pet2.race || 'Unknown';
  const level1 = pet1.level || 1;
  const level2 = pet2.level || 1;
  const stage1 = pet1.stage || 'Baby';
  const stage2 = pet2.stage || 'Baby';

  let hp1 = 100 + (level1 * 10);
  let hp2 = 100 + (level2 * 10);

  const mult1to2 = getTypeMultiplier(type1, type2);
  const mult2to1 = getTypeMultiplier(type2, type1);

  // Type-based attack move pools
  const ATTACK_MOVES = {
    Fire:     ['unleashes a blazing fireball', 'breathes searing flames', 'launches a fire tornado', 'ignites a burning strike'],
    Water:    ['summons a tidal wave', 'blasts a hydro cannon', 'conjures a water vortex', 'strikes with aqua force'],
    Light:    ['fires a beam of holy light', 'channels radiant energy', 'casts a divine blast', 'unleashes a shining strike'],
    Dark:     ['strikes from the shadows', 'unleashes dark energy', 'casts a nightmare wave', 'channels forbidden power'],
    'Holy Dragon': ['breathes sacred flames', 'charges with divine fury', 'unleashes a holy roar', 'strikes with celestial claws'],
    'Holy Beast':  ['pounces with sacred might', 'channels holy aura', 'unleashes a divine fang', 'charges with blessed fury'],
    Machine:  ['fires a missile barrage', 'unleashes a laser blast', 'charges with metal force', 'activates turbo cannon'],
    Wind:     ['summons a razor gale', 'strikes with a cyclone slash', 'unleashes a sonic boom', 'rides the storm winds'],
    Virus:    ['injects corrupted data', 'launches a virus pulse', 'strikes with glitch force', 'unleashes digital decay'],
    Special:  ['channels mysterious energy', 'unleashes a unique technique', 'strikes with unknown force', 'activates a hidden power'],
    Nature:   ['summons thorny vines', 'strikes with leaf blade', 'channels forest energy', 'unleashes a petal storm'],
    Earth:    ['slams with seismic force', 'hurls a massive boulder', 'triggers a ground shatter', 'charges with tectonic power'],
    Electric: ['fires a thunderbolt', 'channels a lightning surge', 'unleashes an electric storm', 'strikes with volt tackle'],
    Ice:      ['blasts a frozen beam', 'summons an ice storm', 'strikes with glacial force', 'unleashes a blizzard wave'],
    Dragon:   ['breathes dragonfire', 'charges with draconic fury', 'unleashes a dragon pulse', 'strikes with ancient power'],
    Unknown:  ['launches a fierce attack', 'strikes with raw power', 'charges forward', 'unleashes energy'],
  };

  const DODGE_PHRASES = [
    'dodges swiftly but takes a glancing hit',
    'tries to counter but gets pushed back',
    'braces for impact',
    'stands firm against the blow',
  ];

  const SUPER_EFF_PHRASES = [
    'The attack lands with devastating force!',
    'A critical weakness is exposed!',
    'The type advantage is overwhelming!',
    'It strikes right at the weak point!',
  ];

  const NOT_EFF_PHRASES = [
    'but the attack barely scratches the surface.',
    'but the opponent shrugs it off easily.',
    'but the damage is greatly reduced.',
    'but the type mismatch weakens the blow.',
  ];

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const log = [];
  let round = 0;
  let attacker = Math.random() > 0.5 ? 1 : 2;

  log.push(`${pet1.name} (Lv.${level1} ${type1}) faces off against ${pet2.name} (Lv.${level2} ${type2})!`);

  while (hp1 > 0 && hp2 > 0 && round < 10) {
    round++;
    if (attacker === 1) {
      const baseDmg = 15 + Math.floor(Math.random() * 10) + level1 * 2;
      const dmg = Math.floor(baseDmg * mult1to2);
      hp2 = Math.max(0, hp2 - dmg);
      const move = pick(ATTACK_MOVES[type1] || ATTACK_MOVES['Unknown']);
      let line = `${pet1.name} ${move}!`;
      if (mult1to2 > 1) {
        line += ` ${pick(SUPER_EFF_PHRASES)}`;
      } else if (mult1to2 < 1) {
        line += ` ${pick(NOT_EFF_PHRASES)}`;
      } else {
        line += ` ${pet2.name} ${pick(DODGE_PHRASES)}.`;
      }
      log.push(line);
      attacker = 2;
    } else {
      const baseDmg = 15 + Math.floor(Math.random() * 10) + level2 * 2;
      const dmg = Math.floor(baseDmg * mult2to1);
      hp1 = Math.max(0, hp1 - dmg);
      const move = pick(ATTACK_MOVES[type2] || ATTACK_MOVES['Unknown']);
      let line = `${pet2.name} ${move}!`;
      if (mult2to1 > 1) {
        line += ` ${pick(SUPER_EFF_PHRASES)}`;
      } else if (mult2to1 < 1) {
        line += ` ${pick(NOT_EFF_PHRASES)}`;
      } else {
        line += ` ${pet1.name} ${pick(DODGE_PHRASES)}.`;
      }
      log.push(line);
      attacker = 1;
    }
  }

  const winner = hp1 > 0 ? pet1 : pet2;
  const loser = hp1 > 0 ? pet2 : pet1;
  const winLevel = hp1 > 0 ? level1 : level2;
  const loseLevel = hp1 > 0 ? level2 : level1;
  const winType = hp1 > 0 ? type1 : type2;
  const loseType = hp1 > 0 ? type2 : type1;
  const winMult = hp1 > 0 ? mult1to2 : mult2to1;

  // Build reason for winning
  const reasons = [];
  if (winLevel > loseLevel) reasons.push(`higher level (Lv.${winLevel} vs Lv.${loseLevel})`);
  if (winMult > 1) reasons.push(`${winType} type advantage over ${loseType}`);
  if (winLevel <= loseLevel && winMult <= 1) reasons.push('superior battle strategy');

  const reasonStr = reasons.length > 0 ? reasons.join(' and ') : 'outlasting the opponent';
  log.push(`${winner.name} claims victory thanks to ${reasonStr}! ${loser.name} retreats to recover.`);

  return { winner, loser, log: log.join('\n'), hp1, hp2 };
}

// ── Digimon selection helper ──
function parsePokemonChoice(pets, text) {
  if (!pets || pets.length === 0) return { pet: null };

  const body = text.toLowerCase().replace(/@\w+/g, '').trim();

  // Match by exact name
  for (const pet of pets) {
    if (body.includes(pet.name.toLowerCase())) {
      return { pet };
    }
  }

  // Match by partial name (at least 3 chars)
  for (const pet of pets) {
    const name = pet.name.toLowerCase();
    const words = body.split(/\s+/);
    for (const w of words) {
      if (w.length >= 3 && name.startsWith(w)) {
        return { pet };
      }
    }
  }

  // Match "my 2" / "my 2nd" / "digimon 2" patterns
  const myNumMatch = body.match(/\b(?:my|digimon|number|no|#)\s*(\d)\b/);
  if (myNumMatch) {
    const idx = parseInt(myNumMatch[1]) - 1;
    if (idx >= 0 && idx < pets.length) return { pet: pets[idx] };
    return { pet: null, outOfRange: true, requested: idx + 1, have: pets.length };
  }

  // Match ordinals
  if (/\b(first|1st)\b/.test(body)) return { pet: pets[0] };
  if (/\b(second|2nd)\b/.test(body)) {
    if (pets.length >= 2) return { pet: pets[1] };
    return { pet: null, outOfRange: true, requested: 2, have: pets.length };
  }
  if (/\b(third|3rd)\b/.test(body)) {
    if (pets.length >= 3) return { pet: pets[2] };
    return { pet: null, outOfRange: true, requested: 3, have: pets.length };
  }
  if (/\blast\b/.test(body)) return { pet: pets[pets.length - 1] };

  return { pet: null };
}

// ── Command handlers ──

async function handleTame(username, tweetText, authorAvatar) {
  const ownerLink = `https://x.com/${username}`;

  // Check if user already has a Digimon (limit: 1 per tamer)
  const existing = await db.getPetsByOwner(username);
  if (existing.length >= 1) {
    return {
      text: `@${username} you already have ${existing[0].name}. feed and battle to level up then digivolve. say "format device" if you want to start over with a new digimon`,
      image: null
    };
  }

  // Only tame from Baby stage
  const digimon = getRandomDigimonFromStage('baby');
  if (!digimon) {
    return { text: `@${username} no digi-eggs found in the digital world right now try again later`, image: null };
  }

  // Get higher-res avatar
  const avatar = (authorAvatar || '').replace('_normal', '_200x200');
  const petId = await db.createDigimon(digimon.gifPath, digimon.name, digimon.element, ownerLink, 'Happy', avatar);

  const image = await cardGen.generateCatchCard(
    { name: digimon.name, race: digimon.element, element: digimon.element, gifPath: digimon.gifPath },
    `@${username}`
  );

  return {
    text: `@${username} welcome to digimon world! ${digimon.name} joined you. baby ${digimon.element} type. digivolve: baby > child > adult > perfect > ultimate`,
    image
  };
}

async function handleFeed(username, tweetText) {
  const pets = await db.getPetsByOwner(username);
  if (pets.length === 0) {
    return { text: `@${username} you dont have a digimon yet. say "tame digimon" and ill help you find one`, image: null };
  }

  const choice = parsePokemonChoice(pets, tweetText);

  if (choice.outOfRange) {
    const names = pets.map((p, i) => `${i + 1}. ${p.name}`).join(', ');
    return { text: `@${username} you only have ${choice.have} digimon. your team: ${names}`, image: null };
  }

  const pet = choice.pet || pets[0];

  const { foodItem, reaction } = await aiFeedParse(tweetText, pet.name, pet.race);

  try {
    const result = await db.feedPet(pet.id);
    if (result.success) {
      const updatedPet = await db.getPetById(pet.id);
      const image = await cardGen.generateFeedCard(updatedPet || pet, result.feedCount, result.growthStage, foodItem, reaction);

      const msg = reaction
        ? `${reaction}`
        : foodItem
          ? `${pet.name} liked the ${foodItem}`
          : `${pet.name} has been fed`;

      return {
        text: `@${username} ${msg} feeds: ${result.feedCount} | stage: ${result.growthStage}`,
        image
      };
    }
  } catch (feedErr) {
    const minutesMatch = feedErr.message.match(/(\d+)/);
    const mins = minutesMatch ? minutesMatch[1] : '60';
    return { text: `@${username} ${pet.name} is still full come back in ${mins} minutes`, image: null };
  }
}

async function handleCheck(username, tweetText) {
  const pets = await db.getPetsByOwner(username);
  if (pets.length === 0) {
    return { text: `@${username} you dont have a digimon yet. say "tame digimon" to get started`, image: null };
  }

  const choice = parsePokemonChoice(pets, tweetText);

  if (choice.outOfRange) {
    const names = pets.map((p, i) => `${i + 1}. ${p.name}`).join(', ');
    return { text: `@${username} you only have ${choice.have} digimon. your team: ${names}`, image: null };
  }

  // Specific digimon requested → show single status card
  if (choice.pet) {
    const pet = choice.pet;
    const image = await cardGen.generateStatusCard(pet);
    return {
      text: `@${username} ${pet.name} (${pet.race}) | lv.${pet.level || 1} | ${pet.growth_stage} | ${pet.feed_count} feeds | ${pet.wins || 0}W/${pet.losses || 0}L | ${pet.activity || 'chilling'}`,
      image
    };
  }

  // No specific digimon → show full team
  const image = await cardGen.generateTeamCard(pets, `@${username}`);
  const teamList = pets.map((p, i) => `${i + 1}.${p.name} lv.${p.level || 1}`).join(' | ');
  return {
    text: `@${username} your team: ${teamList}. say "check [name]" to see one digimon`,
    image
  };
}

function parseMultiplePokemon(pets, text) {
  if (!pets || pets.length === 0) return [];
  const body = text.toLowerCase().replace(/@\w+/g, '').trim();
  const matched = new Set();
  const results = [];

  if (/\b(all|everything|everyone|whole\s*team)\b/.test(body)) {
    return [...pets];
  }

  for (const pet of pets) {
    const name = pet.name.toLowerCase();
    if (body.includes(name) && !matched.has(pet.id)) {
      matched.add(pet.id);
      results.push(pet);
      continue;
    }
    const words = body.split(/\s+/);
    for (const w of words) {
      if (w.length >= 3 && name.startsWith(w) && !matched.has(pet.id)) {
        matched.add(pet.id);
        results.push(pet);
      }
    }
  }

  if (/\b(first|1st)\b/.test(body) && pets[0] && !matched.has(pets[0].id)) {
    matched.add(pets[0].id); results.push(pets[0]);
  }
  if (/\b(second|2nd)\b/.test(body) && pets[1] && !matched.has(pets[1].id)) {
    matched.add(pets[1].id); results.push(pets[1]);
  }
  if (/\b(third|3rd)\b/.test(body) && pets[2] && !matched.has(pets[2].id)) {
    matched.add(pets[2].id); results.push(pets[2]);
  }
  const numMatches = body.matchAll(/\b(?:my|digimon|number|no|#)\s*(\d)\b/g);
  for (const m of numMatches) {
    const idx = parseInt(m[1]) - 1;
    if (idx >= 0 && idx < pets.length && !matched.has(pets[idx].id)) {
      matched.add(pets[idx].id); results.push(pets[idx]);
    }
  }

  return results;
}

async function handleFormatDevice(username, tweetText) {
  const pets = await db.getPetsByOwner(username);
  if (pets.length === 0) {
    return { text: `@${username} your digivice is already empty. say "tame" to get a new digi-egg`, image: null };
  }

  // Delete all digimon for this user
  for (const pet of pets) {
    await db.deletePet(pet.id);
  }

  const names = pets.map(p => p.name).join(', ');
  return {
    text: `@${username} digivice formatted. ${names} has been released back to the digital world. say "tame" to hatch a new digi-egg`,
    image: null
  };
}

async function handleBattle(username, tweetText) {
  const pets = await db.getPetsByOwner(username);
  if (pets.length === 0) {
    return { text: `@${username} you need a digimon first. say "tame digimon" to get one`, image: null };
  }

  const choice = parsePokemonChoice(pets, tweetText);

  if (choice.outOfRange) {
    const names = pets.map((p, i) => `${i + 1}. ${p.name}`).join(', ');
    return { text: `@${username} you only have ${choice.have} digimon. your team: ${names}`, image: null };
  }

  const myPet = choice.pet || pets[0];

  const myIds = new Set(pets.map(p => p.id));
  const allPets = await db.getAllPets();
  const opponents = allPets.filter(p => !myIds.has(p.id));

  if (opponents.length === 0) {
    return { text: `@${username} ${myPet.name} wants to battle but theres no one around. tell your friends to tame digimon`, image: null };
  }

  const opponent = opponents[Math.floor(Math.random() * opponents.length)];
  const oppOwnerRaw = opponent.owner ? opponent.owner.replace(/.*x\.com\//, '').replace(/.*twitter\.com\//, '').replace(/\//g, '') : 'someone';
  const oppOwner = oppOwnerRaw.replace(/^@/, '');

  const battle = simulateBattle(myPet, opponent);

  const myWon = battle.winner.id === myPet.id;
  await db.updateBattleStats(myPet.id, myWon);
  await db.updateBattleStats(opponent.id, !myWon);

  await db.saveBattle(myPet, username, opponent, oppOwner, battle.winner.id, battle.log, '');

  const winnerOwner = battle.winner.id === myPet.id ? username : oppOwner;
  const image = await cardGen.generateBattleCard(myPet, opponent, battle.winner, battle.log, username, oppOwner, winnerOwner);

  return {
    text: `@${username} ${myPet.name} vs ${opponent.name} and ${battle.winner.name} wins. tamer ${winnerOwner} takes the W +25 XP`,
    image
  };
}

async function handleActivity(username, tweetText) {
  const pets = await db.getPetsByOwner(username);
  if (pets.length === 0) {
    return { text: `@${username} you need a digimon first. say "tame digimon" to get started`, image: null };
  }

  const choice = parsePokemonChoice(pets, tweetText);
  if (choice.outOfRange) {
    const names = pets.map((p, i) => `${i + 1}. ${p.name}`).join(', ');
    return { text: `@${username} you only have ${choice.have} digimon. your team: ${names}`, image: null };
  }

  const pet = choice.pet || pets[0];

  const myIds = new Set(pets.map(p => p.id));
  const allPets = await db.getAllPets();
  const others = allPets.filter(p => !myIds.has(p.id));

  if (others.length === 0) {
    return { text: `@${username} ${pet.name} wants to go out but theres no other digimon around. tell friends to join`, image: null };
  }

  const buddy = others[Math.floor(Math.random() * others.length)];
  const buddyOwnerRaw = buddy.owner ? buddy.owner.replace(/.*x\.com\//, '').replace(/.*twitter\.com\//, '').replace(/\//g, '') : 'someone';
  const buddyOwner = buddyOwnerRaw.replace(/^@/, '');

  let activityText = `${pet.name} and ${buddy.name} went on an adventure in the digital world`;
  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: `You describe fun stuff two Digimon are doing together. Keep it short (under 80 chars). Digimon themed, digital world setting.

STRICT RULES:
- NEVER use emoji or emoticons. zero. none.
- NEVER use dashes like -- or - between words
- use lowercase only
- use simple short words only. no big vocabulary. no fancy words.
- keep it natural like texting a friend

Examples:
training together in the digital arena
racing through file island forest
having a data eating contest
swimming in net ocean
exploring server continent for rare data`
          },
          {
            role: 'user',
            content: `Digimon 1: ${pet.name} (${pet.race}). Digimon 2: ${buddy.name} (${buddy.race}). Describe what they're doing:`
          }
        ],
        max_tokens: 60,
        temperature: 0.9
      });
      activityText = completion.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
    } catch (err) {
      console.error('[DIGIMONX] Activity AI failed:', err.message);
    }
  }

  const image = await cardGen.generateActivityCard(pet, buddy, activityText, username, buddyOwner);

  await db.saveActivity(pet, username, buddy, buddyOwner, activityText, '');

  return {
    text: `@${username} ${pet.name} and ${buddy.name} (a friend's digimon) are ${activityText}`,
    image
  };
}

async function handleDigivolve(username, tweetText) {
  if (!db) return { text: `@${username} system offline`, image: null };

  const pets = await db.getPetsByOwner(username);
  if (!pets || pets.length === 0) {
    return { text: `@${username} you dont have any digimon yet. say "tame digimon" to get started`, image: null };
  }

  // Figure out which pet to digivolve (first by default, or by name/number)
  const body = tweetText.toLowerCase();
  let pet = pets[0];
  if (pets.length > 1) {
    if (/\b(second|2nd|2)\b/.test(body)) pet = pets[1];
    else if (/\b(third|3rd|3)\b/.test(body)) pet = pets[2] || pets[pets.length - 1];
    else {
      // Try to find by name
      for (const p of pets) {
        if (body.includes(p.name.toLowerCase())) { pet = p; break; }
      }
    }
  }

  const petName = pet.name.toLowerCase();
  const evolutions = digiData.getDigivolutions(petName);

  if (!evolutions || evolutions.length === 0) {
    const stage = digiData.getStage(petName);
    return { text: `@${username} ${pet.name} is at ${stage} stage and has reached its final form. no further digivolution available`, image: null };
  }

  // Check level requirement: need level 5+ to digivolve
  const level = pet.level || 1;
  if (level < 5) {
    return { text: `@${username} ${pet.name} needs to be level 5 to digivolve (currently level ${level}). keep feeding and battling to level up`, image: null };
  }

  // Pick a random evolution from available options
  const chosenEvo = evolutions[Math.floor(Math.random() * evolutions.length)];
  const evoName = chosenEvo.charAt(0).toUpperCase() + chosenEvo.slice(1);
  const evoStage = digiData.getStage(chosenEvo);
  const evoElement = DIGIMON_ELEMENTS[chosenEvo] || pet.race || 'Unknown';

  // Find the correct sprite folder for the new form
  const stageToFolder = { 'Baby': 'Baby', 'Rookie': 'Child', 'Champion': 'Adult', 'Ultimate': 'Perfect', 'Mega': 'Ultimate' };
  let newGifPath = null;
  for (const [stage, folder] of Object.entries(stageToFolder)) {
    const checkPath = path.join(__dirname, 'public', 'digimon', folder, chosenEvo + '.gif');
    if (fs.existsSync(checkPath)) {
      newGifPath = `/digimon/${folder}/${chosenEvo}.gif`;
      break;
    }
  }
  // Also check Additions folder
  if (!newGifPath) {
    const addPath = path.join(__dirname, 'public', 'digimon', 'Additions', chosenEvo + '.gif');
    if (fs.existsSync(addPath)) {
      newGifPath = `/digimon/Additions/${chosenEvo}.gif`;
    }
  }
  if (!newGifPath) {
    // Sprite not found, check case-insensitive
    for (const folder of STAGE_FOLDERS) {
      const dir = path.join(__dirname, 'public', 'digimon', folder);
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const match = files.find(f => f.toLowerCase() === chosenEvo.toLowerCase() + '.gif');
        if (match) {
          newGifPath = `/digimon/${folder}/${match}`;
          break;
        }
      }
    }
  }

  if (!newGifPath) {
    return { text: `@${username} ${pet.name} tried to digivolve into ${evoName} but the data was corrupted. try again later`, image: null };
  }

  // Update the pet in the database
  try {
    // Reset level to 1 after digivolution, update name, element, and avatar
    await db.run(`UPDATE pets SET name = ?, race = ?, ascii = ?, level = 1, xp = 0 WHERE id = ?`,
      [evoName, evoElement, newGifPath, pet.id]);

    const oldStage = digiData.getStage(petName) || 'Unknown';
    let replyText = `@${username} DIGIVOLUTION COMPLETE! ${pet.name} digivolved into ${evoName}! ${oldStage} → ${evoStage}. element: ${evoElement}. level reset to 1. keep training your new form`;

    // Try to generate a card image
    let image = null;
    try {
      image = await cardGen.generateCatchCard({
        name: evoName,
        element: evoElement,
        gifPath: newGifPath,
      }, username);
    } catch (e) {
      // Card generation optional
    }

    return { text: replyText, image, command: 'digivolve' };
  } catch (err) {
    console.error('[DIGIMONX] Digivolve DB error:', err.message);
    return { text: `@${username} digivolution failed due to a glitch in the digital world. try again`, image: null };
  }
}

async function handleInvite(username, tweetText) {
  return { text: `@${username} want your friends to join? tell them to reply "tame digimon" to any of our posts`, image: null };
}

async function handleChat(username, tweetText) {
  if (!openai) {
    return { text: `@${username} hey tamer say "tame digimon" to get started`, image: null };
  }

  try {
    const body = tweetText.replace(/@\w+/g, '').trim();
    const pets = await db.getPetsByOwner(username);

    let context = `You are DigimonX, a Digimon taming and battling bot on X. You talk like a real person, chill and casual. Keep replies short (under 200 chars).

STRICT RULES:
- NEVER use emoji or emoticons. not one. zero. no smiley faces no nothing.
- NEVER use dashes like -- or - between words
- NEVER use exclamation marks
- use lowercase only. no caps except @usernames and Digimon names
- use simple short words only. no big vocabulary.
- dont say words like "delightful" "magnificent" "wonderful" "fantastic" "incredible" "adorable" "marvelous" "splendid" or any big words like that
- keep it natural and lowkey like texting a friend. no hype. no cringe.
- no formal punctuation. just periods if needed.
- NEVER mention or @ other users. only reply to the person talking to you.

About DigimonX:
- each tamer gets 1 digimon only. say "tame" to hatch a digi-egg
- your digimon starts as a baby stage
- feed your digimon with data to help it grow and gain XP
- battle other tamers to gain XP (type advantages matter)
- when your digimon levels up enough say "digivolve" to evolve it
- evolution stages: baby > child > adult > perfect > ultimate
- say "format device" to delete your digimon and start over with a new egg
- check your digimon stats anytime

Commands: "tame", "feed", "check", "battle", "digivolve", "format device"

if someone asks how to get a digimon or how to play, explain it to them naturally. dont just tell them to tame. actually answer their question.
if someone asks about the project just talk about it normal. guide them if they ask what to do.`;

    if (pets.length > 0) {
      const names = pets.map(p => `${p.name} (${p.race})`).join(', ');
      context += ` This tamer has: ${names}.`;
    } else {
      context += ` This tamer doesnt have a digimon yet. you can hint they should get one.`;
    }

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: context },
        { role: 'user', content: `@${username} says: "${body}"\n\nReply as @digimononx (include @${username} at the start):` }
      ],
      max_tokens: 100,
      temperature: 0.8
    });

    let reply = completion.choices[0].message.content.trim();
    if (!reply.toLowerCase().startsWith(`@${username.toLowerCase()}`)) {
      reply = `@${username} ${reply}`;
    }
    reply = reply.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '').trim();
    reply = reply.replace(/\s*--\s*/g, ' ').trim();
    reply = reply.replace(new RegExp(`@(?!${username}\\b)\\w+`, 'gi'), '').replace(/\s{2,}/g, ' ').trim();
    return { text: reply, image: null };
  } catch (err) {
    console.error('[DIGIMONX] Chat AI failed:', err.message);
    return { text: `@${username} hey tamer say "tame digimon" to get started`, image: null };
  }
}

// ── Timeout wrapper ──
function withTimeout(promise, ms = 60000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)),
  ]);
}

// ── Process a single mention ──
async function processMention(tweet) {
  const command = await parseCommand(tweet.text);

  let result;
  switch (command) {
    case 'tame':
      result = await handleTame(tweet.authorUsername, tweet.text, tweet.authorAvatar);
      break;
    case 'feed':
      result = await handleFeed(tweet.authorUsername, tweet.text);
      break;
    case 'check':
      result = await handleCheck(tweet.authorUsername, tweet.text);
      break;
    case 'battle':
      result = await handleBattle(tweet.authorUsername, tweet.text);
      break;
    case 'activity':
      result = await handleActivity(tweet.authorUsername, tweet.text);
      break;
    case 'invite':
      result = await handleInvite(tweet.authorUsername, tweet.text);
      break;
    case 'format':
    case 'release':
      result = await handleFormatDevice(tweet.authorUsername, tweet.text);
      break;
    case 'help':
      result = {
        text: `@${tweet.authorUsername} digimonx commands: tame = hatch a digi-egg (1 digimon per tamer). feed = give data to grow. check = see your digimon stats. battle = fight another tamer. digivolve = evolve when ready. format device = delete your digimon and start over. your digimon grows: baby > child > adult > perfect > ultimate`,
        image: null
      };
      break;
    case 'digivolve':
      result = await handleDigivolve(tweet.authorUsername, tweet.text);
      break;
    case 'chat':
    default:
      result = await handleChat(tweet.authorUsername, tweet.text);
  }

  // Enforce tone: strip any emoji, dashes, exclamation marks from ALL replies
  result.text = result.text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '')
    .replace(/\s*--\s*/g, ' ')
    .replace(/!/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // X character limit
  if (result.text.length > 280) result.text = result.text.slice(0, 277) + '...';

  return { ...result, command };
}

// ── Poll loop ──
async function poll() {
  if (!pollerActive) return;
  if (pollBusy) {
    console.log('[DIGIMONX] Previous poll still running, skipping');
    if (pollerActive) pollerTimer = setTimeout(poll, POLL_MS);
    return;
  }
  pollBusy = true;
  stats.lastChecked = new Date().toISOString();
  stats.repliesToday = db ? await db.countRepliesToday() : 0;

  try {
    if (!botUserId) {
      botUserId = await withTimeout(getBotUserId(), 15000);
      console.log(`[DIGIMONX] Bot user ID = ${botUserId} (@${BOT_USERNAME})`);
    }

    const mentions = await withTimeout(fetchMentions(botUserId), 15000);
    console.log(`[DIGIMONX] ${mentions.length} new mention(s)`);

    // Build batch: filter out already-replied and own tweets (no limit — process all)
    const batch = [];
    for (const tweet of mentions) {
      const alreadyReplied = await db.hasReplied(tweet.id);
      if (alreadyReplied) {
        // Still advance lastSeenId past already-replied tweets
        await saveLastSeenId(tweet.id);
        continue;
      }
      if (tweet.authorUsername.toLowerCase() === BOT_USERNAME) {
        await saveLastSeenId(tweet.id);
        continue;
      }
      batch.push(tweet);
    }
    if (batch.length > 0) {
      console.log(`[DIGIMONX] Processing ${batch.length} of ${mentions.length} mention(s) this cycle`);
    } else if (mentions.length > 0) {
      console.log(`[DIGIMONX] All ${mentions.length} mentions already processed (skipped)`);
    }

    // Process oldest-first (already sorted). Stop advancing lastSeenId on failure
    // so the failed tweet gets re-fetched next poll.
    let hitRateLimit = false;
    for (const tweet of batch) {
      if (hitRateLimit) break;

      try {
        const result = await withTimeout(processMention(tweet), 30000);

        let mediaId = null;
        if (result.image) {
          try {
            mediaId = await withTimeout(uploadMedia(result.image), 15000);
            console.log(`[DIGIMONX] Uploaded card image, media_id: ${mediaId}`);
          } catch (uploadErr) {
            console.error(`[DIGIMONX] Image upload failed, replying text-only: ${uploadErr.message}`);
          }
        }

        const replyData = await withTimeout(postReply(result.text, tweet.id, mediaId, tweet.conversationId), 10000);
        const replyTweetId = replyData?.id || '';

        await db.saveRepliedTweet(tweet.id, tweet.authorUsername, tweet.text, result.text, replyTweetId, result.command || 'unknown');
        // Only advance lastSeenId AFTER successful reply+save
        await saveLastSeenId(tweet.id);
        stats.repliesTotal++;
        stats.repliesToday++;
        stats.lastReplied = new Date().toISOString();
        console.log(`[DIGIMONX] Replied to @${tweet.authorUsername}: ${result.text.slice(0, 80)}...`);

        // Auto-fill avatar for existing tamers
        if (tweet.authorAvatar) {
          try {
            const avatar = tweet.authorAvatar.replace('_normal', '_200x200');
            const updated = await db.updateTrainerAvatar(tweet.authorUsername, avatar);
            if (updated > 0) console.log(`[DIGIMONX] Updated avatar for @${tweet.authorUsername}`);
          } catch (e) { /* ignore avatar errors */ }
        }

        // 3s gap between replies (faster but still respectful of rate limits)
        if (batch.indexOf(tweet) < batch.length - 1) {
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch (err) {
        const status = err.response?.status;
        const detail = err.response?.data?.detail || err.response?.data?.title || err.message;
        console.error(`[DIGIMONX] Reply failed for @${tweet.authorUsername} (${tweet.id}): ${detail}`);

        if (status === 429) {
          // Rate limited — stop and DON'T advance lastSeenId so we retry these tweets
          console.warn(`[DIGIMONX] Rate limited (429). Stopping cycle, will retry ALL remaining next poll.`);
          hitRateLimit = true;
          break;
        }

        if (status === 403) {
          // Forbidden — could be reply restriction. Mark as replied so we don't loop forever
          console.warn(`[DIGIMONX] 403 Forbidden for tweet ${tweet.id}. Marking as processed to avoid loop.`);
          await db.saveRepliedTweet(tweet.id, tweet.authorUsername, tweet.text, `[FAILED: ${detail}]`, '', 'error');
          await saveLastSeenId(tweet.id);
          continue;
        }

        // Other errors: mark as failed but advance past it to avoid infinite retry loops
        try {
          await db.saveRepliedTweet(tweet.id, tweet.authorUsername, tweet.text, `[ERROR: ${detail}]`, '', 'error');
          await saveLastSeenId(tweet.id);
        } catch (saveErr) {
          // If we can't even save, DON'T advance lastSeenId so we retry
          console.error(`[DIGIMONX] Could not save failed state, will retry next poll`);
          break;
        }
      }
    }

    stats.lastError = null;
    consecutiveErrors = 0;
  } catch (err) {
    consecutiveErrors++;
    stats.lastError = err.response?.data?.detail || err.response?.data?.title || err.message;
    console.error(`[DIGIMONX] Poll error (${consecutiveErrors}x): ${stats.lastError}`);

    if (consecutiveErrors >= 3) {
      const backoff = Math.min(consecutiveErrors * POLL_MS, 600000);
      console.warn(`[DIGIMONX] Backing off for ${backoff / 1000}s`);
      pollBusy = false;
      if (pollerActive) pollerTimer = setTimeout(poll, backoff);
      return;
    }
  }

  pollBusy = false;
  if (pollerActive) pollerTimer = setTimeout(poll, POLL_MS);
}

// ── Public API ──
function startAutoReply() {
  if (pollerActive) return { ok: false, error: 'Already running' };
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) {
    return { ok: false, error: 'X API credentials missing in .env' };
  }
  if (!BOT_USERNAME) {
    return { ok: false, error: 'X_BOT_USERNAME not set in .env' };
  }
  if (!db) {
    return { ok: false, error: 'Database not initialized. Call init() first.' };
  }
  pollerActive = true;
  botUserId = null;
  db.clearFailedReplies().then(count => {
    if (count > 0) console.log(`[DIGIMONX] Cleared ${count} failed replies for retry`);
  }).catch(() => {});
  console.log(`[DIGIMONX] Starting -- polling every ${POLL_MS / 1000}s for @${BOT_USERNAME}`);
  poll();
  return { ok: true };
}

function stopAutoReply() {
  pollerActive = false;
  if (pollerTimer) { clearTimeout(pollerTimer); pollerTimer = null; }
  console.log('[DIGIMONX] Stopped');
  return { ok: true };
}

function getAutoReplyStatus() {
  return {
    active: pollerActive,
    botUsername: BOT_USERNAME,
    pollIntervalSec: POLL_MS / 1000,
    consecutiveErrors,
    lastSeenTweetId: null,
    ...stats,
    configured: !!(X_API_KEY && X_ACCESS_TOKEN && BOT_USERNAME),
  };
}

async function getRecentReplies(limit = 20) {
  return db ? await db.getRecentReplies(limit) : [];
}

// Fetch avatars for all tamers who don't have one yet
async function backfillAvatars() {
  if (!db || !X_API_KEY) return { ok: false, error: 'Not configured' };

  const trainers = await db.getTrainersWithoutAvatars();
  if (trainers.length === 0) return { ok: true, message: 'All tamers already have avatars', updated: 0 };

  console.log(`[DIGIMONX] Backfilling avatars for ${trainers.length} tamer(s): ${trainers.join(', ')}`);

  let updated = 0;
  const batchSize = 100;
  for (let i = 0; i < trainers.length; i += batchSize) {
    const batch = trainers.slice(i, i + batchSize);
    const usernames = batch.join(',');
    const base = 'https://api.twitter.com/2/users/by';
    const qp = { usernames, 'user.fields': 'profile_image_url' };
    const query = new URLSearchParams(qp).toString();
    const fullUrl = `${base}?${query}`;

    try {
      const res = await axios.get(fullUrl, {
        headers: { Authorization: oauthHeader('GET', base, qp) },
      });
      const users = res.data?.data || [];
      for (const u of users) {
        if (u.profile_image_url) {
          const avatar = u.profile_image_url.replace('_normal', '_200x200');
          const count = await db.updateTrainerAvatar(u.username, avatar);
          if (count > 0) {
            updated += count;
            console.log(`[DIGIMONX] Avatar set for @${u.username}`);
          }
        }
      }
    } catch (err) {
      console.error(`[DIGIMONX] Avatar backfill batch failed:`, err.response?.data || err.message);
    }
  }

  return { ok: true, message: `Updated ${updated} digimon across ${trainers.length} tamer(s)`, updated };
}

function getDigimonElement(name) {
  return DIGIMON_ELEMENTS[(name || '').toLowerCase()] || 'Unknown';
}

function pollNow() {
  if (!pollerActive) return { ok: false, error: 'Agent is not running' };
  if (pollBusy) return { ok: false, error: 'Already checking right now, wait a moment' };
  // Cancel the scheduled timer and run immediately
  if (pollerTimer) { clearTimeout(pollerTimer); pollerTimer = null; }
  poll();
  return { ok: true, message: 'Checking mentions now' };
}

module.exports = { init, startAutoReply, stopAutoReply, getAutoReplyStatus, getRecentReplies, processMention, backfillAvatars, pollNow, getDigimonElement, getRandomDigimon, getRandomDigimonFromStage };
