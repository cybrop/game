import { addFloatingText, createExplosion } from '../main.js';

export class TeslaCoil {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.range = 200;
    this.damage = 18;
    this.maxChains = 3;
    this.cooldown = 1.3; // seconds
    this.timer = 0;
    this.activeArcs = []; // Store lines for drawing
  }

  update(dt, enemies) {
    this.timer += dt;

    // Decay visual arcs
    for (let i = this.activeArcs.length - 1; i >= 0; i--) {
      this.activeArcs[i].alpha -= dt * 3.5;
      if (this.activeArcs[i].alpha <= 0) {
        this.activeArcs.splice(i, 1);
      }
    }

    if (this.timer >= this.cooldown) {
      if (this.discharge(enemies)) {
        this.timer = 0;
      }
    }
  }

  discharge(enemies) {
    // Find initial target
    let currentTarget = null;
    let minDist = this.range;

    for (const enemy of enemies) {
      const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (d < minDist) {
        minDist = d;
        currentTarget = enemy;
      }
    }

    if (!currentTarget) return false;

    const hitEnemies = [currentTarget];
    this.activeArcs.push({
      x1: this.x,
      y1: this.y,
      x2: currentTarget.x,
      y2: currentTarget.y,
      alpha: 1
    });

    currentTarget.takeDamage(this.damage);
    addFloatingText(currentTarget.x, currentTarget.y, `-${this.damage}`, '#00ffea');
    createExplosion(currentTarget.x, currentTarget.y, '#00ffea', 5);

    // Chain to nearby enemies
    let prev = currentTarget;
    for (let chain = 1; chain < this.maxChains; chain++) {
      let nextTarget = null;
      let nextDist = 140;

      for (const enemy of enemies) {
        if (hitEnemies.includes(enemy)) continue;
        const d = Math.hypot(enemy.x - prev.x, enemy.y - prev.y);
        if (d < nextDist) {
          nextDist = d;
          nextTarget = enemy;
        }
      }

      if (nextTarget) {
        hitEnemies.push(nextTarget);
        this.activeArcs.push({
          x1: prev.x,
          y1: prev.y,
          x2: nextTarget.x,
          y2: nextTarget.y,
          alpha: 1
        });

        const chainDamage = Math.round(this.damage * 0.75);
        nextTarget.takeDamage(chainDamage);
        addFloatingText(nextTarget.x, nextTarget.y, `-${chainDamage}`, '#00ffea');
        createExplosion(nextTarget.x, nextTarget.y, '#00ffea', 4);
        prev = nextTarget;
      } else {
        break;
      }
    }

    return true;
  }

  draw(ctx) {
    // Draw animated electrical lightning arcs
    for (const arc of this.activeArcs) {
      ctx.save();
      ctx.strokeStyle = `rgba(0, 255, 234, ${Math.max(0, arc.alpha)})`;
      ctx.shadowColor = '#00ffea';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(arc.x1, arc.y1);

      // Jagged lightning segment
      const midX = (arc.x1 + arc.x2) / 2 + (Math.random() - 0.5) * 20;
      const midY = (arc.y1 + arc.y2) / 2 + (Math.random() - 0.5) * 20;
      ctx.lineTo(midX, midY);
      ctx.lineTo(arc.x2, arc.y2);
      ctx.stroke();
      ctx.restore();
    }

    // Tesla core node
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 255, 234, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}