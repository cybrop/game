import { Isometric } from '../core/Isometric.js';

/**
 * 3D Falling TNT Block
 * Drops from the sky, bounces, flashes red/white, and detonates.
 */
export class TNTBlock {
  constructor(targetX, targetY, onDetonate) {
    this.x = targetX;
    this.y = targetY;
    this.z = 180; // High in sky
    this.vz = 0;
    this.gravity = 420;
    this.onDetonate = onDetonate;

    this.fuseTime = 1.2;
    this.age = 0;
    this.isGrounded = false;
    this.detonated = false;
  }

  update(dt) {
    this.age += dt;

    if (!this.isGrounded) {
      this.vz += this.gravity * dt;
      this.z -= this.vz * dt;

      if (this.z <= 0) {
        this.z = 0;
        this.isGrounded = true;
      }
    }

    if (this.age >= this.fuseTime && !this.detonated) {
      this.detonated = true;
      if (this.onDetonate) this.onDetonate(this.x, this.y);
    }
  }

  draw(ctx, originX = 0, originY = 0) {
    if (this.detonated) return;

    // Flash white/red during fuse
    const isFlashing = Math.floor(this.age * 12) % 2 === 0;
    const tntColors = isFlashing ? {
      top: '#ffffff', left: '#e6e6e6', right: '#cccccc', stroke: '#999999'
    } : {
      top: '#d62828', left: '#9e1b1b', right: '#6b0f0f', stroke: '#3a0808'
    };

    Isometric.drawCube(ctx, this.x, this.y, this.z, 14, 14, 14, tntColors, originX, originY);

    // Center white band
    if (!isFlashing) {
      const bandColors = { top: '#f8f9fa', left: '#e9ecef', right: '#dee2e6', stroke: '#333' };
      Isometric.drawCube(ctx, this.x, this.y, this.z + 4, 14.5, 14.5, 4, bandColors, originX, originY);
    }
  }
}