import { Isometric } from '../core/Isometric.js';

/**
 * 3D Minecraft Arrow Projectile
 * Features parabolic flight gravity, orientation aligned with ballistic arc,
 * wooden shaft, iron flint arrowhead, and white fletching.
 */
export class Bullet {
  constructor(x, y, startZ, angle, damage, targetDistance = 200) {
    this.x = x;
    this.y = y;
    this.z = startZ;
    this.angle = angle;
    this.damage = damage;
    this.speed = 460;
    this.radius = 3.5;

    // 3D Ballistic Parabolic Arc
    const flightTime = Math.max(0.32, targetDistance / this.speed);
    this.gravity = 115;
    this.vz = (0.5 * this.gravity * flightTime) - (startZ / flightTime);

    // Initial velocities
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
    // 1. Dynamic Floor Shadow Tracking on z = 0 ground plane
    const shadowPos = Isometric.worldToScreen(this.x, this.y, 0, originX, originY);
    const altitudeScale = Math.max(0.3, 1 - (this.z / 65));

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(shadowPos.x, shadowPos.y, 5 * altitudeScale, 2.5 * altitudeScale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();
    ctx.restore();

    // 2. 3D Oriented Minecraft Arrow Body
    // Compute current 3D velocity unit vector to orient the arrow along its flight path
    const horizSpeed = Math.hypot(this.vx, this.vy);
    const totalSpeed = Math.max(1, Math.hypot(horizSpeed, this.vz));
    const dirX = this.vx / totalSpeed;
    const dirY = this.vy / totalSpeed;
    const dirZ = this.vz / totalSpeed;

    const arrowLength = 14;
    const tailX = this.x - dirX * arrowLength;
    const tailY = this.y - dirY * arrowLength;
    const tailZ = Math.max(0, this.z - dirZ * arrowLength);

    const tipScreen = Isometric.worldToScreen(this.x, this.y, this.z, originX, originY);
    const tailScreen = Isometric.worldToScreen(tailX, tailY, tailZ, originX, originY);

    ctx.save();
    ctx.lineCap = 'square';

    // Wooden shaft
    ctx.beginPath();
    ctx.moveTo(tailScreen.x, tailScreen.y);
    ctx.lineTo(tipScreen.x, tipScreen.y);
    ctx.strokeStyle = '#8f5c2c'; // Oak wood shaft
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Flint / Iron Arrowhead at tip
    ctx.beginPath();
    ctx.arc(tipScreen.x, tipScreen.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#b8bec9'; // Iron flint tip
    ctx.fill();
    ctx.strokeStyle = '#3b4252';
    ctx.lineWidth = 1;
    ctx.stroke();

    // White / Gray Feather Fletching at tail
    ctx.beginPath();
    ctx.arc(tailScreen.x, tailScreen.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#f0f0f0';
    ctx.fill();

    ctx.restore();
  }
}