export class WaveSystem {
  constructor(core) {
    this.core = core;
    this.waveNumber = 0;
    this.spawnTimer = 0;
    this.enemies = [];
  }

  startWave() {
    this.waveNumber += 1;
    this.spawnTimer = 0;
    this.core.state.waveActive = true;
    return this.waveNumber;
  }

  update(dt, arena) {
    if (!this.core.state.waveActive) return [];

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const count = Math.min(5 + this.waveNumber, 18);
      const enemy = this.createEnemy(arena, count);
      this.enemies.push(enemy);
      this.spawnTimer = Math.max(0.6, 1.8 - this.waveNumber * 0.08);
    }

    return this.enemies;
  }

  createEnemy(arena, count) {
    const rect = arena.getBoundingClientRect();
    const side = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;

    if (side === 0) {
      x = Math.random() * rect.width;
      y = -20;
    } else if (side === 1) {
      x = rect.width + 20;
      y = Math.random() * rect.height;
    } else if (side === 2) {
      x = Math.random() * rect.width;
      y = rect.height + 20;
    } else {
      x = -20;
      y = Math.random() * rect.height;
    }

    const intensity = 1 + this.waveNumber * 0.15;
    return {
      x,
      y,
      radius: 12,
      speed: 0.8 * intensity,
      hp: 25 + this.waveNumber * 8,
      reward: 10 + this.waveNumber * 2,
    };
  }
}
