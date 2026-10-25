import { Isometric } from '../core/Isometric.js';

/**
 * 2.5D Voxel Mobs (Humanoid Zombie & Heavy Stone Golem Brute)
 * Features hierarchical limb articulation (Head, Torso, Arms, Legs)
 * with animated walking swing cycles.
 */
export class Enemy {
  constructor(x, y, type = 'crawler', waveMultiplier = 1) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.type = type;
    this.facingAngle = 0;

    if (type === 'crawler') {
      // Voxel Zombie (Humanoid)
      this.radius = 12;
      this.height = 28; // Total height in world voxels
      this.baseSpeed = 46 * (1 + (waveMultiplier - 1) * 0.05);
      this.maxHp = Math.round(20 * waveMultiplier);
      this.damage = 10;
      this.reward = 8;
      this.accentColor = '#2d6a4f';
    } else {
      // Stone/Iron Golem Brute (Heavy Beast)
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

    // Articulation & Gait Animation
    this.stridePhase = Math.random() * Math.PI * 2;
    this.legSwing = 0;
    this.armSwing = 0;
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

    // Advance walking stride animation (swing speed scales with walk speed)
    const strideSpeed = (this.speed / 20) * 4;
    this.stridePhase += dt * strideSpeed;
    this.legSwing = Math.sin(this.stridePhase);
    this.armSwing = Math.cos(this.stridePhase);

    // Track heading toward center Beacon
    this.facingAngle = Math.atan2(targetY - this.y, targetX - this.x);
    this.x += Math.cos(this.facingAngle) * this.speed * dt;
    this.y += Math.sin(this.facingAngle) * this.speed * dt;
  }

  draw(ctx, originX = 0, originY = 0) {
    // 1. Voxel Footprint Ground Shadow on z = 0
    const shadowPos = Isometric.worldToScreen(this.x, this.y, 0, originX, originY);
    const shadowW = this.radius * 1.5;
    const shadowH = shadowW * 0.5;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(shadowPos.x, shadowPos.y + 2, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();
    ctx.restore();

    // 2. Hierarchical Voxel Limbs Assembly
    if (this.type === 'crawler') {
      this.drawVoxelZombie(ctx, originX, originY);
    } else {
      this.drawVoxelGolem(ctx, originX, originY);
    }

    // 3. Minecraft Mini Health Bar
    if (this.hp < this.maxHp) {
      const headPos = Isometric.worldToScreen(this.x, this.y, this.height + 4, originX, originY);
      const barW = this.radius * 2.2;
      const barH = 3.5;
      const pct = Math.max(0, this.hp / this.maxHp);

      ctx.save();
      ctx.fillStyle = '#0e0e11';
      ctx.fillRect(headPos.x - barW / 2, headPos.y, barW, barH);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(headPos.x - barW / 2, headPos.y, barW, barH);

      ctx.fillStyle = this.isChilled ? '#32d6d6' : '#28e05c';
      ctx.fillRect(headPos.x - barW / 2 + 0.5, headPos.y + 0.5, (barW - 1) * pct, barH - 1);
      ctx.restore();
    }
  }

  /**
   * Humanoid Miner Zombie Assembly
   * Head (8x8), Torso (8x12), Arms (reaching out forward), Legs (walking stride)
   */
  drawVoxelZombie(ctx, originX, originY) {
    // Palette (Standard Zombie vs Chilled Frost Zombie)
    const skinColors = this.isChilled ? {
      top: '#52b788',
      left: '#2d6a4f',
      right: '#1b4332',
      stroke: '#081c15'
    } : {
      top: '#588b43',
      left: '#386326',
      right: '#244415',
      stroke: '#14270c'
    };

    const shirtColors = this.isChilled ? {
      top: '#a9d6e5',
      left: '#61a5c2',
      right: '#2a6f97',
      stroke: '#013a63'
    } : {
      top: '#2a9d8f',
      left: '#21867a',
      right: '#155d54',
      stroke: '#0c3833'
    };

    const pantsColors = {
      top: '#3a506b',
      left: '#243346',
      right: '#16202c',
      stroke: '#0b1016'
    };

    const swingDistance = this.legSwing * 4.5;

    // --- LEGS (Elevation: z = 0 to 12) ---
    // Left Leg
    Isometric.drawCube(
      ctx,
      this.x - 3 + Math.cos(this.facingAngle + Math.PI / 2) * 2,
      this.y + swingDistance,
      0,
      4, 4, 12,
      pantsColors,
      originX, originY
    );
    // Right Leg
    Isometric.drawCube(
      ctx,
      this.x + 3 - Math.cos(this.facingAngle + Math.PI / 2) * 2,
      this.y - swingDistance,
      0,
      4, 4, 12,
      pantsColors,
      originX, originY
    );

    // --- TORSO (Elevation: z = 12 to 22) ---
    Isometric.drawCube(
      ctx,
      this.x,
      this.y,
      12,
      10, 6, 10,
      shirtColors,
      originX, originY
    );

    // --- ARMS (Reaching forward in classic zombie posture) ---
    const armForwardX = Math.cos(this.facingAngle) * 5;
    const armForwardY = Math.sin(this.facingAngle) * 5;

    // Left Arm
    Isometric.drawCube(
      ctx,
      this.x - 6 + armForwardX,
      this.y + armForwardY + (this.armSwing * 1.5),
      14,
      4, 9, 4,
      skinColors,
      originX, originY
    );

    // Right Arm
    Isometric.drawCube(
      ctx,
      this.x + 6 + armForwardX,
      this.y + armForwardY - (this.armSwing * 1.5),
      14,
      4, 9, 4,
      skinColors,
      originX, originY
    );

    // --- HEAD (Elevation: z = 22 to 30) ---
    Isometric.drawCube(
      ctx,
      this.x,
      this.y,
      22,
      8, 8, 8,
      skinColors,
      originX, originY
    );
  }

  /**
   * Heavy Stone Golem Beast Assembly
   * Broad 2-block wide stone torso, massive swinging fists, thick legs, and glowing red eyes
   */
  drawVoxelGolem(ctx, originX, originY) {
    const stoneGolemColors = this.isChilled ? {
      top: '#8da9c4',
      left: '#6584a2',
      right: '#415a77',
      stroke: '#1b263b'
    } : {
      top: '#8d99ae',
      left: '#5e6878',
      right: '#3d4450',
      stroke: '#212529'
    };

    const ironPlatingColors = {
      top: '#e9ecef',
      left: '#ced4da',
      right: '#adb5bd',
      stroke: '#495057'
    };

    const mossyAccentColors = {
      top: '#588157',
      left: '#3a5a40',
      right: '#344e41',
      stroke: '#1c2826'
    };

    const swingDistance = this.legSwing * 3.5;

    // --- LEGS (Thick 6x6 stone columns, z = 0 to 14) ---
    // Left Leg
    Isometric.drawCube(
      ctx,
      this.x - 5,
      this.y + swingDistance,
      0,
      6, 6, 14,
      stoneGolemColors,
      originX, originY
    );

    // Right Leg
    Isometric.drawCube(
      ctx,
      this.x + 5,
      this.y - swingDistance,
      0,
      6, 6, 14,
      stoneGolemColors,
      originX, originY
    );

    // --- BROAD TORSO (Heavy stone & iron chestplate, z = 14 to 28) ---
    Isometric.drawCube(
      ctx,
      this.x,
      this.y,
      14,
      18, 12, 14,
      stoneGolemColors,
      originX, originY
    );

    // Iron Chestplate Front Ingot
    Isometric.drawCube(
      ctx,
      this.x + Math.cos(this.facingAngle) * 3,
      this.y + Math.sin(this.facingAngle) * 3,
      17,
      10, 8, 8,
      ironPlatingColors,
      originX, originY
    );

    // Moss shoulder patch
    Isometric.drawCube(
      ctx,
      this.x - 7,
      this.y,
      24,
      6, 6, 4,
      mossyAccentColors,
      originX, originY
    );

    // --- HEAVY SWINGING ARMS & FISTS (z = 8 to 26) ---
    const fistSwing = this.armSwing * 4.5;

    // Left Arm
    Isometric.drawCube(
      ctx,
      this.x - 12,
      this.y - fistSwing,
      8,
      5, 7, 18,
      stoneGolemColors,
      originX, originY
    );

    // Right Arm
    Isometric.drawCube(
      ctx,
      this.x + 12,
      this.y + fistSwing,
      8,
      5, 7, 18,
      stoneGolemColors,
      originX, originY
    );

    // --- GOLEM HEAD (Elongated stone brow, z = 28 to 38) ---
    Isometric.drawCube(
      ctx,
      this.x,
      this.y,
      28,
      10, 10, 10,
      stoneGolemColors,
      originX, originY
    );

    // Red glowing eyes tracking target
    const headScreen = Isometric.worldToScreen(this.x, this.y, 32, originX, originY);
    const eyeOffsetX = Math.cos(this.facingAngle) * 4;
    const eyeOffsetY = Math.sin(this.facingAngle) * 2;

    ctx.save();
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(headScreen.x - 3 + eyeOffsetX, headScreen.y + eyeOffsetY, 2.5, 2.5);
    ctx.fillRect(headScreen.x + 1 + eyeOffsetX, headScreen.y + eyeOffsetY, 2.5, 2.5);
    ctx.restore();
  }
}