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
  }

  update(dt, width, height, core) {
    if (this.isIntermission) {
      this.intermissionTimer -= dt;
      if (this.intermissionTimer <= 0) {
        this.isIntermission = false;
        this.currentWave++;
        this.enemiesToSpawn = 6 + this.currentWave * 4;
        this.enemiesSpawned = 0;
        this.spawnInterval = Math.max(0.4, 1.2 - this.currentWave * 0.06);
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
    }

    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].update(dt, core.x, core.y);
    }
  }

  /**
   * Spawns hostiles along the circular perimeter of the isometric Cartesian world plane
   */
  spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const spawnRadius = 340; // Outside central defenses

    const x = Math.cos(angle) * spawnRadius;
    const y = Math.sin(angle) * spawnRadius;

    const waveMultiplier = 1 + (this.currentWave - 1) * 0.18;
    const isBrute = Math.random() < 0.25 || (this.currentWave >= 3 && this.enemiesSpawned % 6 === 0);
    const type = isBrute ? 'brute' : 'crawler';

    this.enemies.push(new Enemy(x, y, type, waveMultiplier));
  }
}