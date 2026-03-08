/**
 * DigimonX Card Generator — server-side image cards using node-canvas
 * Clean, modern Digimon-themed cards as PNG buffers
 */

const { createCanvas, registerFont, loadImage } = require('canvas');
const path = require('path');

try { registerFont(path.join(__dirname, 'fonts', 'JetBrainsMono-Regular.ttf'), { family: 'JetBrains Mono' }); } catch (e) {}
try { registerFont(path.join(__dirname, 'fonts', 'JetBrainsMono-Bold.ttf'), { family: 'JetBrains Mono', weight: 'bold' }); } catch (e) {}
try { registerFont(path.join(__dirname, 'fonts', 'Pixel Digivolve.otf'), { family: 'Pixel Digivolve' }); } catch (e) {}
try { registerFont(path.join(__dirname, 'public', 'fonts', 'PixelMplus12-Regular.ttf'), { family: 'PixelMplus12' }); } catch (e) {}
try { registerFont(path.join(__dirname, 'fonts', 'Rajdhani-Bold.ttf'), { family: 'Rajdhani', weight: 'bold' }); } catch (e) {}

// Font shortcuts
const F_HEAD = 'bold "Rajdhani", sans-serif';
const F_BODY = '"PixelMplus12", monospace';
const F_PIXEL = '"Pixel Digivolve", monospace';
const F_MONO = '"JetBrains Mono", monospace';

const TYPE_COLORS = {
  Fire: '#F08030', Water: '#6890F0', Light: '#FFD700', Dark: '#705898',
  'Holy Dragon': '#7038F8', 'Holy Beast': '#A890F0', Machine: '#B8B8D0',
  Wind: '#81C4E8', Virus: '#A040A0', Special: '#F85888',
  Unknown: '#A8A878', Dragon: '#7038F8', Ice: '#98D8D8',
  Electric: '#F8D030', Nature: '#78C850', Earth: '#E0C068',
};

// ── Helpers ──

async function loadImg(relativePath) {
  try {
    const p = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    return await loadImage(path.join(__dirname, 'public', p));
  } catch (e) { return null; }
}

function getGifPath(pet) { return pet.ascii || pet.gifPath || null; }
function getTypeColor(type) { return TYPE_COLORS[type] || TYPE_COLORS.Unknown; }

async function loadAvatar(url) {
  if (!url) return null;
  try { return await loadImage(url); } catch (e) { return null; }
}

function drawAvatar(ctx, img, cx, cy, radius) {
  if (!img) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
  // Border ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawDigimon(ctx, img, cx, cy, size) {
  if (!img) return;
  const ratio = Math.min(size / img.width, size / img.height);
  const w = img.width * ratio, h = img.height * ratio;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

function drawBgCover(ctx, img, w, h) {
  const ratio = Math.max(w / img.width, h / img.height);
  const sw = img.width * ratio, sh = img.height * ratio;
  ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}

function drawOutlinedText(ctx, text, x, y, fill, stroke, width) {
  ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke || '#000'; ctx.lineWidth = width || 4;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}

// ── Shared card base (dark gradient + accent bars) ──

function drawModernBase(ctx, w, h, accentColor1, accentColor2) {
  // Dark gradient background
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#060818');
  bg.addColorStop(0.5, '#0c1428');
  bg.addColorStop(1, '#06081a');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

  // Subtle radial glow
  const glow = ctx.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.3, w * 0.5);
  glow.addColorStop(0, 'rgba(0,120,255,0.06)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);

  // Top accent bar
  const c1 = accentColor1 || '#00aaff', c2 = accentColor2 || '#00ffcc';
  const top = ctx.createLinearGradient(0, 0, w, 0);
  top.addColorStop(0, 'rgba(0,0,0,0)'); top.addColorStop(0.2, c1);
  top.addColorStop(0.5, c2); top.addColorStop(0.8, c1);
  top.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = top; ctx.fillRect(0, 0, w, 3);

  // Bottom accent bar
  ctx.fillRect(0, h - 3, w, 3);

  // Bottom branding bar
  ctx.fillStyle = 'rgba(0,5,15,0.8)'; ctx.fillRect(0, h - 28, w, 28);
  ctx.font = '10px ' + F_BODY;
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.textAlign = 'left';
  ctx.fillText('DGMX', 12, h - 10);
  ctx.textAlign = 'right'; ctx.fillText('@digimononx', w - 12, h - 10);
}

function drawTypeBadgeSolid(ctx, type, x, y) {
  const color = getTypeColor(type);
  const text = type.toUpperCase();
  ctx.font = 'bold 14px ' + F_HEAD;
  const tw = ctx.measureText(text).width;
  const bw = tw + 24, bh = 24;
  roundRect(ctx, x - bw / 2, y - bh / 2, bw, bh, 5);
  ctx.fillStyle = color; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y); ctx.textBaseline = 'alphabetic';
}

function drawSepLine(ctx, w, y, color) {
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.3, color || 'rgba(0,180,255,0.3)');
  g.addColorStop(0.7, color || 'rgba(0,180,255,0.3)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, y, w, 1);
}

// ═══════════════════════════════════════════════════
// ── TAME SUCCESS CARD ──
// ═══════════════════════════════════════════════════

async function generateCatchCard(digimon, tamerHandle) {
  const w = 800, h = 480;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  const bg = await loadImg('success.png');
  if (bg) drawBgCover(ctx, bg, w, h);
  else { ctx.fillStyle = '#002244'; ctx.fillRect(0, 0, w, h); }

  // Overlay
  const ov = ctx.createLinearGradient(0, 0, 0, h);
  ov.addColorStop(0, 'rgba(0,5,20,0.7)'); ov.addColorStop(0.4, 'rgba(0,5,20,0.35)');
  ov.addColorStop(0.7, 'rgba(0,5,20,0.35)'); ov.addColorStop(1, 'rgba(0,5,20,0.8)');
  ctx.fillStyle = ov; ctx.fillRect(0, 0, w, h);

  // Accent bars
  const topG = ctx.createLinearGradient(0, 0, w, 0);
  topG.addColorStop(0, 'rgba(0,180,255,0)'); topG.addColorStop(0.2, '#00aaff');
  topG.addColorStop(0.5, '#00ffcc'); topG.addColorStop(0.8, '#00aaff');
  topG.addColorStop(1, 'rgba(0,180,255,0)');
  ctx.fillStyle = topG; ctx.fillRect(0, 0, w, 4); ctx.fillRect(0, h - 4, w, 4);

  ctx.font = 'bold 48px ' + F_HEAD;
  drawOutlinedText(ctx, 'WELCOME TO DIGIMON WORLD', 400, 58, '#ffffff', '#000', 7);
  ctx.font = '16px ' + F_BODY;
  ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 6;
  drawOutlinedText(ctx, 'デジモンワールドへようこそ', 400, 84, '#ffcc00', '#000', 3);
  ctx.shadowBlur = 0;
  drawSepLine(ctx, w, 94);

  const gifPath = getGifPath(digimon);
  if (gifPath) { const img = await loadImg(gifPath); drawDigimon(ctx, img, 400, 210, 190); }

  ctx.font = 'bold 40px ' + F_HEAD;
  drawOutlinedText(ctx, digimon.name.toUpperCase(), 400, 335, '#ffffff', '#000', 6);
  drawTypeBadgeSolid(ctx, digimon.race || digimon.element || 'Unknown', 400, 362);
  ctx.font = 'bold 20px ' + F_HEAD;
  drawOutlinedText(ctx, 'TAMER: ' + tamerHandle.toUpperCase(), 400, 400, '#ffffff', '#000', 4);
  ctx.font = 'bold 14px ' + F_HEAD;
  drawOutlinedText(ctx, 'BABY  ▸  CHILD  ▸  ADULT  ▸  PERFECT  ▸  ULTIMATE', 400, 428, '#00eeff', '#000', 3);
  ctx.font = '12px ' + F_BODY;
  drawOutlinedText(ctx, 'STAGE: BABY  |  LEVEL: 1  |  FEED & BATTLE TO DIGIVOLVE', 400, 455, 'rgba(255,255,255,0.85)', '#000', 3);

  return canvas.toBuffer('image/png');
}

// ═══════════════════════════════════════════════════
// ── TAME FAIL CARD ──
// ═══════════════════════════════════════════════════

async function generateFailCard(digimon, tamerHandle) {
  const w = 800, h = 480;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  const bg = await loadImg('failed.png');
  if (bg) drawBgCover(ctx, bg, w, h);
  else { ctx.fillStyle = '#220000'; ctx.fillRect(0, 0, w, h); }

  const ov = ctx.createLinearGradient(0, 0, 0, h);
  ov.addColorStop(0, 'rgba(0,0,0,0.6)'); ov.addColorStop(0.5, 'rgba(0,0,0,0.3)');
  ov.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = ov; ctx.fillRect(0, 0, w, h);

  // Red accent bars
  const topG = ctx.createLinearGradient(0, 0, w, 0);
  topG.addColorStop(0, 'rgba(255,0,0,0)'); topG.addColorStop(0.3, '#ff3355');
  topG.addColorStop(0.7, '#ff3355'); topG.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = topG; ctx.fillRect(0, 0, w, 4); ctx.fillRect(0, h - 4, w, 4);

  ctx.font = 'bold 56px ' + F_HEAD;
  drawOutlinedText(ctx, 'TAME FAILED', 400, 140, '#ff4444', '#000', 8);

  ctx.font = '16px ' + F_BODY;
  drawOutlinedText(ctx, 'デジモンが逃げた', 400, 175, '#ff8888', '#000', 3);

  ctx.font = 'bold 22px ' + F_HEAD;
  drawOutlinedText(ctx, 'THE DIGIMON ESCAPED BACK TO THE DIGITAL WORLD', 400, 280, '#ffffff', '#000', 5);

  ctx.font = 'bold 18px ' + F_HEAD;
  drawOutlinedText(ctx, 'TAMER: ' + tamerHandle.toUpperCase(), 400, 360, '#ffffff', '#000', 4);
  ctx.font = 'bold 16px ' + F_HEAD;
  drawOutlinedText(ctx, 'BETTER LUCK NEXT TIME', 400, 400, 'rgba(255,255,255,0.7)', '#000', 3);

  return canvas.toBuffer('image/png');
}

// ═══════════════════════════════════════════════════
// ── STATUS CARD ──
// ═══════════════════════════════════════════════════

async function generateStatusCard(pet) {
  const w = 800, h = 480;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  drawModernBase(ctx, w, h);

  // Header
  ctx.font = 'bold 28px ' + F_HEAD; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText('DIGIMON STATUS', 400, 35);
  drawSepLine(ctx, w, 48);

  // Tamer avatar (top-right area)
  const avatarImg = await loadAvatar(pet.avatar);
  if (avatarImg) {
    drawAvatar(ctx, avatarImg, 700, 100, 32);
    ctx.font = 'bold 12px ' + F_HEAD; ctx.fillStyle = '#ff6600'; ctx.textAlign = 'center';
    ctx.fillText('@' + (pet.ownerHandle || '').toUpperCase(), 700, 142);
  }

  // Digimon image
  const gifPath = getGifPath(pet);
  if (gifPath) { const img = await loadImg(gifPath); drawDigimon(ctx, img, 400, 130, 130); }

  // Name + type
  ctx.font = 'bold 30px ' + F_HEAD; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText(pet.name.toUpperCase(), 400, 218);
  drawTypeBadgeSolid(ctx, pet.race || 'Unknown', 400, 242);

  drawSepLine(ctx, w, 260);

  // Stats grid - 2 columns
  const col1 = 160, col2 = 500, startY = 285, gap = 30;
  ctx.font = 'bold 15px ' + F_HEAD;

  function statRow(label, value, x, y, color) {
    ctx.fillStyle = 'rgba(0,180,255,0.5)'; ctx.textAlign = 'left';
    ctx.fillText(label.toUpperCase(), x - 90, y);
    ctx.fillStyle = color || '#fff'; ctx.textAlign = 'left';
    ctx.fillText(value, x + 30, y);
  }

  const level = pet.level || 1;
  const hungerStatus = pet.hungerStatus || 'Unknown';
  const hColor = hungerStatus === 'Hungry' ? '#ff3355' : hungerStatus === 'Getting Hungry' ? '#ffcc00' : '#00ff88';

  statRow('LEVEL', String(level), col1, startY, '#00ffcc');
  statRow('STAGE', pet.growth_stage || 'Baby', col1, startY + gap);
  statRow('STATUS', pet.status || 'Happy', col1, startY + gap * 2);
  statRow('ENERGY', hungerStatus, col1, startY + gap * 3, hColor);

  statRow('RECORD', `${pet.wins || 0}W / ${pet.losses || 0}L`, col2, startY, '#00aaff');
  statRow('FEEDS', String(pet.feed_count || 0), col2, startY + gap);
  const ageDays = Math.floor((Date.now() / 1000 - (pet.created_at || Date.now() / 1000)) / 86400);
  statRow('AGE', ageDays + ' DAYS', col2, startY + gap * 2);
  statRow('TAMER', (pet.ownerHandle || '???').toUpperCase(), col2, startY + gap * 3, '#ff6600');

  // XP bar
  const xp = pet.xp || 0, xpNeeded = level * 100;
  const pct = Math.min(1, xp / xpNeeded);
  const barX = 120, barY = startY + gap * 4 + 10, barW = w - 240, barH = 12;
  roundRect(ctx, barX, barY, barW, barH, 6);
  ctx.fillStyle = 'rgba(0,30,60,0.6)'; ctx.fill();
  if (pct > 0) {
    const barG = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    barG.addColorStop(0, '#0066ff'); barG.addColorStop(1, '#00ffcc');
    roundRect(ctx, barX, barY, barW * pct, barH, 6);
    ctx.fillStyle = barG; ctx.fill();
  }
  ctx.font = '11px ' + F_BODY; ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.textAlign = 'center';
  ctx.fillText(`XP: ${xp} / ${xpNeeded}`, 400, barY + 26);

  return canvas.toBuffer('image/png');
}

// ═══════════════════════════════════════════════════
// ── FEED CARD ──
// ═══════════════════════════════════════════════════

async function generateFeedCard(pet, feedCount, growthStage, foodItem, reaction) {
  const w = 800, h = 480;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  drawModernBase(ctx, w, h, '#00cc66', '#00ffaa');

  // Header
  ctx.font = 'bold 28px ' + F_HEAD; ctx.fillStyle = '#00ffaa'; ctx.textAlign = 'center';
  ctx.fillText('DATA FEED', 400, 35);
  ctx.font = '12px ' + F_BODY; ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText('デジモンにデータを与える', 400, 52);
  drawSepLine(ctx, w, 60, 'rgba(0,255,150,0.3)');

  // Tamer avatar (top-right)
  const avatarImg = await loadAvatar(pet.avatar);
  if (avatarImg) {
    drawAvatar(ctx, avatarImg, 700, 100, 32);
    ctx.font = 'bold 12px ' + F_HEAD; ctx.fillStyle = '#ff6600'; ctx.textAlign = 'center';
    ctx.fillText('@' + (pet.ownerHandle || '').toUpperCase(), 700, 142);
  }

  // Digimon image
  const gifPath = getGifPath(pet);
  if (gifPath) { const img = await loadImg(gifPath); drawDigimon(ctx, img, 400, 145, 130); }

  // Name + type
  ctx.font = 'bold 28px ' + F_HEAD; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText(pet.name.toUpperCase(), 400, 232);
  drawTypeBadgeSolid(ctx, pet.race || 'Unknown', 400, 256);

  drawSepLine(ctx, w, 274, 'rgba(0,255,150,0.3)');

  // Reaction / food text
  ctx.font = 'bold 18px ' + F_HEAD; ctx.fillStyle = '#00ffaa'; ctx.textAlign = 'center';
  if (reaction) {
    ctx.fillText(reaction.toUpperCase(), 400, 302);
  } else if (foodItem) {
    ctx.fillText(pet.name.toUpperCase() + ' ATE THE ' + foodItem.toUpperCase(), 400, 302);
  } else {
    ctx.fillText(pet.name.toUpperCase() + ' IS FULL AND HAPPY', 400, 302);
  }

  // Food item tag
  if (foodItem) {
    ctx.font = 'bold 14px ' + F_HEAD;
    const tw = ctx.measureText(foodItem.toUpperCase()).width;
    const bw = tw + 28, bx = 400 - bw / 2, by = 318;
    roundRect(ctx, bx, by, bw, 26, 5);
    ctx.fillStyle = 'rgba(0,255,150,0.15)'; ctx.fill();
    ctx.strokeStyle = 'rgba(0,255,150,0.4)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#00ffaa'; ctx.textAlign = 'center';
    ctx.fillText(foodItem.toUpperCase(), 400, by + 18);
  }

  // Stats row
  const statsY = foodItem ? 370 : 340;
  ctx.font = 'bold 16px ' + F_HEAD; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.textAlign = 'center';
  ctx.fillText(`FEEDS: ${feedCount}  |  STAGE: ${growthStage}  |  LEVEL: ${pet.level || 1}`, 400, statsY);

  // XP bar
  const level = pet.level || 1, xp = pet.xp || 0, xpNeeded = level * 100;
  const pct = Math.min(1, xp / xpNeeded);
  const barX = 200, barY = statsY + 18, barW = 400, barH = 8;
  roundRect(ctx, barX, barY, barW, barH, 4);
  ctx.fillStyle = 'rgba(0,30,60,0.6)'; ctx.fill();
  if (pct > 0) {
    const barG = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    barG.addColorStop(0, '#00aa55'); barG.addColorStop(1, '#00ffaa');
    roundRect(ctx, barX, barY, barW * pct, barH, 4);
    ctx.fillStyle = barG; ctx.fill();
  }
  ctx.font = '10px ' + F_BODY; ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText(`${xp} / ${xpNeeded} XP`, 400, barY + 22);

  return canvas.toBuffer('image/png');
}

// ═══════════════════════════════════════════════════
// ── BATTLE CARD ── (narrative style, no HP numbers)
// ═══════════════════════════════════════════════════

async function generateBattleCard(pet1, pet2, winner, battleLog, owner1, owner2, winnerOwner) {
  const w = 800, h = 520;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  drawModernBase(ctx, w, h, '#ff4444', '#ff8800');

  // Header
  ctx.font = 'bold 32px ' + F_HEAD; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText('DIGIMON BATTLE', 400, 36);
  ctx.font = '11px ' + F_BODY; ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText('デジモンバトル', 400, 52);
  drawSepLine(ctx, w, 60, 'rgba(255,80,80,0.3)');

  // Pet 1 (left)
  const p1x = 180;
  const gif1 = getGifPath(pet1);
  if (gif1) { const img = await loadImg(gif1); drawDigimon(ctx, img, p1x, 120, 100); }
  ctx.font = 'bold 22px ' + F_HEAD; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText(pet1.name.toUpperCase(), p1x, 188);
  drawTypeBadgeSolid(ctx, pet1.race || 'Unknown', p1x, 210);
  // Avatar + owner
  const av1 = await loadAvatar(pet1.avatar);
  if (av1) { drawAvatar(ctx, av1, p1x - 60, 230, 16); }
  ctx.font = 'bold 13px ' + F_HEAD; ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.textAlign = 'center';
  ctx.fillText('@' + owner1.toUpperCase() + '  LV.' + (pet1.level || 1), p1x + (av1 ? 5 : 0), 234);

  // VS badge
  ctx.font = 'bold 28px ' + F_HEAD;
  const vsGrad = ctx.createLinearGradient(370, 100, 430, 140);
  vsGrad.addColorStop(0, '#ff4444'); vsGrad.addColorStop(1, '#ff8800');
  ctx.fillStyle = vsGrad; ctx.textAlign = 'center';
  ctx.fillText('VS', 400, 135);

  // Pet 2 (right)
  const p2x = 620;
  const gif2 = getGifPath(pet2);
  if (gif2) { const img = await loadImg(gif2); drawDigimon(ctx, img, p2x, 120, 100); }
  ctx.font = 'bold 22px ' + F_HEAD; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText(pet2.name.toUpperCase(), p2x, 188);
  drawTypeBadgeSolid(ctx, pet2.race || 'Unknown', p2x, 210);
  // Avatar + owner
  const av2 = await loadAvatar(pet2.avatar);
  if (av2) { drawAvatar(ctx, av2, p2x - 60, 230, 16); }
  ctx.font = 'bold 13px ' + F_HEAD; ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.textAlign = 'center';
  ctx.fillText('@' + owner2.toUpperCase() + '  LV.' + (pet2.level || 1), p2x + (av2 ? 5 : 0), 234);

  drawSepLine(ctx, w, 250, 'rgba(255,80,80,0.3)');

  // Battle narrative box
  const boxX = 60, boxY = 262, boxW = w - 120, boxH = 140;
  roundRect(ctx, boxX, boxY, boxW, boxH, 8);
  ctx.fillStyle = 'rgba(10,15,30,0.7)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,100,100,0.2)'; ctx.lineWidth = 1; ctx.stroke();

  // Parse narrative lines from battleLog
  const lines = (battleLog || '').split('\n').filter(l => l.trim());
  ctx.font = '12px ' + F_BODY; ctx.textAlign = 'left';
  const maxLines = Math.min(lines.length, 7);
  for (let i = 0; i < maxLines; i++) {
    const line = lines[i];
    if (line.includes('wins')) {
      ctx.fillStyle = '#00ffcc';
    } else if (line.includes('super effective')) {
      ctx.fillStyle = '#ffcc00';
    } else if (line.includes('not very effective')) {
      ctx.fillStyle = '#ff6666';
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
    }
    ctx.fillText(line.slice(0, 80), boxX + 16, boxY + 22 + i * 18);
  }

  drawSepLine(ctx, w, boxY + boxH + 10, 'rgba(255,80,80,0.3)');

  // Winner announcement
  if (winner) {
    const winY = boxY + boxH + 36;
    ctx.font = 'bold 26px ' + F_HEAD; ctx.textAlign = 'center';
    ctx.fillStyle = '#00ffcc';
    ctx.fillText(winner.name.toUpperCase() + ' WINS', 400, winY);
    ctx.font = 'bold 14px ' + F_HEAD; ctx.fillStyle = '#ff6600';
    ctx.fillText('TAMER @' + winnerOwner.toUpperCase() + '  +25 XP', 400, winY + 24);
  }

  return canvas.toBuffer('image/png');
}

// ═══════════════════════════════════════════════════
// ── ACTIVITY CARD ──
// ═══════════════════════════════════════════════════

async function generateActivityCard(pet1, pet2, activity, owner1, owner2) {
  const w = 800, h = 480;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  drawModernBase(ctx, w, h, '#8833ff', '#cc66ff');

  // Header
  ctx.font = 'bold 28px ' + F_HEAD; ctx.fillStyle = '#cc88ff'; ctx.textAlign = 'center';
  ctx.fillText('DIGITAL ADVENTURE', 400, 35);
  ctx.font = '11px ' + F_BODY; ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText('デジタルアドベンチャー', 400, 52);
  drawSepLine(ctx, w, 60, 'rgba(150,80,255,0.3)');

  // Pet 1 (left)
  const p1x = 200;
  const gif1 = getGifPath(pet1);
  if (gif1) { const img = await loadImg(gif1); drawDigimon(ctx, img, p1x, 125, 100); }
  ctx.font = 'bold 20px ' + F_HEAD; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText(pet1.name.toUpperCase(), p1x, 192);
  drawTypeBadgeSolid(ctx, pet1.race || 'Unknown', p1x, 214);
  ctx.font = 'bold 12px ' + F_HEAD; ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('@' + owner1.toUpperCase(), p1x, 236);

  // Connector
  ctx.font = 'bold 24px ' + F_HEAD; ctx.fillStyle = '#cc88ff';
  ctx.fillText('×', 400, 130);

  // Pet 2 (right)
  const p2x = 600;
  const gif2 = getGifPath(pet2);
  if (gif2) { const img = await loadImg(gif2); drawDigimon(ctx, img, p2x, 125, 100); }
  ctx.font = 'bold 20px ' + F_HEAD; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText(pet2.name.toUpperCase(), p2x, 192);
  drawTypeBadgeSolid(ctx, pet2.race || 'Unknown', p2x, 214);
  ctx.font = 'bold 12px ' + F_HEAD; ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('@' + owner2.toUpperCase(), p2x, 236);

  drawSepLine(ctx, w, 255, 'rgba(150,80,255,0.3)');

  // Activity text box
  const boxX = 80, boxY = 270, boxW = w - 160, boxH = 70;
  roundRect(ctx, boxX, boxY, boxW, boxH, 8);
  ctx.fillStyle = 'rgba(60,20,100,0.3)'; ctx.fill();
  ctx.strokeStyle = 'rgba(150,80,255,0.25)'; ctx.lineWidth = 1; ctx.stroke();

  ctx.font = 'bold 16px ' + F_HEAD; ctx.fillStyle = '#cc88ff'; ctx.textAlign = 'center';
  const maxChars = 60;
  if (activity.length > maxChars) {
    const mid = activity.lastIndexOf(' ', maxChars);
    ctx.fillText(activity.slice(0, mid > 0 ? mid : maxChars).toUpperCase(), 400, boxY + 28);
    ctx.fillText(activity.slice(mid > 0 ? mid + 1 : maxChars).toUpperCase(), 400, boxY + 50);
  } else {
    ctx.fillText(activity.toUpperCase(), 400, boxY + 40);
  }

  return canvas.toBuffer('image/png');
}

// ═══════════════════════════════════════════════════
// ── TEAM CARD ──
// ═══════════════════════════════════════════════════

async function generateTeamCard(pets, tamerHandle) {
  const w = 800, h = 480;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  drawModernBase(ctx, w, h, '#ff6600', '#ffaa00');

  // Header
  ctx.font = 'bold 26px ' + F_HEAD; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText(tamerHandle.toUpperCase() + '  DIGIVICE', 400, 35);
  ctx.font = '11px ' + F_BODY; ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText('テイマーのデジヴァイス', 400, 52);
  drawSepLine(ctx, w, 60, 'rgba(255,120,0,0.3)');

  const count = pets.length;
  const slotW = Math.floor((w - 80) / Math.max(count, 1));

  for (let i = 0; i < count; i++) {
    const pet = pets[i];
    const cx = 40 + slotW * i + slotW / 2;

    // Digimon image
    const gifPath = getGifPath(pet);
    if (gifPath) { const img = await loadImg(gifPath); drawDigimon(ctx, img, cx, 140, 110); }

    // Name
    ctx.font = 'bold 20px ' + F_HEAD; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(pet.name.toUpperCase(), cx, 216);
    drawTypeBadgeSolid(ctx, pet.race || 'Unknown', cx, 240);

    // Level
    ctx.font = 'bold 16px ' + F_HEAD; ctx.fillStyle = '#00ffcc';
    ctx.fillText('LV.' + (pet.level || 1), cx, 270);

    // Stats
    ctx.font = 'bold 13px ' + F_HEAD; ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText((pet.growth_stage || 'Baby').toUpperCase(), cx, 292);
    ctx.fillText((pet.wins || 0) + 'W / ' + (pet.losses || 0) + 'L', cx, 310);
    ctx.fillText((pet.feed_count || 0) + ' FEEDS', cx, 328);

    // XP bar
    const level = pet.level || 1, xp = pet.xp || 0, xpNeeded = level * 100;
    const pct = Math.min(1, xp / xpNeeded);
    const barW = 100, barH = 8, barX = cx - barW / 2, barY = 340;
    roundRect(ctx, barX, barY, barW, barH, 4);
    ctx.fillStyle = 'rgba(0,30,60,0.6)'; ctx.fill();
    if (pct > 0) {
      const g = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      g.addColorStop(0, '#ff6600'); g.addColorStop(1, '#ffaa00');
      roundRect(ctx, barX, barY, barW * pct, barH, 4);
      ctx.fillStyle = g; ctx.fill();
    }
    ctx.font = '9px ' + F_BODY; ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(xp + '/' + xpNeeded + ' XP', cx, barY + 20);
  }

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
