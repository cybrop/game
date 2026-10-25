import { Isometric } from '../core/Isometric.js';

/**
 * 2.5D / 3D Voxel Particle & Block Debris System
 * Renders block fragments, redstone sparks, and stone chips bouncing on the isometric terrain.
 */
export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.splatters = [];
    this.shockwaves = [];

    this.MAX_PARTICLES = 320;
    this.MAX_SPLATTERS = 50;
    this.MAX_SHOCKWAVES = 12;
  }

  reset() {
    this.particles.length = 0;
    this.splatters.length = 0;
    this.shockwaves.length = 0;
  }

  /**
   * Spawn 3D blocky fragments with velocity, elevation, and ground bounce
   */
  emitExplosion(worldX, worldY, worldZ = 10, color = '#ff0055', count = 16, isHeavy = false) {
    const allowance = this.MAX_PARTICLES - this.particles.length;
    if (allowance <= 0) return;

    const requested = isHeavy ? count * 2 : count;
    const total = Math.min(allowance, requested);
    const baseSpeed = isHeavy ? 130 : 85;
    const gravity = isHeavy ? 300 : 200;

    for (let i = 0; i < total; i++) {
      const angle = Math.random() * Math.PI * 2;
      const horizontalSpeed = (Math.random() * 0.8 + 0.2) * baseSpeed;
      const vz = (Math.random() * 1.2 + 0.4) * (baseSpeed * 0.9);

      this.particles.push({
        x: worldX,
        y: worldY,
        z: worldZ + (Math.random() * 4 - 2),
        vx: Math.cos(angle) * horizontalSpeed,
        vy: Math.sin(angle) * horizontalSpeed,
        vz,
        gravity,
        bounces: isHeavy ? 2 : 1,
        restitution: 0.4,
        size: (Math.random() * 2.8 + 2.0) * (isHeavy ? 1.3 : 1),
        color,
        alpha: 1,
        decay: Math.random() * 0.35 + 0.55,
        age: 0
      });
    }
  }

  /**
   * Spawn block crack chips & sparks
   */
  emitSparks(worldX, worldY, worldZ = 12, color = '#d61c1c', count = 8, biasAngle = null) {
    const allowance = this.MAX_PARTICLES - this.particles.length;
    if (allowance <= 0) return;

    const total = Math.min(allowance, count);
    for (let i = 0; i < total; i++) {
      const angle = biasAngle !== null
        ? biasAngle + (Math.random() - 0.5) * 1.2
        : Math.random() * Math.PI * 2;
      const speed = Math.random() * 110 + 35;

      this.particles.push({
        x: worldX,
        y: worldY,
        z: worldZ,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: Math.random() * 70 + 25,
        gravity: 240,
        bounces: 1,
        restitution: 0.3,
        size: Math.random() * 2.0 + 1.2,
        color,
        alpha: 1,
        decay: Math.random() * 0.2 + 0.3,
        age: 0
      });
    }
  }

  /**
   * Spawn 2.5D Isometric Shockwave on the ground plane
   */
  emitShockwave(worldX, worldY, maxRadius = 75, color = '#d61c1c') {
    if (this.shockwaves.length >= this.MAX_SHOCKWAVES) {
      this.shockwaves.shift();
    }

    this.shockwaves.push({
      x: worldX,
      y: worldY,
      radius: 6,
      maxRadius,
      growthRate: maxRadius * 3.2,
      alpha: 1,
      color
    });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      p.alpha = Math.max(0, 1 - (p.age / p.decay));

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vz -= p.gravity * dt;

      // Floor Collision & Bounce
      if (p.z <= 0) {
        p.z = 0;
        if (p.bounces > 0) {
          p.bounces--;
          p.vz = -p.vz * p.restitution;
          p.vx *= 0.6;
          p.vy *= 0.6;

          if (this.splatters.length < this.MAX_SPLATTERS && p.age < p.decay * 0.6) {
            this.splatters.push({
              x: p.x,
              y: p.y,
              size: p.size * (Math.random() * 1.3 + 1.0),
              color: p.color,
              alpha: p.alpha * 0.65,
              decay: 0.7,
              age: 0
            });
          }
        } else {
          p.vz = 0;
          p.vx = 0;
          p.vy = 0;
        }
      }

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Ground block impact debris splatters
    for (let i = this.splatters.length - 1; i >= 0; i--) {
      const s = this.splatters[i];
      s.age += dt;
      s.alpha = Math.max(0, 0.65 * (1 - (s.age / s.decay)));
      if (s.alpha <= 0) {
        this.splatters.splice(i, 1);
      }
    }

    // Isometric shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * Math.min(1, dt * 10);
      sw.alpha -= dt * 1.8;

      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius * 0.98) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  drawGroundFX(ctx, originX, originY) {
    ctx.save();

    // Voxel Block Splatter marks on z = 0
    for (let i = 0; i < this.splatters.length; i++) {
      const s = this.splatters[i];
      const pos = Isometric.worldToScreen(s.x, s.y, 0, originX, originY);
      const rx = s.size * Isometric.COS_A * 2;
      const ry = s.size * Isometric.SIN_A * 2;

      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.fill();
    }

    // Concentric shockwaves
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      const pos = Isometric.worldToScreen(sw.x, sw.y, 0, originX, originY);
      const rx = sw.radius * Isometric.COS_A * 2;
      const ry = sw.radius * Isometric.SIN_A * 2;

      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = Math.max(0, sw.alpha);
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, rx * 1.15, ry * 1.15, 0, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = Math.max(0, sw.alpha * 0.4);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  drawAirborneParticles(ctx, originX, originY) {
    ctx.save();

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Ground shadow beneath block fragment
      if (p.z > 2) {
        const shadowPos = Isometric.worldToScreen(p.x, p.y, 0, originX, originY);
        const shadowScale = Math.max(0.3, 1 - (p.z / 80));
        ctx.beginPath();
        ctx.ellipse(shadowPos.x, shadowPos.y, p.size * 1.3 * shadowScale, p.size * 0.65 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.globalAlpha = Math.max(0, p.alpha * 0.5);
        ctx.fill();
      }

      // Render 3D Square/Voxel Block Fragment
      const screenPos = Isometric.worldToScreen(p.x, p.y, p.z, originX, originY);
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.fillRect(screenPos.x - p.size / 2, screenPos.y - p.size / 2, p.size, p.size);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(screenPos.x - p.size / 2, screenPos.y - p.size / 2, p.size, p.size);
    }

    ctx.restore();
  }

  getActiveCount() {
    return this.particles.length + this.shockwaves.length + this.splatters.length;
  }
}