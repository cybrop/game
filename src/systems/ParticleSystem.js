import { Isometric } from '../core/Isometric.js';

/**
 * 2.5D / 3D Particle & Visual FX System
 * Supports 3D trajectories (x, y, z), gravity, floor collision bouncing,
 * ground scorch splatters, and isometric elliptical shockwaves.
 */
export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.splatters = [];
    this.shockwaves = [];
  }

  reset() {
    this.particles = [];
    this.splatters = [];
    this.shockwaves = [];
  }

  /**
   * Spawn 3D particles with velocity, elevation, and floor bounce
   */
  emitExplosion(worldX, worldY, worldZ = 10, color = '#ff0055', count = 16, isHeavy = false) {
    const total = isHeavy ? count * 2 : count;
    const baseSpeed = isHeavy ? 140 : 90;
    const gravity = isHeavy ? 280 : 180;

    for (let i = 0; i < total; i++) {
      const angle = Math.random() * Math.PI * 2;
      const horizontalSpeed = (Math.random() * 0.8 + 0.2) * baseSpeed;
      const vz = (Math.random() * 1.2 + 0.3) * (baseSpeed * 0.9);

      this.particles.push({
        x: worldX,
        y: worldY,
        z: worldZ + (Math.random() * 4 - 2),
        vx: Math.cos(angle) * horizontalSpeed,
        vy: Math.sin(angle) * horizontalSpeed,
        vz,
        gravity,
        bounces: isHeavy ? 2 : 1,
        restitution: 0.45,
        radius: (Math.random() * 2.5 + 1.2) * (isHeavy ? 1.4 : 1),
        color,
        alpha: 1,
        decay: Math.random() * 0.4 + 0.6, // seconds duration
        age: 0
      });
    }
  }

  /**
   * Spawn targeted kinetic sparks (e.g. on bullet impact or strike)
   */
  emitSparks(worldX, worldY, worldZ = 12, color = '#00f3ff', count = 8, biasAngle = null) {
    for (let i = 0; i < count; i++) {
      const angle = biasAngle !== null
        ? biasAngle + (Math.random() - 0.5) * 1.2
        : Math.random() * Math.PI * 2;
      const speed = Math.random() * 120 + 40;

      this.particles.push({
        x: worldX,
        y: worldY,
        z: worldZ,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: Math.random() * 80 + 30,
        gravity: 220,
        bounces: 1,
        restitution: 0.35,
        radius: Math.random() * 1.8 + 0.8,
        color,
        alpha: 1,
        decay: Math.random() * 0.25 + 0.35,
        age: 0
      });
    }
  }

  /**
   * Spawn 2.5D Isometric Shockwave on the ground plane
   */
  emitShockwave(worldX, worldY, maxRadius = 75, color = '#00f3ff') {
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
    // 1. Update 3D Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      p.alpha = Math.max(0, 1 - (p.age / p.decay));

      // Move in world Cartesian coordinates
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
          p.vx *= 0.65;
          p.vy *= 0.65;

          // Leave temporary floor splatter spot
          if (p.age < p.decay * 0.7) {
            this.splatters.push({
              x: p.x,
              y: p.y,
              radius: p.radius * (Math.random() * 1.5 + 1.2),
              color: p.color,
              alpha: p.alpha * 0.65,
              decay: 0.8,
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

    // 2. Update Ground Splatters
    for (let i = this.splatters.length - 1; i >= 0; i--) {
      const s = this.splatters[i];
      s.age += dt;
      s.alpha = Math.max(0, 0.65 * (1 - (s.age / s.decay)));
      if (s.alpha <= 0) {
        this.splatters.splice(i, 1);
      }
    }

    // 3. Update 2.5D Isometric Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * Math.min(1, dt * 10);
      sw.alpha -= dt * 1.8;

      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius * 0.98) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  /**
   * Render ground-layer visual effects (shockwaves & floor splatters on z=0)
   */
  drawGroundFX(ctx, originX, originY) {
    ctx.save();

    // Splatters
    for (let i = 0; i < this.splatters.length; i++) {
      const s = this.splatters[i];
      const pos = Isometric.worldToScreen(s.x, s.y, 0, originX, originY);
      const rx = s.radius * Isometric.COS_A * 2;
      const ry = s.radius * Isometric.SIN_A * 2;

      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.fill();
    }

    // 2.5D Concentric Elliptical Shockwaves
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
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 12;
      ctx.stroke();

      // Outer faint ripple ring
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, rx * 1.15, ry * 1.15, 0, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = Math.max(0, sw.alpha * 0.4);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Render airborne 3D particles with elevation projection and contact shadows
   */
  drawAirborneParticles(ctx, originX, originY) {
    ctx.save();

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Ground shadow beneath particle when airborne
      if (p.z > 2) {
        const shadowPos = Isometric.worldToScreen(p.x, p.y, 0, originX, originY);
        const shadowScale = Math.max(0.3, 1 - (p.z / 80));
        ctx.beginPath();
        ctx.ellipse(shadowPos.x, shadowPos.y, p.radius * 1.5 * shadowScale, p.radius * 0.75 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.globalAlpha = Math.max(0, p.alpha * 0.6);
        ctx.fill();
      }

      // Projected 3D particle body
      const screenPos = Isometric.worldToScreen(p.x, p.y, p.z, originX, originY);
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fill();
    }

    ctx.restore();
  }

  getActiveCount() {
    return this.particles.length + this.shockwaves.length + this.splatters.length;
  }
}