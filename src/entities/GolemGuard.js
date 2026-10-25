import { Isometric } from '../core/Isometric.js';
import { CONFIG } from '../config.js';

/**
 * Friendly Iron Golem Bouncer / Patrol Guard
 * Patrols around the Beacon and delivers high-knockback uppercut punches to encroaching mobs.
 */
export class GolemGuard {
  constructor(orbitAngle = 0) {
    this.orbitAngle = orbitAngle;
    this.orbitRadius = CONFIG.GOLEM_GUARD.PATROL_RADIUS;
    this.speed = CONFIG.GOLEM_GUARD.SPEED;
    this.damage = CONFIG.GOLEM_GUARD.DAMAGE;
    this.knockback = CONFIG.GOLEM_GUARD.KNOCKBACK;
    this.attackCooldown = CONFIG.GOLEM_GUARD.ATTACK_COOLDOWN;
    this.timeSinceAttack = 0;
    this.punchSwing = 0;

    this.x = Math.cos(this.orbitAngle) * this.orbitRadius;
    this.y = Math.sin(this.orbitAngle) * this.orbitRadius;
    this.radius = 16;
  }

  update(dt, enemies, audio, onHit) {
    this.timeSinceAttack += dt;
    if (this.punchSwing > 0) {
      this.punchSwing = Math.max(0, this.punchSwing - dt * 4);
    }

    // Patrol in orbit around Beacon
    this.orbitAngle += (this.speed / this.orbitRadius) * dt;
    this.x = Math.cos(this.orbitAngle) * this.orbitRadius;
    this.y = Math.sin(this.orbitAngle) * this.orbitRadius;

    // Detect nearby encroaching mobs
    const attackRangeSq = 32 * 32;
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;

      if (dx * dx + dy * dy < attackRangeSq && this.timeSinceAttack >= this.attackCooldown) {
        this.timeSinceAttack = 0;
        this.punchSwing = 1;

        enemy.takeDamage(this.damage);
        if (audio) audio.playImpact();

        // High knockback uppercut
        const pushAngle = Math.atan2(dy, dx);
        enemy.x += Math.cos(pushAngle) * this.knockback;
        enemy.y += Math.sin(pushAngle) * this.knockback;

        if (onHit) onHit(enemy, this.damage);
        break;
      }
    }
  }

  draw(ctx, originX = 0, originY = 0) {
    const golemColors = {
      top: '#f8f9fa',
      left: '#ced4da',
      right: '#adb5bd',
      stroke: '#495057'
    };

    const vineColors = {
      top: '#52b788',
      left: '#2d6a4f',
      right: '#1b4332',
      stroke: '#081c15'
    };

    // Body
    Isometric.drawCube(ctx, this.x, this.y, 8, 14, 10, 12, golemColors, originX, originY);
    // Vine chest decoration
    Isometric.drawCube(ctx, this.x - 3, this.y, 11, 4, 4, 6, vineColors, originX, originY);

    // Punching Arm
    const punchForward = this.punchSwing * 8;
    Isometric.drawCube(ctx, this.x + 8 + punchForward, this.y, 10, 4, 6, 12, golemColors, originX, originY);
    Isometric.drawCube(ctx, this.x - 8, this.y, 8, 4, 6, 12, golemColors, originX, originY);

    // Head
    Isometric.drawCube(ctx, this.x, this.y, 20, 8, 8, 8, golemColors, originX, originY);
  }
}