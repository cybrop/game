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
import { ParticleSystem } from './systems/ParticleSystem.js';
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
export const particleSystem = new ParticleSystem();

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
let floatingTexts = [];

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

export function createExplosion(worldX, worldY, worldZ = 12, color = '#ff0055', count = 16, isHeavy = false) {
  particleSystem.emitExplosion(worldX, worldY, worldZ, color, count, isHeavy);
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
      waveManager.enemies.forEach(e => {
        particleSystem.emitExplosion(e.x, e.y, e.height, e.accentColor, 14, false);
        e.takeDamage(999);
      });
      bullets = [];

      gameOverModal.hide();
      audio.playShockwave();
      particleSystem.emitShockwave(0, 0, 140, '#00f3ff');
      triggerScreenShake(14);
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
  particleSystem.reset();

  const baseHp = CONFIG.CORE.BASE_HP + economy.meta.baseHp * CONFIG.CORE.HP_PER_META_LEVEL;
  const baseDamage = CONFIG.TURRET.BASE_DAMAGE + economy.meta.baseDamage * CONFIG.TURRET.DAMAGE_PER_META_LEVEL;

  core = new Core(0, 0, baseHp);
  turret = new Turret(0, 0, baseDamage);

  teslaCoil = economy.meta.unlockTesla ? new TeslaCoil(0, 0) : null;
  cryoField = economy.meta.unlockCryo ? new CryoField(0, 0) : null;

  waveManager = new WaveManager();

  bullets = [];
  floatingTexts = [];

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

  const worldPos = Isometric.screenToWorld(screenClickX, screenClickY, originX, originY, 0);

  audio.playShockwave();
  triggerScreenShake(7);

  // Emit 2.5D floor shockwave on world position
  particleSystem.emitShockwave(worldPos.x, worldPos.y, CONFIG.STRIKE.RADIUS, '#00f3ff');

  const strikeDamage = Math.round(turret.damage * CONFIG.STRIKE.DAMAGE_FACTOR);
  waveManager.enemies.forEach((enemy) => {
    const dist = Math.hypot(enemy.x - worldPos.x, enemy.y - worldPos.y);
    if (dist < CONFIG.STRIKE.RADIUS) {
      enemy.takeDamage(strikeDamage);
      const enemyScreen = Isometric.worldToScreen(enemy.x, enemy.y, enemy.height + 4, originX, originY);
      addFloatingText(enemyScreen.x, enemyScreen.y, `-${strikeDamage}`, '#00ffcc', true);
      particleSystem.emitSparks(enemy.x, enemy.y, enemy.height, '#00f3ff', 8);

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
    particleSystem.update(dt);

    const originX = logicalWidth / 2;
    const originY = logicalHeight / 2 + 30;

    if (cryoField) cryoField.update(dt, waveManager.enemies);
    waveManager.update(dt, logicalWidth, logicalHeight, core);
    turret.update(dt, waveManager.enemies, bullets);
    if (teslaCoil) teslaCoil.update(dt, waveManager.enemies);

    // Update 3D Projectiles
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.update(dt);

      let hit = false;
      for (let j = 0; j < waveManager.enemies.length; j++) {
        const enemy = waveManager.enemies[j];
        const dist2D = Math.hypot(b.x - enemy.x, b.y - enemy.y);
        const heightMatch = b.z <= enemy.height + 8 && b.z >= 0;

        if (dist2D < b.radius + enemy.radius && heightMatch) {
          enemy.takeDamage(b.damage);
          audio.playImpact();

          const enemyScreen = Isometric.worldToScreen(enemy.x, enemy.y, b.z, originX, originY);
          addFloatingText(enemyScreen.x, enemyScreen.y, `-${b.damage}`, '#ff0077');
          particleSystem.emitSparks(b.x, b.y, b.z, '#00f3ff', 6, b.angle + Math.PI);
          hit = true;
          break;
        }
      }

      if (hit || b.isOffscreen()) {
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

        const coreScreen = Isometric.worldToScreen(core.x, core.y, 35, originX, originY);
        particleSystem.emitExplosion(enemy.x, enemy.y, enemy.height, '#ff3344', 20, isBrute);
        particleSystem.emitShockwave(core.x, core.y, 40, '#ff3344');
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

        const enemyScreen = Isometric.worldToScreen(enemy.x, enemy.y, enemy.height, originX, originY);
        addFloatingText(enemyScreen.x, enemyScreen.y - 10, `+${enemy.reward}E`, '#ffd000', isBrute);
        particleSystem.emitExplosion(enemy.x, enemy.y, enemy.height, enemy.accentColor, 16, isBrute);
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
    particleSystem,
    floatingTexts
  });

  const totalEntities = (waveManager ? waveManager.enemies.length : 0) + bullets.length + particleSystem.getActiveCount();
  profiler.update(timestamp, totalEntities, performance.now() - frameStart);
}

const loop = new GameLoop(update, render);

initGame();