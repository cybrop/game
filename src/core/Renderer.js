import { Isometric } from './Isometric.js';

/**
 * Multi-pass 2.5D Isometric Render Pipeline
 * Features layered Minecraft voxel terrain (grass, dirt, stone, bedrock),
 * step-down quarry excavation, and redstone wire conduits.
 */
export class Renderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.redstonePulseTime = 0;
  }

  renderScene({
    dpr,
    logicalWidth,
    logicalHeight,
    dt,
    energyRate,
    shake,
    core,
    turret,
    teslaCoil,
    cryoField,
    waveManager,
    bullets,
    particleSystem,
    floatingTexts
  }) {
    const ctx = this.ctx;
    const originX = logicalWidth / 2;
    const originY = logicalHeight / 2 + 30;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(shake.offsetX, shake.offsetY);
    ctx.clearRect(-40, -40, logicalWidth + 80, logicalHeight + 80);

    // ==========================================
    // Pass 1: Layered Voxel Terrain & Redstone Wire Conduits
    // ==========================================
    this.renderVoxelTerrain(ctx, originX, originY);
    this.renderRedstoneWireConduits(ctx, originX, originY, dt, energyRate);

    // ==========================================
    // Pass 2: Field Auras & Ground-Level FX
    // ==========================================
    if (cryoField) {
      this.renderSoulFrostAura(ctx, cryoField, originX, originY);
    }
    if (particleSystem) {
      particleSystem.drawGroundFX(ctx, originX, originY);
    }

    // ==========================================
    // Pass 3: Depth-Sorted Voxel Entities & 3D Projectiles
    // ==========================================
    this.renderDepthSortedEntities(ctx, originX, originY, core, turret, teslaCoil, waveManager.enemies, bullets);

    // ==========================================
    // Pass 4: Airborne Voxel Particles & Combat Text
    // ==========================================
    if (particleSystem) {
      particleSystem.drawAirborneParticles(ctx, originX, originY);
    }
    this.renderFloatingText(ctx, floatingTexts);

    ctx.restore();
  }

  /**
   * Renders layered blocky Minecraft terrain with grass tops, dirt layers,
   * cobblestone borders, and a sunken center mining quarry.
   */
  renderVoxelTerrain(ctx, originX, originY) {
    const blockSize = 48;
    const halfBlocks = 6; // Grid size spanning -6 to +6 blocks

    // Ground grass color palettes
    const blockColorsA = {
      top: '#598a35',     // Grass green top
      left: '#4a331c',    // Dirt side left
      right: '#362412',   // Dirt side right
      stroke: '#281c10'
    };

    const blockColorsB = {
      top: '#4e7e2d',     // Slightly darker grass variant
      left: '#432d18',
      right: '#30200f',
      stroke: '#281c10'
    };

    const stoneBlockColors = {
      top: '#6e6e73',     // Stone top
      left: '#545459',    // Stone side
      right: '#3c3c40',
      stroke: '#1e1e20'
    };

    const bedrockColors = {
      top: '#1b1b1e',
      left: '#121214',
      right: '#0b0b0d',
      stroke: '#050506'
    };

    // 1. Draw Outer Terrain Blocks
    for (let gx = -halfBlocks; gx <= halfBlocks; gx++) {
      for (let gy = -halfBlocks; gy <= halfBlocks; gy++) {
        const wx = gx * blockSize;
        const wy = gy * blockSize;
        const distFromCenter = Math.hypot(gx, gy);

        // Center quarry excavation hole: skip drawing full grass block in quarry area
        if (distFromCenter < 2.0) continue;

        const isVariant = (Math.abs(gx + gy)) % 2 === 0;
        const colors = distFromCenter > 4.5 ? stoneBlockColors : (isVariant ? blockColorsA : blockColorsB);

        // Ground elevation is 0, block height is 16
        Isometric.drawCube(ctx, wx, wy, -16, blockSize, blockSize, 16, colors, originX, originY);
      }
    }

    // 2. Draw Sunken Quarry Excavation (Step-down stone tiers leading to bedrock)
    // Tier -1: Stepped Cobblestone Rim
    const rimBlocks = [
      { gx: -1, gy: -1 }, { gx: 0, gy: -1 }, { gx: 1, gy: -1 },
      { gx: -1, gy: 0 },                     { gx: 1, gy: 0 },
      { gx: -1, gy: 1 },  { gx: 0, gy: 1 },  { gx: 1, gy: 1 }
    ];

    rimBlocks.forEach(b => {
      Isometric.drawCube(ctx, b.gx * blockSize, b.gy * blockSize, -32, blockSize, blockSize, 16, stoneBlockColors, originX, originY);
    });

    // Tier -2: Deep Center Bedrock Foundation Plate
    Isometric.drawCube(ctx, 0, 0, -42, blockSize * 1.5, blockSize * 1.5, 10, bedrockColors, originX, originY);
  }

  /**
   * Renders Redstone dust wire paths running along the ground blocks toward the central beacon,
   * complete with redstone dust particles flowing along the lines.
   */
  renderRedstoneWireConduits(ctx, originX, originY, dt, energyRate) {
    this.redstonePulseTime += dt * (1.5 + energyRate * 0.08);

    const wirePaths = [
      // Orthogonal cardinal lines
      { x1: 280, y1: 0, x2: 45, y2: 0 },
      { x1: -280, y1: 0, x2: -45, y2: 0 },
      { x1: 0, y1: 280, x2: 0, y2: 45 },
      { x1: 0, y1: -280, x2: 0, y2: -45 },
      // Diagonal branch lines
      { x1: 200, y1: 200, x2: 35, y2: 35 },
      { x1: -200, y1: 200, x2: -35, y2: 35 },
      { x1: 200, y1: -200, x2: 35, y2: -35 },
      { x1: -200, y1: -200, x2: -35, y2: -35 }
    ];

    ctx.save();

    wirePaths.forEach((path, idx) => {
      const p1 = Isometric.worldToScreen(path.x1, path.y1, 1, originX, originY);
      const p2 = Isometric.worldToScreen(path.x2, path.y2, 1, originX, originY);

      // Redstone wire track (dark crimson wire line)
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = '#6e0f0f';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Redstone wire active core line (bright red)
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = '#d61c1c';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Flowing redstone signal pulse node (Minecraft redstone dust particle)
      const packetOffset = (this.redstonePulseTime * 0.35 + idx / wirePaths.length) % 1;
      const curX = path.x1 + (path.x2 - path.x1) * packetOffset;
      const curY = path.y1 + (path.y2 - path.y1) * packetOffset;
      const pulseScreen = Isometric.worldToScreen(curX, curY, 3, originX, originY);

      // Redstone square dust packet
      ctx.fillStyle = '#ff2b2b';
      ctx.fillRect(pulseScreen.x - 3, pulseScreen.y - 3, 6, 6);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(pulseScreen.x - 3, pulseScreen.y - 3, 6, 6);
    });

    ctx.restore();
  }

  /**
   * Soul Frost Brazier aura (Cryo field reskinned to soul fire blue)
   */
  renderSoulFrostAura(ctx, cryoField, originX, originY) {
    ctx.save();
    const center = Isometric.worldToScreen(cryoField.x, cryoField.y, 1, originX, originY);
    const wave = Math.sin(cryoField.pulse) * 4;
    const rx = (cryoField.radius + wave) * Isometric.COS_A * 2;
    const ry = (cryoField.radius + wave) * Isometric.SIN_A * 2;

    ctx.beginPath();
    ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(40, 190, 220, 0.08)';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(60, 220, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.restore();
  }

  renderDepthSortedEntities(ctx, originX, originY, core, turret, teslaCoil, enemies, bullets) {
    const renderList = [];

    // Core & Elevated Turret Base
    renderList.push({
      depth: core.x + core.y,
      render: () => {
        turret.drawRange(ctx, originX, originY);
        core.draw(ctx, originX, originY);
        turret.draw(ctx, originX, originY);
        if (teslaCoil) teslaCoil.draw(ctx, originX, originY);
      }
    });

    // Enemies
    enemies.forEach((enemy) => {
      renderList.push({
        depth: enemy.x + enemy.y,
        render: () => enemy.draw(ctx, originX, originY)
      });
    });

    // Bullets
    bullets.forEach((bullet) => {
      renderList.push({
        depth: bullet.x + bullet.y + (bullet.z * 0.05),
        render: () => bullet.draw(ctx, originX, originY)
      });
    });

    renderList.sort((a, b) => a.depth - b.depth);

    for (let i = 0; i < renderList.length; i++) {
      renderList[i].render();
    }
  }

  renderFloatingText(ctx, floatingTexts) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy * 0.016;
      ft.alpha -= 0.016 / ft.life;

      if (ft.alpha <= 0) {
        floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `bold ${ft.size}px 'Courier New', monospace`;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillText(ft.text, ft.x - 12, ft.y);
      ctx.restore();
    }
  }
}