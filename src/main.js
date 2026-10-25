import { CONFIG } from './config.js';
import { GameState } from './core/GameState.js';
import { GameLoop } from './core/Loop.js';
import { Isometric } from './core/Isometric.js';
import { Renderer } from './core/Renderer.js';
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
export const renderer = new Renderer(canvas, ctx);

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

function resizeCanvas() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  dpr = window.devicePixelRatio || 1;
  logicalWidth = container.clientWidth;
  logicalHeight = container.clientHeight;

  canvas.width = Math.floor(logicalWidth * dpr);
  canvas.height = Math.floor(logicalHeight * dpr);
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
      teslaCoil = new TeslaCoil(0, 0);
    } else if (type === 'unlockCryo' && !cryoField) {
      cryoField = new CryoField(0, 0);
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

  const currentShards = economy.coreShards;
  const currentMeta = { ...economy.meta };

  economy = new Economy();
  economy.coreShards = currentShards;
  economy.meta = currentMeta;

  gameState.reset();

  const baseHp = CONFIG.CORE.BASE_HP + economy.meta.baseHp * CONFIG.CORE.HP_PER_META_LEVEL;
  const baseDamage = CONFIG.TURRET.BASE_DAMAGE + economy.meta.baseDamage * CONFIG.TURRET.DAMAGE_PER_META_LEVEL;

  // In Isometric coordinate space, Core is situated at ground origin (0, 0)
  core = new Core(0, 0, baseHp);
  turret = new Turret(0, 0, baseDamage);

  teslaCoil = economy.meta.unlockTesla ? new TeslaCoil(0, 0) : null;
  cryoField = economy.meta.unlockCryo ? new CryoField(0, 0) : null;

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

// User Strike using Isometric Inverse Raycast
canvas.addEventListener('pointerdown', (e) => {
  if (gameState.isGameOver || gameState.isPaused) return;
  audio.init();

  const rect = canvas.getBoundingClientRect();
  const screenClickX = (e.clientX - rect.left) * (logicalWidth / rect.width);
  const screenClickY = (e.clientY - rect.top) * (logicalHeight / rect.height);

  const originX = logicalWidth / 2;
  const originY = logicalHeight / 2 + 30;

  // Map 2D screen coordinate to 2.5D World ground coordinate
  const worldPos = Isometric.screenToWorld(screenClickX, screenClickY, originX, originY, 0);

  audio.playShockwave();
  triggerScreenShake(7);

  shockwaves.push({
    x: screenClickX,
    y: screenClickY,
    radius: 6,
    maxRadius: CONFIG.STRIKE.RADIUS,
    alpha: 1
  });

  const strikeDamage = Math.round(turret.damage * CONFIG.STRIKE.DAMAGE_FACTOR);
  waveManager.enemies.forEach((enemy) => {
    const dist = Math.hypot(enemy.x - worldPos.x, enemy.y - worldPos.y);
    if (dist < CONFIG.STRIKE.RADIUS) {
      enemy.takeDamage(strikeDamage);
      const enemyScreen = Isometric.worldToScreen(enemy.x, enemy.y, 16, originX, originY);
      addFloatingText(enemyScreen.x, enemyScreen.y, `-${strikeDamage}`, '#00ffcc', true);
      createExplosion(enemyScreen.x, enemyScreen.y, '#00f3ff', 8);

      const angle = Math.atan2(enemy.y - worldPos.y, enemy.x - worldPos.x);
      enemy.x += Math.cos(angle) * CONFIG.STRIKE.KNOCKBACK;
      enemy.y += Math.sin(angle) * CONFIG.STRIKE.KNOCKBACK;
    }
  });
});

// Physics & State Pipeline
function update(dt, timestamp) {
  gameState.updateShake();

  if (!gameState.isGameOver && !gameState.isPaused) {
    economy.update(dt);
    core.update(dt);

    const originX = logicalWidth / 2;
    const originY = logicalHeight / 2 + 30;

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

          const enemyScreen = Isometric.worldToScreen(enemy.x, enemy.y, 14, originX, originY);
          addFloatingText(enemyScreen.x, enemyScreen.y, `-${b.damage}`, '#ff0077');
          createExplosion(enemyScreen.x, enemyScreen.y, '#00f3ff', 6);
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

        const enemyScreen = Isometric.worldToScreen(enemy.x, enemy.y, 12, originX, originY);
        const coreScreen = Isometric.worldToScreen(core.x, core.y, 25, originX, originY);

        createExplosion(enemyScreen.x, enemyScreen.y, '#ff3344', 20, isBrute);
        addFloatingText(coreScreen.x, coreScreen.y - 15, `-${enemy.damage} HP`, '#ff3344', true);
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

        const enemyScreen = Isometric.worldToScreen(enemy.x, enemy.y, 14, originX, originY);
        addFloatingText(enemyScreen.x, enemyScreen.y - 10, `+${enemy.reward}E`, '#ffd000', isBrute);
        createExplosion(enemyScreen.x, enemyScreen.y, enemy.accentColor, 16, isBrute);
        waveManager.enemies.splice(i, 1);
      }
    }

    syncAllUI();
  }
}

// Render Pass Pipeline
function render(dt, timestamp) {
  const frameStart = performance.now();

  renderer.renderScene({
    dpr,
    logicalWidth,
    logicalHeight,
    dt,
    energyRate: economy.getEnergyRate(),
    shake: gameState.screenShake,
    core,
    turret,
    teslaCoil,
    cryoField,
    waveManager,
    bullets,
    particles,
    floatingTexts,
    shockwaves
  });

  const totalEntities = (waveManager ? waveManager.enemies.length : 0) + bullets.length + particles.length;
  profiler.update(timestamp, totalEntities, performance.now() - frameStart);
}

const loop = new GameLoop(update, render);

initGame();