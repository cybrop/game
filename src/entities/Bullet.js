export class Bullet {
  constructor(x, y, vx, vy, damage, radius = 6) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.radius = radius;
    this.element = document.createElement('div');
    this.element.className = 'bullet';
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
    document.querySelector('#bullet-layer').appendChild(this.element);
  }

  update(dt) {
    this.x += this.vx * 60 * dt;
    this.y += this.vy * 60 * dt;
    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y}px`;
  }

  destroy() {
    this.element.remove();
  }
}
