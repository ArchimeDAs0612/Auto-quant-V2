const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

class StateManager {
  static ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  static saveState(state) {
    try {
      this.ensureDataDir();
      console.log('[StateManager] DATA_DIR:', DATA_DIR);
      console.log('[StateManager] STATE_FILE:', STATE_FILE);
      console.log('[StateManager] state keys:', Object.keys(state));
      const data = JSON.stringify(state, null, 2);
      fs.writeFileSync(STATE_FILE, data);
      console.log('[StateManager] 文件写入成功');
      return true;
    } catch (error) {
      console.error('[StateManager] 保存状态失败:', error.message);
      return false;
    }
  }

  static loadState() {
    try {
      if (!fs.existsSync(STATE_FILE)) {
        return null;
      }
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[StateManager] 加载状态失败:', error.message);
      return null;
    }
  }

  static saveTradingStats(stats) {
    const state = this.loadState() || {};
    state.tradingStats = stats;
    state.lastUpdated = Date.now();
    return this.saveState(state);
  }

  static saveHistory(history) {
    const state = this.loadState() || {};
    state.history = history;
    state.lastUpdated = Date.now();
    return this.saveState(state);
  }

  static savePositions(positions) {
    const state = this.loadState() || {};
    state.positions = positions;
    state.lastUpdated = Date.now();
    return this.saveState(state);
  }

  static saveDailyLossCount(count) {
    const state = this.loadState() || {};
    state.dailyLossCount = count;
    state.lastUpdated = Date.now();
    return this.saveState(state);
  }

  static loadDailyLossCount() {
    const state = this.loadState();
    if (!state) return 0;

    const lastUpdated = state.lastUpdated;
    if (!lastUpdated) return 0;

    const now = new Date();
    const last = new Date(lastUpdated);

    if (now.toDateString() !== last.toDateString()) {
      return 0;
    }

    return state.dailyLossCount || 0;
  }

  static saveFullState(data) {
    const state = {
      tradingStats: data.tradingStats,
      history: data.history,
      positions: data.positions,
      dailyLossCount: data.dailyLossCount,
      equityHistory: data.equityHistory,
      lastUpdated: Date.now()
    };
    return this.saveState(state);
  }
}

module.exports = StateManager;