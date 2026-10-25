export class Profiler {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.isVisible = false;
    this.frameCount = 0;
    this.lastFpsTimestamp = performance.now();
    this.frameTimes = [];
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div style="font-weight:bold; color:#00ff88; margin-bottom:2px;">PERF MONITOR</div>
      <div>FPS: <span id="perf-fps">60</span></div>
      <div>1% LOW: <span id="perf-low">60</span></div>
      <div>SWARM: <span id="perf-swarm">0</span></div>
      <div>PARTICLES: <span id="perf-particles">0</span></div>
      <div>FRAME TIME: <span id="perf-ms">0</span>ms</div>
    `;
    this.fpsEl = document.getElementById('perf-fps');
    this.lowEl = document.getElementById('perf-low');
    this.swarmEl = document.getElementById('perf-swarm');
    this.particlesEl = document.getElementById('perf-particles');
    this.msEl = document.getElementById('perf-ms');
  }

  toggle() {
    this.isVisible = !this.isVisible;
    this.container.classList.toggle('hidden', !this.isVisible);
    return this.isVisible;
  }

  update(timestamp, swarmCount, particleCount, renderTimeMs) {
    if (!this.isVisible) return;

    this.frameCount++;
    this.frameTimes.push(renderTimeMs);

    if (timestamp - this.lastFpsTimestamp >= 500) {
      const fps = Math.round((this.frameCount * 1000) / (timestamp - this.lastFpsTimestamp));
      this.fpsEl.textContent = fps;
      this.fpsEl.style.color = fps >= 55 ? '#00ff88' : fps >= 40 ? '#ffd000' : '#ff3344';

      // Calculate approximate 1% low
      if (this.frameTimes.length > 0) {
        this.frameTimes.sort((a, b) => b - a);
        const lowIndex = Math.max(0, Math.floor(this.frameTimes.length * 0.01));
        const worstMs = this.frameTimes[lowIndex] || 16.6;
        const lowFps = Math.min(fps, Math.round(1000 / Math.max(worstMs, 1)));
        this.lowEl.textContent = lowFps;
      }

      this.swarmEl.textContent = swarmCount;
      this.particlesEl.textContent = particleCount;

      this.frameCount = 0;
      this.frameTimes.length = 0;
      this.lastFpsTimestamp = timestamp;
    }

    if (renderTimeMs !== undefined) {
      this.msEl.textContent = renderTimeMs.toFixed(2);
    }
  }
}