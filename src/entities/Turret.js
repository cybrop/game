import { Bullet } from './Bullet.js';
import { Isometric } from '../core/Isometric.js';
import { audio } from '../main.js';

export class Turret {
  constructor(x = 0, y = 0, baseDamage = 15) {
    this.x = x;
    this.y = y;
    this.elevation = 38; // Sits above Core upper deck
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
      // Calculate 2D Cartesian aim angle towards enemy world coordinates
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
    const barrelOffset = 22;
    const spawnX = this.x + Math.cos(this.angle) * barrelOffset;
    const spawnY = this.y + Math.sin(this.angle) * barrelOffset;

    // Launch with initial elevation matching turret cannon elevation
    const targetDistance = this.target ? Math.hypot(this.target.x - this.x, this.target.y - this.y) : this.range;
    bullets.push(new Bullet(spawnX, spawnY, this.elevation, this.angle, this.damage, targetDistance));
    audio.playLaser();
  }

  draw(ctx, originX = 0, originY = 0) {
    const screenPos = Isometric.worldToScreen(this.x, this.y, this.elevation, originX, originY);

    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);

    // Turret Pivot Hub (Rotary platform)
    ctx.beginPath();
    ctx.ellipse(0, 4, 12, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0a1024';
    ctx.fill();
    ctx.strokeStyle = '#00aacc';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 2.5D Aiming Cannon Assembly
    ctx.save();
    ctx.scale(1, 0.58); // Dimetric ground perspective pitch
    ctx.rotate(this.angle);

    // Dual railgun barrels
    ctx.fillStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 10;
    ctx.fillRect(4, -5, 18, 3.5);
    ctx.fillRect(4, 1.5, 18, 3.5);

    // Cannon armor housing
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fillStyle = '#101633';
    ctx.fill();
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Aiming optic
    ctx.beginPath();
    ctx.arc(3, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ff0077';
    ctx.fill();

    ctx.restore();

    // Elevated muzzle discharge flash
    if (this.muzzleFlash > 0) {
      const flashDist = 24;
      const flashX = Math.cos(this.angle) * flashDist;
      const flashY = Math.sin(this.angle) * flashDist * 0.58;

      ctx.beginPath();
      ctx.arc(flashX, flashY, 11 * this.muzzleFlash, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 243, 255, ${this.muzzleFlash})`;
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 16;
      ctx.fill();
    }

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