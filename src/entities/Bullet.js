import { Isometric } from '../core/Isometric.js';

export class Bullet {
  constructor(x, y, startZ, angle, damage, targetDistance = 200, isEnemyBullet = false) {
    this.x = x;
    this.y = y;
    this.z = startZ;
    this.angle = angle;
    this.damage = damage;
    this.isEnemyBullet = isEnemyBullet;
    this.speed = isEnemyBullet ? 280 : 460;
    this.radius = 3.5;

    const flightTime = Math.max(0.32, targetDistance / this.speed);
    this.gravity = isEnemyBullet ? 85 : 115;
    this.vz = (0.5 * this.gravity * flightTime) - (startZ / flightTime);

    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.z += this.vz * dt;
    this.vz -= this.gravity * dt;

    if (this.z < 0) {
      this.z = 0;
    }
  }

  isOffscreen() {
    return Math.hypot(this.x, this.y) > 480 || this.z <= 0;
  }

  draw(ctx, originX = 0, originY = 0) {
    const screenPos = Isometric.worldToScreen(this.x, this.y, this.z, originX, originY);

    const altitudeScale = Math.max(0.3, 1 - (this.z / 65));
    const shadowY = screenPos.y + this.z;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(screenPos.x, shadowY, 5 * altitudeScale, 2.5 * altitudeScale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();
    ctx.restore();

    const horizSpeed = Math.hypot(this.vx, this.vy);
    const totalSpeed = Math.max(1, Math.hypot(horizSpeed, this.vz));
    const dirX = this.vx / totalSpeed;
    const dirY = this.vy / totalSpeed;
    const dirZ = this.vz / totalSpeed;

    const arrowLength = 14;
    const tailX = this.x - dirX * arrowLength;
    const tailY = this.y - dirY * arrowLength;
    const tailZ = Math.max(0, this.z - dirZ * arrowLength);

    const tailScreen = Isometric.worldToScreen(tailX, tailY, tailZ, originX, originY);

    ctx.save();
    ctx.lineCap = 'square';

    // Shaft
    ctx.beginPath();
    ctx.moveTo(tailScreen.x, tailScreen.y);
    ctx.lineTo(screenPos.x, screenPos.y);
    ctx.strokeStyle = this.isEnemyBullet ? '#ff6b35' : '#8f5c2c';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Arrow tip
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = this.isEnemyBullet ? '#d62828' : '#b8bec9';
    ctx.fill();

    // Fletching
    ctx.beginPath();
    ctx.arc(tailScreen.x, tailScreen.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#f0f0f0';
    ctx.fill();

    ctx.restore();
  }
}