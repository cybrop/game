export class Economy {
  constructor(core) {
    this.core = core;
  }

  tick() {
    const income = Math.max(1, this.core.state.drillLevel + this.core.state.turretLevel);
    this.core.addOre(income);
  }
}
