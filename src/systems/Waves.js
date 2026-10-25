import { Enemy } from '../entities/Enemy.js';

export class WaveManager {
  constructor() {
    this.currentWave = 1;
    this.enemies = [];
    this.enemiesToSpawn = 8;
    this.enemiesSpawned = 0;
    this.spawnInterval = 1.1;
    this.spawnTimer = 0;
    this.isIntermission = false;
    this.intermissionTimer = 3.0;
    this.activeBoss = null;
  }

  update(dt, width, height, core, bullets, onCreeperExplode, audio) {
    if (this.isIntermission) {
      this.intermissionTimer -= dt;
      if (this.intermissionTimer <= 0) {
        this.isIntermission = false;
        this.currentWave++;
        this.enemiesToSpawn = 6 + this.currentWave * 4;
        this.enemiesSpawned = 0;
        this.spawnInterval = Math.max(0.35, 1.2 - this.currentWave * 0.05);

        // Every 5th wave spawns a Wither Beast Boss
        if (this.currentWave % 5 === 0) {
          this.spawnBoss();
        }
      }
      return;
    }

    if (this.enemiesSpawned < this.enemiesToSpawn) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        this.spawnEnemy();
        this.enemiesSpawned++;
      }
    } else if (this.enemies.length === 0) {
      this.isIntermission = true;
      this.intermissionTimer = 3.0;
      this.activeBoss = null;
    }

    const coreX = core.x;
    const coreY = core.y;
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].update(dt, coreX, coreY, bullets, onCreeperExplode, audio);
    }
  }

  spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const spawnRadius = 340;

    const x = Math.cos(angle) * spawnRadius;
    const y = Math.sin(angle) * spawnRadius;

    const waveMultiplier = 1 + (this.currentWave - 1) * 0.18;
    const rand = Math.random();

    let type = 'crawler'; // Zombie
    if (rand < 0.22) {
      type = 'creeper'; // Kamikaze
    } else if (rand < 0.42) {
      type = 'skeleton'; // Ranged sniper
    } else if (rand < 0.60) {
      type = 'brute'; // Stone golem
    }

    this.enemies.push(new Enemy(x, y, type, waveMultiplier));
  }

  spawnBoss() {
    const angle = Math.random() * Math.PI * 2;
    const spawnRadius = 360;
    const x = Math.cos(angle) * spawnRadius;
    const y = Math.sin(angle) * spawnRadius;

    const waveMultiplier = 1 + (this.currentWave - 1) * 0.25;
    const boss = new Enemy(x, y, 'boss', waveMultiplier);
    this.activeBoss = boss;
    this.enemies.push(boss);
  }
}