import { Core } from './core/Core.js';
import { Turret } from './entities/Turret.js';
import { TeslaCoil } from './entities/TeslaCoil.js';
import { CryoField } from './entities/CryoField.js';
import { WaveManager } from './systems/Waves.js';
import { Economy } from './systems/Economy.js';
import { AudioManager } from './systems/Audio.js';
import { CrazyGamesSDK } from './sdk/crazy.js';

// Setup Canvas and SDK
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

export const audio = new AudioManager();
export const crazySdk = new CrazyGamesSDK();

// High DPI Scaling & Responsive letterboxing
let dpr = 1;
let logicalWidth = 760;
let logicalHeight = 656;

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

  if (core) {
    core.x = centerX;
    core.y = centerY;
  }
  if (turret) {
    turret.x = centerX;
    turret.y = centerY;
  }
  if (teslaCoil) {
    teslaCoil.x = centerX;
    teslaCoil.y = centerY;
  }
  if (cryoField) {
    cryoField.x = centerX;
    cryoField.y = centerY;
  }
}

window.addEventListener('resize', resizeCanvas);
document.addEventListener('fullscreenchange', resizeCanvas);
document.addEventListener('webkitfullscreenchange', resizeCanvas);

// UI references
const ui = {
  energy: document.getElementById('dark-energy'),
  energyRate: document.getElementById('energy-rate'),
  wave: document.getElementById('wave-counter'),
  waveProgress: document.getElementById('wave-progress'),
  coreHpText: document.getElementById('core-hp-text'),
  hudShards: document.getElementById('hud-shards'),
  kills: document.getElementById('stat-kills'),
  range: document.getElementById('stat-range'),
  statTesla: document.getElementById('stat-tesla'),
  statCryo: document.getElementById('stat-cryo'),
  audioToggleBtn: document.getElementById('audio-toggle-btn'),
  audioIcon: document.getElementById('audio-icon'),
  fullscreenBtn: document.getElementById('fullscreen-btn'),
  perfToggleBtn: document.getElementById('perf-toggle-btn'),

  // Profiler UI
  perfOverlay: document.getElementById('perf-overlay'),
  perfFps: document.getElementById('perf-fps'),
  perfEntities: document.getElementById('perf-entities'),
  perfMs: document.getElementById('perf-ms'),

  // Upgrade buttons
  lvlDamage: document.getElementById('lvl-damage'),
  valDamage: document.getElementById('val-damage'),
  costDamage: document.getElementById('cost-damage'),
  btnDamage: document.getElementById('btn-upgrade-damage'),

  lvlFirerate: document.getElementById('lvl-firerate'),
  valFirerate: document.getElementById('val-firerate'),
  costFirerate: document.getElementById('cost-firerate'),
  btnFirerate: document.getElementById('btn-upgrade-firerate'),

  lvlHealth: document.getElementById('lvl-health'),
  valHealth: document.getElementById('val-health'),
  costHealth: document.getElementById('cost-health'),
  btnHealth: document.getElementById('btn-upgrade-health'),

  lvlYield: document.getElementById('lvl-yield'),
  valYield: document.getElementById('val-yield'),
  costYield: document.getElementById('cost-yield'),
  btnYield: document.getElementById('btn-upgrade-yield'),

  // Game over modal
  gameOverModal: document.getElementById('game-over-modal'),
  payoutShards: document.getElementById('payout-shards'),
  doubleShardsAmount: document.getElementById('double-shards-amount'),
  btnRewardedDouble: document.getElementById('btn-rewarded-double'),
  btnRewardedRevive: document.getElementById('btn-rewarded-revive'),
  summaryWaves: document.getElementById('summary-waves'),
  summaryEnergy: document.getElementById('summary-energy'),
  summaryKills: document.getElementById('summary-kills'),
  summaryTotalShards: document.getElementById('summary-total-shards'),
  modalWorkshopBtn: document.getElementById('modal-workshop-btn'),
  restartBtn: document.getElementById('restart-run-btn'),

  // Workshop modal
  btnOpenWorkshop: document.getElementById('btn-open-workshop'),
  workshopModal: document.getElementById('workshop-modal'),
  closeWorkshopBtn: document.getElementById('close-workshop-btn'),
  workshopShardsVal: document.getElementById('workshop-shards-val'),

  // Workshop buttons
  metaLvlBaseEnergy: document.getElementById('meta-lvl-baseEnergy'),
  metaCostBaseEnergy: document.getElementById('meta-cost-baseEnergy'),
  btnMetaBaseEnergy: document.getElementById('btn-meta-baseEnergy'),

  metaLvlBaseHp: document.getElementById('meta-lvl-baseHp'),
  metaCostBaseHp: document.getElementById('meta-cost-baseHp'),
  btnMetaBaseHp: document.getElementById('btn-meta-baseHp'),

  metaLvlBaseDamage: document.getElementById('meta-lvl-baseDamage'),
  metaCostBaseDamage: document.getElementById('meta-cost-baseDamage'),
  btnMetaBaseDamage: document.getElementById('btn-meta-baseDamage'),

  metaStatusTesla: document.getElementById('meta-status-tesla'),
  btnMetaUnlockTesla: document.getElementById('btn-meta-unlockTesla'),

  metaStatusCryo: document.getElementById('meta-status-cryo'),
  btnMetaUnlockCryo: document.getElementById('btn-meta-unlockCryo')
};

// Game Entities & Systems
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
let killsCount = 0;
let isGameOver = false;
let isPaused = false;
let animationFrameId = null;
let lastTimestamp = performance.now();

// Rewarded Ad run flags
let currentRunShardsEarned = 0;
let hasDoubledShards = false;
let hasRevivedThisRun = false;

// Profiling metrics
let showProfiler = false;
let frameCount = 0;
let lastFpsUpdate = performance.now();

// Screen Shake Engine
let screenShake = {
  intensity: 0,
  decay: 0.9,
  offsetX: 0,
  offsetY: 0
};

export function triggerScreenShake(strength = 8) {
  screenShake.intensity = Math.max(screenShake.intensity, strength);
}

let veinPulseTime = 0;

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

function initGame() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  resizeCanvas();
  const centerX = logicalWidth / 2;
  const centerY = logicalHeight / 2;

  const currentShards = economy.coreShards;
  const currentMeta = { ...economy.meta };

  economy = new Economy();
  economy.coreShards = currentShards;
  economy.meta = currentMeta;

  const baseHp = 100 + economy.meta.baseHp * 40;
  const baseDamage = 15 + economy.meta.baseDamage * 5;

  core = new Core(centerX, centerY, baseHp);
  turret = new Turret(centerX, centerY, baseDamage);

  teslaCoil = economy.meta.unlockTesla ? new TeslaCoil(centerX, centerY) : null;
  cryoField = economy.meta.unlockCryo ? new CryoField(centerX, centerY) : null;

  waveManager = new WaveManager();

  bullets = [];
  particles = [];
  floatingTexts = [];
  shockwaves = [];
  killsCount = 0;
  isGameOver = false;
  isPaused = false;
  hasDoubledShards = false;
  hasRevivedThisRun = false;
  screenShake.intensity = 0;
  lastTimestamp = performance.now();

  ui.gameOverModal.classList.add('hidden');
  ui.workshopModal.classList.add('hidden');
  ui.btnRewardedDouble.disabled = false;
  ui.btnRewardedRevive.disabled = false;

  updateUI();
  updateWorkshopUI();

  // Notify SDK of gameplay session commencement
  crazySdk.gameplayStart();

  animationFrameId = requestAnimationFrame(gameLoop);
}

function updateUI() {
  ui.energy.textContent = Math.floor(economy.energy);
  ui.energyRate.textContent = economy.getEnergyRate().toFixed(1);
  ui.wave.textContent = waveManager.currentWave;
  ui.coreHpText.textContent = `${Math.max(0, Math.ceil(core.currentHp))} / ${core.maxHp}`;
  ui.hudShards.textContent = economy.coreShards;
  ui.kills.textContent = killsCount;
  ui.range.textContent = `${turret.range}px`;

  ui.statTesla.textContent = economy.meta.unlockTesla ? 'Active' : 'Locked';
  ui.statTesla.style.color = economy.meta.unlockTesla ? '#00ff88' : '#7482a5';

  ui.statCryo.textContent = economy.meta.unlockCryo ? 'Active' : 'Locked';
  ui.statCryo.style.color = economy.meta.unlockCryo ? '#00f3ff' : '#7482a5';

  if (waveManager.isIntermission) {
    ui.waveProgress.textContent = `Next wave in ${(Math.max(0, waveManager.intermissionTimer)).toFixed(1)}s`;
  } else {
    ui.waveProgress.textContent = `Enemies: ${waveManager.enemies.length + (waveManager.enemiesToSpawn - waveManager.enemiesSpawned)}`;
  }

  // Damage Upgrade
  const damageCost = economy.getUpgradeCost('damage');
  ui.lvlDamage.textContent = economy.upgrades.damage;
  ui.valDamage.textContent = turret.damage;
  ui.costDamage.textContent = damageCost;
  ui.btnDamage.disabled = economy.energy < damageCost;

  // Fire Rate Upgrade
  const firerateCost = economy.getUpgradeCost('firerate');
  ui.lvlFirerate.textContent = economy.upgrades.firerate;
  ui.valFirerate.textContent = (turret.fireCooldown / 1000).toFixed(2);
  ui.costFirerate.textContent = firerateCost;
  ui.btnFirerate.disabled = economy.energy < firerateCost;

  // Health Upgrade
  const healthCost = economy.getUpgradeCost('health');
  ui.lvlHealth.textContent = economy.upgrades.health;
  ui.valHealth.textContent = core.maxHp;
  ui.costHealth.textContent = healthCost;
  ui.btnHealth.disabled = economy.energy < healthCost;

  // Extractor Yield Upgrade
  const yieldCost = economy.getUpgradeCost('yield');
  ui.lvlYield.textContent = economy.upgrades.yield;
  ui.valYield.textContent = economy.getEnergyRate().toFixed(1);
  ui.costYield.textContent = yieldCost;
  ui.btnYield.disabled = economy.energy < yieldCost;
}

function updateWorkshopUI() {
  const meta = economy.meta;
  ui.workshopShardsVal.textContent = economy.coreShards;

  const energyCost = economy.getMetaCost('baseEnergy');
  ui.metaLvlBaseEnergy.textContent = meta.baseEnergy;
  ui.metaCostBaseEnergy.textContent = energyCost;
  ui.btnMetaBaseEnergy.disabled = economy.coreShards < energyCost;

  const hpCost = economy.getMetaCost('baseHp');
  ui.metaLvlBaseHp.textContent = meta.baseHp;
  ui.metaCostBaseHp.textContent = hpCost;
  ui.btnMetaBaseHp.disabled = economy.coreShards < hpCost;

  const damageCost = economy.getMetaCost('baseDamage');
  ui.metaLvlBaseDamage.textContent = meta.baseDamage;
  ui.metaCostBaseDamage.textContent = damageCost;
  ui.btnMetaBaseDamage.disabled = economy.coreShards < damageCost;

  if (meta.unlockTesla) {
    ui.metaStatusTesla.textContent = 'INSTALLED';
    ui.metaStatusTesla.style.color = '#00ff88';
    ui.btnMetaUnlockTesla.disabled = true;
    ui.btnMetaUnlockTesla.textContent = 'PURCHASED';
  } else {
    ui.metaStatusTesla.textContent = 'LOCKED';
    ui.metaStatusTesla.style.color = '#ffd000';
    ui.btnMetaUnlockTesla.disabled = economy.coreShards < 40;
    ui.btnMetaUnlockTesla.textContent = 'UNLOCK (40 SHARDS)';
  }

  if (meta.unlockCryo) {
    ui.metaStatusCryo.textContent = 'INSTALLED';
    ui.metaStatusCryo.style.color = '#00ff88';
    ui.btnMetaUnlockCryo.disabled = true;
    ui.btnMetaUnlockCryo.textContent = 'PURCHASED';
  } else {
    ui.metaStatusCryo.textContent = 'LOCKED';
    ui.metaStatusCryo.style.color = '#ffd000';
    ui.btnMetaUnlockCryo.disabled = economy.coreShards < 50;
    ui.btnMetaUnlockCryo.textContent = 'UNLOCK (50 SHARDS)';
  }
}

// In-Run Upgrades
ui.btnDamage.addEventListener('click', () => {
  if (economy.buyUpgrade('damage')) {
    audio.playUpgrade();
    const baseDamage = 15 + economy.meta.baseDamage * 5;
    turret.damage = Math.round(baseDamage * Math.pow(1.22, economy.upgrades.damage - 1));
    updateUI();
  }
});

ui.btnFirerate.addEventListener('click', () => {
  if (economy.buyUpgrade('firerate')) {
    audio.playUpgrade();
    turret.fireCooldown = Math.max(120, Math.round(450 * Math.pow(0.9, economy.upgrades.firerate - 1)));
    updateUI();
  }
});

ui.btnHealth.addEventListener('click', () => {
  if (economy.buyUpgrade('health')) {
    audio.playUpgrade();
    const oldMax = core.maxHp;
    const baseHp = 100 + economy.meta.baseHp * 40;
    core.maxHp = Math.round(baseHp * Math.pow(1.25, economy.upgrades.health - 1));
    core.heal(core.maxHp - oldMax);
    updateUI();
  }
});

ui.btnYield.addEventListener('click', () => {
  if (economy.buyUpgrade('yield')) {
    audio.playUpgrade();
    updateUI();
  }
});

// Meta Upgrades
ui.btnMetaBaseEnergy.addEventListener('click', () => {
  if (economy.buyMetaUpgrade('baseEnergy')) {
    audio.playUpgrade();
    updateWorkshopUI();
    updateUI();
  }
});

ui.btnMetaBaseHp.addEventListener('click', () => {
  if (economy.buyMetaUpgrade('baseHp')) {
    audio.playUpgrade();
    const hpDiff = 40;
    core.maxHp += hpDiff;
    core.heal(hpDiff);
    updateWorkshopUI();
    updateUI();
  }
});

ui.btnMetaBaseDamage.addEventListener('click', () => {
  if (economy.buyMetaUpgrade('baseDamage')) {
    audio.playUpgrade();
    turret.damage += 5;
    updateWorkshopUI();
    updateUI();
  }
});

ui.btnMetaUnlockTesla.addEventListener('click', () => {
  if (economy.buyMetaUpgrade('unlockTesla')) {
    audio.playUpgrade();
    if (!teslaCoil) {
      teslaCoil = new TeslaCoil(logicalWidth / 2, logicalHeight / 2);
    }
    updateWorkshopUI();
    updateUI();
  }
});

ui.btnMetaUnlockCryo.addEventListener('click', () => {
  if (economy.buyMetaUpgrade('unlockCryo')) {
    audio.playUpgrade();
    if (!cryoField) {
      cryoField = new CryoField(logicalWidth / 2, logicalHeight / 2);
    }
    updateWorkshopUI();
    updateUI();
  }
});

// Sound Toggle
ui.audioToggleBtn.addEventListener('click', () => {
  const isMuted = audio.toggleMute();
  ui.audioIcon.textContent = isMuted ? '🔇' : '🔊';
});

// Fullscreen Toggle
ui.fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
});

// Profiler Toggle
ui.perfToggleBtn.addEventListener('click', () => {
  showProfiler = !showProfiler;
  ui.perfOverlay.classList.toggle('hidden', !showProfiler);
});

// Navigation & Modals
ui.btnOpenWorkshop.addEventListener('click', () => {
  isPaused = true;
  crazySdk.gameplayStop();
  updateWorkshopUI();
  ui.workshopModal.classList.remove('hidden');
});

ui.modalWorkshopBtn.addEventListener('click', () => {
  ui.gameOverModal.classList.add('hidden');
  updateWorkshopUI();
  ui.workshopModal.classList.remove('hidden');
});

ui.closeWorkshopBtn.addEventListener('click', () => {
  ui.workshopModal.classList.add('hidden');
  if (isGameOver) {
    ui.gameOverModal.classList.remove('hidden');
  } else {
    isPaused = false;
    lastTimestamp = performance.now();
    crazySdk.gameplayStart();
  }
});

ui.restartBtn.addEventListener('click', () => {
  initGame();
});

// Rewarded Ad 1: Double Core Shards
ui.btnRewardedDouble.addEventListener('click', () => {
  if (hasDoubledShards) return;

  crazySdk.requestRewardedAd({
    adStarted: () => {
      audio.init();
    },
    rewardGiven: () => {
      hasDoubledShards = true;
      economy.addShards(currentRunShardsEarned);
      ui.summaryTotalShards.textContent = economy.coreShards;
      ui.payoutShards.textContent = `+${currentRunShardsEarned * 2} (DOUBLED!)`;
      ui.btnRewardedDouble.disabled = true;
      ui.btnRewardedDouble.textContent = '✓ SHARDS DOUBLED';
      audio.playUpgrade();
    }
  });
});

// Rewarded Ad 2: Emergency Reboot Revive
ui.btnRewardedRevive.addEventListener('click', () => {
  if (hasRevivedThisRun) return;

  crazySdk.requestRewardedAd({
    adStarted: () => {
      audio.init();
    },
    rewardGiven: () => {
      hasRevivedThisRun = true;
      isGameOver = false;
      core.heal(Math.round(core.maxHp * 0.5));

      // Clear surrounding enemies with a shockwave
      waveManager.enemies.forEach(e => {
        e.takeDamage(999);
      });
      bullets = [];

      ui.gameOverModal.classList.add('hidden');
      audio.playShockwave();
      triggerScreenShake(12);
      crazySdk.gameplayStart();
      lastTimestamp = performance.now();
    }
  });
});

// Orbital assistance via Pointer Events
canvas.addEventListener('pointerdown', (e) => {
  if (isGameOver || isPaused) return;
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
    maxRadius: 75,
    alpha: 1
  });

  const strikeDamage = Math.round(turret.damage * 0.9);
  waveManager.enemies.forEach((enemy) => {
    const dist = Math.hypot(enemy.x - clickX, enemy.y - clickY);
    if (dist < 75) {
      enemy.takeDamage(strikeDamage);
      addFloatingText(enemy.x, enemy.y, `-${strikeDamage}`, '#00ffcc', true);
      createExplosion(enemy.x, enemy.y, '#00f3ff', 8);
      const angle = Math.atan2(enemy.y - clickY, enemy.x - clickX);
      enemy.x += Math.cos(angle) * 24;
      enemy.y += Math.sin(angle) * 24;
    }
  });
});

function handleGameOver() {
  isGameOver = true;
  crazySdk.gameplayStop();

  audio.playCoreBreach();
  triggerScreenShake(16);

  currentRunShardsEarned = economy.calculateShardPayout(
    waveManager.currentWave,
    killsCount,
    economy.totalEarned
  );
  economy.addShards(currentRunShardsEarned);

  ui.payoutShards.textContent = `+${currentRunShardsEarned}`;
  ui.doubleShardsAmount.textContent = `+${currentRunShardsEarned}`;
  ui.summaryWaves.textContent = waveManager.currentWave;
  ui.summaryEnergy.textContent = Math.floor(economy.totalEarned);
  ui.summaryKills.textContent = killsCount;
  ui.summaryTotalShards.textContent = economy.coreShards;

  if (hasRevivedThisRun) {
    ui.btnRewardedRevive.disabled = true;
    ui.btnRewardedRevive.textContent = 'REVIVE ALREADY USED';
  }

  // Request midgame interstitial ad with audio suspend
  crazySdk.requestMidgameAd({
    adStarted: () => {
      // Audio is paused automatically by SDK or mute
    },
    adFinished: () => {
      ui.gameOverModal.classList.remove('hidden');
    }
  });

  ui.gameOverModal.classList.remove('hidden');
}

// Background Visual Grid and Extraction Veins
function drawBackgroundGridAndVeins(ctx, width, height, dt, energyRate) {
  veinPulseTime += dt * (1.2 + energyRate * 0.08);

  ctx.save();
  const gridSize = 45;
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

// Main Game Loop
function gameLoop(timestamp) {
  const frameStart = performance.now();
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
  lastTimestamp = timestamp;

  // Profiler FPS counter
  frameCount++;
  if (timestamp - lastFpsUpdate >= 500) {
    if (showProfiler) {
      const currentFps = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate));
      const totalEntities = (waveManager ? waveManager.enemies.length : 0) + bullets.length + particles.length;
      ui.perfFps.textContent = currentFps;
      ui.perfEntities.textContent = totalEntities;
    }
    frameCount = 0;
    lastFpsUpdate = timestamp;
  }

  // Screen Shake
  if (screenShake.intensity > 0.1) {
    screenShake.offsetX = (Math.random() - 0.5) * screenShake.intensity;
    screenShake.offsetY = (Math.random() - 0.5) * screenShake.intensity;
    screenShake.intensity *= screenShake.decay;
  } else {
    screenShake.offsetX = 0;
    screenShake.offsetY = 0;
    screenShake.intensity = 0;
  }

  if (!isGameOver && !isPaused) {
    economy.update(dt);
    core.update(dt);

    if (cryoField) {
      cryoField.update(dt, waveManager.enemies);
    }

    waveManager.update(dt, logicalWidth, logicalHeight, core);
    turret.update(dt, waveManager.enemies, bullets);

    if (teslaCoil) {
      teslaCoil.update(dt, waveManager.enemies);
    }

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

    // Enemy Collisions & Eliminations
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
        killsCount++;
        audio.playExplosion(isBrute);
        if (isBrute) triggerScreenShake(6);
        addFloatingText(enemy.x, enemy.y - 12, `+${enemy.reward}E`, '#ffd000', isBrute);
        createExplosion(enemy.x, enemy.y, enemy.accentColor, 16, isBrute);
        waveManager.enemies.splice(i, 1);
      }
    }

    updateUI();
  }

  // --- RENDERING WITH HIGH-DPI & CAMERA SHAKE ---
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.translate(screenShake.offsetX, screenShake.offsetY);
  ctx.clearRect(-20, -20, logicalWidth + 40, logicalHeight + 40);

  drawBackgroundGridAndVeins(ctx, logicalWidth, logicalHeight, dt, economy.getEnergyRate());

  if (cryoField) {
    cryoField.draw(ctx);
  }

  turret.drawRange(ctx);
  core.draw(ctx);
  turret.draw(ctx);

  if (teslaCoil) {
    teslaCoil.draw(ctx);
  }

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

  if (showProfiler) {
    const renderTime = (performance.now() - frameStart).toFixed(2);
    ui.perfMs.textContent = renderTime;
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

// Start
initGame();