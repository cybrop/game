import { Isometric } from './Isometric.js';

export class Core {
  constructor(x = 0, y = 0, maxHp = 100) {
    this.x = x; // World Cartesian X
    this.y = y; // World Cartesian Y
    this.z = 0;
    this.radius = 34;
    this.maxHp = maxHp;
    this.currentHp = maxHp;
    this.rotation = 0;
    this.pulse = 0;
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
    this.rotation += dt * 0.8;
    this.pulse += dt * 2.5;
  }

  draw(ctx, originX = 0, originY = 0) {
    // Project world anchor to screen
    const screenPos = Isometric.worldToScreen(this.x, this.y, 0, originX, originY);

    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);

    // Extraction shockwave pulse ring on ground
    const pulseRadius = this.radius + 8 + Math.sin(this.pulse) * 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, pulseRadius * Isometric.COS_A * 2, pulseRadius * Isometric.SIN_A * 2, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.28)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2.5D Extruded Hexagonal/Cylindrical Drill Base
    const baseHeight = 22;
    const rx = this.radius * Isometric.COS_A * 2;
    const ry = this.radius * Isometric.SIN_A * 2;

    // Cylinder column sides
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
    ctx.lineTo(rx, -baseHeight);
    ctx.ellipse(0, -baseHeight, rx, ry, 0, 0, Math.PI, true);
    ctx.lineTo(-rx, 0);
    ctx.fillStyle = '#0a0f24';
    ctx.fill();
    ctx.strokeStyle = '#00aacc';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cylinder top deck
    ctx.beginPath();
    ctx.ellipse(0, -baseHeight, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#10162e';
    ctx.fill();
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Rotating drill vanes
    ctx.save();
    ctx.translate(0, -baseHeight);
    ctx.scale(1, 0.5); // Isometric top-face squash
    ctx.rotate(this.rotation);
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -this.radius + 8);
      ctx.stroke();
    }
    ctx.restore();

    // Reactor Core Glow Orb elevated atop drill
    ctx.beginPath();
    ctx.arc(0, -baseHeight - 8, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ff0077';
    ctx.shadowColor = '#ff0077';
    ctx.shadowBlur = 16;
    ctx.fill();

    ctx.restore();

    // Isometric Health Arc Indicator
    this.drawHealthBar(ctx, originX, originY);
  }

  drawHealthBar(ctx, originX, originY) {
    const screenPos = Isometric.worldToScreen(this.x, this.y, 35, originX, originY);
    const hpRatio = Math.max(0, this.currentHp / this.maxHp);
    const barW = 54;
    const barH = 5;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(screenPos.x - barW / 2, screenPos.y, barW, barH);

    ctx.fillStyle = hpRatio > 0.4 ? '#00ff88' : '#ff3344';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 6;
    ctx.fillRect(screenPos.x - barW / 2, screenPos.y, barW * hpRatio, barH);
    ctx.restore();
  }
}