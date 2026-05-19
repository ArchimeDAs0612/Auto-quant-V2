const STORAGE_KEY = 'btc_trading_dashboard_state';
const AUTO_SAVE_INTERVAL = 5000;
const DEBOUNCE_DELAY = 1000;

class DataPersistenceService {
  constructor() {
    this.lastSaveTime = null;
    this.lastRecoveryTime = null;
    this.saveStatus = 'idle';
    this.recoveryResult = null;
    this.autoSaveTimer = null;
    this.pendingSave = false;
    this.listeners = {};
  }

  getStorageKey() {
    return STORAGE_KEY;
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  saveData(data) {
    try {
      const serialized = JSON.stringify({
        ...data,
        _meta: {
          version: 1,
          savedAt: Date.now(),
          userAgent: navigator.userAgent
        }
      });

      if (serialized.length > 5 * 1024 * 1024) {
        console.warn('[Persistence] Data size exceeds 5MB limit');
        return false;
      }

      localStorage.setItem(STORAGE_KEY, serialized);
      this.lastSaveTime = Date.now();
      this.saveStatus = 'saved';
      this.emit('save', { success: true, time: this.lastSaveTime });
      return true;
    } catch (error) {
      console.error('[Persistence] Save error:', error);
      this.saveStatus = 'error';
      this.emit('save', { success: false, error: error.message });
      return false;
    }
  }

  loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.recoveryResult = { found: false };
        this.emit('recovery', this.recoveryResult);
        return null;
      }

      const data = JSON.parse(raw);

      if (data._meta) {
        const age = Date.now() - data._meta.savedAt;
        const maxAge = 7 * 24 * 60 * 60 * 1000;

        if (age > maxAge) {
          console.log('[Persistence] Data too old, clearing');
          this.clearData();
          this.recoveryResult = { found: true, stale: true };
          this.emit('recovery', this.recoveryResult);
          return null;
        }

        this.recoveryResult = {
          found: true,
          age,
          savedAt: data._meta.savedAt,
          version: data._meta.version
        };
      }

      this.lastRecoveryTime = Date.now();
      delete data._meta;
      this.emit('recovery', this.recoveryResult);
      return data;
    } catch (error) {
      console.error('[Persistence] Load error:', error);
      this.recoveryResult = { found: true, error: error.message };
      this.emit('recovery', this.recoveryResult);
      return null;
    }
  }

  clearData() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.saveStatus = 'idle';
      this.emit('clear', { success: true });
      return true;
    } catch (error) {
      console.error('[Persistence] Clear error:', error);
      return false;
    }
  }

  startAutoSave(getDataFn, interval = AUTO_SAVE_INTERVAL) {
    this.stopAutoSave();

    const debouncedSave = this.debounce(() => {
      const data = getDataFn();
      if (data) {
        this.saveData(data);
      }
    }, DEBOUNCE_DELAY);

    this.autoSaveTimer = setInterval(() => {
      debouncedSave();
    }, interval);

    console.log(`[Persistence] Auto-save started (interval: ${interval}ms)`);
    return this.autoSaveTimer;
  }

  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      console.log('[Persistence] Auto-save stopped');
    }
  }

  debounce(fn, delay) {
    let timer = null;
    return (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  handleVisibilityChange(getDataFn) {
    if (document.visibilityState === 'hidden') {
      const data = getDataFn();
      if (data) {
        this.saveData(data);
        console.log('[Persistence] Emergency save on visibility hidden');
      }
    }
  }

  setupBeforeUnload(getDataFn) {
    const handleBeforeUnload = (event) => {
      const data = getDataFn();
      if (data) {
        this.saveData(data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }

  setupVisibilityHandler(getDataFn) {
    const handleVisibilityChange = () => {
      this.handleVisibilityChange(getDataFn);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }

  getStatus() {
    return {
      saveStatus: this.saveStatus,
      lastSaveTime: this.lastSaveTime,
      lastRecoveryTime: this.lastRecoveryTime,
      recoveryResult: this.recoveryResult,
      storageSize: this.getStorageSize()
    };
  }

  getStorageSize() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return 0;
      return new Blob([raw]).size;
    } catch {
      return 0;
    }
  }
}

const persistenceService = new DataPersistenceService();

if (typeof window !== 'undefined') {
  window.persistenceService = persistenceService;
}

export default persistenceService;
export { DataPersistenceService };
