import { Isometric } from './Isometric.js';

/**
 * Multi-pass 2.5D Isometric Render Pipeline
 */
export class Renderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.veinPulseTime = 0;
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
    // Pass 1: Isometric Floor & Conduits
    // ==========================================
    this.renderGroundGrid(ctx, originX, originY);
    this.renderExtractionVeins(ctx, originX, originY, dt, energyRate);

    // ==========================================
    // Pass 2: Field Auras & Ground-Level FX
    // ==========================================
    if (cryoField) {
      this.renderCryoField(ctx, cryoField, originX, originY);
    }
    if (particleSystem) {
      particleSystem.drawGroundFX(ctx, originX, originY);
    }

    // ==========================================
    // Pass 3: Depth-Sorted 2.5D Entities & 3D Projectiles
    // ==========================================
    this.renderDepthSortedEntities(ctx, originX, originY, core, turret, teslaCoil, waveManager.enemies, bullets);

    // ==========================================
    // Pass 4: Airborne 3D Particles, Sparks, & Combat Text
    // ==========================================
    if (particleSystem) {
      particleSystem.drawAirborneParticles(ctx, originX, originY);
    }
    this.renderFloatingText(ctx, floatingTexts);

    ctx.restore();
  }

  renderGroundGrid(ctx, originX, originY) {
    const worldRadius = 380;
    const step = 48;

    ctx.save();
    ctx.strokeStyle = 'rgba(26, 36, 70, 0.45)';
    ctx.lineWidth = 1;

    for (let x = -worldRadius; x <= worldRadius; x += step) {
      const pStart = Isometric.worldToScreen(x, -worldRadius, 0, originX, originY);
      const pEnd = Isometric.worldToScreen(x, worldRadius, 0, originX, originY);
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.stroke();
    }

    for (let y = -worldRadius; y <= worldRadius; y += step) {
      const pStart = Isometric.worldToScreen(-worldRadius, y, 0, originX, originY);
      const pEnd = Isometric.worldToScreen(worldRadius, y, 0, originX, originY);
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.stroke();
    }

    // Excavation foundation rim
    const centerScreen = Isometric.worldToScreen(0, 0, 0, originX, originY);
    ctx.beginPath();
    ctx.ellipse(centerScreen.x, centerScreen.y, 68, 34, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#070b1a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  renderExtractionVeins(ctx, originX, originY, dt, energyRate) {
    this.veinPulseTime += dt * (1.2 + energyRate * 0.08);
    const veinCount = 8;
    const veinLength = 360;

    ctx.save();
    for (let i = 0; i < veinCount; i++) {
      const angle = (i * Math.PI * 2) / veinCount;
      const startWorldX = Math.cos(angle) * veinLength;
      const startWorldY = Math.sin(angle) * veinLength;

      const pStart = Isometric.worldToScreen(startWorldX, startWorldY, 0, originX, originY);
      const pEnd = Isometric.worldToScreen(0, 0, 0, originX, originY);

      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const packetOffset = (this.veinPulseTime * 0.22 + i / veinCount) % 1;
      const currentWorldX = startWorldX * (1 - packetOffset);
      const currentWorldY = startWorldY * (1 - packetOffset);
      const packetScreen = Isometric.worldToScreen(currentWorldX, currentWorldY, 2, originX, originY);

      ctx.beginPath();
      ctx.arc(packetScreen.x, packetScreen.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00f3ff';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 9;
      ctx.fill();
    }
    ctx.restore();
  }

  renderCryoField(ctx, cryoField, originX, originY) {
    ctx.save();
    const center = Isometric.worldToScreen(cryoField.x, cryoField.y, 0, originX, originY);
    const wave = Math.sin(cryoField.pulse) * 4;
    const rx = (cryoField.radius + wave) * Isometric.COS_A * 2;
    const ry = (cryoField.radius + wave) * Isometric.SIN_A * 2;

    ctx.beginPath();
    ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 180, 255, 0.07)';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 210, 255, 0.32)';
    ctx.lineWidth = 1.8;
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
      ctx.font = `bold ${ft.size}px Consolas, monospace`;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 8;
      ctx.fillText(ft.text, ft.x - 12, ft.y);
      ctx.restore();
    }
  }
}