export class Core {
  constructor() {
    this.state = {
      ore: 0,
      depth: 0,
      hp: 100,
      shields: 0,
      drillLevel: 1,
      turretLevel: 1,
      shieldLevel: 1,
      idleIncome: 0,
      bestDepth: 0,
      waveActive: false,
      gameOver: false,
    };

    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  addOre(amount) {
    this.state.ore += amount;
    this.notify();
  }

  spendOre(amount) {
    if (this.state.ore < amount) return false;
    this.state.ore -= amount;
    this.notify();
    return true;
  }

  damage(amount) {
    if (this.state.gameOver) return false;

    const shieldAbsorb = Math.min(this.state.shields, amount);
    this.state.shields -= shieldAbsorb;
    const remaining = amount - shieldAbsorb;
    this.state.hp = Math.max(0, this.state.hp - remaining);

    if (this.state.hp <= 0) {
      this.state.gameOver = true;
    }

    this.notify();
    return this.state.hp <= 0;
  }

  repair(amount) {
    this.state.hp = Math.min(100, this.state.hp + amount);
    this.notify();
  }

  upgradeDrill() {
    const cost = this.state.drillLevel * 25;
    if (!this.spendOre(cost)) return false;
    this.state.drillLevel += 1;
    this.state.idleIncome += 4;
    this.state.depth += 10;
    this.notify();
    return true;
  }

  upgradeTurret() {
    const cost = this.state.turretLevel * 30;
    if (!this.spendOre(cost)) return false;
    this.state.turretLevel += 1;
    this.notify();
    return true;
  }

  upgradeShield() {
    const cost = this.state.shieldLevel * 35;
    if (!this.spendOre(cost)) return false;
    this.state.shieldLevel += 1;
    this.state.shields += 25;
    this.notify();
    return true;
  }

  tickIdle() {
    const gain = this.state.idleIncome;
    if (gain > 0) {
      this.addOre(gain);
    }
    this.state.depth += 1;
    this.state.bestDepth = Math.max(this.state.bestDepth, this.state.depth);
    this.notify();
  }
}
