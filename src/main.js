import { Core } from './core/Core.js';
import { InputHandler } from './core/Input.js';
import { Turret } from './entities/Turret.js';
import { Enemy } from './entities/Enemy.js';
import { Bullet } from './entities/Bullet.js';
import { WaveSystem } from './systems/Waves.js';
import { Economy } from './systems/Economy.js';
import { StorageManager } from './systems/Storage.js';
import { AudioSystem } from './systems/Audio.js';
import { CrazyGamesWrapper } from './sdk/crazy.js';

const core = new Core();
const storage = new StorageManager();
const audio = new AudioSystem();
const sdk = new CrazyGamesWrapper();

const arena = document.querySelector('#arena');
const enemyLayer = document.querySelector('#enemy-layer');
const bulletLayer = document.querySelector('#bullet-layer');
const gameOverModal = document.querySelector('#game-over');
const restartButton = document.querySelector('#restart-game');
const drillButton = document.querySelector('#upgrade-drill');
const shieldButton = document.querySelector('#upgrade-shield');
const turretButton = document.querySelector('#upgrade-turret');
const waveButton = document.querySelector('#start-wave');

const stateRefs = {
  ore: document.querySelector('#ore-value'),
  depth: document.querySelector('#depth-value'),
  hp: document.querySelector('#hp-value'),
  shield: document.querySelector('#shield-value'),
  idle: document.querySelector('#idle-income'),
  bestDepth: document.querySelector('#best-depth'),
};

const input = new InputHandler(core, arena);
const turret = new Turret(core, arena, bulletLayer);
const waveSystem = new WaveSystem(core);
const economy = new Economy(core);

const enemies = [];
const bullets = [];

function render(state) {
  stateRefs.ore.textContent = Math.floor(state.ore);
  stateRefs.depth.textContent = `${Math.floor(state.depth)}m`;
  stateRefs.hp.textContent = Math.floor(state.hp);
  stateRefs.shield.textContent = Math.floor(state.shields);
  stateRefs.idle.textContent = `${state.idleIncome}/s`;
  stateRefs.bestDepth.textContent = `${Math.floor(state.bestDepth)}m`;

  if (state.gameOver) {
    gameOverModal.classList.remove('hidden');
  }
}

function spawnEnemyPattern() {
  const rect = arena.getBoundingClientRect();
  const count = Math.min(4 + core.state.depth / 35, 12);

  for (let i = 0; i < count; i++) {
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;

    if (edge === 0) {
      x = Math.random() * rect.width;
      y = -20;
    } else if (edge === 1) {
      x = rect.width + 20;
      y = Math.random() * rect.height;
    } else if (edge === 2) {
      x = Math.random() * rect.width;
      y = rect.height + 20;
    } else {
      x = -20;
      y = Math.random() * rect.height;
    }

    const enemy = new Enemy(x, y, 14, 0.7 + core.state.depth * 0.01, 22 + core.state.depth * 0.8, 8);
    enemies.push(enemy);
    enemyLayer.appendChild(enemy.element);
  }
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.update(dt);

    for (let j = enemies.length - 1; j >= 0; j -= 1) {
      const enemy = enemies[j];
      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      const dist = Math.hypot(dx, dy);

      if (dist < bullet.radius + enemy.radius) {
        enemy.hp -= bullet.damage;
        bullet.destroy();
        bullets.splice(i, 1);

        if (enemy.hp <= 0) {
          enemy.element.remove();
          enemies.splice(j, 1);
          core.addOre(enemy.reward);
          audio.beep(900, 0.05, 'triangle', 0.02);
        }
        break;
      }
    }

    if (bullets[i] && (bullets[i].x < -10 || bullets[i].x > arena.clientWidth + 10 || bullets[i].y < -10 || bullets[i].y > arena.clientHeight + 10)) {
      bullets[i].destroy();
      bullets.splice(i, 1);
    }
  }
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.update(dt);

    const centerX = arena.clientWidth / 2;
    const centerY = arena.clientHeight / 2;
    const distance = Math.hypot(enemy.x - centerX, enemy.y - centerY);

    if (distance < 30) {
      const damage = 8 + Math.floor(core.state.depth / 15);
      core.damage(damage);
      enemy.element.remove();
      enemies.splice(i, 1);
      audio.beep(120, 0.1, 'square', 0.015);
    }
  }
}

function fireTurret(dt) {
  if (!enemies.length) return;

  const target = enemies.reduce((best, enemy) => {
    if (!best) return enemy;
    const bestDist = Math.hypot(best.x - arena.clientWidth / 2, best.y - arena.clientHeight / 2);
    const enemyDist = Math.hypot(enemy.x - arena.clientWidth / 2, enemy.y - arena.clientHeight / 2);
    return enemyDist < bestDist ? enemy : best;
  }, null);

  if (!target) return;

  const angle = Math.atan2(target.y - arena.clientHeight / 2, target.x - arena.clientWidth / 2);
  const bullet = new Bullet(arena.clientWidth / 2, arena.clientHeight / 2, Math.cos(angle) * 7, Math.sin(angle) * 7, 10 + core.state.turretLevel * 4);
  bullets.push(bullet);
}

let last = performance.now();
let spawnAccumulator = 0;

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.035);
  last = now;

  if (!core.state.gameOver) {
    spawnAccumulator += dt;
    if (spawnAccumulator > 1.2) {
      spawnEnemyPattern();
      spawnAccumulator = 0;
    }

    turret.update(enemies, dt);
    updateBullets(dt);
    updateEnemies(dt);
    economy.tick();
    core.tickIdle();
  }

  render(core.state);
  requestAnimationFrame(loop);
}

core.subscribe(render);

drillButton.addEventListener('click', () => core.upgradeDrill());
shieldButton.addEventListener('click', () => core.upgradeShield());
turretButton.addEventListener('click', () => core.upgradeTurret());
waveButton.addEventListener('click', () => {
  waveSystem.startWave();
  spawnEnemyPattern();
});

restartButton.addEventListener('click', () => {
  gameOverModal.classList.add('hidden');
  core.state.gameOver = false;
  core.state.hp = 100;
  core.state.shields = 0;
  core.state.ore = 0;
  core.state.depth = 0;
  core.notify();
  enemies.length = 0;
  bullets.length = 0;
  enemyLayer.innerHTML = '';
  bulletLayer.innerHTML = '';
});

const saved = storage.load();
if (saved.bestDepth) {
  core.state.bestDepth = saved.bestDepth;
}

core.subscribe((state) => {
  storage.save({ bestDepth: state.bestDepth });
});

requestAnimationFrame(loop);
