export class CryoField {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 160;
    this.pulse = 0;
    this.tickTimer = 0;
    this.tickInterval = 0.5; // Damage tick every 0.5s
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
        // Slow down hostiles in frost field
        enemy.applySlow(0.5, 0.6);

        if (shouldTick) {
          enemy.takeDamage(2);
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Glowing frost field
    const wave = Math.sin(this.pulse) * 4;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + wave, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 180, 255, 0.06)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, this.radius + wave, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 210, 255, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.stroke();

    ctx.restore();
  }
}