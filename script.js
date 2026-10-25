const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// UI Elements
const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('wave');
const healthEl = document.getElementById('health');
const finalScoreEl = document.getElementById('final-score');
const gameOverScreen = document.getElementById('game-over-screen');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

let score = 0;
let wave = 1;
let gameOver = false;
let gameStarted = false;
let animationId;

// Input Handling
const keys = {};
let mousePos = { x: canvas.width / 2, y: canvas.height / 2 };
let isMouseDown = false;

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mousePos.x = e.clientX - rect.left;
  mousePos.y = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', () => { isMouseDown = true; });
canvas.addEventListener('mouseup', () => { isMouseDown = false; });

// Player Class
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 16;
    this.speed = 4;
    this.health = 100;
    this.angle = 0;
    this.lastShotTime = 0;
    this.shotCooldown = 150; // ms
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Ship Body
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-14, 12);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-14, -12);
    ctx.closePath();
    ctx.fillStyle = '#00ffcc';
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 12;
    ctx.fill();

    ctx.restore();
  }

  update() {
    // Movement
    let dx = 0;
    let dy = 0;

    if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x + dx * this.speed));
    this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y + dy * this.speed));

    // Rotate toward mouse
    this.angle = Math.atan2(mousePos.y - this.y, mousePos.x - this.x);

    // Shooting
    const now = Date.now();
    if ((isMouseDown || keys['Space']) && now - this.lastShotTime > this.shotCooldown) {
      this.shoot();
      this.lastShotTime = now;
    }
  }

  shoot() {
    const tipX = this.x + Math.cos(this.angle) * 20;
    const tipY = this.y + Math.sin(this.angle) * 20;
    bullets.push(new Bullet(tipX, tipY, this.angle));
  }
}

// Projectile Class
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 10;
    this.radius = 3;
    this.toRemove = false;
  }

  draw() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
  }

  update() {
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
      this.toRemove = true;
    }
  }
}

// Enemy Class
class Enemy {
  constructor(x, y, speed, radius, color, health) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.radius = radius;
    this.color = color;
    this.health = health;
    this.toRemove = false;
  }

  draw() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();
  }

  update(player) {
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.x += Math.cos(angle) * this.speed;
    this.y += Math.sin(angle) * this.speed;
  }
}

// Particle Explosion Effect
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = Math.random() * 3 + 1;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = Math.random() * 5 + 1;
    this.alpha = 1;
    this.decay = Math.random() * 0.03 + 0.015;
    this.toRemove = false;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.restore();
  }

  update() {
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
    this.alpha -= this.decay;
    if (this.alpha <= 0) {
      this.toRemove = true;
    }
  }
}

// Game State Containers
let player;
let bullets = [];
let enemies = [];
let particles = [];
let spawnTimer = 0;
let enemiesToSpawn = 10;
let enemiesSpawned = 0;

function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  const buffer = 30;

  if (edge === 0) {
    x = Math.random() * canvas.width;
    y = -buffer;
  } else if (edge === 1) {
    x = canvas.width + buffer;
    y = Math.random() * canvas.height;
  } else if (edge === 2) {
    x = Math.random() * canvas.width;
    y = canvas.height + buffer;
  } else {
    x = -buffer;
    y = Math.random() * canvas.height;
  }

  const speed = 1.2 + Math.random() * 1.5 + wave * 0.15;
  const radius = 12 + Math.random() * 8;
  const colors = ['#ff0055', '#ff5500', '#aa00ff'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const health = radius > 16 ? 2 : 1;

  enemies.push(new Enemy(x, y, speed, radius, color, health));
}

function createExplosion(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
}

function initGame() {
  score = 0;
  wave = 1;
  gameOver = false;
  enemiesSpawned = 0;
  enemiesToSpawn = 10;
  bullets = [];
  enemies = [];
  particles = [];
  player = new Player(canvas.width / 2, canvas.height / 2);

  scoreEl.textContent = score;
  waveEl.textContent = wave;
  healthEl.textContent = player.health;

  gameOverScreen.classList.add('hidden');
  startScreen.classList.add('hidden');
}

function animate() {
  animationId = requestAnimationFrame(animate);

  // Clear Screen with trailing motion blur
  ctx.fillStyle = 'rgba(5, 5, 13, 0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!gameStarted || gameOver) return;

  player.update();
  player.draw();

  // Wave Manager
  spawnTimer++;
  if (spawnTimer % Math.max(30, 90 - wave * 5) === 0 && enemiesSpawned < enemiesToSpawn) {
    spawnEnemy();
    enemiesSpawned++;
  }

  if (enemiesSpawned >= enemiesToSpawn && enemies.length === 0) {
    wave++;
    waveEl.textContent = wave;
    enemiesSpawned = 0;
    enemiesToSpawn = 10 + wave * 5;
    player.health = Math.min(100, player.health + 20);
    healthEl.textContent = player.health;
  }

  // Update Bullets
  bullets.forEach((bullet) => {
    bullet.update();
    bullet.draw();
  });

  // Update Particles
  particles.forEach((particle) => {
    particle.update();
    particle.draw();
  });

  // Update Enemies & Handle Collisions
  enemies.forEach((enemy) => {
    enemy.update(player);
    enemy.draw();

    // Check Player Collision
    const distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (distToPlayer < player.radius + enemy.radius) {
      enemy.toRemove = true;
      player.health -= 15;
      healthEl.textContent = Math.max(0, player.health);
      createExplosion(player.x, player.y, '#ff0055', 15);

      if (player.health <= 0) {
        endGame();
      }
    }

    // Check Bullet Collisions
    bullets.forEach((bullet) => {
      const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
      if (dist < bullet.radius + enemy.radius) {
        bullet.toRemove = true;
        enemy.health -= 1;

        if (enemy.health <= 0) {
          enemy.toRemove = true;
          score += 100;
          scoreEl.textContent = score;
          createExplosion(enemy.x, enemy.y, enemy.color, 16);
        } else {
          createExplosion(bullet.x, bullet.y, '#00ffff', 4);
        }
      }
    });
  });

  // Cleanup marked items
  bullets = bullets.filter((b) => !b.toRemove);
  enemies = enemies.filter((e) => !e.toRemove);
  particles = particles.filter((p) => !p.toRemove);
}

function endGame() {
  gameOver = true;
  finalScoreEl.textContent = score;
  gameOverScreen.classList.remove('hidden');
}

startBtn.addEventListener('click', () => {
  gameStarted = true;
  initGame();
  animate();
});

restartBtn.addEventListener('click', () => {
  initGame();
});