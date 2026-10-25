import { CONFIG } from './config.js';
import { GameState } from './core/GameState.js';
import { GameLoop } from './core/Loop.js';
import { Core } from './core/Core.js';
import { Turret } from './entities/Turret.js';
import { TeslaCoil } from './entities/TeslaCoil.js';
import { CryoField } from './entities/CryoField.js';
import { WaveManager } from './systems/Waves.js';
import { Economy } from './systems/Economy.js';
import { AudioManager } from './systems/Audio.js';
import { CrazyGamesSDK } from './sdk/crazy.js';

// Modular UI components
import { TopHud } from './ui/TopHud.js';
import { UpgradeSidebar } from './ui/UpgradeSidebar.js';
import { GameOverModal } from './ui/GameOverModal.js';
import { WorkshopModal } from './ui/WorkshopModal.js';
import { Profiler } from './ui/Profiler.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

export const audio = new AudioManager();
export const crazySdk = new CrazyGamesSDK();
export const gameState = new GameState();

let dpr = 1;
let logicalWidth = CONFIG.CANVAS.DEFAULT_WIDTH;
let logicalHeight = CONFIG.CANVAS.DEFAULT_HEIGHT;

let core;
let turret;
let teslaCoil = null;
let cryoField = null;
let economy = new Economy();
let waveManager;
let bullets = [];
let particles = [];
let floatingTexts = [];
let shockwaves = [];
let veinPulseTime = 0;

// Screen Resize
function resizeCanvas() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  dpr = window.devicePixelRatio || 1;
  logicalWidth = container.clientWidth;
  logicalHeight = container.clientHeight;

  canvas.width = Math.floor(logicalWidth * dpr);
  canvas.height = Math.floor(logicalHeight * dpr);

  const centerX = logicalWidth / 2;
  const centerY = logicalHeight / 2;

  if (core) { core.x = centerX; core.y = centerY; }
  if (turret) { turret.x = centerX; turret.y = centerY; }
  if (teslaCoil) { teslaCoil.x = centerX; teslaCoil.y = centerY; }
  if (cryoField) { cryoField.x = centerX; cryoField.y = centerY; }
}

window.addEventListener('resize', resizeCanvas);
document.addEventListener('fullscreenchange', resizeCanvas);
document.addEventListener('webkitfullscreenchange', resizeCanvas);

// UI Initialization
const topHud = new TopHud('top-hud', {
  onToggleAudio: () => audio.toggleMute(),
  onToggleFullscreen: () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  },
  onTogglePerf: () => profiler.toggle()
});

const upgradeSidebar = new UpgradeSidebar('upgrade-sidebar', {
  onBuyUpgrade: (type) => handleBuyInRunUpgrade(type),
  onOpenWorkshop: () => openWorkshop()
});

const gameOverModal = new GameOverModal('game-over-modal', {
  onDoubleShards: () => handleDoubleShards(),
  onRevive: () => handleEmergencyRevive(),
  onOpenWorkshop: () => {
    gameOverModal.hide();
    openWorkshop();
  },
  onRestart: () => initGame()
});

const workshopModal = new WorkshopModal('workshop-modal', {
  onClose: () => closeWorkshop(),
  onBuyMeta: (type) => handleBuyMetaUpgrade(type)
});

const profiler = new Profiler('perf-overlay');

export function triggerScreenShake(strength = 8) {
  gameState.triggerShake(strength);
}

export function addFloatingText(x, y, text, color = '#00f3ff', isCritical = false) {
  floatingTexts.push({
    x,
    y,
    text,
    color,
    alpha: 1,
    size: isCritical ? 16 : 13,
    vy: isCritical ? -40 : -28,
    life: isCritical ? 1.0 : 0.75
  });
}

export function createExplosion(x, y, color = '#ff0055', count = 14, isHeavy = false) {
  const particleCount = isHeavy ? count * 2 : count;
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 4 + 1.5) * (isHeavy ? 1.8 : 1);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      radius: (Math.random() * 2.8 + 1) * (isHeavy ? 1.4 : 1),
      alpha: 1,
      decay: Math.random() * 0.025 + 0.015
    });
  }
}

function handleBuyInRunUpgrade(type) {
  if (economy.buyUpgrade(type)) {
    audio.playUpgrade();
    if (type === 'damage') {
      const baseDamage = CONFIG.TURRET.BASE_DAMAGE + economy.meta.baseDamage * CONFIG.TURRET.DAMAGE_PER_META_LEVEL;
      turret.damage = Math.round(baseDamage * Math.pow(1.22, economy.upgrades.damage - 1));
    } else if (type === 'firerate') {
      turret.fireCooldown = Math.max(
        CONFIG.TURRET.MIN_FIRE_COOLDOWN,
        Math.round(CONFIG.TURRET.BASE_FIRE_COOLDOWN * Math.pow(0.9, economy.upgrades.firerate - 1))
      );
    } else if (type === 'health') {
      const oldMax = core.maxHp;
      const baseHp = CONFIG.CORE.BASE_HP + economy.meta.baseHp * CONFIG.CORE.HP_PER_META_LEVEL;
      core.maxHp = Math.round(baseHp * Math.pow(1.25, economy.upgrades.health - 1));
      core.heal(core.maxHp - oldMax);
    }
    syncAllUI();
  }
}

function handleBuyMetaUpgrade(type) {
  if (economy.buyMetaUpgrade(type)) {
    audio.playUpgrade();
    if (type === 'baseHp') {
      core.maxHp += CONFIG.CORE.HP_PER_META_LEVEL;
      core.heal(CONFIG.CORE.HP_PER_META_LEVEL);
    } else if (type === 'baseDamage') {
      turret.damage += CONFIG.TURRET.DAMAGE_PER_META_LEVEL;
    } else if (type === 'unlockTesla' && !teslaCoil) {
      teslaCoil = new TeslaCoil(logicalWidth / 2, logicalHeight / 2);
    } else if (type === 'unlockCryo' && !cryoField) {
      cryoField = new CryoField(logicalWidth / 2, logicalHeight / 2);
    }
    syncAllUI();
  }
}

function openWorkshop() {
  gameState.isPaused = true;
  crazySdk.gameplayStop();
  workshopModal.update(economy);
  workshopModal.show();
}

function closeWorkshop() {
  workshopModal.hide();
  if (gameState.isGameOver) {
    gameOverModal.show({
      shardsEarned: gameState.currentRunShardsEarned,
      wave: waveManager.currentWave,
      totalEnergy: economy.totalEarned,
      kills: gameState.kills,
      totalShards: economy.coreShards,
      hasRevived: gameState.hasRevivedThisRun
    });
  } else {
    gameState.isPaused = false;
    loop.resetTime();
    crazySdk.gameplayStart();
  }
}

function handleDoubleShards() {
  if (gameState.hasDoubledShards) return;
  crazySdk.requestRewardedAd({
    adStarted: () => audio.init(),
    rewardGiven: () => {
      gameState.hasDoubledShards = true;
      economy.addShards(gameState.currentRunShardsEarned);
      gameOverModal.show({
        shardsEarned: gameState.currentRunShardsEarned * 2,
        wave: waveManager.currentWave,
        totalEnergy: economy.totalEarned,
        kills: gameState.kills,
        totalShards: economy.coreShards,
        hasRevived: gameState.hasRevivedThisRun
      });
      audio.playUpgrade();
    }
  });
}

function handleEmergencyRevive() {
  if (gameState.hasRevivedThisRun) return;
  crazySdk.requestRewardedAd({
    adStarted: () => audio.init(),
    rewardGiven: () => {
      gameState.hasRevivedThisRun = true;
      gameState.isGameOver = false;
      core.heal(Math.round(core.maxHp * 0.5));
      waveManager.enemies.forEach(e => e.takeDamage(999));
      bullets = [];

      gameOverModal.hide();
      audio.playShockwave();
      triggerScreenShake(12);
      crazySdk.gameplayStart();
      loop.resetTime();
    }
  });
}

function syncAllUI() {
  topHud.update({
    energy: economy.energy,
    energyRate: economy.getEnergyRate(),
    wave: waveManager ? waveManager.currentWave : 1,
    waveIntermission: waveManager ? waveManager.isIntermission : false,
    intermissionTime: waveManager ? waveManager.intermissionTimer : 0,
    remainingEnemies: waveManager ? waveManager.enemies.length + (waveManager.enemiesToSpawn - waveManager.enemiesSpawned) : 0,
    shards: economy.coreShards,
    currentHp: core ? core.currentHp : 0,
    maxHp: core ? core.maxHp : 100
  });

  upgradeSidebar.update({
    economy,
    turret,
    core,
    kills: gameState.kills
  });

  workshopModal.update(economy);
}

function initGame() {
  resizeCanvas();
  const centerX = logicalWidth / 2;
  const centerY = logicalHeight / 2;

  const currentShards = economy.coreShards;
  const currentMeta = { ...economy.meta };

  economy = new Economy();
  economy.coreShards = currentShards;
  economy.meta = currentMeta;

  gameState.reset();

  const baseHp = CONFIG.CORE.BASE_HP + economy.meta.baseHp * CONFIG.CORE.HP_PER_META_LEVEL;
  const baseDamage = CONFIG.TURRET.BASE_DAMAGE + economy.meta.baseDamage * CONFIG.TURRET.DAMAGE_PER_META_LEVEL;

  core = new Core(centerX, centerY, baseHp);
  turret = new Turret(centerX, centerY, baseDamage);

  teslaCoil = economy.meta.unlockTesla ? new TeslaCoil(centerX, centerY) : null;
  cryoField = economy.meta.unlockCryo ? new CryoField(centerX, centerY) : null;

  waveManager = new WaveManager();

  bullets = [];
  particles = [];
  floatingTexts = [];
  shockwaves = [];

  gameOverModal.hide();
  workshopModal.hide();

  syncAllUI();
  crazySdk.gameplayStart();
  loop.start();
}

function handleGameOver() {
  gameState.isGameOver = true;
  crazySdk.gameplayStop();
  audio.playCoreBreach();
  triggerScreenShake(16);

  gameState.currentRunShardsEarned = economy.calculateShardPayout(
    waveManager.currentWave,
    gameState.kills,
    economy.totalEarned
  );
  economy.addShards(gameState.currentRunShardsEarned);

  crazySdk.requestMidgameAd({
    adFinished: () => {
      gameOverModal.show({
        shardsEarned: gameState.currentRunShardsEarned,
        wave: waveManager.currentWave,
        totalEnergy: economy.totalEarned,
        kills: gameState.kills,
        totalShards: economy.coreShards,
        hasRevived: gameState.hasRevivedThisRun
      });
    }
  });

  gameOverModal.show({
    shardsEarned: gameState.currentRunShardsEarned,
    wave: waveManager.currentWave,
    totalEnergy: economy.totalEarned,
    kills: gameState.kills,
    totalShards: economy.coreShards,
    hasRevived: gameState.hasRevivedThisRun
  });
}

// User Strike
canvas.addEventListener('pointerdown', (e) => {
  if (gameState.isGameOver || gameState.isPaused) return;
  audio.init();

  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) * (logicalWidth / rect.width);
  const clickY = (e.clientY - rect.top) * (logicalHeight / rect.height);

  audio.playShockwave();
  triggerScreenShake(7);

  shockwaves.push({
    x: clickX,
    y: clickY,
    radius: 6,
    maxRadius: CONFIG.STRIKE.RADIUS,
    alpha: 1
  });

  const strikeDamage = Math.round(turret.damage * CONFIG.STRIKE.DAMAGE_FACTOR);
  waveManager.enemies.forEach((enemy) => {
    const dist = Math.hypot(enemy.x - clickX, enemy.y - clickY);
    if (dist < CONFIG.STRIKE.RADIUS) {
      enemy.takeDamage(strikeDamage);
      addFloatingText(enemy.x, enemy.y, `-${strikeDamage}`, '#00ffcc', true);
      createExplosion(enemy.x, enemy.y, '#00f3ff', 8);
      const angle = Math.atan2(enemy.y - clickY, enemy.x - clickX);
      enemy.x += Math.cos(angle) * CONFIG.STRIKE.KNOCKBACK;
      enemy.y += Math.sin(angle) * CONFIG.STRIKE.KNOCKBACK;
    }
  });
});

function drawBackgroundGridAndVeins(ctx, width, height, dt, energyRate) {
  veinPulseTime += dt * (1.2 + energyRate * 0.08);

  ctx.save();
  const gridSize = CONFIG.CANVAS.GRID_SIZE;
  ctx.strokeStyle = 'rgba(26, 34, 62, 0.45)';
  ctx.lineWidth = 1;

  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const veinCount = 8;

  for (let i = 0; i < veinCount; i++) {
    const baseAngle = (i * Math.PI * 2) / veinCount;
    const veinLength = Math.max(width, height) * 0.7;
    const startX = centerX + Math.cos(baseAngle) * veinLength;
    const startY = centerY + Math.sin(baseAngle) * veinLength;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(centerX, centerY);
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const pulseOffset = (veinPulseTime * 0.2 + (i / veinCount)) % 1;
    const nodeX = startX + (centerX - startX) * pulseOffset;
    const nodeY = startY + (centerY - startY) * pulseOffset;

    ctx.beginPath();
    ctx.arc(nodeX, nodeY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 8;
    ctx.fill();
  }

  ctx.restore();
}

// Tick & Render Pipeline
function update(dt, timestamp) {
  gameState.updateShake();

  if (!gameState.isGameOver && !gameState.isPaused) {
    economy.update(dt);
    core.update(dt);

    if (cryoField) cryoField.update(dt, waveManager.enemies);
    waveManager.update(dt, logicalWidth, logicalHeight, core);
    turret.update(dt, waveManager.enemies, bullets);
    if (teslaCoil) teslaCoil.update(dt, waveManager.enemies);

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.update(dt);

      let hit = false;
      for (let j = 0; j < waveManager.enemies.length; j++) {
        const enemy = waveManager.enemies[j];
        const dist = Math.hypot(b.x - enemy.x, b.y - enemy.y);
        if (dist < b.radius + enemy.radius) {
          enemy.takeDamage(b.damage);
          audio.playImpact();
          addFloatingText(enemy.x, enemy.y, `-${b.damage}`, '#ff0077');
          createExplosion(b.x, b.y, '#00f3ff', 6);
          hit = true;
          break;
        }
      }

      if (hit || b.isOffscreen(logicalWidth, logicalHeight)) {
        bullets.splice(i, 1);
      }
    }

    // Enemies
    for (let i = waveManager.enemies.length - 1; i >= 0; i--) {
      const enemy = waveManager.enemies[i];
      const distToCore = Math.hypot(enemy.x - core.x, enemy.y - core.y);

      if (distToCore < core.radius + enemy.radius) {
        core.takeDamage(enemy.damage);
        const isBrute = enemy.type === 'brute';
        audio.playExplosion(isBrute);
        triggerScreenShake(isBrute ? 12 : 7);
        createExplosion(enemy.x, enemy.y, '#ff3344', 20, isBrute);
        addFloatingText(core.x, core.y - 20, `-${enemy.damage} HP`, '#ff3344', true);
        waveManager.enemies.splice(i, 1);

        if (core.isDestroyed()) {
          handleGameOver();
          break;
        }
        continue;
      }

      if (enemy.isDead()) {
        const isBrute = enemy.type === 'brute';
        economy.addEnergy(enemy.reward);
        gameState.kills++;
        audio.playExplosion(isBrute);
        if (isBrute) triggerScreenShake(6);
        addFloatingText(enemy.x, enemy.y - 12, `+${enemy.reward}E`, '#ffd000', isBrute);
        createExplosion(enemy.x, enemy.y, enemy.accentColor, 16, isBrute);
        waveManager.enemies.splice(i, 1);
      }
    }

    syncAllUI();
  }
}

function render(dt, timestamp) {
  const frameStart = performance.now();

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.translate(gameState.screenShake.offsetX, gameState.screenShake.offsetY);
  ctx.clearRect(-20, -20, logicalWidth + 40, logicalHeight + 40);

  drawBackgroundGridAndVeins(ctx, logicalWidth, logicalHeight, dt, economy.getEnergyRate());

  if (cryoField) cryoField.draw(ctx);
  turret.drawRange(ctx);
  core.draw(ctx);
  turret.draw(ctx);
  if (teslaCoil) teslaCoil.draw(ctx);

  // Shockwaves
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    sw.radius += (sw.maxRadius - sw.radius) * 0.22;
    sw.alpha -= 0.055;
    ctx.save();
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 243, 255, ${Math.max(0, sw.alpha)})`;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();
    if (sw.alpha <= 0) shockwaves.splice(i, 1);
  }

  waveManager.enemies.forEach((enemy) => enemy.draw(ctx));
  bullets.forEach((bullet) => bullet.draw(ctx));

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;

    if (p.alpha <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Floating text
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy * dt;
    ft.alpha -= dt / ft.life;

    if (ft.alpha <= 0) {
      floatingTexts.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.font = `bold ${ft.size}px Consolas, monospace`;
    ctx.fillStyle = ft.color;
    ctx.shadowColor = ft.color;
    ctx.shadowBlur = 8;
    ctx.fillText(ft.text, ft.x - 12, ft.y);
    ctx.restore();
  }

  ctx.restore();

  const totalEntities = (waveManager ? waveManager.enemies.length : 0) + bullets.length + particles.length;
  profiler.update(timestamp, totalEntities, performance.now() - frameStart);
}

const loop = new GameLoop(update, render);

initGame();