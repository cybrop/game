import { Bullet } from './Bullet.js';
import { Isometric } from '../core/Isometric.js';
import { audio } from '../main.js';

export class Turret {
  constructor(x = 0, y = 0, baseDamage = 15) {
    this.x = x;
    this.y = y;
    this.elevation = 28; // Elevated atop Core deck
    this.angle = 0;
    this.range = 240;
    this.damage = baseDamage;
    this.fireCooldown = 450;
    this.timeSinceLastShot = 0;
    this.target = null;
    this.muzzleFlash = 0;
  }

  update(dt, enemies, bullets) {
    this.timeSinceLastShot += dt * 1000;
    if (this.muzzleFlash > 0) {
      this.muzzleFlash -= dt * 6;
    }

    this.target = this.findNearestEnemy(enemies);

    if (this.target) {
      this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);

      if (this.timeSinceLastShot >= this.fireCooldown) {
        this.fire(bullets);
        this.timeSinceLastShot = 0;
        this.muzzleFlash = 1;
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
    const muzzleOffset = 22;
    const spawnX = this.x + Math.cos(this.angle) * muzzleOffset;
    const spawnY = this.y + Math.sin(this.angle) * muzzleOffset;
    bullets.push(new Bullet(spawnX, spawnY, this.angle, this.damage));
    audio.playLaser();
  }

  draw(ctx, originX = 0, originY = 0) {
    const screenPos = Isometric.worldToScreen(this.x, this.y, this.elevation, originX, originY);

    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);

    // Muzzle flash
    if (this.muzzleFlash > 0) {
      ctx.beginPath();
      ctx.arc(Math.cos(this.angle) * 18, Math.sin(this.angle) * 9, 8 * this.muzzleFlash, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 243, 255, ${this.muzzleFlash})`;
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 14;
      ctx.fill();
    }

    // 2.5D Aiming Turret Cannon
    ctx.save();
    ctx.scale(1, 0.58); // Isometric pitch tilt
    ctx.rotate(this.angle);

    ctx.fillStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(4, -3, 16, 6);

    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#0b1126';
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  drawRange(ctx, originX = 0, originY = 0) {
    ctx.save();
    Isometric.drawIsoCircle(ctx, this.x, this.y, this.range, originX, originY);
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.restore();
  }
}