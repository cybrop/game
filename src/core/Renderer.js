import { Isometric } from './Isometric.js';

/**
 * Multi-pass 2.5D Isometric Render Pipeline
 * Features cached offscreen voxel terrain, pre-rendered redstone wire conduits,
 * and zero-allocation depth sorting.
 */
export class Renderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.redstonePulseTime = 0;

    // Offscreen cached terrain canvas to eliminate ~500 draw calls per frame
    this.terrainCanvas = document.createElement('canvas');
    this.terrainCtx = this.terrainCanvas.getContext('2d');
    this.cachedWidth = 0;
    this.cachedHeight = 0;
    this.cachedDpr = 0;

    // Reusable draw list to eliminate garbage collection allocations
    this.drawQueue = [];
    this.currentCore = null;
    this.currentTurret = null;
    this.currentTesla = null;

    this.coreGroup = {
      depth: 0,
      draw: (ctx, originX, originY) => {
        if (this.currentTurret) this.currentTurret.drawRange(ctx, originX, originY);
        if (this.currentCore) this.currentCore.draw(ctx, originX, originY);
        if (this.currentTurret) this.currentTurret.draw(ctx, originX, originY);
        if (this.currentTesla) this.currentTesla.draw(ctx, originX, originY);
      }
    };
  }

  invalidateTerrain() {
    this.cachedWidth = 0;
    this.cachedHeight = 0;
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
    const originX = logicalWidth * 0.5;
    const originY = logicalHeight * 0.5 + 30;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(shake.offsetX, shake.offsetY);
    ctx.clearRect(-40, -40, logicalWidth + 80, logicalHeight + 80);

    // ==========================================
    // Pass 1: Blit Cached Voxel Terrain
    // ==========================================
    if (this.cachedWidth !== logicalWidth || this.cachedHeight !== logicalHeight || this.cachedDpr !== dpr) {
      this.updateTerrainCache(dpr, logicalWidth, logicalHeight, originX, originY);
    }
    ctx.drawImage(this.terrainCanvas, 0, 0, logicalWidth, logicalHeight);
    this.renderRedstonePulses(ctx, originX, originY, dt, energyRate);

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

  updateTerrainCache(dpr, logicalWidth, logicalHeight, originX, originY) {
    this.cachedWidth = logicalWidth;
    this.cachedHeight = logicalHeight;
    this.cachedDpr = dpr;

    this.terrainCanvas.width = Math.floor(logicalWidth * dpr);
    this.terrainCanvas.height = Math.floor(logicalHeight * dpr);

    const tCtx = this.terrainCtx;
    tCtx.save();
    tCtx.scale(dpr, dpr);
    tCtx.clearRect(0, 0, logicalWidth, logicalHeight);

    this.renderVoxelTerrain(tCtx, originX, originY);
    this.renderStaticRedstoneWires(tCtx, originX, originY);

    tCtx.restore();
  }

  renderVoxelTerrain(ctx, originX, originY) {
    const blockSize = 48;
    const halfBlocks = 6;

    const blockColorsA = {
      top: '#598a35',
      left: '#4a331c',
      right: '#362412',
      stroke: '#281c10'
    };

    const blockColorsB = {
      top: '#4e7e2d',
      left: '#432d18',
      right: '#30200f',
      stroke: '#281c10'
    };

    const stoneBlockColors = {
      top: '#6e6e73',
      left: '#545459',
      right: '#3c3c40',
      stroke: '#1e1e20'
    };

    const bedrockColors = {
      top: '#1b1b1e',
      left: '#121214',
      right: '#0b0b0d',
      stroke: '#050506'
    };

    for (let gx = -halfBlocks; gx <= halfBlocks; gx++) {
      for (let gy = -halfBlocks; gy <= halfBlocks; gy++) {
        const wx = gx * blockSize;
        const wy = gy * blockSize;
        const distFromCenter = Math.hypot(gx, gy);

        if (distFromCenter < 2.0) continue;

        const isVariant = (Math.abs(gx + gy)) % 2 === 0;
        const colors = distFromCenter > 4.5 ? stoneBlockColors : (isVariant ? blockColorsA : blockColorsB);

        Isometric.drawCube(ctx, wx, wy, -16, blockSize, blockSize, 16, colors, originX, originY);
      }
    }

    const rimBlocks = [
      { gx: -1, gy: -1 }, { gx: 0, gy: -1 }, { gx: 1, gy: -1 },
      { gx: -1, gy: 0 },                     { gx: 1, gy: 0 },
      { gx: -1, gy: 1 },  { gx: 0, gy: 1 },  { gx: 1, gy: 1 }
    ];

    for (let i = 0; i < rimBlocks.length; i++) {
      const b = rimBlocks[i];
      Isometric.drawCube(ctx, b.gx * blockSize, b.gy * blockSize, -32, blockSize, blockSize, 16, stoneBlockColors, originX, originY);
    }

    Isometric.drawCube(ctx, 0, 0, -42, blockSize * 1.5, blockSize * 1.5, 10, bedrockColors, originX, originY);
  }

  renderStaticRedstoneWires(ctx, originX, originY) {
    const wirePaths = [
      { x1: 280, y1: 0, x2: 45, y2: 0 },
      { x1: -280, y1: 0, x2: -45, y2: 0 },
      { x1: 0, y1: 280, x2: 0, y2: 45 },
      { x1: 0, y1: -280, x2: 0, y2: -45 },
      { x1: 200, y1: 200, x2: 35, y2: 35 },
      { x1: -200, y1: 200, x2: -35, y2: 35 },
      { x1: 200, y1: -200, x2: 35, y2: -35 },
      { x1: -200, y1: -200, x2: -35, y2: -35 }
    ];

    ctx.save();
    for (let i = 0; i < wirePaths.length; i++) {
      const path = wirePaths[i];
      const p1 = Isometric.worldToScreen(path.x1, path.y1, 1, originX, originY);
      const p2 = Isometric.worldToScreen(path.x2, path.y2, 1, originX, originY);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = '#6e0f0f';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = '#d61c1c';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  renderRedstonePulses(ctx, originX, originY, dt, energyRate) {
    this.redstonePulseTime += dt * (1.5 + energyRate * 0.08);

    const wirePaths = [
      { x1: 280, y1: 0, x2: 45, y2: 0 },
      { x1: -280, y1: 0, x2: -45, y2: 0 },
      { x1: 0, y1: 280, x2: 0, y2: 45 },
      { x1: 0, y1: -280, x2: 0, y2: -45 },
      { x1: 200, y1: 200, x2: 35, y2: 35 },
      { x1: -200, y1: 200, x2: -35, y2: 35 },
      { x1: 200, y1: -200, x2: 35, y2: -35 },
      { x1: -200, y1: -200, x2: -35, y2: -35 }
    ];

    ctx.save();
    ctx.fillStyle = '#ff2b2b';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;

    for (let i = 0; i < wirePaths.length; i++) {
      const path = wirePaths[i];
      const packetOffset = (this.redstonePulseTime * 0.35 + i / wirePaths.length) % 1;
      const curX = path.x1 + (path.x2 - path.x1) * packetOffset;
      const curY = path.y1 + (path.y2 - path.y1) * packetOffset;
      const pulseScreen = Isometric.worldToScreen(curX, curY, 3, originX, originY);

      ctx.fillRect(pulseScreen.x - 3, pulseScreen.y - 3, 6, 6);
      ctx.strokeRect(pulseScreen.x - 3, pulseScreen.y - 3, 6, 6);
    }
    ctx.restore();
  }

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
    this.currentCore = core;
    this.currentTurret = turret;
    this.currentTesla = teslaCoil;

    this.drawQueue.length = 0;
    this.coreGroup.depth = core.x + core.y;
    this.drawQueue.push(this.coreGroup);

    const eLen = enemies.length;
    for (let i = 0; i < eLen; i++) {
      const enemy = enemies[i];
      enemy.depth = enemy.x + enemy.y;
      this.drawQueue.push(enemy);
    }

    const bLen = bullets.length;
    for (let i = 0; i < bLen; i++) {
      const bullet = bullets[i];
      bullet.depth = bullet.x + bullet.y + (bullet.z * 0.05);
      this.drawQueue.push(bullet);
    }

    this.drawQueue.sort((a, b) => a.depth - b.depth);

    const qLen = this.drawQueue.length;
    for (let i = 0; i < qLen; i++) {
      this.drawQueue[i].draw(ctx, originX, originY);
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