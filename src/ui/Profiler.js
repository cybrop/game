export class Profiler {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.isVisible = false;
    this.frameCount = 0;
    this.lastFpsTimestamp = performance.now();
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div>FPS: <span id="perf-fps">60</span></div>
      <div>ENTITIES: <span id="perf-entities">0</span></div>
      <div>FRAME TIME: <span id="perf-ms">0</span>ms</div>
    `;
    this.fpsEl = document.getElementById('perf-fps');
    this.entitiesEl = document.getElementById('perf-entities');
    this.msEl = document.getElementById('perf-ms');
  }

  toggle() {
    this.isVisible = !this.isVisible;
    this.container.classList.toggle('hidden', !this.isVisible);
    return this.isVisible;
  }

  update(timestamp, entityCount, renderTimeMs) {
    if (!this.isVisible) return;

    this.frameCount++;
    if (timestamp - this.lastFpsTimestamp >= 500) {
      const fps = Math.round((this.frameCount * 1000) / (timestamp - this.lastFpsTimestamp));
      this.fpsEl.textContent = fps;
      this.entitiesEl.textContent = entityCount;
      this.frameCount = 0;
      this.lastFpsTimestamp = timestamp;
    }

    if (renderTimeMs !== undefined) {
      this.msEl.textContent = renderTimeMs.toFixed(2);
    }
  }
}