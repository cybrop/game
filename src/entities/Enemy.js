import { Isometric } from '../core/Isometric.js';

export class Enemy {
  constructor(x, y, type = 'crawler', waveMultiplier = 1) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.type = type;
    this.facingAngle = 0;

    if (type === 'crawler') {
      this.radius = 12;
      this.height = 14;
      this.baseSpeed = 46 * (1 + (waveMultiplier - 1) * 0.05);
      this.maxHp = Math.round(20 * waveMultiplier);
      this.damage = 10;
      this.reward = 8;
      this.color = '#ff0055';
      this.accentColor = '#ff5599';
      this.hoverAltitude = 3;
    } else {
      // Brute / Heavy Armored Siege Mech
      this.radius = 20;
      this.height = 24;
      this.baseSpeed = 28 * (1 + (waveMultiplier - 1) * 0.03);
      this.maxHp = Math.round(70 * waveMultiplier);
      this.damage = 25;
      this.reward = 25;
      this.color = '#aa00ff';
      this.accentColor = '#dd55ff';
      this.hoverAltitude = 6;
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

    this.bobbing += dt * 5.5;
    this.z = this.hoverAltitude + Math.sin(this.bobbing) * 2;

    this.facingAngle = Math.atan2(targetY - this.y, targetX - this.x);
    this.x += Math.cos(this.facingAngle) * this.speed * dt;
    this.y += Math.sin(this.facingAngle) * this.speed * dt;
  }

  draw(ctx, originX = 0, originY = 0) {
    // 1. DYNAMIC GROUND SHADOW (Rendered on z = 0 plane directly below)
    const shadowPos = Isometric.worldToScreen(this.x, this.y, 0, originX, originY);
    const shadowScale = Math.max(0.6, 1 - this.z * 0.03);
    const shadowW = this.radius * 1.4 * shadowScale;
    const shadowH = shadowW * 0.5;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(shadowPos.x, shadowPos.y + 4, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();
    ctx.restore();

    // 2. ELEVATED PSEUDO-3D GEOMETRY
    const screenPos = Isometric.worldToScreen(this.x, this.y, this.z, originX, originY);

    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);

    if (this.type === 'crawler') {
      this.drawCrawler(ctx);
    } else {
      this.drawBrute(ctx);
    }

    // Mini Health Bar when taking damage
    if (this.hp < this.maxHp) {
      const barW = this.radius * 2.2;
      const barH = 3.5;
      const pct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(-barW / 2, -this.height - 12, barW, barH);
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(-barW / 2, -this.height - 12, barW * pct, barH);
    }

    ctx.restore();
  }

  drawCrawler(ctx) {
    const rx = this.radius * 1.15;
    const ry = this.radius * 0.6;

    // Chilled Frost Aura
    if (this.isChilled) {
      ctx.beginPath();
      ctx.ellipse(0, 0, rx + 4, ry + 2, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Extruded insectoid prism body (Lateral faceted walls)
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
    ctx.lineTo(rx, -this.height);
    ctx.ellipse(0, -this.height, rx, ry, 0, 0, Math.PI, true);
    ctx.lineTo(-rx, 0);
    ctx.fillStyle = this.isChilled ? '#0f294d' : '#4d001e';
    ctx.fill();
    ctx.strokeStyle = this.isChilled ? '#00b4d8' : '#880033';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Top Carapace Deck
    ctx.beginPath();
    ctx.ellipse(0, -this.height, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.isChilled ? '#0077b6' : this.color;
    ctx.shadowColor = this.accentColor;
    ctx.shadowBlur = 10;
    ctx.fill();

    // Directional Cyber Eyes tracking target
    const eyeDist = 6;
    const eyeX = Math.cos(this.facingAngle) * eyeDist;
    const eyeY = -this.height + Math.sin(this.facingAngle) * (eyeDist * 0.5);

    ctx.beginPath();
    ctx.arc(eyeX - 3, eyeY, 2, 0, Math.PI * 2);
    ctx.arc(eyeX + 3, eyeY, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 5;
    ctx.fill();
  }

  drawBrute(ctx) {
    const rx = this.radius * 1.25;
    const ry = this.radius * 0.65;

    if (this.isChilled) {
      ctx.beginPath();
      ctx.ellipse(0, 0, rx + 5, ry + 3, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Heavy Armor Chassis Base extrusion
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
    ctx.lineTo(rx, -this.height);
    ctx.ellipse(0, -this.height, rx, ry, 0, 0, Math.PI, true);
    ctx.lineTo(-rx, 0);

    const gradBrute = ctx.createLinearGradient(-rx, 0, rx, 0);
    gradBrute.addColorStop(0, '#1c0533');
    gradBrute.addColorStop(0.5, '#420d75');
    gradBrute.addColorStop(1, '#150326');
    ctx.fillStyle = gradBrute;
    ctx.fill();
    ctx.strokeStyle = '#dd55ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Armored Top Deck Plate
    ctx.beginPath();
    ctx.ellipse(0, -this.height, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.isChilled ? '#0077b6' : '#6b0fa3';
    ctx.shadowColor = this.accentColor;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.stroke();

    // Power Core Vents
    ctx.beginPath();
    ctx.arc(0, -this.height, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff0077';
    ctx.shadowColor = '#ff0077';
    ctx.shadowBlur = 8;
    ctx.fill();
  }
}