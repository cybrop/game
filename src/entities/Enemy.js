import { Isometric } from '../core/Isometric.js';

/**
 * 2.5D Voxel Mobs:
 * 1. Crawler: Miner Zombie (Humanoid)
 * 2. Brute: Heavy Stone Golem
 * 3. Creeper: Nether Bomber (Kamikaze swelling mob)
 * 4. Skeleton: Ranged sniper mob
 * 5. Boss: Wither Beast (every 5 waves)
 */
export class Enemy {
  constructor(x, y, type = 'crawler', waveMultiplier = 1) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.type = type;
    this.facingAngle = 0;

    // Burn status (Flame enchantment)
    this.burnTimer = 0;
    this.burnTickTimer = 0;

    if (type === 'crawler') {
      this.radius = 12;
      this.height = 28;
      this.baseSpeed = 46 * (1 + (waveMultiplier - 1) * 0.05);
      this.maxHp = Math.round(20 * waveMultiplier);
      this.damage = 10;
      this.reward = 8;
      this.accentColor = '#2d6a4f';
    } else if (type === 'creeper') {
      this.radius = 13;
      this.height = 26;
      this.baseSpeed = 52 * (1 + (waveMultiplier - 1) * 0.05);
      this.maxHp = Math.round(18 * waveMultiplier);
      this.damage = 38; // Kamikaze core damage
      this.reward = 12;
      this.accentColor = '#52b788';
      this.fuseTimer = 0;
      this.isHissing = false;
      this.fuseDuration = 1.3;
    } else if (type === 'skeleton') {
      this.radius = 11;
      this.height = 28;
      this.baseSpeed = 36 * (1 + (waveMultiplier - 1) * 0.04);
      this.maxHp = Math.round(24 * waveMultiplier);
      this.damage = 12;
      this.reward = 10;
      this.accentColor = '#adb5bd';
      this.shootCooldown = 2.0;
      this.timeSinceShot = Math.random() * 1.5;
    } else if (type === 'boss') {
      this.radius = 28;
      this.height = 54;
      this.baseSpeed = 22 * (1 + (waveMultiplier - 1) * 0.02);
      this.maxHp = Math.round(280 * waveMultiplier);
      this.damage = 50;
      this.reward = 100;
      this.accentColor = '#7209b7';
      this.isBoss = true;
    } else {
      // Brute Stone Golem
      this.radius = 20;
      this.height = 36;
      this.baseSpeed = 28 * (1 + (waveMultiplier - 1) * 0.03);
      this.maxHp = Math.round(70 * waveMultiplier);
      this.damage = 25;
      this.reward = 25;
      this.accentColor = '#8a5a44';
    }

    this.hp = this.maxHp;
    this.speed = this.baseSpeed;
    this.slowTimer = 0;
    this.isChilled = false;

    this.stridePhase = Math.random() * Math.PI * 2;
    this.legSwing = 0;
    this.armSwing = 0;
  }

  applySlow(multiplier = 0.5, duration = 0.6) {
    this.speed = this.baseSpeed * multiplier;
    this.slowTimer = duration;
    this.isChilled = true;
  }

  applyBurn(duration = 2.5) {
    this.burnTimer = Math.max(this.burnTimer, duration);
  }

  takeDamage(amount) {
    this.hp -= amount;
  }

  isDead() {
    return this.hp <= 0;
  }

  update(dt, targetX, targetY, bullets, onCreeperExplode, audio) {
    // Process slow
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

    // Process burn (Flame I damage over time)
    if (this.burnTimer > 0) {
      this.burnTimer -= dt;
      this.burnTickTimer += dt;
      if (this.burnTickTimer >= 0.5) {
        this.burnTickTimer = 0;
        this.takeDamage(3);
      }
    }

    const distToTarget = Math.hypot(targetX - this.x, targetY - this.y);
    this.facingAngle = Math.atan2(targetY - this.y, targetX - this.x);

    // Creeper Kamikaze fuse logic
    if (this.type === 'creeper') {
      if (distToTarget <= 65) {
        if (!this.isHissing) {
          this.isHissing = true;
          this.speed = this.baseSpeed * 1.35; // Sprint during fuse
          if (audio) audio.playMobDamage(false);
        }
        this.fuseTimer += dt;
        if (this.fuseTimer >= this.fuseDuration) {
          if (onCreeperExplode) onCreeperExplode(this);
          this.hp = 0;
          return;
        }
      }
    }

    // Skeleton Archer ranged standoff
    if (this.type === 'skeleton') {
      if (distToTarget <= 190) {
        // Stop and shoot arrows
        this.timeSinceShot += dt;
        if (this.timeSinceShot >= this.shootCooldown) {
          this.timeSinceShot = 0;
          // Shoot enemy arrow at core
          if (bullets) {
            import('./Bullet.js').then(({ Bullet }) => {
              bullets.push(new Bullet(this.x, this.y, this.height - 4, this.facingAngle, this.damage, distToTarget, true));
              if (audio) audio.playArrowTwang();
            });
          }
        }
        return; // Don't march closer
      }
    }

    // Advance walking stride animation
    const strideSpeed = (this.speed * 0.05) * 4;
    this.stridePhase += dt * strideSpeed;
    this.legSwing = Math.sin(this.stridePhase);
    this.armSwing = Math.cos(this.stridePhase);

    this.x += Math.cos(this.facingAngle) * this.speed * dt;
    this.y += Math.sin(this.facingAngle) * this.speed * dt;
  }

  draw(ctx, originX = 0, originY = 0) {
    const screenPos = Isometric.worldToScreen(this.x, this.y, this.z, originX, originY);

    // 1. Ground Shadow
    const shadowW = this.radius * 1.5;
    const shadowH = shadowW * 0.5;
    const shadowY = screenPos.y + this.z + 2;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(screenPos.x, shadowY, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();
    ctx.restore();

    // 2. Voxel Model Drawing
    if (this.type === 'crawler') {
      this.drawVoxelZombie(ctx, originX, originY);
    } else if (this.type === 'creeper') {
      this.drawVoxelCreeper(ctx, originX, originY);
    } else if (this.type === 'skeleton') {
      this.drawVoxelSkeleton(ctx, originX, originY);
    } else if (this.type === 'boss') {
      this.drawVoxelBoss(ctx, originX, originY, screenPos);
    } else {
      this.drawVoxelGolem(ctx, originX, originY, screenPos);
    }

    // Flame Effect (Burning)
    if (this.burnTimer > 0) {
      ctx.save();
      ctx.fillStyle = '#ff6b35';
      ctx.fillRect(screenPos.x - 3, screenPos.y - this.height * 0.5, 6, 6);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(screenPos.x - 2, screenPos.y - this.height * 0.6, 4, 4);
      ctx.restore();
    }

    // 3. Mini Health Bar (Standard mobs)
    if (!this.isBoss && this.hp < this.maxHp) {
      const barW = this.radius * 2.2;
      const barH = 3.5;
      const pct = Math.max(0, this.hp / this.maxHp);
      const barY = screenPos.y - (this.height + 4 - this.z);

      ctx.save();
      ctx.fillStyle = '#0e0e11';
      ctx.fillRect(screenPos.x - barW / 2, barY, barW, barH);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(screenPos.x - barW / 2, barY, barW, barH);

      ctx.fillStyle = this.isChilled ? '#32d6d6' : '#28e05c';
      ctx.fillRect(screenPos.x - barW / 2 + 0.5, barY + 0.5, (barW - 1) * pct, barH - 1);
      ctx.restore();
    }
  }

  drawVoxelZombie(ctx, originX, originY) {
    const skinColors = this.isChilled ? {
      top: '#52b788', left: '#2d6a4f', right: '#1b4332', stroke: '#081c15'
    } : {
      top: '#588b43', left: '#386326', right: '#244415', stroke: '#14270c'
    };

    const shirtColors = {
      top: '#2a9d8f', left: '#21867a', right: '#155d54', stroke: '#0c3833'
    };

    const pantsColors = {
      top: '#3a506b', left: '#243346', right: '#16202c', stroke: '#0b1016'
    };

    const swingDistance = this.legSwing * 4.5;

    Isometric.drawCube(ctx, this.x - 3, this.y + swingDistance, 0, 4, 4, 12, pantsColors, originX, originY);
    Isometric.drawCube(ctx, this.x + 3, this.y - swingDistance, 0, 4, 4, 12, pantsColors, originX, originY);
    Isometric.drawCube(ctx, this.x, this.y, 12, 10, 6, 10, shirtColors, originX, originY);

    const armForwardX = Math.cos(this.facingAngle) * 5;
    const armForwardY = Math.sin(this.facingAngle) * 5;
    Isometric.drawCube(ctx, this.x - 6 + armForwardX, this.y + armForwardY, 14, 4, 9, 4, skinColors, originX, originY);
    Isometric.drawCube(ctx, this.x + 6 + armForwardX, this.y + armForwardY, 14, 4, 9, 4, skinColors, originX, originY);
    Isometric.drawCube(ctx, this.x, this.y, 22, 8, 8, 8, skinColors, originX, originY);
  }

  drawVoxelCreeper(ctx, originX, originY) {
    const isFlashing = this.isHissing && Math.floor(this.fuseTimer * 10) % 2 === 0;
    const creeperColors = isFlashing ? {
      top: '#ffffff', left: '#e0e0e0', right: '#cccccc', stroke: '#aaaaaa'
    } : {
      top: '#40916c', left: '#2d6a4f', right: '#1b4332', stroke: '#081c15'
    };

    const scaleMult = this.isHissing ? 1 + (this.fuseTimer / this.fuseDuration) * 0.25 : 1;
    const legSwing = this.legSwing * 3.5;

    // 4 Quadruped walking legs
    Isometric.drawCube(ctx, this.x - 4, this.y - 4 + legSwing, 0, 4, 4, 8, creeperColors, originX, originY);
    Isometric.drawCube(ctx, this.x + 4, this.y - 4 - legSwing, 0, 4, 4, 8, creeperColors, originX, originY);
    Isometric.drawCube(ctx, this.x - 4, this.y + 4 - legSwing, 0, 4, 4, 8, creeperColors, originX, originY);
    Isometric.drawCube(ctx, this.x + 4, this.y + 4 + legSwing, 0, 4, 4, 8, creeperColors, originX, originY);

    // Torso (Tall block)
    Isometric.drawCube(ctx, this.x, this.y, 8, 8 * scaleMult, 6 * scaleMult, 12 * scaleMult, creeperColors, originX, originY);

    // Head (Creeper frown)
    Isometric.drawCube(ctx, this.x, this.y, 20 * scaleMult, 8 * scaleMult, 8 * scaleMult, 8 * scaleMult, creeperColors, originX, originY);
  }

  drawVoxelSkeleton(ctx, originX, originY) {
    const boneColors = {
      top: '#e9ecef', left: '#ced4da', right: '#adb5bd', stroke: '#495057'
    };

    const swingDistance = this.legSwing * 4.0;

    Isometric.drawCube(ctx, this.x - 2.5, this.y + swingDistance, 0, 3, 3, 12, boneColors, originX, originY);
    Isometric.drawCube(ctx, this.x + 2.5, this.y - swingDistance, 0, 3, 3, 12, boneColors, originX, originY);
    Isometric.drawCube(ctx, this.x, this.y, 12, 8, 4, 10, boneColors, originX, originY);

    // Skeleton Bow arm
    const bowX = Math.cos(this.facingAngle) * 6;
    const bowY = Math.sin(this.facingAngle) * 6;
    Isometric.drawCube(ctx, this.x - 5 + bowX, this.y + bowY, 15, 3, 8, 3, boneColors, originX, originY);
    Isometric.drawCube(ctx, this.x + 5 + bowX, this.y + bowY, 15, 3, 8, 3, boneColors, originX, originY);
    Isometric.drawCube(ctx, this.x, this.y, 22, 7, 7, 7, boneColors, originX, originY);
  }

  drawVoxelGolem(ctx, originX, originY, screenPos) {
    const stoneGolemColors = this.isChilled ? {
      top: '#8da9c4', left: '#6584a2', right: '#415a77', stroke: '#1b263b'
    } : {
      top: '#8d99ae', left: '#5e6878', right: '#3d4450', stroke: '#212529'
    };
    const ironPlatingColors = { top: '#e9ecef', left: '#ced4da', right: '#adb5bd', stroke: '#495057' };

    const swingDistance = this.legSwing * 3.5;

    Isometric.drawCube(ctx, this.x - 5, this.y + swingDistance, 0, 6, 6, 14, stoneGolemColors, originX, originY);
    Isometric.drawCube(ctx, this.x + 5, this.y - swingDistance, 0, 6, 6, 14, stoneGolemColors, originX, originY);
    Isometric.drawCube(ctx, this.x, this.y, 14, 18, 12, 14, stoneGolemColors, originX, originY);
    Isometric.drawCube(ctx, this.x, this.y, 17, 10, 8, 8, ironPlatingColors, originX, originY);

    const fistSwing = this.armSwing * 4.5;
    Isometric.drawCube(ctx, this.x - 12, this.y - fistSwing, 8, 5, 7, 18, stoneGolemColors, originX, originY);
    Isometric.drawCube(ctx, this.x + 12, this.y + fistSwing, 8, 5, 7, 18, stoneGolemColors, originX, originY);
    Isometric.drawCube(ctx, this.x, this.y, 28, 10, 10, 10, stoneGolemColors, originX, originY);

    const headScreenY = screenPos.y - (32 - this.z);
    ctx.save();
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(screenPos.x - 3, headScreenY, 2.5, 2.5);
    ctx.fillRect(screenPos.x + 1, headScreenY, 2.5, 2.5);
    ctx.restore();
  }

  drawVoxelBoss(ctx, originX, originY, screenPos) {
    const bossColors = {
      top: '#4a0e4e', left: '#2a0845', right: '#1a042b', stroke: '#0f0219'
    };
    const ribColors = {
      top: '#adb5bd', left: '#6c757d', right: '#495057', stroke: '#212529'
    };

    // Huge hovering 3-headed Wither Beast
    const hoverZ = 8 + Math.sin(this.stridePhase * 2) * 4;

    // Spine & Ribs
    Isometric.drawCube(ctx, this.x, this.y, hoverZ, 12, 8, 22, ribColors, originX, originY);
    Isometric.drawCube(ctx, this.x, this.y, hoverZ + 22, 28, 12, 8, bossColors, originX, originY);

    // Center Main Head
    Isometric.drawCube(ctx, this.x, this.y, hoverZ + 30, 12, 12, 12, bossColors, originX, originY);
    // Left & Right Minor Heads
    Isometric.drawCube(ctx, this.x - 14, this.y, hoverZ + 26, 9, 9, 9, bossColors, originX, originY);
    Isometric.drawCube(ctx, this.x + 14, this.y, hoverZ + 26, 9, 9, 9, bossColors, originX, originY);

    // Glowing Eyes
    ctx.save();
    ctx.fillStyle = '#00f3ff';
    ctx.fillRect(screenPos.x - 4, screenPos.y - 48, 2.5, 2.5);
    ctx.fillRect(screenPos.x + 2, screenPos.y - 48, 2.5, 2.5);
    ctx.restore();
  }
}