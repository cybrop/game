export class Bullet {
  constructor(x, y, angle, damage) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 460; // px / sec
    this.damage = damage;
    this.radius = 3.5;
  }

  update(dt) {
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
  }

  isOffscreen(width, height) {
    return this.x < -20 || this.x > width + 20 || this.y < -20 || this.y > height + 20;
  }

  draw(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }
}