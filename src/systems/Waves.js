import { Enemy } from '../entities/Enemy.js';

export class WaveManager {
  constructor() {
    this.currentWave = 1;
    this.enemies = [];
    this.enemiesToSpawn = 8;
    this.enemiesSpawned = 0;
    this.spawnInterval = 1.1; // seconds
    this.spawnTimer = 0;
    this.isIntermission = false;
    this.intermissionTimer = 3.0; // Break between waves
  }

  update(dt, width, height, core) {
    // Intermission between waves
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

    // Spawn cycle
    if (this.enemiesSpawned < this.enemiesToSpawn) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        this.spawnEnemy(width, height);
        this.enemiesSpawned++;
      }
    } else if (this.enemies.length === 0) {
      // Wave cleared
      this.isIntermission = true;
      this.intermissionTimer = 3.0;
    }

    // Update active enemies toward core
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].update(dt, core.x, core.y);
    }
  }

  spawnEnemy(width, height) {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    const offset = 30;

    switch (edge) {
      case 0: // Top
        x = Math.random() * width;
        y = -offset;
        break;
      case 1: // Right
        x = width + offset;
        y = Math.random() * height;
        break;
      case 2: // Bottom
        x = Math.random() * width;
        y = height + offset;
        break;
      case 3: // Left
        x = -offset;
        y = Math.random() * height;
        break;
    }

    // Every 4th wave or 20% random chance spawns a Siege Brute
    const waveMultiplier = 1 + (this.currentWave - 1) * 0.18;
    const isBrute = Math.random() < 0.25 || (this.currentWave >= 3 && this.enemiesSpawned % 6 === 0);
    const type = isBrute ? 'brute' : 'crawler';

    this.enemies.push(new Enemy(x, y, type, waveMultiplier));
  }
}