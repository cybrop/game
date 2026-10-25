export class InputHandler {
  constructor(core, arenaElement) {
    this.core = core;
    this.arena = arenaElement;
    this.bindEvents();
  }

  bindEvents() {
    this.arena.addEventListener('pointerdown', (event) => {
      if (this.core.state.gameOver) return;

      const rect = this.arena.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const dx = x - centerX;
      const dy = y - centerY;

      const angle = Math.atan2(dy, dx);
      this.core.state.lastShotAngle = angle;
      this.core.notify();
    });

    window.addEventListener('keydown', (event) => {
      const shortcuts = {
        'c': () => this.core.upgradeDrill(),
        't': () => this.core.upgradeTurret(),
        's': () => this.core.upgradeShield(),
      };

      const action = shortcuts[event.key.toLowerCase()];
      if (action) action();
    });
  }
}
