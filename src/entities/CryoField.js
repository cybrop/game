export class CryoField {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.radius = 160;
    this.pulse = 0;
    this.tickTimer = 0;
    this.tickInterval = 0.5;
  }

  update(dt, enemies) {
    this.pulse += dt * 2.0;
    this.tickTimer += dt;
    const shouldTick = this.tickTimer >= this.tickInterval;
    if (shouldTick) {
      this.tickTimer = 0;
    }

    for (const enemy of enemies) {
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist <= this.radius) {
        enemy.applySlow(0.5, 0.6);
        if (shouldTick) {
          enemy.takeDamage(2);
        }
      }
    }
  }
}