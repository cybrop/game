import { Isometric } from './Isometric.js';

export class Core {
  constructor(x = 0, y = 0, maxHp = 100) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.radius = 34; // Retains collision boundary
    this.maxHp = maxHp;
    this.currentHp = maxHp;
    this.rotation = 0;
    this.pulse = 0;
  }

  takeDamage(amount) {
    this.currentHp = Math.max(0, this.currentHp - amount);
  }

  heal(amount) {
    this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
  }

  isDestroyed() {
    return this.currentHp <= 0;
  }

  update(dt) {
    this.rotation += dt * 1.5;
    this.pulse += dt * 2.8;
  }

  draw(ctx, originX = 0, originY = 0) {
    // 1. Redstone Signal Activation Ground Ring
    const pulseRad = this.radius + 6 + Math.sin(this.pulse) * 3;
    ctx.save();
    Isometric.drawIsoCircle(ctx, this.x, this.y, pulseRad, originX, originY);
    ctx.strokeStyle = '#d61c1c';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.restore();

    // 2. TIER 1: Obsidian Base Platform (Stepped 3x3 block slab)
    const obsidianColors = {
      top: '#241738',
      left: '#170e24',
      right: '#0f0817',
      stroke: '#08040d'
    };
    Isometric.drawCube(ctx, this.x, this.y, 0, 68, 68, 10, obsidianColors, originX, originY);

    // 3. TIER 2: Iron / Netherite Pedestal Plate
    const pedestalColors = {
      top: '#d8dee9',
      left: '#9aa2b1',
      right: '#6a7280',
      stroke: '#3b4252'
    };
    Isometric.drawCube(ctx, this.x, this.y, 10, 46, 46, 8, pedestalColors, originX, originY);

    // 4. TIER 3: Glass-Encased Beacon Chamber
    const glassColors = {
      top: 'rgba(215, 245, 255, 0.45)',
      left: 'rgba(140, 200, 230, 0.35)',
      right: 'rgba(90, 150, 190, 0.4)',
      stroke: 'rgba(180, 240, 255, 0.8)'
    };
    Isometric.drawCube(ctx, this.x, this.y, 18, 28, 28, 24, glassColors, originX, originY);

    // 5. INTERNAL ROTATING END CRYSTAL / NETHER STAR
    const crystalZ = 30 + Math.sin(this.pulse) * 2.5;
    const crystalCenter = Isometric.worldToScreen(this.x, this.y, crystalZ, originX, originY);

    ctx.save();
    ctx.translate(crystalCenter.x, crystalCenter.y);

    // Interlocking rotating diamond facets
    const crystalSize = 8;
    ctx.save();
    ctx.scale(1, 0.58);
    ctx.rotate(this.rotation);

    // Outer crystal rhombus (Cyan)
    ctx.beginPath();
    ctx.moveTo(0, -crystalSize * 1.4);
    ctx.lineTo(crystalSize, 0);
    ctx.lineTo(0, crystalSize * 1.4);
    ctx.lineTo(-crystalSize, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(50, 230, 240, 0.85)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // Inner counter-rotating crystal rhombus (Magenta / Nether star)
    ctx.rotate(-this.rotation * 2);
    ctx.beginPath();
    ctx.moveTo(0, -crystalSize);
    ctx.lineTo(crystalSize * 0.7, 0);
    ctx.lineTo(0, crystalSize);
    ctx.lineTo(-crystalSize * 0.7, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(235, 40, 140, 0.9)';
    ctx.fill();

    ctx.restore();

    // Central luminous white spark
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();

    // 6. VERTICAL SKYWARD BEACON BEAM
    const beamBase = Isometric.worldToScreen(this.x, this.y, 42, originX, originY);
    ctx.save();

    // Outer cyan beam glow
    ctx.beginPath();
    ctx.moveTo(beamBase.x - 8, beamBase.y);
    ctx.lineTo(beamBase.x - 8, beamBase.y - 280);
    ctx.lineTo(beamBase.x + 8, beamBase.y - 280);
    ctx.lineTo(beamBase.x + 8, beamBase.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(40, 215, 255, 0.22)';
    ctx.fill();

    // Inner pure light beam core
    ctx.beginPath();
    ctx.moveTo(beamBase.x - 3.5, beamBase.y);
    ctx.lineTo(beamBase.x - 3.5, beamBase.y - 280);
    ctx.lineTo(beamBase.x + 3.5, beamBase.y - 280);
    ctx.lineTo(beamBase.x + 3.5, beamBase.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(240, 255, 255, 0.75)';
    ctx.fill();

    ctx.restore();

    // 7. Minecraft Style Boss Health Bar
    this.drawHealthBar(ctx, originX, originY);
  }

  drawHealthBar(ctx, originX, originY) {
    const screenPos = Isometric.worldToScreen(this.x, this.y, 52, originX, originY);
    const hpRatio = Math.max(0, this.currentHp / this.maxHp);
    const barW = 60;
    const barH = 6;

    ctx.save();
    // Dark outer frame
    ctx.fillStyle = '#121214';
    ctx.fillRect(screenPos.x - barW / 2, screenPos.y, barW, barH);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(screenPos.x - barW / 2, screenPos.y, barW, barH);

    // Segmented health bar fill
    ctx.fillStyle = hpRatio > 0.4 ? '#17b848' : '#d61c1c';
    ctx.fillRect(screenPos.x - barW / 2 + 1, screenPos.y + 1, (barW - 2) * hpRatio, barH - 2);

    // Segment tick marks
    ctx.strokeStyle = '#121214';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const tx = screenPos.x - barW / 2 + (barW * (i / 4));
      ctx.beginPath();
      ctx.moveTo(tx, screenPos.y + 1);
      ctx.lineTo(tx, screenPos.y + barH - 1);
      ctx.stroke();
    }

    ctx.restore();
  }
}