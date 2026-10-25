export class StorageManager {
  constructor(key = 'cyber-drill-save') {
    this.key = key;
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  save(data) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch {
      // ignore quota issues in browser restricted mode
    }
  }
}
