export class Enemy {
  constructor(x, y, radius, speed, hp, reward) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speed = speed;
    this.hp = hp;
    this.maxHp = hp;
    this.reward = reward;
    this.element = document.createElement('div');
    this.element.className = 'enemy';
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
    document.querySelector('#enemy-layer').appendChild(this.element);
  }

  update(dt) {
    const centerX = window.innerWidth * 0.5;
    const centerY = window.innerHeight * 0.5;
    const dx = centerX - this.x;
    const dy = centerY - this.y;
    const distance = Math.hypot(dx, dy) || 1;
    this.x += (dx / distance) * this.speed * dt * 60;
    this.y += (dy / distance) * this.speed * dt * 60;

    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y}px`;
    this.element.style.transform = `scale(${1 + (this.maxHp - this.hp) * 0.04})`;
  }

  draw() {
    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y}px`;
  }
}
