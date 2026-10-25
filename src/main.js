import { Core } from './core/Core.js';
import { Turret } from './entities/Turret.js';
import { WaveManager } from './systems/Waves.js';
import { Economy } from './systems/Economy.js';

// Setup Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const container = document.getElementById('canvas-container');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// UI references
const ui = {
  energy: document.getElementById('dark-energy'),
  energyRate: document.getElementById('energy-rate'),
  wave: document.getElementById('wave-counter'),
  waveProgress: document.getElementById('wave-progress'),
  coreHpText: document.getElementById('core-hp-text'),
  kills: document.getElementById('stat-kills'),
  range: document.getElementById('stat-range'),

  // Upgrade labels & buttons
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
  summaryWaves: document.getElementById('summary-waves'),
  summaryEnergy: document.getElementById('summary-energy'),
  summaryKills: document.getElementById('summary-kills'),
  restartBtn: document.getElementById('restart-run-btn')
};

// Game Entities & Systems
let core;
let turret;
let economy;
let waveManager;
let bullets = [];
let particles = [];
let floatingTexts = [];
let shockwaves = [];
let killsCount = 0;
let isGameOver = false;
let lastTimestamp = performance.now();

export function addFloatingText(x, y, text, color = '#00f3ff') {
  floatingTexts.push({
    x,
    y,
    text,
    color,
    alpha: 1,
    life: 0.8
  });
}

export function createExplosion(x, y, color = '#ff0055', count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 1;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      radius: Math.random() * 2.5 + 1,
      alpha: 1,
      decay: Math.random() * 0.03 + 0.02
    });
  }
}

function initGame() {
  resizeCanvas();
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  core = new Core(centerX, centerY);
  turret = new Turret(centerX, centerY);
  economy = new Economy();
  waveManager = new WaveManager();

  bullets = [];
  particles = [];
  floatingTexts = [];
  shockwaves = [];
  killsCount = 0;
  isGameOver = false;

  ui.gameOverModal.classList.add('hidden');
  updateUI();
}

function updateUI() {
  // Stats & Resources
  ui.energy.textContent = Math.floor(economy.energy);
  ui.energyRate.textContent = economy.getEnergyRate().toFixed(1);
  ui.wave.textContent = waveManager.currentWave;
  ui.coreHpText.textContent = `${Math.max(0, Math.ceil(core.currentHp))} / ${core.maxHp}`;
  ui.kills.textContent = killsCount;
  ui.range.textContent = `${turret.range}px`;

  // Wave status
  if (waveManager.isIntermission) {
    ui.waveProgress.textContent = `Next wave in ${(waveManager.intermissionTimer).toFixed(1)}s`;
  } else {
    ui.waveProgress.textContent = `Enemies: ${waveManager.enemies.length + (waveManager.enemiesToSpawn - waveManager.enemiesSpawned)}`;
  }

  // Damage
  const damageCost = economy.getUpgradeCost('damage');
  ui.lvlDamage.textContent = economy.upgrades.damage;
  ui.valDamage.textContent = turret.damage;
  ui.costDamage.textContent = damageCost;
  ui.btnDamage.disabled = economy.energy < damageCost;

  // Fire Rate
  const firerateCost = economy.getUpgradeCost('firerate');
  ui.lvlFirerate.textContent = economy.upgrades.firerate;
  ui.valFirerate.textContent = (turret.fireCooldown / 1000).toFixed(2);
  ui.costFirerate.textContent = firerateCost;
  ui.btnFirerate.disabled = economy.energy < firerateCost;

  // Core Health
  const healthCost = economy.getUpgradeCost('health');
  ui.lvlHealth.textContent = economy.upgrades.health;
  ui.valHealth.textContent = core.maxHp;
  ui.costHealth.textContent = healthCost;
  ui.btnHealth.disabled = economy.energy < healthCost;

  // Extractor Yield
  const yieldCost = economy.getUpgradeCost('yield');
  ui.lvlYield.textContent = economy.upgrades.yield;
  ui.valYield.textContent = economy.getEnergyRate().toFixed(1);
  ui.costYield.textContent = yieldCost;
  ui.btnYield.disabled = economy.energy < yieldCost;
}

// Upgrade Event Handlers
ui.btnDamage.addEventListener('click', () => {
  if (economy.buyUpgrade('damage')) {
    turret.damage = Math.round(15 * Math.pow(1.22, economy.upgrades.damage - 1));
    updateUI();
  }
});

ui.btnFirerate.addEventListener('click', () => {
  if (economy.buyUpgrade('firerate')) {
    turret.fireCooldown = Math.max(120, Math.round(450 * Math.pow(0.9, economy.upgrades.firerate - 1)));
    updateUI();
  }
});

ui.btnHealth.addEventListener('click', () => {
  if (economy.buyUpgrade('health')) {
    const oldMax = core.maxHp;
    core.maxHp = Math.round(100 * Math.pow(1.25, economy.upgrades.health - 1));
    core.heal(core.maxHp - oldMax);
    updateUI();
  }
});

ui.btnYield.addEventListener('click', () => {
  if (economy.buyUpgrade('yield')) {
    updateUI();
  }
});

ui.restartBtn.addEventListener('click', () => {
  initGame();
});

// Click assistance: Orbital shockwave on user tap/click
canvas.addEventListener('pointerdown', (e) => {
  if (isGameOver) return;
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  shockwaves.push({
    x: clickX,
    y: clickY,
    radius: 5,
    maxRadius: 65,
    alpha: 1
  });

  // Damage and knockback nearby enemies
  waveManager.enemies.forEach((enemy) => {
    const dist = Math.hypot(enemy.x - clickX, enemy.y - clickY);
    if (dist < 65) {
      const dmg = Math.round(turret.damage * 0.75);
      enemy.takeDamage(dmg);
      addFloatingText(enemy.x, enemy.y, `-${dmg}`, '#00ffcc');
      // Knockback
      const angle = Math.atan2(enemy.y - clickY, enemy.x - clickX);
      enemy.x += Math.cos(angle) * 20;
      enemy.y += Math.sin(angle) * 20;
    }
  });
});

function handleGameOver() {
  isGameOver = true;
  ui.summaryWaves.textContent = waveManager.currentWave;
  ui.summaryEnergy.textContent = Math.floor(economy.totalEarned);
  ui.summaryKills.textContent = killsCount;
  ui.gameOverModal.classList.remove('hidden');
}

// Main Game Loop
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
  lastTimestamp = timestamp;

  if (!isGameOver) {
    // 1. Economy passive generation
    economy.update(dt);

    // 2. Core update
    core.update(dt);

    // 3. Wave & Enemy updates
    waveManager.update(dt, canvas.width, canvas.height, core);

    // 4. Turret auto-targeting and firing
    turret.update(dt, waveManager.enemies, bullets);

    // 5. Update Projectiles
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.update(dt);

      // Check collision against all active enemies
      let hit = false;
      for (let j = 0; j < waveManager.enemies.length; j++) {
        const enemy = waveManager.enemies[j];
        const dist = Math.hypot(b.x - enemy.x, b.y - enemy.y);
        if (dist < b.radius + enemy.radius) {
          enemy.takeDamage(b.damage);
          addFloatingText(enemy.x, enemy.y, `-${b.damage}`, '#ff0055');
          createExplosion(b.x, b.y, '#00f3ff', 5);
          hit = true;
          break;
        }
      }

      if (hit || b.isOffscreen(canvas.width, canvas.height)) {
        bullets.splice(i, 1);
      }
    }

    // 6. Handle dead enemies & core collision
    for (let i = waveManager.enemies.length - 1; i >= 0; i--) {
      const enemy = waveManager.enemies[i];

      // Reached core
      const distToCore = Math.hypot(enemy.x - core.x, enemy.y - core.y);
      if (distToCore < core.radius + enemy.radius) {
        core.takeDamage(enemy.damage);
        createExplosion(enemy.x, enemy.y, '#ff3344', 16);
        addFloatingText(core.x, core.y - 20, `-${enemy.damage} HP`, '#ff3344');
        waveManager.enemies.splice(i, 1);

        if (core.isDestroyed()) {
          handleGameOver();
          break;
        }
        continue;
      }

      // Slain by turret/strike
      if (enemy.isDead()) {
        economy.addEnergy(enemy.reward);
        killsCount++;
        addFloatingText(enemy.x, enemy.y - 10, `+${enemy.reward}E`, '#ffd000');
        createExplosion(enemy.x, enemy.y, enemy.accentColor, 14);
        waveManager.enemies.splice(i, 1);
      }
    }

    updateUI();
  }

  // --- RENDERING ---
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background Grid
  drawGrid(ctx, canvas.width, canvas.height);

  // Core range ring
  turret.drawRange(ctx);

  // Core
  core.draw(ctx);

  // Turret
  turret.draw(ctx);

  // Shockwaves
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    sw.radius += (sw.maxRadius - sw.radius) * 0.2;
    sw.alpha -= 0.05;
    ctx.save();
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 243, 255, ${Math.max(0, sw.alpha)})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    if (sw.alpha <= 0) shockwaves.splice(i, 1);
  }

  // Enemies
  waveManager.enemies.forEach((enemy) => enemy.draw(ctx));

  // Bullets
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
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Floating text indicators
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y -= 25 * dt;
    ft.alpha -= dt / ft.life;

    if (ft.alpha <= 0) {
      floatingTexts.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.font = 'bold 12px Consolas, monospace';
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x - 10, ft.y);
    ctx.restore();
  }

  requestAnimationFrame(gameLoop);
}

function drawGrid(ctx, width, height) {
  const gridSize = 40;
  ctx.save();
  ctx.strokeStyle = 'rgba(26, 34, 62, 0.4)';
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
  ctx.restore();
}

// Launch
initGame();
requestAnimationFrame(gameLoop);