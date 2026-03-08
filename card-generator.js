/**
 * DigimonX Card Generator — server-side image cards using node-canvas
 * Generates Digimon-themed cards with actual Digimon images as PNG buffers
 */

const { createCanvas, registerFont, loadImage } = require('canvas');
const path = require('path');

try {
  registerFont(path.join(__dirname, 'fonts', 'JetBrainsMono-Regular.ttf'), { family: 'JetBrains Mono' });
  registerFont(path.join(__dirname, 'fonts', 'JetBrainsMono-Bold.ttf'), { family: 'JetBrains Mono', weight: 'bold' });
} catch (e) {}
try {
  registerFont(path.join(__dirname, 'fonts', 'Pixel Digivolve.otf'), { family: 'Pixel Digivolve' });
  registerFont(path.join(__dirname, 'fonts', 'Pixel Digivolve Italic.otf'), { family: 'Pixel Digivolve', style: 'italic' });
} catch (e) {}
try {
  registerFont(path.join(__dirname, 'public', 'fonts', 'PixelMplus12-Regular.ttf'), { family: 'PixelMplus12' });
} catch (e) {}

const FONT = '"Pixel Digivolve", "PixelMplus12", "JetBrains Mono", monospace';

const C = {
  bg:        '#0a0a1a',
  bgPanel:   'rgba(10, 20, 40, 0.8)',
  border:    '#1a3a6a',
  accent:    '#00d4ff',
  accentLt:  '#00ffcc',
  text:      '#e8f0ff',
  textDim:   '#6688aa',
  textMuted: '#3a4a5a',
  red:       '#ff3355',
  green:     '#00cc66',
  blue:      '#0088ff',
  yellow:    '#ffcc00',
  digivice:  '#00aaff',
};

const TYPE_COLORS = {
  Fire: '#F08030', Water: '#6890F0', Light: '#FFD700', Dark: '#705848',
  'Holy Dragon': '#7038F8', 'Holy Beast': '#A890F0', Machine: '#B8B8D0',
  Wind: '#A890F0', Virus: '#A040A0', Special: '#F85888',
  Unknown: '#A8A878', Dragon: '#7038F8', Ice: '#98D8D8',
  Electric: '#F8D030', Nature: '#78C850', Earth: '#E0C068',
};

// ── Image loading helpers ──

async function loadImg(relativePath) {
  try {
    const p = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    return await loadImage(path.join(__dirname, 'public', p));
  } catch (e) { return null; }
}

function getGifPath(pet) {
  return pet.ascii || pet.gifPath || null;
}

function drawDigimon(ctx, img, cx, cy, size) {
  if (!img) return;
  const ratio = Math.min(size / img.width, size / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

// Cover-fill: scale image to cover canvas, center-crop
function drawBgCover(ctx, img, w, h) {
  const ratio = Math.max(w / img.width, h / img.height);
  const sw = img.width * ratio;
  const sh = img.height * ratio;
  ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
}

// ── Drawing helpers ──

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawCardBase(ctx, w, h) {
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#050510');
  bgGrad.addColorStop(0.5, '#0a0a1a');
  bgGrad.addColorStop(1, '#0a1428');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = 0.03;
  ctx.beginPath(); ctx.arc(w * 0.75, h * 0.4, 150, 0, Math.PI * 2);
  ctx.fillStyle = '#00ffcc'; ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = C.border; ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  const lg = ctx.createLinearGradient(0, 0, w, 0);
  lg.addColorStop(0, 'transparent'); lg.addColorStop(0.2, C.digivice);
  lg.addColorStop(0.5, C.accentLt); lg.addColorStop(0.8, C.digivice);
  lg.addColorStop(1, 'transparent');
  ctx.strokeStyle = lg; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(w, 1); ctx.stroke();

  ctx.fillStyle = 'rgba(5, 10, 20, 0.6)'; ctx.fillRect(0, 0, w, 38);
  ctx.strokeStyle = C.border; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 38); ctx.lineTo(w, 38); ctx.stroke();

  const dotY = 19;
  ctx.fillStyle = C.digivice; ctx.beginPath(); ctx.arc(22, dotY, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(22, dotY, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.accentLt; ctx.beginPath(); ctx.arc(42, dotY, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(60, dotY, 5, 0, Math.PI * 2); ctx.fill();
}

function drawBranding(ctx, w, h) {
  ctx.fillStyle = 'rgba(5, 10, 20, 0.7)'; ctx.fillRect(0, h - 32, w, 32);
  ctx.strokeStyle = C.border; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, h - 32); ctx.lineTo(w, h - 32); ctx.stroke();
  ctx.font = '11px ' + FONT;
  ctx.fillStyle = C.textMuted; ctx.textAlign = 'left';
  ctx.fillText('digimonx', 16, h - 11);
  ctx.textAlign = 'right'; ctx.fillText('@digimononx', w - 16, h - 11);
}

function drawLabel(ctx, label, value, x, y, valueColor) {
  ctx.font = '12px ' + FONT; ctx.fillStyle = C.textDim; ctx.textAlign = 'left';
  ctx.fillText(label, x, y);
  ctx.fillStyle = valueColor || C.text; ctx.fillText(value, x + 120, y);
}

function drawSeparator(ctx, x1, x2, y) {
  ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
  ctx.setLineDash([]);
}

function getTypeColor(type) { return TYPE_COLORS[type] || TYPE_COLORS.Unknown; }

function drawTypeBadge(ctx, type, x, y) {
  const color = getTypeColor(type);
  const text = type.toUpperCase();
  ctx.font = 'bold 11px ' + FONT;
  const textW = ctx.measureText(text).width;
  const badgeW = textW + 16, badgeH = 20;
  roundRect(ctx, x - badgeW / 2, y - badgeH / 2, badgeW, badgeH, 4);
  ctx.fillStyle = color; ctx.globalAlpha = 0.25; ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.fillText(text, x, y + 4);
}

// ── Outlined text helper (for readability on busy backgrounds) ──

function drawOutlinedText(ctx, text, x, y, fillColor, outlineColor, outlineWidth) {
  ctx.textAlign = 'center';
  ctx.strokeStyle = outlineColor || '#000';
  ctx.lineWidth = outlineWidth || 4;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fillColor;
  ctx.fillText(text, x, y);
}

// ── Tame Success Card ── (uses success.png background + Digimon image)

async function generateCatchCard(digimon, tamerHandle) {
  const w = 800, h = 480;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Background: success.png
  const bg = await loadImg('success.png');
  if (bg) {
    drawBgCover(ctx, bg, w, h);
  } else {
    ctx.fillStyle = '#002244'; ctx.fillRect(0, 0, w, h);
  }

  // Dark overlay so text pops
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, w, h);

  // Top accent line
  const grad = ctx.createLinearGradient(100, 0, 700, 0);
  grad.addColorStop(0, 'rgba(0,204,255,0)');
  grad.addColorStop(0.3, '#00ccff');
  grad.addColorStop(0.7, '#00ccff');
  grad.addColorStop(1, 'rgba(0,204,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, 3);

  // Header — "WELCOME TO DIGIMON WORLD"
  ctx.font = '42px "Pixel Digivolve", monospace';
  drawOutlinedText(ctx, 'WELCOME TO DIGIMON WORLD', 400, 55, '#00ffcc', '#000', 6);

  // Japanese subtitle
  ctx.font = '18px "PixelMplus12", monospace';
  drawOutlinedText(ctx, 'デジモンワールドへようこそ', 400, 82, '#ffcc00', '#000', 3);

  // Digimon image — centered, slightly larger
  const gifPath = getGifPath(digimon);
  if (gifPath) {
    const digimonImg = await loadImg(gifPath);
    drawDigimon(ctx, digimonImg, 400, 200, 190);
  }

  // Digimon name
  ctx.font = '36px "Pixel Digivolve", monospace';
  drawOutlinedText(ctx, digimon.name.toUpperCase(), 400, 330, '#ffffff', '#000', 5);

  // Type badge
  ctx.font = '14px "Pixel Digivolve", monospace';
  const typeColor = getTypeColor(digimon.race || digimon.element || 'Unknown');
  const typeText = (digimon.race || digimon.element || 'Unknown').toUpperCase();
  const tw = ctx.measureText(typeText).width;
  const bw = tw + 28, bh = 26;
  roundRect(ctx, 400 - bw / 2, 340, bw, bh, 5);
  ctx.fillStyle = typeColor; ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = typeColor; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = typeColor; ctx.textAlign = 'center'; ctx.fillText(typeText, 400, 358);

  // Tamer info
  ctx.font = '18px "Pixel Digivolve", monospace';
  drawOutlinedText(ctx, 'TAMER: ' + tamerHandle.toUpperCase(), 400, 395, '#ffffff', '#000', 4);

  // Evolution path
  ctx.font = '13px "PixelMplus12", monospace';
  drawOutlinedText(ctx, 'BABY  ▸  CHILD  ▸  ADULT  ▸  PERFECT  ▸  ULTIMATE', 400, 425, '#00ccff', '#000', 3);

  // Stage + level info
  ctx.font = '12px "PixelMplus12", monospace';
  drawOutlinedText(ctx, 'stage: Baby  |  level: 1  |  feed & battle to digivolve', 400, 452, 'rgba(255,255,255,0.7)', '#000', 3);

  // Bottom accent line
  ctx.fillStyle = grad;
  ctx.fillRect(0, h - 3, w, 3);

  return canvas.toBuffer('image/png');
}

// ── Tame Fail Card ── (uses failed.png background, no Digimon shown, no footer)

async function generateFailCard(digimon, tamerHandle) {
  const w = 800, h = 480;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Background: failed.png — fill entire card, no footer
  const bg = await loadImg('failed.png');
  if (bg) {
    drawBgCover(ctx, bg, w, h);
  } else {
    ctx.fillStyle = '#220000'; ctx.fillRect(0, 0, w, h);
  }

  // Light overlay just enough for text readability
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, w, h);

  // "TAME FAILED" — big bold outlined text
  ctx.font = 'bold 52px ' + FONT;
  drawOutlinedText(ctx, 'TAME FAILED', 400, 120, '#ff4444', '#000', 6);

  // Subtitle
  ctx.font = 'bold 24px ' + FONT;
  drawOutlinedText(ctx, 'the digimon escaped back to the digital world', 400, 280, '#ffffff', '#000', 5);

  // Tamer
  ctx.font = 'bold 18px ' + FONT;
  drawOutlinedText(ctx, 'tamer: ' + tamerHandle, 400, 370, '#ffffff', '#000', 4);

  // Tagline
  ctx.font = 'bold 16px ' + FONT;
  drawOutlinedText(ctx, 'better luck next time. try again tamer', 400, 420, 'rgba(255,255,255,0.85)', '#000', 3);

  return canvas.toBuffer('image/png');
}

// ── Status Card ── (Digimon image + stats)

async function generateStatusCard(pet) {
  const w = 800, h = 520;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  drawCardBase(ctx, w, h);

  ctx.fillStyle = C.textDim; ctx.font = '11px ' + FONT; ctx.textAlign = 'left';
  ctx.fillText('$ digimonx status --digimon=' + pet.name, 78, 24);

  // Digimon image (centered top)
  const gifPath = getGifPath(pet);
  if (gifPath) {
    const digimonImg = await loadImg(gifPath);
    drawDigimon(ctx, digimonImg, 400, 110, 120);
  }

  // Name + type
  ctx.fillStyle = C.text; ctx.font = 'bold 22px ' + FONT; ctx.textAlign = 'center';
  ctx.fillText(pet.name, 400, 190);
  drawTypeBadge(ctx, pet.race || 'Unknown', 400, 214);

  drawSeparator(ctx, 100, 700, 232);

  // Stats panel
  const panelX = 60, panelY = 248, panelW = w - 120, panelH = 160;
  roundRect(ctx, panelX, panelY, panelW, panelH, 6);
  ctx.fillStyle = C.bgPanel; ctx.fill();
  ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.stroke();

  const col1 = panelX + 30, col2 = panelX + panelW / 2 + 20;
  const rowH = 28, startRow = panelY + 32;

  const stage = pet.growth_stage || 'Baby';
  const stageColor = stage === 'Adult' ? C.accentLt : stage === 'Teen' ? C.accent : C.textDim;

  drawLabel(ctx, 'status', pet.status || 'Happy', col1, startRow);
  drawLabel(ctx, 'growth', stage, col1, startRow + rowH, stageColor);
  drawLabel(ctx, 'feeds', (pet.feed_count || 0) + 'x', col1, startRow + rowH * 2);
  drawLabel(ctx, 'level', String(pet.level || 1), col1, startRow + rowH * 3, C.accentLt);

  const hungerStatus = pet.hungerStatus || 'Unknown';
  let hColor = C.green;
  if (hungerStatus === 'Hungry') hColor = C.red;
  else if (hungerStatus === 'Getting Hungry') hColor = C.yellow;

  drawLabel(ctx, 'hunger', hungerStatus.toLowerCase(), col2, startRow, hColor);
  drawLabel(ctx, 'tamer', pet.ownerHandle || '???', col2, startRow + rowH, C.blue);
  const ageDays = Math.floor((Date.now() / 1000 - (pet.created_at || Date.now() / 1000)) / 86400);
  drawLabel(ctx, 'age', ageDays + ' days', col2, startRow + rowH * 2);
  drawLabel(ctx, 'record', `${pet.wins || 0}W / ${pet.losses || 0}L`, col2, startRow + rowH * 3, C.accent);

  // XP bar
  const barY = panelY + panelH - 20, barX = panelX + 30, barW = panelW - 60;
  const level = pet.level || 1, xp = pet.xp || 0, xpNeeded = level * 100;
  const pct = Math.min(100, (xp / xpNeeded) * 100);
  ctx.fillStyle = 'rgba(10, 30, 60, 0.5)';
  roundRect(ctx, barX, barY, barW, 8, 4); ctx.fill();
  if (pct > 0) {
    const barGrad = ctx.createLinearGradient(barX, 0, barX + barW * pct / 100, 0);
    barGrad.addColorStop(0, C.blue); barGrad.addColorStop(1, C.accentLt);
    ctx.fillStyle = barGrad;
    roundRect(ctx, barX, barY, barW * pct / 100, 8, 4); ctx.fill();
  }
  ctx.font = '10px ' + FONT; ctx.fillStyle = C.textDim; ctx.textAlign = 'center';
  ctx.fillText(`XP: ${xp}/${xpNeeded}`, 400, barY + 24);

  // Activity
  if (pet.activity) {
    ctx.font = '12px ' + FONT; ctx.fillStyle = C.textMuted; ctx.textAlign = 'center';
    ctx.fillText('currently: ' + pet.activity, 400, 460);
  }

  drawBranding(ctx, w, h);
  return canvas.toBuffer('image/png');
}

// ── Feed Card ── (Digimon image + feeding info)

async function generateFeedCard(pet, feedCount, growthStage, foodItem, reaction) {
  const w = 800, h = 480;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  drawCardBase(ctx, w, h);

  ctx.fillStyle = C.textDim; ctx.font = '11px ' + FONT; ctx.textAlign = 'left';
  const cmdText = foodItem ? '$ digimonx feed --item="' + foodItem + '"' : '$ digimonx feed';
  ctx.fillText(cmdText, 78, 24);

  // Digimon image (centered)
  const gifPath = getGifPath(pet);
  if (gifPath) {
    const digimonImg = await loadImg(gifPath);
    drawDigimon(ctx, digimonImg, 400, 120, 120);
  }

  // Name + type
  ctx.fillStyle = C.text; ctx.font = 'bold 22px ' + FONT; ctx.textAlign = 'center';
  ctx.fillText(pet.name, 400, 200);
  drawTypeBadge(ctx, pet.race || 'Unknown', 400, 224);

  // Reaction text
  ctx.fillStyle = C.accentLt; ctx.font = '14px ' + FONT; ctx.textAlign = 'center';
  if (reaction) {
    ctx.fillText(reaction, 400, 265);
  } else if (foodItem) {
    ctx.fillText(pet.name + ' ate the ' + foodItem, 400, 265);
  } else {
    ctx.fillText(pet.name + ' is full and happy', 400, 265);
  }

  drawSeparator(ctx, 200, 600, 285);

  // Stats
  ctx.fillStyle = C.textDim; ctx.font = '13px ' + FONT;
  ctx.fillText('feeds: ' + feedCount + '  |  stage: ' + growthStage, 400, 315);

  // Food item tag
  if (foodItem) {
    const tagY = 350;
    const foodLabel = foodItem.toLowerCase();
    ctx.font = '13px ' + FONT;
    const textW = ctx.measureText(foodLabel).width;
    const tagW = textW + 32, tagX = 400 - tagW / 2;
    roundRect(ctx, tagX, tagY - 14, tagW, 26, 4);
    ctx.fillStyle = 'rgba(0, 255, 204, 0.12)'; ctx.fill();
    ctx.strokeStyle = C.accentLt; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = C.accentLt; ctx.textAlign = 'center';
    ctx.fillText(foodLabel, 400, tagY + 3);
  }

  drawBranding(ctx, w, h);
  return canvas.toBuffer('image/png');
}

// ── Battle Card ── (two Digimon images + battle log)

async function generateBattleCard(pet1, pet2, winner, battleLog, owner1, owner2, winnerOwner) {
  const w = 800, h = 520;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  drawCardBase(ctx, w, h);

  ctx.fillStyle = C.textDim; ctx.font = '11px ' + FONT; ctx.textAlign = 'left';
  ctx.fillText('$ digimonx battle --' + pet1.name + '-vs-' + pet2.name, 78, 24);

  // "BATTLE!" header
  ctx.fillStyle = C.digivice; ctx.font = 'bold 28px ' + FONT; ctx.textAlign = 'center';
  ctx.fillText('DIGIMON BATTLE', 400, 72);

  // Pet 1 (left) — image + info
  const p1x = 180;
  const gif1 = getGifPath(pet1);
  if (gif1) {
    const img1 = await loadImg(gif1);
    drawDigimon(ctx, img1, p1x, 125, 80);
  }
  ctx.fillStyle = C.text; ctx.font = 'bold 14px ' + FONT; ctx.textAlign = 'center';
  ctx.fillText(pet1.name, p1x, 180);
  drawTypeBadge(ctx, pet1.race || 'Unknown', p1x, 198);
  ctx.font = '10px ' + FONT; ctx.fillStyle = C.textDim;
  ctx.fillText('@' + owner1 + '  Lv.' + (pet1.level || 1), p1x, 220);

  // VS
  ctx.fillStyle = C.accentLt; ctx.font = 'bold 22px ' + FONT;
  ctx.fillText('VS', 400, 145);

  // Pet 2 (right) — image + info
  const p2x = 620;
  const gif2 = getGifPath(pet2);
  if (gif2) {
    const img2 = await loadImg(gif2);
    drawDigimon(ctx, img2, p2x, 125, 80);
  }
  ctx.fillStyle = C.text; ctx.font = 'bold 14px ' + FONT; ctx.textAlign = 'center';
  ctx.fillText(pet2.name, p2x, 180);
  drawTypeBadge(ctx, pet2.race || 'Unknown', p2x, 198);
  ctx.font = '10px ' + FONT; ctx.fillStyle = C.textDim;
  ctx.fillText('@' + owner2 + '  Lv.' + (pet2.level || 1), p2x, 220);

  drawSeparator(ctx, 60, 740, 238);

  // Battle log box
  const boxX = 60, boxY = 252, boxW = w - 120, boxH = 150;
  roundRect(ctx, boxX, boxY, boxW, boxH, 6);
  ctx.fillStyle = C.bgPanel; ctx.fill();
  ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.stroke();

  ctx.font = '11px ' + FONT; ctx.textAlign = 'left';
  const lines = battleLog.split('\n').slice(0, 7);
  lines.forEach((line, i) => {
    ctx.fillStyle = line.includes('wins') ? C.accentLt : C.textDim;
    ctx.fillText(line, boxX + 16, boxY + 20 + i * 19);
  });

  // Winner
  if (winner) {
    ctx.fillStyle = C.accentLt; ctx.font = 'bold 20px ' + FONT; ctx.textAlign = 'center';
    ctx.fillText(winner.name + ' WINS', 400, 432);
    if (winnerOwner) {
      ctx.font = 'bold 13px ' + FONT; ctx.fillStyle = C.text;
      ctx.fillText('tamer @' + winnerOwner, 400, 452);
    }
    ctx.font = '12px ' + FONT; ctx.fillStyle = C.textDim;
    ctx.fillText('+25 XP', 400, 472);
  }

  drawBranding(ctx, w, h);
  return canvas.toBuffer('image/png');
}

// ── Activity Card ── (two Digimon images + activity description)

async function generateActivityCard(pet1, pet2, activity, owner1, owner2) {
  const w = 800, h = 480;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  drawCardBase(ctx, w, h);

  ctx.fillStyle = C.textDim; ctx.font = '11px ' + FONT; ctx.textAlign = 'left';
  ctx.fillText('$ digimonx adventure --pair="' + pet1.name + ' x ' + pet2.name + '"', 78, 24);

  // Pet 1 (left) — image + info
  const p1x = 200;
  const gif1 = getGifPath(pet1);
  if (gif1) {
    const img1 = await loadImg(gif1);
    drawDigimon(ctx, img1, p1x, 100, 90);
  }
  ctx.fillStyle = C.text; ctx.font = 'bold 16px ' + FONT; ctx.textAlign = 'center';
  ctx.fillText(pet1.name, p1x, 160);
  drawTypeBadge(ctx, pet1.race || 'Unknown', p1x, 182);
  ctx.fillStyle = C.textDim; ctx.font = '10px ' + FONT;
  ctx.fillText('@' + owner1, p1x, 204);

  // Connector
  ctx.fillStyle = C.accentLt; ctx.font = 'bold 18px ' + FONT;
  ctx.fillText('x', 400, 110);

  // Pet 2 (right) — image + info
  const p2x = 600;
  const gif2 = getGifPath(pet2);
  if (gif2) {
    const img2 = await loadImg(gif2);
    drawDigimon(ctx, img2, p2x, 100, 90);
  }
  ctx.fillStyle = C.text; ctx.font = 'bold 16px ' + FONT; ctx.textAlign = 'center';
  ctx.fillText(pet2.name, p2x, 160);
  drawTypeBadge(ctx, pet2.race || 'Unknown', p2x, 182);
  ctx.fillStyle = C.textDim; ctx.font = '10px ' + FONT;
  ctx.fillText('@' + owner2, p2x, 204);

  drawSeparator(ctx, 60, 740, 225);

  // Activity box
  const boxY = 245, boxX = 60, boxW = w - 120, boxH = 60;
  roundRect(ctx, boxX, boxY, boxW, boxH, 6);
  ctx.fillStyle = C.bgPanel; ctx.fill();
  ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.stroke();

  ctx.fillStyle = C.accentLt; ctx.font = '14px ' + FONT; ctx.textAlign = 'center';
  const maxChars = 65;
  if (activity.length > maxChars) {
    const mid = activity.lastIndexOf(' ', maxChars);
    ctx.fillText(activity.slice(0, mid), 400, boxY + 22);
    ctx.fillText(activity.slice(mid + 1), 400, boxY + 42);
  } else {
    ctx.fillText(activity, 400, boxY + 32);
  }

  drawBranding(ctx, w, h);
  return canvas.toBuffer('image/png');
}

// ── Team Card ── (show all tamer's digimon in one card)

async function generateTeamCard(pets, tamerHandle) {
  const w = 800, h = 480;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  drawCardBase(ctx, w, h);

  ctx.fillStyle = C.textDim; ctx.font = '11px ' + FONT; ctx.textAlign = 'left';
  ctx.fillText('$ digimonx status --team', 78, 24);

  // Tamer header
  ctx.fillStyle = C.text; ctx.font = 'bold 18px ' + FONT; ctx.textAlign = 'center';
  ctx.fillText(tamerHandle + ' team', 400, 68);

  drawSeparator(ctx, 60, 740, 82);

  const count = pets.length;
  const slotW = Math.floor((w - 80) / count);

  for (let i = 0; i < count; i++) {
    const pet = pets[i];
    const cx = 40 + slotW * i + slotW / 2;

    // Digimon image
    const gifPath = getGifPath(pet);
    if (gifPath) {
      const img = await loadImg(gifPath);
      drawDigimon(ctx, img, cx, 155, 110);
    }

    // Name
    ctx.fillStyle = C.text; ctx.font = 'bold 14px ' + FONT; ctx.textAlign = 'center';
    ctx.fillText(pet.name, cx, 228);

    // Type badge
    drawTypeBadge(ctx, pet.race || 'Unknown', cx, 248);

    // Level
    ctx.fillStyle = C.accentLt; ctx.font = 'bold 13px ' + FONT;
    ctx.fillText('Lv.' + (pet.level || 1), cx, 278);

    // Stats
    ctx.fillStyle = C.textDim; ctx.font = '10px ' + FONT;
    ctx.fillText((pet.growth_stage || 'Baby'), cx, 298);
    ctx.fillText((pet.wins || 0) + 'W / ' + (pet.losses || 0) + 'L', cx, 316);
    ctx.fillText((pet.feed_count || 0) + ' feeds', cx, 334);

    // XP bar
    const level = pet.level || 1;
    const xp = pet.xp || 0;
    const xpNeeded = level * 100;
    const pct = Math.min(100, (xp / xpNeeded) * 100);
    const barW = 80, barH = 6;
    const barX = cx - barW / 2, barY = 346;

    ctx.fillStyle = 'rgba(10, 30, 60, 0.5)';
    roundRect(ctx, barX, barY, barW, barH, 3); ctx.fill();
    if (pct > 0) {
      const barGrad = ctx.createLinearGradient(barX, 0, barX + barW * pct / 100, 0);
      barGrad.addColorStop(0, C.blue); barGrad.addColorStop(1, C.accentLt);
      ctx.fillStyle = barGrad;
      roundRect(ctx, barX, barY, barW * pct / 100, barH, 3); ctx.fill();
    }
    ctx.font = '8px ' + FONT; ctx.fillStyle = C.textDim;
    ctx.fillText(xp + '/' + xpNeeded + ' XP', cx, barY + 16);

    // Slot number
    ctx.fillStyle = C.textMuted; ctx.font = '9px ' + FONT;
    ctx.fillText('#' + (i + 1), cx, 96);
  }

  drawBranding(ctx, w, h);
  return canvas.toBuffer('image/png');
}

module.exports = {
  generateCatchCard,
  generateFailCard,
  generateStatusCard,
  generateFeedCard,
  generateBattleCard,
  generateActivityCard,
  generateTeamCard,
};
