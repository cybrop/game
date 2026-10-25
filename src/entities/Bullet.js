import { Isometric } from '../core/Isometric.js';

export class Bullet {
  constructor(x, y, angle, damage) {
    this.x = x;
    this.y = y;
    this.z = 18; // Elevated bullet altitude
    this.angle = angle;
    this.speed = 460;
    this.damage = damage;
    this.radius = 3.5;
  }

  update(dt) {
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
  }

  isOffscreen() {
    // Distance from world center (boundary check)
    return Math.hypot(this.x, this.y) > 480;
  }

  draw(ctx, originX = 0, originY = 0) {
    const screenPos = Isometric.worldToScreen(this.x, this.y, this.z, originX, originY);

    ctx.save();
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }
}