import { Bullet } from './Bullet.js';

export class Turret {
  constructor(x, y, baseDamage = 15) {
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.range = 240;
    this.damage = baseDamage;
    this.fireCooldown = 450; // ms
    this.timeSinceLastShot = 0; // ms
    this.target = null;
  }

  update(dt, enemies, bullets) {
    this.timeSinceLastShot += dt * 1000;

    // Target nearest enemy within range
    this.target = this.findNearestEnemy(enemies);

    if (this.target) {
      this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);

      // Auto-fire
      if (this.timeSinceLastShot >= this.fireCooldown) {
        this.fire(bullets);
        this.timeSinceLastShot = 0;
      }
    }
  }

  findNearestEnemy(enemies) {
    let nearest = null;
    let minDistance = this.range;

    for (const enemy of enemies) {
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist <= minDistance) {
        minDistance = dist;
        nearest = enemy;
      }
    }
    return nearest;
  }

  fire(bullets) {
    const muzzleOffset = 26;
    const spawnX = this.x + Math.cos(this.angle) * muzzleOffset;
    const spawnY = this.y + Math.sin(this.angle) * muzzleOffset;
    bullets.push(new Bullet(spawnX, spawnY, this.angle, this.damage));
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Turret barrel
    ctx.fillStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 10;
    ctx.fillRect(8, -3, 18, 6);

    // Turret pivot hub
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#10162c';
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawRange(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.restore();
  }
}