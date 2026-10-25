export class StorageManager {
  static KEY = 'core_extractor_save_v1';

  static save(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  static load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Could not load from localStorage:', e);
      return null;
    }
  }
}