export class Core {
  constructor(x, y, maxHp = 100) {
    this.x = x;
    this.y = y;
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

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Extraction shockwave field ring
    const pulseRadius = this.radius + 6 + Math.sin(this.pulse) * 3;
    ctx.beginPath();
    ctx.arc(0, 0, pulseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dark energy drill base
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#0f1429';
    ctx.fill();
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Internal rotating drill reactor
    ctx.save();
    ctx.rotate(this.rotation);
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -this.radius + 6);
      ctx.stroke();
    }
    ctx.restore();

    // Reactor Core Glow
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#ff0077';
    ctx.shadowColor = '#ff0077';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.restore();

    // Health Arc Indicator
    this.drawHealthBar(ctx);
  }

  drawHealthBar(ctx) {
    const hpRatio = Math.max(0, this.currentHp / this.maxHp);
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * hpRatio);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 12, startAngle, endAngle);
    ctx.strokeStyle = hpRatio > 0.4 ? '#00ff88' : '#ff3344';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }
}