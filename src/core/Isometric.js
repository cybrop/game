/**
 * 2.5D Isometric Math & Voxel Cube Transformations
 * Uses standard 2:1 dimetric projection (tile width = 2 * tile height)
 */
export class Isometric {
  static ISO_ANGLE = Math.PI / 6; // 30 degrees
  static COS_A = Math.cos(Isometric.ISO_ANGLE); // ~0.866025
  static SIN_A = Math.sin(Isometric.ISO_ANGLE); // 0.5

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
   * Draw an authentic 3-face directional isometric cube or prism
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - Center X in world space
   * @param {number} y - Center Y in world space
   * @param {number} z - Base elevation in world space
   * @param {number} sizeX - Width along X axis
   * @param {number} sizeY - Length along Y axis
   * @param {number} height - Vertical height (Z dimension)
   * @param {Object} colors - { top, left, right, stroke }
   * @param {number} originX
   * @param {number} originY
   */
  static drawCube(ctx, x, y, z, sizeX, sizeY, height, colors, originX = 0, originY = 0) {
    const hx = sizeX / 2;
    const hy = sizeY / 2;

    // 4 bottom vertices (ground at elevation z)
    const b0 = Isometric.worldToScreen(x - hx, y - hy, z, originX, originY); // back
    const b1 = Isometric.worldToScreen(x + hx, y - hy, z, originX, originY); // right
    const b2 = Isometric.worldToScreen(x + hx, y + hy, z, originX, originY); // front
    const b3 = Isometric.worldToScreen(x - hx, y + hy, z, originX, originY); // left

    // 4 top vertices (elevated by height)
    const t0 = Isometric.worldToScreen(x - hx, y - hy, z + height, originX, originY);
    const t1 = Isometric.worldToScreen(x + hx, y - hy, z + height, originX, originY);
    const t2 = Isometric.worldToScreen(x + hx, y + hy, z + height, originX, originY);
    const t3 = Isometric.worldToScreen(x - hx, y + hy, z + height, originX, originY);

    const strokeColor = colors.stroke || '#141416';
    ctx.save();
    ctx.lineWidth = 1;
    ctx.lineJoin = 'miter';

    // 1. LEFT FACE (b3, b2, t2, t3) - Medium diffuse shade
    ctx.beginPath();
    ctx.moveTo(b3.x, b3.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(t3.x, t3.y);
    ctx.closePath();
    ctx.fillStyle = colors.left || '#44301a';
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.stroke();

    // 2. RIGHT FACE (b2, b1, t1, t2) - Deep shadow side
    ctx.beginPath();
    ctx.moveTo(b2.x, b2.y);
    ctx.lineTo(b1.x, b1.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.closePath();
    ctx.fillStyle = colors.right || '#312111';
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.stroke();

    // 3. TOP FACE (t0, t1, t2, t3) - Brightest direct illumination
    ctx.beginPath();
    ctx.moveTo(t0.x, t0.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(t3.x, t3.y);
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