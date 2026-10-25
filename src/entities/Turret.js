import { Bullet } from './Bullet.js';
import { Isometric } from '../core/Isometric.js';
import { audio } from '../main.js';

export class Turret {
  constructor(x = 0, y = 0, baseDamage = 15) {
    this.x = x;
    this.y = y;
    this.elevation = 42;
    this.angle = 0;
    this.range = 240;
    this.damage = baseDamage;
    this.fireCooldown = 450;
    this.timeSinceLastShot = 0;
    this.target = null;
    this.muzzleRecoil = 0;
  }

  update(dt, enemies, bullets, hasMultishot = false) {
    this.timeSinceLastShot += dt * 1000;
    if (this.muzzleRecoil > 0) {
      this.muzzleRecoil = Math.max(0, this.muzzleRecoil - dt * 5);
    }

    this.target = this.findNearestEnemy(enemies);

    if (this.target) {
      this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);

      if (this.timeSinceLastShot >= this.fireCooldown) {
        this.fire(bullets, hasMultishot);
        this.timeSinceLastShot = 0;
        this.muzzleRecoil = 1;
      }
    }
  }

  findNearestEnemy(enemies) {
    let nearest = null;
    let minDistanceSq = this.range * this.range;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= minDistanceSq) {
        minDistanceSq = distSq;
        nearest = enemy;
      }
    }
    return nearest;
  }

  fire(bullets, hasMultishot = false) {
    const barrelOffset = 16;
    const spawnX = this.x + Math.cos(this.angle) * barrelOffset;
    const spawnY = this.y + Math.sin(this.angle) * barrelOffset;
    const spawnZ = this.elevation + 4;

    const targetDistance = this.target
      ? Math.hypot(this.target.x - this.x, this.target.y - this.y)
      : this.range;

    // Standard arrow
    bullets.push(new Bullet(spawnX, spawnY, spawnZ, this.angle, this.damage, targetDistance));

    // Multishot Enchantment: 2 extra spread arrows
    if (hasMultishot) {
      bullets.push(new Bullet(spawnX, spawnY, spawnZ, this.angle - 0.22, this.damage * 0.85, targetDistance));
      bullets.push(new Bullet(spawnX, spawnY, spawnZ, this.angle + 0.22, this.damage * 0.85, targetDistance));
    }

    audio.playArrowTwang();
  }

  draw(ctx, originX = 0, originY = 0) {
    const standColors = {
      top: '#d0d4dc', left: '#9ea5b3', right: '#717887', stroke: '#353a44'
    };
    Isometric.drawCube(ctx, this.x, this.y, this.elevation - 8, 14, 14, 8, standColors, originX, originY);

    const headScreen = Isometric.worldToScreen(this.x, this.y, this.elevation + 6, originX, originY);

    ctx.save();
    ctx.translate(headScreen.x, headScreen.y);

    const headSize = 18;
    const hx = headSize / 2;
    const hy = headSize * 0.5;

    ctx.fillStyle = '#55555c';
    ctx.fillRect(-hx, -hy - 8, headSize, headSize);
    ctx.strokeStyle = '#222226';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-hx, -hy - 8, headSize, headSize);

    ctx.fillStyle = '#b8bec9';
    ctx.fillRect(-hx, -hy - 8, headSize, 4);

    const dirX = Math.cos(this.angle) * 4;
    const dirY = Math.sin(this.angle) * 2;

    ctx.fillStyle = '#d61c1c';
    ctx.fillRect(-hx + 3 + dirX, -hy - 2 + dirY, 3, 2.5);
    ctx.fillRect(hx - 6 + dirX, -hy - 2 + dirY, 3, 2.5);

    const mouthX = dirX * 1.5;
    const mouthY = 2 + dirY * 1.2;
    const recoilOffset = this.muzzleRecoil * 2;

    ctx.beginPath();
    ctx.arc(mouthX - Math.cos(this.angle) * recoilOffset, mouthY - Math.sin(this.angle) * recoilOffset, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1c1f';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (this.muzzleRecoil > 0.1) {
      ctx.beginPath();
      ctx.arc(mouthX + Math.cos(this.angle) * 8, mouthY + Math.sin(this.angle) * 4, 5 * this.muzzleRecoil, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 220, 220, ${this.muzzleRecoil * 0.8})`;
      ctx.fill();
    }

    ctx.restore();
  }

  drawRange(ctx, originX = 0, originY = 0) {
    ctx.save();
    Isometric.drawIsoCircle(ctx, this.x, this.y, this.range, originX, originY);
    ctx.strokeStyle = 'rgba(214, 28, 28, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.restore();
  }
}