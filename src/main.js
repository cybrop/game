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

const MAX_FLOATING_TEXTS = 40;

function resizeCanvas() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  dpr = window.devicePixelRatio || 1;
  logicalWidth = container.clientWidth;
  logicalHeight = container.clientHeight;

  canvas.width = Math.floor(logicalWidth * dpr);
  canvas.height = Math.floor(logicalHeight * dpr);

  renderer.invalidateTerrain();
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

export function addFloatingText(x, y, text, color = '#ffffff', isCritical = false) {
  if (floatingTexts.length >= MAX_FLOATING_TEXTS) {
    floatingTexts.shift();
  }

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

export function createExplosion(worldX, worldY, worldZ = 12, color = '#d61c1c', count = 16, isHeavy = false) {
  particleSystem.emitExplosion(worldX, worldY, worldZ, color, count, isHeavy);
}

function handleBuyInRunUpgrade(type) {
  if (economy.buyUpgrade(type)) {
    audio.playAnvil();
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
    audio.playAnvil();
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
      audio.playAnvil();
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
      for (let i = 0; i < waveManager.enemies.length; i++) {
        const e = waveManager.enemies[i];
        particleSystem.emitExplosion(e.x, e.y, e.height, e.accentColor, 14, false);
        e.takeDamage(999);
      }
      bullets.length = 0;

      gameOverModal.hide();
      audio.playTotemRevive();
      particleSystem.emitShockwave(0, 0, 140, '#28e05c');
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
  audio.playBeaconDestroyed();
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

// User Strike: TNT Orbital Drop with fast squared distance test
canvas.addEventListener('pointerdown', (e) => {
  if (gameState.isGameOver || gameState.isPaused) return;
  audio.init();

  const rect = canvas.getBoundingClientRect();
  const scaleX = logicalWidth / Math.max(1, rect.width);
  const scaleY = logicalHeight / Math.max(1, rect.height);

  const screenClickX = (e.clientX - rect.left) * scaleX;
  const screenClickY = (e.clientY - rect.top) * scaleY;

  const originX = logicalWidth / 2;
  const originY = logicalHeight / 2 + 30;

  const worldPos = Isometric.screenToWorld(screenClickX, screenClickY, originX, originY, 0);

  audio.playTNTExplosion(true);
  triggerScreenShake(8);

  particleSystem.emitShockwave(worldPos.x, worldPos.y, CONFIG.STRIKE.RADIUS, '#d61c1c');

  const strikeDamage = Math.round(turret.damage * CONFIG.STRIKE.DAMAGE_FACTOR);
  const strikeRadiusSq = CONFIG.STRIKE.RADIUS * CONFIG.STRIKE.RADIUS;

  for (let i = 0; i < waveManager.enemies.length; i++) {
    const enemy = waveManager.enemies[i];
    const dx = enemy.x - worldPos.x;
    const dy = enemy.y - worldPos.y;

    if (dx * dx + dy * dy < strikeRadiusSq) {
      enemy.takeDamage(strikeDamage);
      audio.playMobDamage(enemy.type === 'brute');

      const enemyScreen = Isometric.worldToScreen(enemy.x, enemy.y, enemy.height + 4, originX, originY);
      addFloatingText(enemyScreen.x, enemyScreen.y, `-${strikeDamage}`, '#ff3838', true);
      particleSystem.emitSparks(enemy.x, enemy.y, enemy.height, '#d61c1c', 8);

      const angle = Math.atan2(dy, dx);
      enemy.x += Math.cos(angle) * CONFIG.STRIKE.KNOCKBACK;
      enemy.y += Math.sin(angle) * CONFIG.STRIKE.KNOCKBACK;
    }
  }
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

    // Fast squared-distance 3D projectile collision checks
    const eLen = waveManager.enemies.length;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.update(dt);

      let hit = false;
      for (let j = 0; j < eLen; j++) {
        const enemy = waveManager.enemies[j];
        const dx = b.x - enemy.x;
        const dy = b.y - enemy.y;
        const rSum = b.radius + enemy.radius;

        if (dx * dx + dy * dy < rSum * rSum && b.z <= enemy.height + 8 && b.z >= 0) {
          enemy.takeDamage(b.damage);
          audio.playMobDamage(enemy.type === 'brute');

          const enemyScreen = Isometric.worldToScreen(enemy.x, enemy.y, b.z, originX, originY);
          addFloatingText(enemyScreen.x, enemyScreen.y, `-${b.damage}`, '#ff4444');
          particleSystem.emitSparks(b.x, b.y, b.z, '#8f5c2c', 6, b.angle + Math.PI);
          hit = true;
          break;
        }
      }

      if (hit || b.isOffscreen()) {
        if (!hit && b.z <= 0) {
          audio.playImpact();
        }
        bullets.splice(i, 1);
      }
    }

    // Fast squared-distance Core collisions & enemy death processing
    const coreR = core.radius;
    for (let i = waveManager.enemies.length - 1; i >= 0; i--) {
      const enemy = waveManager.enemies[i];
      const rSum = coreR + enemy.radius;
      const distSq = enemy.x * enemy.x + enemy.y * enemy.y;

      if (distSq < rSum * rSum) {
        core.takeDamage(enemy.damage);
        const isBrute = enemy.type === 'brute';
        audio.playTNTExplosion(isBrute);
        triggerScreenShake(isBrute ? 12 : 7);

        const coreScreen = Isometric.worldToScreen(core.x, core.y, 35, originX, originY);
        particleSystem.emitExplosion(enemy.x, enemy.y, enemy.height, '#707070', 20, isBrute);
        particleSystem.emitShockwave(core.x, core.y, 40, '#d61c1c');
        addFloatingText(coreScreen.x, coreScreen.y - 15, `-${enemy.damage} HP`, '#ff3838', true);
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
        audio.playMobDamage(isBrute);
        if (isBrute) triggerScreenShake(6);

        const enemyScreen = Isometric.worldToScreen(enemy.x, enemy.y, enemy.height, originX, originY);
        addFloatingText(enemyScreen.x, enemyScreen.y - 10, `+${enemy.reward} R`, '#d61c1c', isBrute);
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

  const renderTime = performance.now() - frameStart;
  const swarmCount = waveManager ? waveManager.enemies.length : 0;
  const particleCount = particleSystem.getActiveCount();

  profiler.update(timestamp, swarmCount, particleCount, renderTime);
}

const loop = new GameLoop(update, render);

initGame();