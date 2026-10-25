/**
 * 2.5D Isometric Math & Coordinate Transformations
 * Uses standard 2:1 dimetric projection (tile width = 2 * tile height)
 */
export class Isometric {
  // Projection angle constants: cos(30 deg) ≈ 0.866025, sin(30 deg) = 0.5
  static ISO_ANGLE = Math.PI / 6; // 30 degrees
  static COS_A = Math.cos(Isometric.ISO_ANGLE);
  static SIN_A = Math.sin(Isometric.ISO_ANGLE);

  /**
   * Convert 3D World Cartesian coordinates to 2D Screen coordinates
   * @param {number} x - Cartesian X
   * @param {number} y - Cartesian Y
   * @param {number} z - Vertical elevation (altitude above ground plane)
   * @param {number} originX - Screen horizontal center anchor
   * @param {number} originY - Screen vertical center anchor
   * @returns {{x: number, y: number, depth: number}}
   */
  static worldToScreen(x, y, z = 0, originX = 0, originY = 0) {
    const screenX = (x - y) * Isometric.COS_A + originX;
    const screenY = (x + y) * Isometric.SIN_A - z + originY;
    const depth = x + y + z * 0.05;

    return { x: screenX, y: screenY, depth };
  }

  /**
   * Inverse projection: Convert 2D Screen click/pointer coordinates to World Cartesian coordinates
   * Solves for ground plane (z = 0)
   * @param {number} screenX - Click screen X (relative to canvas container in CSS pixels)
   * @param {number} screenY - Click screen Y (relative to canvas container in CSS pixels)
   * @param {number} originX - Screen horizontal center anchor
   * @param {number} originY - Screen vertical center anchor
   * @param {number} z - Target elevation plane (defaults to ground 0)
   * @returns {{x: number, y: number}}
   */
  static screenToWorld(screenX, screenY, originX = 0, originY = 0, z = 0) {
    const relX = screenX - originX;
    const relY = screenY - originY + z;

    const x = (relX / Isometric.COS_A + relY / Isometric.SIN_A) * 0.5;
    const y = (relY / Isometric.SIN_A - relX / Isometric.COS_A) * 0.5;

    return { x, y };
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