import { Isometric } from './Isometric.js';

export class Core {
  constructor(x = 0, y = 0, maxHp = 100) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.radius = 34;
    this.maxHp = maxHp;
    this.currentHp = maxHp;
    this.rotation = 0;
    this.pulse = 0;
    this.tierHeight = 24;
  }

  takeDamage(amount) {
    this.currentHp = Math.max(0, this.currentHp - amount);
  }

  heal(amount) {
    this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
  }

  isDestroyed() {
    return this.currentHp <= 0;
  }

  update(dt) {
    this.rotation += dt * 0.9;
    this.pulse += dt * 2.5;
  }

  draw(ctx, originX = 0, originY = 0) {
    const screenPos = Isometric.worldToScreen(this.x, this.y, 0, originX, originY);

    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);

    // Dynamic ground extraction energy ring
    const pulseRad = this.radius + 10 + Math.sin(this.pulse) * 4;
    const pulseRx = pulseRad * Isometric.COS_A * 2;
    const pulseRy = pulseRad * Isometric.SIN_A * 2;

    ctx.beginPath();
    ctx.ellipse(0, 0, pulseRx, pulseRy, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // TIER 1: Subterranean Outer Foundation Base (Beveled ring)
    const t1Rx = this.radius * 1.35 * Isometric.COS_A * 2;
    const t1Ry = this.radius * 1.35 * Isometric.SIN_A * 2;
    const t1H = 8;

    // Base cylinder wall
    ctx.beginPath();
    ctx.ellipse(0, 0, t1Rx, t1Ry, 0, 0, Math.PI);
    ctx.lineTo(t1Rx, -t1H);
    ctx.ellipse(0, -t1H, t1Rx, t1Ry, 0, 0, Math.PI, true);
    ctx.lineTo(-t1Rx, 0);
    ctx.fillStyle = '#060a17';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // TIER 2: Main Extruded Industrial Rig Column
    const t2Rx = this.radius * Isometric.COS_A * 2;
    const t2Ry = this.radius * Isometric.SIN_A * 2;
    const t2H = this.tierHeight;

    // Rig side wall (Dark metallic shaded cylinder)
    ctx.beginPath();
    ctx.ellipse(0, -t1H, t2Rx, t2Ry, 0, 0, Math.PI);
    ctx.lineTo(t2Rx, -t1H - t2H);
    ctx.ellipse(0, -t1H - t2H, t2Rx, t2Ry, 0, 0, Math.PI, true);
    ctx.lineTo(-t2Rx, -t1H);

    const gradWall = ctx.createLinearGradient(-t2Rx, 0, t2Rx, 0);
    gradWall.addColorStop(0, '#0a1024');
    gradWall.addColorStop(0.5, '#141d3b');
    gradWall.addColorStop(1, '#080d1e');
    ctx.fillStyle = gradWall;
    ctx.fill();
    ctx.strokeStyle = '#00aacc';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rig top deck
    ctx.beginPath();
    ctx.ellipse(0, -t1H - t2H, t2Rx, t2Ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#10162f';
    ctx.fill();
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Rotating internal turbine rotor blades
    ctx.save();
    ctx.translate(0, -t1H - t2H);
    ctx.scale(1, 0.58);
    ctx.rotate(this.rotation);
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.85)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      ctx.rotate((Math.PI * 2) / 4);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -this.radius + 6);
      ctx.stroke();
    }
    ctx.restore();

    // Glowing Dark Energy Plasma Reactor Core (Hovering above deck)
    const reactorAltitude = -t1H - t2H - 12 + Math.sin(this.pulse) * 3;
    ctx.beginPath();
    ctx.arc(0, reactorAltitude, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#ff0077';
    ctx.shadowColor = '#ff0077';
    ctx.shadowBlur = 20;
    ctx.fill();

    // Reactor containment plasma core center
    ctx.beginPath();
    ctx.arc(0, reactorAltitude, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.restore();

    this.drawHealthBar(ctx, originX, originY);
  }

  drawHealthBar(ctx, originX, originY) {
    const screenPos = Isometric.worldToScreen(this.x, this.y, 48, originX, originY);
    const hpRatio = Math.max(0, this.currentHp / this.maxHp);
    const barW = 56;
    const barH = 5;

    ctx.save();
    ctx.fillStyle = 'rgba(4, 7, 16, 0.85)';
    ctx.fillRect(screenPos.x - barW / 2, screenPos.y, barW, barH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(screenPos.x - barW / 2, screenPos.y, barW, barH);

    ctx.fillStyle = hpRatio > 0.4 ? '#00ff88' : '#ff3344';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.fillRect(screenPos.x - barW / 2 + 1, screenPos.y + 1, (barW - 2) * hpRatio, barH - 2);
    ctx.restore();
  }
}