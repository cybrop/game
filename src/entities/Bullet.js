import { Isometric } from '../core/Isometric.js';

export class Bullet {
  constructor(x, y, startZ, angle, damage, targetDistance = 200) {
    this.x = x;
    this.y = y;
    this.z = startZ; // Initial launch elevation
    this.angle = angle;
    this.damage = damage;
    this.speed = 460;
    this.radius = 3.5;

    // 3D Parabolic Ballistics
    // Total flight duration calculated from target distance
    const flightTime = Math.max(0.35, targetDistance / this.speed);
    this.gravity = 110; // Downward acceleration in world Z units
    // Initial vertical velocity to arc smoothly and land near target
    this.vz = (0.5 * this.gravity * flightTime) - (startZ / flightTime);
  }

  update(dt) {
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;

    // Apply ballistic vertical velocity and gravity
    this.z += this.vz * dt;
    this.vz -= this.gravity * dt;

    // Clamp to ground plane
    if (this.z < 0) {
      this.z = 0;
    }
  }

  isOffscreen() {
    // Check world boundary limit or floor impact
    return Math.hypot(this.x, this.y) > 480 || this.z <= 0;
  }

  draw(ctx, originX = 0, originY = 0) {
    // 1. Dynamic Floor Shadow Tracking on z = 0 ground plane
    const shadowPos = Isometric.worldToScreen(this.x, this.y, 0, originX, originY);
    const altitudeScale = Math.max(0.35, 1 - (this.z / 60));

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(shadowPos.x, shadowPos.y, 4.5 * altitudeScale, 2.2 * altitudeScale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();
    ctx.restore();

    // 2. Elevated 3D Bullet Body
    const screenPos = Isometric.worldToScreen(this.x, this.y, this.z, originX, originY);

    ctx.save();
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 10;
    ctx.fill();

    // Hot energy tracer center
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, this.radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }
}