const EventEmitter = require('events');
const SignalGenerator = require('./signalGenerator');
const RiskManager = require('./riskManager');
const StateManager = require('./stateManager');

class PaperTrading extends EventEmitter {
  constructor(initialBalance = 1000) {
    super();
    this.signalGenerator = new SignalGenerator();
    this.riskManager = new RiskManager(initialBalance);

    this.candles = {
      '4H': [],
      '1H': [],
      '15m': []
    };

    this.currentPrice = null;
    this.isRunning = false;
    this.checkInterval = null;
    this.lastUpdateTime = 0;

    this.consecutiveLosses = 0;
    this.lastLossTime = 0;
    this.LOSS_PAUSE_DURATION = 4 * 60 * 60 * 1000;
    this.MAX_CONSECUTIVE_LOSSES = 2;

    this.equityHistory = [];
    this.maxEquityHistoryPoints = 10000;
    this.lastEquitySaveTime = 0;
    this.equitySaveInterval = 5000;

    this.loadState();
    this.saveStateInterval = setInterval(() => this.saveState(), 60000);
    this.equityUpdateInterval = setInterval(() => this.recordEquity(), 10000);

    this.setupEventListeners();
  }

  recordEquity() {
    const currentTime = Date.now();
    const currentEquity = this.getCurrentEquity();
    const unrealizedPnl = this.getUnrealizedPnl();

    this.equityHistory.push({
      timestamp: currentTime,
      balance: this.riskManager.balance,
      equity: currentEquity,
      unrealizedPnl: unrealizedPnl,
      openPositions: this.riskManager.positions.length
    });

    if (this.equityHistory.length > this.maxEquityHistoryPoints) {
      this.equityHistory = this.equityHistory.slice(-this.maxEquityHistoryPoints);
    }

    if (currentTime - this.lastEquitySaveTime > this.equitySaveInterval) {
      this.lastEquitySaveTime = currentTime;
      this.emit('equityUpdate', {
        timestamp: currentTime,
        balance: this.riskManager.balance,
        equity: currentEquity,
        unrealizedPnl: unrealizedPnl,
        openPositions: this.riskManager.positions.length,
        history: this.equityHistory
      });
    }
  }

  getCurrentEquity() {
    return this.riskManager.balance + this.getUnrealizedPnl();
  }

  getUnrealizedPnl() {
    if (!this.currentPrice || this.currentPrice <= 0) return 0;
    return this.riskManager.positions.reduce((sum, pos) => {
      const pnl = pos.direction === 'long'
        ? (this.currentPrice - pos.entryPrice) * pos.positionSize / pos.entryPrice
        : (pos.entryPrice - this.currentPrice) * pos.positionSize / pos.entryPrice;
      return sum + pnl;
    }, 0);
  }

  loadEquityHistory(history) {
    if (Array.isArray(history) && history.length > 0) {
      this.equityHistory = history;
    }
  }

  canTrade() {
    if (this.consecutiveLosses >= this.MAX_CONSECUTIVE_LOSSES) {
      const now = Date.now();
      if (now - this.lastLossTime < this.LOSS_PAUSE_DURATION) {
        const remainingMinutes = Math.ceil((this.LOSS_PAUSE_DURATION - (now - this.lastLossTime)) / 60000);
        console.log(`[风控] 连续${this.consecutiveLosses}单止损，交易暂停 ${remainingMinutes} 分钟`);
        return { allowed: false, reason: `连续${this.consecutiveLosses}单止损，暂停交易 ${remainingMinutes} 分钟` };
      } else {
        console.log(`[风控] 连续亏损暂停结束，恢复交易`);
        this.consecutiveLosses = 0;
      }
    }
    return { allowed: true };
  }

  recordLoss() {
    this.consecutiveLosses++;
    this.lastLossTime = Date.now();
    console.log(`[风控] 记录止损: 连续${this.consecutiveLosses}单`);
  }

  recordWin() {
    if (this.consecutiveLosses > 0) {
      console.log(`[风控] 盈利清除连续亏损计数`);
      this.consecutiveLosses = 0;
    }
  }

  setupEventListeners() {
    this.signalGenerator.on('tradeSignal', (signal) => {
      this.handleTradeSignal(signal);
    });
    
    this.riskManager.on('positionOpened', (position) => {
      this.emit('positionOpened', position);
      this.notifyTrade('OPEN', position);
    });
    
    this.riskManager.on('positionClosed', (position) => {
      if (position.pnl < 0) {
        this.recordLoss();
      } else {
        this.recordWin();
      }
      this.saveState();
      this.emit('positionClosed', position);
      this.notifyTrade('CLOSE', position);
    });
  }

  async updateCandles(timeframe, candles) {
    this.candles[timeframe] = candles;
    this.lastUpdateTime = Date.now();
  }

  async updatePrice(price) {
    this.currentPrice = price;
    this.riskManager.setCurrentPrice(price);

    if (this.currentPrice && this.riskManager.positions.length > 0) {
      const closedPositions = this.riskManager.checkPosition(this.currentPrice);
    }
  }

  async generateSignal() {
    console.log('[Debug] generateSignal called');
    console.log('[Debug] currentPrice:', this.currentPrice);
    console.log('[Debug] candles:', Object.keys(this.candles).map(k => `${k}: ${k}: ${this.candles[k]?.length || 0}`).join(', '));

    const canTradeResult = this.canTrade();
    if (!canTradeResult.allowed) {
      console.log('[Debug] 交易暂停:', canTradeResult.reason);
      return {
        action: 'WAIT',
        reason: canTradeResult.reason,
        noTradeReasons: [canTradeResult.reason],
        confidence: 0,
        direction: null
      };
    }

    if (!this.currentPrice) {
      console.log('[Debug] currentPrice is null');
      return null;
    }

    const hasEnoughData = Object.values(this.candles).every(
      candles => candles && candles.length >= 50
    );

    console.log('[Debug] hasEnoughData:', hasEnoughData);

    if (!hasEnoughData) {
      return null;
    }

    const hasPosition = this.riskManager.positions.length > 0;
    const signal = await this.signalGenerator.generateSignals(this.candles, hasPosition);
    console.log('[Debug] raw signal:', signal?.action, signal?.confidence);
    const processedSignal = this.signalGenerator.processSignal(signal);
    console.log('[Debug] processedSignal:', processedSignal);

    return processedSignal;
  }

  handleTradeSignal(signal) {
    if (!signal || signal.action === 'WAIT') {
      return;
    }
    
    const canOpen = this.riskManager.canOpenPosition();
    if (!canOpen.allowed) {
      return;
    }
    
    const atr = signal.analysis?.timeframe15m?.adx;
    const positionDetails = this.riskManager.calculatePositionSize(
      signal,
      this.currentPrice,
      atr
    );
    
    const result = this.riskManager.openPosition(signal, positionDetails);

    if (result.success) {
      this.saveState();
      this.emit('signalTriggered', signal);
    }
  }

  notifyTrade(action, position) {
    const message = this.formatTradeNotification(action, position);
    this.emit('notification', message);
  }

  formatTradeNotification(action, position) {
    const direction = position.direction === 'long' ? '做多' : '做空';
    
    if (action === 'OPEN') {
      return {
        type: 'TRADE',
        action: 'OPEN',
        title: `📈 开仓通知`,
        message: `${direction}开仓\n入场价: ${position.entryPrice.toFixed(1)}\n止损: ${position.stopLoss.toFixed(1)}\n止盈: ${position.takeProfit.toFixed(1)}\n仓位: ${position.positionSize.toFixed(2)} USDT\n杠杆: ${position.leverage}x`,
        position
      };
    } else {
      const pnlEmoji = position.pnl >= 0 ? '✅' : '❌';
      const pnlText = position.pnl >= 0 ? '盈利' : '亏损';
      return {
        type: 'TRADE',
        action: 'CLOSE',
        title: `${pnlEmoji} 平仓通知 - ${position.status === 'take_profit' ? '止盈' : '止损'}`,
        message: `${direction}平仓\n${pnlText}: ${position.pnl.toFixed(2)} USDT\n${pnlText}率: ${(position.pnlPercent * 100).toFixed(2)}%\n入场价: ${position.entryPrice.toFixed(1)}\n出场价: ${position.closePriceActual.toFixed(1)}`,
        position
      };
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    this.checkInterval = setInterval(async () => {
      if (!this.currentPrice) return;
      
      const closedPositions = this.riskManager.checkPosition(this.currentPrice);
      
      const stats = this.riskManager.getStats();
      this.emit('equityUpdate', {
        balance: stats.balance,
        unrealizedPnl: stats.unrealizedPnl
      });
      
      const openPositions = this.riskManager.getOpenPositions();
      for (const pos of openPositions) {
        const pnl = this.riskManager.calculatePnl(pos, this.currentPrice);
        pos.currentPnl = pnl;
        pos.currentPnlPercent = pnl / pos.positionSize;
        this.emit('positionUpdate', pos);
      }
    }, 2000);
    
    this.emit('started');
  }

  loadState() {
    const state = StateManager.loadState();
    if (!state) {
      console.log('[PaperTrading] 无历史状态，从头开始');
      return;
    }

    if (state.tradingStats) {
      console.log('[PaperTrading] 恢复状态:', JSON.stringify(state.tradingStats).substring(0, 100));
      this.riskManager.restoreStats(state.tradingStats);
    }

    if (state.positions && Array.isArray(state.positions)) {
      this.riskManager.restorePositions(state.positions);
    }

    if (state.history && Array.isArray(state.history)) {
      this.riskManager.restoreClosedPositions(state.history);
    }

    if (state.equityHistory && Array.isArray(state.equityHistory)) {
      this.equityHistory = state.equityHistory;
      console.log(`[PaperTrading] 恢复权益历史 ${state.equityHistory.length} 条`);
    }

    if (state.dailyLossCount) {
      this.riskManager.dailyLossCount = state.dailyLossCount;
    }
  }

  saveState() {
    try {
      const state = {
        tradingStats: this.riskManager.getStats(),
        history: this.getHistory(),
        positions: this.riskManager.positions,
        dailyLossCount: this.riskManager.dailyLossCount || 0,
        equityHistory: this.equityHistory.slice(-1000)
      };
      StateManager.saveFullState(state);
      console.log('[PaperTrading] 状态已保存');
    } catch (error) {
      console.error('[PaperTrading] 保存状态失败:', error.message);
    }
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    this.emit('stopped');
  }

  reset() {
    this.signalGenerator.reset();
    this.riskManager.reset();
    this.candles = { '4H': [], '1H': [], '15m': [] };
    this.currentPrice = null;
    this.emit('reset');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      currentPrice: this.currentPrice,
      signalStatus: this.signalGenerator.getSignalStatus(),
      tradingStats: this.riskManager.getStats(),
      openPositions: this.riskManager.getOpenPositions(),
      lastUpdateTime: this.lastUpdateTime,
      hasEnoughData: {
        '4H': this.candles['4H'].length >= 50,
        '1H': this.candles['1H'].length >= 50,
        '15m': this.candles['15m'].length >= 50
      }
    };
  }

  getHistory() {
    return this.riskManager.closedPositions.map(pos => ({
      id: pos.id,
      direction: pos.direction,
      entryPrice: pos.entryPrice,
      exitPrice: pos.closePriceActual,
      pnl: pos.pnl,
      pnlPercent: pos.pnlPercent,
      status: pos.status,
      openedAt: pos.openedAtStr,
      closedAt: pos.closedAtStr,
      duration: pos.closedAt - pos.openedAt
    }));
  }

  getEquityCurve(timeRange = 'ALL') {
    const now = Date.now();
    let startTime = 0;

    switch (timeRange) {
      case '1D':
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case '7D':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '30D':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        startTime = 0;
    }

    let curve = this.equityHistory.filter(point => point.timestamp >= startTime);

    if (curve.length === 0) {
      const history = this.riskManager.closedPositions;
      const currentPrice = this.currentPrice || 0;
      const unrealizedPnl = this.getUnrealizedPnl();

      if (history.length === 0 && unrealizedPnl === 0) return [];

      curve = [];
      let runningBalance = this.riskManager.initialBalance;

      for (const trade of history) {
        runningBalance += trade.pnl;
        curve.push({
          timestamp: trade.closedAt,
          balance: runningBalance,
          equity: runningBalance,
          unrealizedPnl: 0,
          openPositions: 0
        });
      }

      const currentEquity = runningBalance + unrealizedPnl;
      curve.push({
        timestamp: Date.now(),
        balance: this.riskManager.balance,
        equity: currentEquity,
        unrealizedPnl: unrealizedPnl,
        openPositions: this.riskManager.positions.length
      });
    }

    const currentEquity = this.getCurrentEquity();
    const lastPoint = curve[curve.length - 1];
    if (!lastPoint || Math.abs(currentEquity - lastPoint.equity) > 0.01) {
      curve.push({
        timestamp: now,
        balance: this.riskManager.balance,
        equity: currentEquity,
        unrealizedPnl: this.getUnrealizedPnl(),
        openPositions: this.riskManager.positions.length
      });
    }

    return curve;
  }

  getEquityStats() {
    const curve = this.equityHistory;
    if (curve.length === 0) {
      return {
        currentEquity: this.getCurrentEquity(),
        initialBalance: this.riskManager.initialBalance,
        maxEquity: this.riskManager.balance,
        minEquity: this.riskManager.balance,
        maxDrawdown: 0,
        totalPnl: 0,
        totalTrades: this.riskManager.closedPositions.length,
        winningTrades: this.riskManager.closedPositions.filter(t => t.pnl > 0).length,
        losingTrades: this.riskManager.closedPositions.filter(t => t.pnl <= 0).length,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        bestTrade: 0,
        worstTrade: 0
      };
    }

    const equities = curve.map(p => p.equity);
    const maxEquity = Math.max(...equities);
    const minEquity = Math.min(...equities);
    const peak = { equity: this.riskManager.initialBalance };
    let maxDrawdown = 0;

    for (const point of curve) {
      if (point.equity > peak.equity) {
        peak.equity = point.equity;
      }
      const drawdown = (peak.equity - point.equity) / peak.equity;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    const closedPositions = this.riskManager.closedPositions;
    const winningTrades = closedPositions.filter(t => t.pnl > 0);
    const losingTrades = closedPositions.filter(t => t.pnl <= 0);
    const totalPnl = closedPositions.reduce((sum, t) => sum + t.pnl, 0);
    const totalWin = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));

    return {
      currentEquity: this.getCurrentEquity(),
      initialBalance: this.riskManager.initialBalance,
      maxEquity,
      minEquity,
      maxDrawdown: maxDrawdown * 100,
      totalPnl,
      totalTrades: closedPositions.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: closedPositions.length > 0 ? (winningTrades.length / closedPositions.length) * 100 : 0,
      avgWin: winningTrades.length > 0 ? totalWin / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? totalLoss / losingTrades.length : 0,
      profitFactor: totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? totalWin : 0,
      bestTrade: closedPositions.length > 0 ? Math.max(...closedPositions.map(t => t.pnl)) : 0,
      worstTrade: closedPositions.length > 0 ? Math.min(...closedPositions.map(t => t.pnl)) : 0
    };
  }
}

module.exports = PaperTrading;
