export class TopHud {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = options;
    this.render();
    this.bindElements();
    this.attachEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="hud-box">
        <span class="hud-label">REDSTONE:</span>
        <span id="dark-energy" class="hud-val ore-redstone">0</span>
        <span class="hud-sub">(+<span id="energy-rate">5</span>/s)</span>
      </div>
      <div class="hud-box">
        <span class="hud-label">WAVE:</span>
        <span id="wave-counter" class="hud-val ore-gold">1</span>
        <span class="hud-sub" id="wave-progress">Wave in progress</span>
      </div>
      <div class="hud-box">
        <span class="hud-label">EMERALDS:</span>
        <span id="hud-shards" class="hud-val ore-emerald">0</span>
      </div>
      <div class="hud-box">
        <span class="hud-label">BEACON INTEGRITY:</span>
        <span id="core-hp-text" class="hud-val ore-diamond">100 / 100</span>
      </div>
      <div class="hud-controls">
        <button id="perf-toggle-btn" class="icon-hud-btn" title="Toggle Profiler (FPS)">⚡</button>
        <button id="fullscreen-btn" class="icon-hud-btn" title="Toggle Fullscreen">⛶</button>
        <button id="audio-toggle-btn" class="icon-hud-btn" title="Toggle Sound">
          <span id="audio-icon">🔊</span>
        </button>
      </div>
    `;
  }

  bindElements() {
    this.energyEl = document.getElementById('dark-energy');
    this.energyRateEl = document.getElementById('energy-rate');
    this.waveEl = document.getElementById('wave-counter');
    this.waveProgressEl = document.getElementById('wave-progress');
    this.shardsEl = document.getElementById('hud-shards');
    this.coreHpEl = document.getElementById('core-hp-text');
    this.audioToggleBtn = document.getElementById('audio-toggle-btn');
    this.audioIcon = document.getElementById('audio-icon');
    this.fullscreenBtn = document.getElementById('fullscreen-btn');
    this.perfToggleBtn = document.getElementById('perf-toggle-btn');
  }

  attachEvents() {
    this.audioToggleBtn.addEventListener('click', () => {
      if (this.options.onToggleAudio) {
        const isMuted = this.options.onToggleAudio();
        this.audioIcon.textContent = isMuted ? '🔇' : '🔊';
      }
    });

    this.fullscreenBtn.addEventListener('click', () => {
      if (this.options.onToggleFullscreen) this.options.onToggleFullscreen();
    });

    this.perfToggleBtn.addEventListener('click', () => {
      if (this.options.onTogglePerf) this.options.onTogglePerf();
    });
  }

  update({ energy, energyRate, wave, waveIntermission, intermissionTime, remainingEnemies, shards, currentHp, maxHp }) {
    this.energyEl.textContent = Math.floor(energy);
    this.energyRateEl.textContent = energyRate.toFixed(1);
    this.waveEl.textContent = wave;
    this.shardsEl.textContent = shards;
    this.coreHpEl.textContent = `${Math.max(0, Math.ceil(currentHp))} / ${maxHp}`;

    if (waveIntermission) {
      this.waveProgressEl.textContent = `Next raid in ${Math.max(0, intermissionTime).toFixed(1)}s`;
    } else {
      this.waveProgressEl.textContent = `Hostiles: ${remainingEnemies}`;
    }
  }
}