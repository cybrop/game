export class Economy {
  constructor() {
    this.energy = 50; // Starting seed currency
    this.totalEarned = 50;
    this.baseRate = 5; // Base energy/sec

    this.upgrades = {
      damage: 1,
      firerate: 1,
      health: 1,
      yield: 1
    };

    this.baseCosts = {
      damage: 25,
      firerate: 35,
      health: 40,
      yield: 30
    };

    this.costMultipliers = {
      damage: 1.45,
      firerate: 1.55,
      health: 1.4,
      yield: 1.5
    };
  }

  getEnergyRate() {
    return this.baseRate + (this.upgrades.yield - 1) * 4;
  }

  update(dt) {
    const gained = this.getEnergyRate() * dt;
    this.energy += gained;
    this.totalEarned += gained;
  }

  addEnergy(amount) {
    this.energy += amount;
    this.totalEarned += amount;
  }

  getUpgradeCost(type) {
    const level = this.upgrades[type];
    const base = this.baseCosts[type];
    const mult = this.costMultipliers[type];
    return Math.round(base * Math.pow(mult, level - 1));
  }

  buyUpgrade(type) {
    const cost = this.getUpgradeCost(type);
    if (this.energy >= cost) {
      this.energy -= cost;
      this.upgrades[type]++;
      return true;
    }
    return false;
  }
}