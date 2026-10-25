/**
 * 2.5D Isometric Math & Zero-Allocation Voxel Cube Transformations
 * Uses standard 2:1 dimetric projection (tile width = 2 * tile height)
 */
export class Isometric {
  static ISO_ANGLE = Math.PI / 6; // 30 degrees
  static COS_A = Math.cos(Isometric.ISO_ANGLE); // ~0.8660254037844386
  static SIN_A = 0.5; // Exactly 0.5

  /**
   * Convert 3D World Cartesian coordinates to 2D Screen coordinates
   */
  static worldToScreen(x, y, z = 0, originX = 0, originY = 0) {
    const screenX = (x - y) * Isometric.COS_A + originX;
    const screenY = (x + y) * Isometric.SIN_A - z + originY;
    const depth = x + y + z * 0.05;

    return { x: screenX, y: screenY, depth };
  }

  /**
   * Inverse projection: Convert 2D Screen click/pointer coordinates to World Cartesian coordinates (z = 0)
   */
  static screenToWorld(screenX, screenY, originX = 0, originY = 0, z = 0) {
    const relX = screenX - originX;
    const relY = screenY - originY + z;

    const x = (relX / Isometric.COS_A + relY / Isometric.SIN_A) * 0.5;
    const y = (relY / Isometric.SIN_A - relX / Isometric.COS_A) * 0.5;

    return { x, y };
  }

  /**
   * High-performance zero-allocation 3-face directional isometric cube
   * Inlines trigonometric projection math to eliminate object allocation in tight loops.
   */
  static drawCube(ctx, x, y, z, sizeX, sizeY, height, colors, originX = 0, originY = 0) {
    const cosA = Isometric.COS_A;
    const sinA = Isometric.SIN_A;
    const hx = sizeX * 0.5;
    const hy = sizeY * 0.5;

    const x0 = x - hx;
    const x1 = x + hx;
    const y0 = y - hy;
    const y1 = y + hy;

    // Bottom screen vertices (elevation z)
    const b0x = (x0 - y0) * cosA + originX;
    const b0y = (x0 + y0) * sinA - z + originY;

    const b1x = (x1 - y0) * cosA + originX;
    const b1y = (x1 + y0) * sinA - z + originY;

    const b2x = (x1 - y1) * cosA + originX;
    const b2y = (x1 + y1) * sinA - z + originY;

    const b3x = (x0 - y1) * cosA + originX;
    const b3y = (x0 + y1) * sinA - z + originY;

    // Top screen vertices (elevated by height; X coordinates are identical)
    const t0y = b0y - height;
    const t1y = b1y - height;
    const t2y = b2y - height;
    const t3y = b3y - height;

    const strokeColor = colors.stroke || '#141416';
    ctx.save();
    ctx.lineWidth = 1;
    ctx.lineJoin = 'miter';

    // 1. LEFT FACE (b3, b2, t2, t3) - Medium diffuse shade
    ctx.beginPath();
    ctx.moveTo(b3x, b3y);
    ctx.lineTo(b2x, b2y);
    ctx.lineTo(b2x, t2y);
    ctx.lineTo(b3x, t3y);
    ctx.closePath();
    ctx.fillStyle = colors.left || '#44301a';
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.stroke();

    // 2. RIGHT FACE (b2, b1, t1, t2) - Deep shadow side
    ctx.beginPath();
    ctx.moveTo(b2x, b2y);
    ctx.lineTo(b1x, b1y);
    ctx.lineTo(b1x, t1y);
    ctx.lineTo(b2x, t2y);
    ctx.closePath();
    ctx.fillStyle = colors.right || '#312111';
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.stroke();

    // 3. TOP FACE (t0, t1, t2, t3) - Direct illumination
    ctx.beginPath();
    ctx.moveTo(b0x, t0y);
    ctx.lineTo(b1x, t1y);
    ctx.lineTo(b2x, t2y);
    ctx.lineTo(b3x, t3y);
    ctx.closePath();
    ctx.fillStyle = colors.top || '#588836';
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw an isometric diamond tile on the ground plane
   */
  static drawIsoTile(ctx, worldX, worldY, tileSize, originX, originY) {
    const p1 = Isometric.worldToScreen(worldX - tileSize / 2, worldY - tileSize / 2, 0, originX, originY);
    const p2 = Isometric.worldToScreen(worldX + tileSize / 2, worldY - tileSize / 2, 0, originX, originY);
    const p3 = Isometric.worldToScreen(worldX + tileSize / 2, worldY + tileSize / 2, 0, originX, originY);
    const p4 = Isometric.worldToScreen(worldX - tileSize / 2, worldY + tileSize / 2, 0, originX, originY);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
  }

  /**
   * Draw an isometric ellipse/circle on ground plane
   */
  static drawIsoCircle(ctx, worldX, worldY, radius, originX, originY) {
    const center = Isometric.worldToScreen(worldX, worldY, 0, originX, originY);
    const radiusX = radius * Isometric.COS_A * 2;
    const radiusY = radius * Isometric.SIN_A * 2;

    ctx.beginPath();
    ctx.ellipse(center.x, center.y, radiusX, radiusY, 0, 0, Math.PI * 2);
  }
}