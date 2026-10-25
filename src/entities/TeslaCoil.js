import { Isometric } from '../core/Isometric.js';
import { audio, triggerScreenShake, particleSystem } from '../main.js';

export class TeslaCoil {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.range = 200;
    this.damage = 18;
    this.maxChains = 3;
    this.cooldown = 1.3;
    this.timer = 0;
    this.activeArcs = [];
  }

  update(dt, enemies) {
    this.timer += dt;

    for (let i = this.activeArcs.length - 1; i >= 0; i--) {
      this.activeArcs[i].alpha -= dt * 3.5;
      if (this.activeArcs[i].alpha <= 0) {
        const last = this.activeArcs.pop();
        if (i < this.activeArcs.length) {
          this.activeArcs[i] = last;
        }
      }
    }

    if (this.timer >= this.cooldown) {
      if (this.discharge(enemies)) {
        this.timer = 0;
      }
    }
  }

  discharge(enemies) {
    let currentTarget = null;
    let minDistSq = this.range * this.range;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        currentTarget = enemy;
      }
    }

    if (!currentTarget) return false;

    audio.playLightningStrike();
    triggerScreenShake(4);

    const hitEnemies = [currentTarget];
    this.activeArcs.push({
      x1: this.x,
      y1: this.y,
      z1: 22,
      x2: currentTarget.x,
      y2: currentTarget.y,
      z2: 12,
      alpha: 1
    });

    currentTarget.takeDamage(this.damage);
    particleSystem.emitSparks(currentTarget.x, currentTarget.y, 14, '#32d6d6', 6);

    let prev = currentTarget;
    const maxChainDistSq = 140 * 140;

    for (let chain = 1; chain < this.maxChains; chain++) {
      let nextTarget = null;
      let nextDistSq = maxChainDistSq;

      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (hitEnemies.includes(enemy)) continue;
        const dx = enemy.x - prev.x;
        const dy = enemy.y - prev.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < nextDistSq) {
          nextDistSq = dSq;
          nextTarget = enemy;
        }
      }

      if (nextTarget) {
        hitEnemies.push(nextTarget);
        this.activeArcs.push({
          x1: prev.x,
          y1: prev.y,
          z1: 12,
          x2: nextTarget.x,
          y2: nextTarget.y,
          z2: 12,
          alpha: 1
        });

        const chainDamage = Math.round(this.damage * 0.75);
        nextTarget.takeDamage(chainDamage);
        particleSystem.emitSparks(nextTarget.x, nextTarget.y, 14, '#32d6d6', 5);
        prev = nextTarget;
      } else {
        break;
      }
    }

    return true;
  }

  draw(ctx, originX = 0, originY = 0) {
    for (let i = 0; i < this.activeArcs.length; i++) {
      const arc = this.activeArcs[i];
      const p1 = Isometric.worldToScreen(arc.x1, arc.y1, arc.z1, originX, originY);
      const p2 = Isometric.worldToScreen(arc.x2, arc.y2, arc.z2, originX, originY);

      ctx.save();
      ctx.strokeStyle = `rgba(100, 240, 255, ${Math.max(0, arc.alpha)})`;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);

      const midX = (p1.x + p2.x) * 0.5 + (Math.random() - 0.5) * 18;
      const midY = (p1.y + p2.y) * 0.5 + (Math.random() - 0.5) * 18;
      ctx.lineTo(midX, midY);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
    }

    const pylon = Isometric.worldToScreen(this.x, this.y, 20, originX, originY);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(pylon.x, pylon.y, 10, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#b87333';
    ctx.fill();
    ctx.strokeStyle = '#e09858';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}