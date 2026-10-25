export class GameLoop {
  constructor(updateFn, renderFn) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
    this.lastTimestamp = performance.now();
    this.animationFrameId = null;
    this.isRunning = false;
    this.boundTick = this.tick.bind(this);
  }

  start() {
    if (this.isRunning) this.stop();
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.animationFrameId = requestAnimationFrame(this.boundTick);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resetTime() {
    this.lastTimestamp = performance.now();
  }

  tick(timestamp) {
    if (!this.isRunning) return;

    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;

    this.updateFn(dt, timestamp);
    this.renderFn(dt, timestamp);

    this.animationFrameId = requestAnimationFrame(this.boundTick);
  }
}