import { Isometric } from '../core/Isometric.js';

export class Enemy {
  constructor(x, y, type = 'crawler', waveMultiplier = 1) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.type = type;

    if (type === 'crawler') {
      this.radius = 11;
      this.height = 12;
      this.baseSpeed = 46 * (1 + (waveMultiplier - 1) * 0.05);
      this.maxHp = Math.round(20 * waveMultiplier);
      this.damage = 10;
      this.reward = 8;
      this.color = '#ff0055';
      this.accentColor = '#ff5599';
    } else {
      // Brute / Siege
      this.radius = 18;
      this.height = 20;
      this.baseSpeed = 28 * (1 + (waveMultiplier - 1) * 0.03);
      this.maxHp = Math.round(70 * waveMultiplier);
      this.damage = 25;
      this.reward = 25;
      this.color = '#aa00ff';
      this.accentColor = '#dd55ff';
    }

    this.hp = this.maxHp;
    this.speed = this.baseSpeed;
    this.slowTimer = 0;
    this.isChilled = false;
    this.bobbing = Math.random() * Math.PI * 2;
  }

  applySlow(multiplier = 0.5, duration = 0.6) {
    this.speed = this.baseSpeed * multiplier;
    this.slowTimer = duration;
    this.isChilled = true;
  }

  takeDamage(amount) {
    this.hp -= amount;
  }

  isDead() {
    return this.hp <= 0;
  }

  update(dt, targetX, targetY) {
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) {
        this.speed = this.baseSpeed;
        this.isChilled = false;
      }
    } else {
      this.speed = this.baseSpeed;
      this.isChilled = false;
    }

    this.bobbing += dt * 5;
    this.z = Math.sin(this.bobbing) * 2; // Subtle vertical hover

    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    this.x += Math.cos(angle) * this.speed * dt;
    this.y += Math.sin(angle) * this.speed * dt;
  }

  draw(ctx, originX = 0, originY = 0) {
    const screenPos = Isometric.worldToScreen(this.x, this.y, this.z, originX, originY);

    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);

    const rx = this.radius * 1.1;
    const ry = this.radius * 0.58;

    // Chilled frost aura
    if (this.isChilled) {
      ctx.beginPath();
      ctx.ellipse(0, 0, rx + 4, ry + 2, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 2.5D Extruded Body Prism
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
    ctx.lineTo(rx, -this.height);
    ctx.ellipse(0, -this.height, rx, ry, 0, 0, Math.PI, true);
    ctx.lineTo(-rx, 0);
    ctx.fillStyle = this.isChilled ? '#1a5599' : '#550022';
    ctx.fill();

    // Body Cap
    ctx.beginPath();
    ctx.ellipse(0, -this.height, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.isChilled ? '#3399ff' : this.color;
    ctx.shadowColor = this.accentColor;
    ctx.shadowBlur = 10;
    ctx.fill();

    // Eye Node
    ctx.beginPath();
    ctx.arc(0, -this.height - 1, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Mini Health Bar (when damaged)
    if (this.hp < this.maxHp) {
      const barW = this.radius * 2;
      const barH = 3;
      const pct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(-this.radius, -this.height - 10, barW, barH);
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(-this.radius, -this.height - 10, barW * pct, barH);
    }

    ctx.restore();
  }
}