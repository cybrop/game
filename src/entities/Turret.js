export class Turret {
  constructor(core, arena, bulletLayer) {
    this.core = core;
    this.arena = arena;
    this.bulletLayer = bulletLayer;
    this.cooldown = 0;
    this.range = 210;
    this.rate = 0.4;
  }

  update(enemies, dt) {
    this.cooldown -= dt;

    if (this.cooldown <= 0 && enemies.length) {
      const target = this.getTarget(enemies);
      if (!target) return;

      const angle = Math.atan2(target.y - this.arena.clientHeight / 2, target.x - this.arena.clientWidth / 2);
      this.fire(angle);
      this.cooldown = Math.max(0.12, this.rate / (this.core.state.turretLevel * 0.4 + 1));
    }
  }

  getTarget(enemies) {
    return enemies.reduce((best, enemy) => {
      if (!best) return enemy;
      const bestDistance = Math.hypot(best.x, best.y);
      const enemyDistance = Math.hypot(enemy.x, enemy.y);
      return enemyDistance < bestDistance ? enemy : best;
    }, null);
  }

  fire(angle) {
    const bullet = {
      x: this.arena.clientWidth / 2,
      y: this.arena.clientHeight / 2,
      vx: Math.cos(angle) * 7,
      vy: Math.sin(angle) * 7,
      radius: 6,
      damage: 12 + this.core.state.turretLevel * 2,
    };

    const element = document.createElement('div');
    element.className = 'bullet';
    element.style.left = `${bullet.x}px`;
    element.style.top = `${bullet.y}px`;
    this.bulletLayer.appendChild(element);
    bullet.element = element;

    this.core.state.bullets = this.core.state.bullets || [];
    this.core.state.bullets.push(bullet);
  }
}
