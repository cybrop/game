export class Enemy {
  constructor(x, y, type = 'crawler', waveMultiplier = 1) {
    this.x = x;
    this.y = y;
    this.type = type;

    if (type === 'crawler') {
      this.radius = 11;
      this.baseSpeed = 46 * (1 + (waveMultiplier - 1) * 0.05);
      this.maxHp = Math.round(20 * waveMultiplier);
      this.damage = 10;
      this.reward = 8;
      this.color = '#ff0055';
      this.accentColor = '#ff5599';
    } else {
      // Brute / Siege
      this.radius = 18;
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
    // Process chilling status
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) {
        this.speed = this.baseSpeed;
        this.isChilled = false;
      }
    }

    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    this.x += Math.cos(angle) * this.speed * dt;
    this.y += Math.sin(angle) * this.speed * dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Chilled visual aura
    if (this.isChilled) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Body
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.isChilled ? '#3399ff' : this.color;
    ctx.shadowColor = this.accentColor;
    ctx.shadowBlur = 10;
    ctx.fill();

    // Inner detail
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // HP Mini Bar (only when damaged)
    if (this.hp < this.maxHp) {
      const barW = this.radius * 2;
      const barH = 3;
      const pct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-this.radius, -this.radius - 8, barW, barH);
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(-this.radius, -this.radius - 8, barW * pct, barH);
    }

    ctx.restore();
  }
}