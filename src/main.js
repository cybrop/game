import { CONFIG } from './config.js';
import { GameState } from './core/GameState.js';
import { GameLoop } from './core/Loop.js';
import { Isometric } from './core/Isometric.js';
import { Renderer } from './core/Renderer.js';
import { Core } from './core/Core.js';
import { Turret } from './entities/Turret.js';
import { TeslaCoil } from './entities/TeslaCoil.js';
import { CryoField } from './entities/CryoField.js';
import { GolemGuard } from './entities/GolemGuard.js';
import { TNTBlock } from './entities/TNTBlock.js';
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
let golemGuards = [];
let tntBlocks = [];
let economy = new Economy();
let waveManager;
let bullets = [];
let floatingTexts = [];

// Boss HUD Elements
const bossHud = document.getElementById('boss-hud-bar');
const bossHpFill = document.getElementById('boss-hp-fill');
const bossName = document.getElementById('boss-name');

let uiSyncTimer = 0;
const UI_SYNC_INTERVAL = 0.1;
const MAX_FLOATING_TEXTS = 35;

function resizeCanvas() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    life: isCritical ? 0.9 : 0.65
  });
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
    } else if (type === 'golem') {
      // Spawn an Iron Golem Bouncer
      const orbitOffset = (golemGuards.length * Math.PI * 2) / 3;
      golemGuards.push(new GolemGuard(orbitOffset));
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

  // Boss bar synchronization
  if (waveManager && waveManager.activeBoss && !waveManager.activeBoss.isDead()) {
    bossHud.classList.remove('hidden');
    const boss = waveManager.activeBoss;
    const hpPct = Math.max(0, (boss.hp / boss.maxHp) * 100);
    bossHpFill.style.width = `${hpPct}%`;
  } else {
    bossHud.classList.add('hidden');
  }
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
  golemGuards.length = 0;
  tntBlocks.length = 0;

  waveManager = new WaveManager();

  bullets.length = 0;
  floatingTexts.length = 0;

  gameOverModal.hide();
  workshopModal.hide();
  bossHud.classList.add('hidden');

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

// User Strike: 3D Dropping TNT Block
canvas.addEventListener('pointerdown', (e) => {
  if (gameState.isGameOver || gameState.isPaused) return;
  audio.init();

  const rect = canvas.getBoundingClientRect();
  const scaleX = logicalWidth / Math.max(1, rect.width);
  const scaleY = logicalHeight / Math.max(1, rect.height);

  const screenClickX = (e.clientX - rect.left) * scaleX;
  const screenClickY = (e.clientY - rect.top) * scaleY;

  const originX = logicalWidth * 0.5;
  const originY = logicalHeight * 0.5 + 30;

  const worldPos = Isometric.screenToWorld(screenClickX, screenClickY, originX, originY, 0);

  // Drop 3D TNT block
  tntBlocks.push(new TNTBlock(worldPos.x, worldPos.y, (tx, ty) => {
    audio.playTNTExplosion(true);
    triggerScreenShake(10);
    particleSystem.emitShockwave(tx, ty, CONFIG.STRIKE.RADIUS, '#d61c1c');
    particleSystem.emitExplosion(tx, ty, 6, '#d62828', 24, true);

    const strikeDamage = Math.round(turret.damage * CONFIG.STRIKE.DAMAGE_FACTOR * 1.3);
    const strikeRadiusSq = CONFIG.STRIKE.RADIUS * CONFIG.STRIKE.RADIUS;

    for (let i = 0; i < waveManager.enemies.length; i++) {
      const enemy = waveManager.enemies[i];
      const dx = enemy.x - tx;
      const dy = enemy.y - ty;

      if (dx * dx + dy * dy < strikeRadiusSq) {
        enemy.takeDamage(strikeDamage);
        audio.playMobDamage(enemy.type === 'brute' || enemy.type === 'boss');

        const enemyScreen = Isometric.worldToScreen(enemy.x, enemy.y, enemy.height + 4, originX, originY);
        addFloatingText(enemyScreen.x, enemyScreen.y, `-${strikeDamage}`, '#ff3838', true);
        particleSystem.emitSparks(enemy.x, enemy.y, enemy.height, '#d61c1c', 8);

        const angle = Math.atan2(dy, dx);
        enemy.x += Math.cos(angle) * CONFIG.STRIKE.KNOCKBACK * 1.5;
        enemy.y += Math.sin(angle) * CONFIG.STRIKE.KNOCKBACK * 1.5;
      }
    }
  }));
});

// Physics & State Pipeline
function update(dt, timestamp) {
  gameState.updateShake();

  if (!gameState.isGameOver && !gameState.isPaused) {
    economy.update(dt);
    core.update(dt);
    particleSystem.update(dt);

    const originX = logicalWidth * 0.5;
    const originY = logicalHeight * 0.5 + 30;

    // Soul Frost expansion: emit blue soul fire embers
    if (cryoField) {
      cryoField.update(dt, waveManager.enemies);
      if (Math.random() < 0.2) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * cryoField.radius;
        particleSystem.emitSparks(Math.cos(angle) * dist, Math.sin(angle) * dist, 4, '#32d6d6', 2);
      }
    }

    // Update Wave Manager with mob hooks
    waveManager.update(
      dt, logicalWidth, logicalHeight, core, bullets,
      (creeper) => {
        // Creeper detonation callback
        audio.playTNTExplosion(true);
        triggerScreenShake(9);
        particleSystem.emitExplosion(creeper.x, creeper.y, creeper.height, '#52b788', 22, true);
        particleSystem.emitShockwave(creeper.x, creeper.y, 60, '#ff4444');
        core.takeDamage(creeper.damage);
        addFloatingText(0, -20, `-${creeper.damage} HP`, '#ff0000', true);
        if (core.isDestroyed()) handleGameOver();
      },
      audio
    );

    // Turret with Multishot support
    turret.update(dt, waveManager.enemies, bullets, economy.meta.multishot);

    if (teslaCoil) teslaCoil.update(dt, waveManager.enemies);

    // Golem Guards
    for (let i = 0; i < golemGuards.length; i++) {
      golemGuards[i].update(dt, waveManager.enemies, audio, (enemy, dmg) => {
        const eScreen = Isometric.worldToScreen(enemy.x, enemy.y, enemy.height + 4, originX, originY);
        addFloatingText(eScreen.x, eScreen.y, `-${dmg}`, '#ffffff');
        particleSystem.emitSparks(enemy.x, enemy.y, enemy.height, '#ced4da', 6);
      });
    }

    // 3D TNT Blocks
    for (let i = tntBlocks.length - 1; i >= 0; i--) {
      const tnt = tntBlocks[i];
      tnt.update(dt);
      if (tnt.detonated) {
        const last = tntBlocks.pop();
        if (i < tntBlocks.length) tntBlocks[i] = last;
      }
    }

    // Projectiles
    const eLen = waveManager.enemies.length;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.update(dt);

      let hit = false;
      const bRad = b.radius;

      // Enemy skeleton arrows hitting Core
      if (b.isEnemyBullet) {
        const dx = b.x - core.x;
        const dy = b.y - core.y;
        if (dx * dx + dy * dy < core.radius * core.radius && b.z <= 40) {
          core.takeDamage(b.damage);
          audio.playImpact();
          triggerScreenShake(4);
          addFloatingText(0, -20, `-${b.damage} HP`, '#ff5555');
          hit = true;
        }
      } else {
        // Player arrows hitting mobs
        for (let j = 0; j < eLen; j++) {
          const enemy = waveManager.enemies[j];
          const dx = b.x - enemy.x;
          const dy = b.y - enemy.y;
          const rSum = bRad + enemy.radius;

          if (dx * dx + dy * dy < rSum * rSum && b.z <= enemy.height + 10 && b.z >= 0) {
            enemy.takeDamage(b.damage);

            // Flame I Enchantment: ignite mob
            if (economy.meta.flame) {
              enemy.applyBurn(3.0);
            }

            audio.playMobDamage(enemy.type === 'brute' || enemy.type === 'boss');

            const enemyScreen = Isometric.worldToScreen(enemy.x, enemy.y, b.z, originX, originY);
            addFloatingText(enemyScreen.x, enemyScreen.y, `-${b.damage}`, economy.meta.flame ? '#ff9900' : '#ff4444');
            particleSystem.emitSparks(b.x, b.y, b.z, '#8f5c2c', 6, b.angle + Math.PI);
            hit = true;
            break;
          }
        }
      }

      if (hit || b.isOffscreen()) {
        if (!hit && b.z <= 0) audio.playImpact();
        const lastBullet = bullets.pop();
        if (i < bullets.length) bullets[i] = lastBullet;
      }
    }

    // Mob Core Contact & Elimination
    const coreR = core.radius;
    for (let i = waveManager.enemies.length - 1; i >= 0; i--) {
      const enemy = waveManager.enemies[i];
      const rSum = coreR + enemy.radius;
      const distSq = enemy.x * enemy.x + enemy.y * enemy.y;

      if (distSq < rSum * rSum) {
        core.takeDamage(enemy.damage);

        // Thorns Enchantment: reflect damage back to attacking mob
        if (economy.meta.thorns) {
          const reflectDmg = Math.round(enemy.damage * 0.75);
          enemy.takeDamage(reflectDmg);
          const eScreen = Isometric.worldToScreen(enemy.x, enemy.y, enemy.height, originX, originY);
          addFloatingText(eScreen.x, eScreen.y, `THORNS -${reflectDmg}`, '#55ff55');
        }

        const isHeavy = enemy.type === 'brute' || enemy.type === 'boss';
        audio.playTNTExplosion(isHeavy);
        triggerScreenShake(isHeavy ? 14 : 7);

        const coreScreen = Isometric.worldToScreen(core.x, core.y, 35, originX, originY);
        particleSystem.emitExplosion(enemy.x, enemy.y, enemy.height, '#707070', 20, isHeavy);
        particleSystem.emitShockwave(core.x, core.y, 40, '#d61c1c');
        addFloatingText(coreScreen.x, coreScreen.y - 15, `-${enemy.damage} HP`, '#ff3838', true);

        const lastEnemy = waveManager.enemies.pop();
        if (i < waveManager.enemies.length) waveManager.enemies[i] = lastEnemy;

        if (core.isDestroyed()) {
          handleGameOver();
          break;
        }
        continue;
      }

      if (enemy.isDead()) {
        const isHeavy = enemy.type === 'brute' || enemy.type === 'boss';
        economy.addEnergy(enemy.reward);
        gameState.kills++;
        audio.playMobDamage(isHeavy);
        if (isHeavy) triggerScreenShake(6);

        const enemyScreen = Isometric.worldToScreen(enemy.x, enemy.y, enemy.height, originX, originY);
        addFloatingText(enemyScreen.x, enemyScreen.y - 10, `+${enemy.reward} R`, '#d61c1c', isHeavy);
        particleSystem.emitExplosion(enemy.x, enemy.y, enemy.height, enemy.accentColor, 16, isHeavy);

        const lastEnemy = waveManager.enemies.pop();
        if (i < waveManager.enemies.length) waveManager.enemies[i] = lastEnemy;
      }
    }

    uiSyncTimer += dt;
    if (uiSyncTimer >= UI_SYNC_INTERVAL) {
      uiSyncTimer = 0;
      syncAllUI();
    }
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
    floatingTexts,
    golemGuards,
    tntBlocks
  });

  const renderTime = performance.now() - frameStart;
  const swarmCount = waveManager ? waveManager.enemies.length : 0;
  const particleCount = particleSystem.getActiveCount();

  profiler.update(timestamp, swarmCount, particleCount, renderTime);
}

const loop = new GameLoop(update, render);

initGame();