const EventEmitter = require('events');

class RiskManager extends EventEmitter {
  constructor(initialBalance = 1000) {
    super();
    this.config = {
      maxLeverage: 10,
      minLeverage: 1,
      maxPositionPercent: 1.0,
      minPositionPercent: 0.05,
      stopLossMinPercent: 0.01,
      stopLossMaxPercent: 0.05,
      takeProfitMinRatio: 3.1,
      maxDrawdownPercent: 0.2,
      maxDailyLossPercent: 0.05,
      maxConsecutiveLosses: 3,
      riskPercent: 0.05
    };

    this.initialBalance = initialBalance;
    this.currentPrice = null;
    this.reset();
  }

  setCurrentPrice(price) {
    this.currentPrice = price;
  }

  reset() {
    this.balance = this.initialBalance;
    this.positions = [];
    this.closedPositions = [];
    this.dailyStats = {
      trades: 0,
      wins: 0,
      losses: 0,
      volume: 0,
      pnl: 0,
      startBalance: this.initialBalance
    };
    this.stats = {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      totalVolume: 0,
      totalPnl: 0,
      maxDrawdown: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      lastLossDate: null
    };
    this.emit('reset');
  }

  restorePositions(positions) {
    if (Array.isArray(positions) && positions.length > 0) {
      this.positions = positions;
      console.log(`[RiskManager] 恢复持仓 ${positions.length} 个`);
    }
  }

  restoreClosedPositions(closedPositions) {
    if (Array.isArray(closedPositions)) {
      this.closedPositions = closedPositions;
      console.log(`[RiskManager] 恢复历史持仓 ${closedPositions.length} 个`);
    }
  }

  restoreStats(stats) {
    if (stats && typeof stats === 'object') {
      this.stats = { ...this.stats, ...stats };
      this.balance = stats.balance || this.initialBalance;
      console.log(`[RiskManager] 恢复统计信息`);
    }
  }

  calculatePositionSize(signal, currentPrice, atr) {
    const { direction, entry, confidence } = signal;

    let finalLeverage;
    if (entry?.leverage) {
      finalLeverage = Math.min(entry.leverage, this.config.maxLeverage);
      finalLeverage = Math.max(this.config.minLeverage, finalLeverage);
    } else {
      let baseLeverage = 5;
      if (atr && currentPrice) {
        const atrPercent = atr / currentPrice;
        baseLeverage = Math.floor((0.02) / atrPercent);
        baseLeverage = Math.max(this.config.minLeverage, Math.min(baseLeverage, this.config.maxLeverage));
      }
      const confidenceMultiplier = Math.min(Math.max((confidence || 50) / 100, 0.5), 1.5);
      const leverage = Math.floor(baseLeverage * confidenceMultiplier);
      finalLeverage = Math.max(this.config.minLeverage, Math.min(leverage, this.config.maxLeverage));
    }

    const equity = this.balance + this.calculateUnrealizedPnl();
    const positionNotional = equity * finalLeverage;
    const positionSize = positionNotional;

    const maxLossPercent = 0.05;
    const riskAmount = equity * maxLossPercent;

    let stopLossPercent = 0.01;
    if (entry?.riskReward?.stopLossPercent) {
      stopLossPercent = entry.riskReward.stopLossPercent;
    } else if (atr && currentPrice) {
      const atrPercent = atr / currentPrice;
      stopLossPercent = Math.max(atrPercent * 2, 0.01);
    }

    stopLossPercent = Math.max(
      this.config.stopLossMinPercent,
      Math.min(stopLossPercent, this.config.stopLossMaxPercent)
    );

    const maxStopLossPercent = maxLossPercent / finalLeverage;
    stopLossPercent = Math.min(stopLossPercent, maxStopLossPercent);

    const stopLoss = direction === 'long'
      ? currentPrice * (1 - stopLossPercent)
      : currentPrice * (1 + stopLossPercent);

    const takeProfitPercent = stopLossPercent * this.config.takeProfitMinRatio;
    const takeProfit = direction === 'long'
      ? currentPrice * (1 + takeProfitPercent)
      : currentPrice * (1 - takeProfitPercent);

    const maintenanceMarginRate = 0.005;
    const liquidationPrice = direction === 'long'
      ? currentPrice * (1 - (1 / finalLeverage) + maintenanceMarginRate)
      : currentPrice * (1 + (1 / finalLeverage) - maintenanceMarginRate);

    return {
      positionSize,
      positionNotional,
      leverage: finalLeverage,
      marginMode: 'cross',
      stopLoss,
      takeProfit,
      stopLossPercent,
      takeProfitPercent,
      riskAmount,
      riskRewardRatio: this.config.takeProfitMinRatio,
      entryPrice: currentPrice,
      confidence,
      signalAction: signal.action,
      scoreBreakdown: entry?.scoreBreakdown || null,
      scoreDetails: entry?.scoreDetails || [],
      riskLevel: entry?.riskLevel || 'Medium',
      liquidationPrice,
      maintenanceMarginRate
    };
  }

  canOpenPosition() {
    if (this.positions.length > 0) {
      return { allowed: false, reason: '已有持仓中，禁止开新仓' };
    }

    const today = new Date().toDateString();
    if (this.stats.lastLossDate && this.stats.lastLossDate !== today) {
      this.stats.consecutiveLosses = 0;
    }

    if (this.stats.consecutiveLosses >= 3) {
       return { allowed: false, reason: `连错3次，今日${this.stats.lastLossDate}已停止交易` };
     }

    const dailyLoss = this.dailyStats.pnl < 0
      ? Math.abs(this.dailyStats.pnl) / this.dailyStats.startBalance
      : 0;
    if (dailyLoss > this.config.maxDailyLossPercent) {
      return { allowed: false, reason: '今日亏损已达上限' };
    }

    const currentDrawdown = this.calculateDrawdown();
    if (currentDrawdown > this.config.maxDrawdownPercent) {
      return { allowed: false, reason: '总资金回撤已达上限' };
    }

    return { allowed: true };
  }

  openPosition(signal, positionDetails) {
    const canOpen = this.canOpenPosition();
    if (!canOpen.allowed) {
      return { success: false, reason: canOpen.reason };
    }

    const position = {
      id: this.generatePositionId(),
      direction: signal.direction,
      entryPrice: positionDetails.entryPrice,
      positionSize: positionDetails.positionSize,
      positionNotional: positionDetails.positionNotional,
      leverage: positionDetails.leverage,
      marginMode: positionDetails.marginMode || 'cross',
      stopLoss: positionDetails.stopLoss,
      takeProfit: positionDetails.takeProfit,
      stopLossPercent: positionDetails.stopLossPercent,
      takeProfitPercent: positionDetails.takeProfitPercent,
      liquidationPrice: positionDetails.liquidationPrice,
      maintenanceMarginRate: positionDetails.maintenanceMarginRate,
      signal,
      openedAt: Date.now(),
      openedAtStr: new Date().toISOString()
    };

    this.positions.push(position);
    this.dailyStats.trades++;
    this.stats.totalTrades++;
    
    this.emit('positionOpened', position);
    
    return { success: true, position };
  }

  checkPosition(currentPrice) {
    const triggeredPositions = [];
    
    for (const position of this.positions) {
      const pnl = this.calculatePnl(position, currentPrice);
      const pnlPercent = pnl / position.positionSize;
      
      let status = 'open';
      let triggered = false;
      
      if (position.direction === 'long') {
        if (currentPrice <= position.stopLoss) {
          status = 'stop_loss';
          triggered = true;
        } else if (currentPrice >= position.takeProfit) {
          status = 'take_profit';
          triggered = true;
        }
      } else {
        if (currentPrice >= position.stopLoss) {
          status = 'stop_loss';
          triggered = true;
        } else if (currentPrice <= position.takeProfit) {
          status = 'take_profit';
          triggered = true;
        }
      }
      
      if (triggered) {
        const closedPosition = {
          ...position,
          closePrice: triggered ? (status === 'stop_loss' ? position.stopLoss : position.takeProfit) : currentPrice,
          closePriceActual: currentPrice,
          closedAt: Date.now(),
          closedAtStr: new Date().toISOString(),
          pnl,
          pnlPercent,
          status
        };
        
        this.closePosition(closedPosition);
        triggeredPositions.push(closedPosition);
      }
    }
    
    return triggeredPositions;
  }

  calculateUnrealizedPnl() {
    if (!this.currentPrice || this.positions.length === 0) return 0;
    return this.positions.reduce((sum, pos) => {
      return sum + this.calculatePnl(pos, this.currentPrice);
    }, 0);
  }

  calculatePnl(position, currentPrice) {
    if (position.direction === 'long') {
      return (currentPrice - position.entryPrice) * position.positionSize / position.entryPrice;
    } else {
      return (position.entryPrice - currentPrice) * position.positionSize / position.entryPrice;
    }
  }

  closePosition(closedPosition) {
    this.positions = this.positions.filter(p => p.id !== closedPosition.id);
    this.closedPositions.push(closedPosition);
    
    this.balance += closedPosition.pnl;
    this.dailyStats.pnl += closedPosition.pnl;
    this.stats.totalPnl += closedPosition.pnl;
    
    if (closedPosition.pnl > 0) {
      this.stats.wins++;
      this.stats.consecutiveWins++;
      this.stats.consecutiveLosses = 0;
      this.dailyStats.wins++;
      if (this.stats.consecutiveWins > this.stats.maxConsecutiveWins) {
        this.stats.maxConsecutiveWins = this.stats.consecutiveWins;
      }
    } else {
      this.stats.losses++;
      this.stats.consecutiveLosses++;
      this.stats.consecutiveWins = 0;
      this.stats.lastLossDate = new Date().toDateString();
      this.dailyStats.losses++;
      if (this.stats.consecutiveLosses > this.stats.maxConsecutiveLosses) {
        this.stats.maxConsecutiveLosses = this.stats.consecutiveLosses;
      }
    }
    
    this.emit('positionClosed', closedPosition);
  }

  calculateDrawdown() {
    if (this.closedPositions.length === 0) return 0;
    
    let peak = this.initialBalance;
    let maxDrawdown = 0;
    
    for (const pos of this.closedPositions) {
      const balance = this.initialBalance + this.closedPositions
        .slice(0, this.closedPositions.indexOf(pos) + 1)
        .reduce((sum, p) => sum + p.pnl, 0);
      
      if (balance > peak) peak = balance;
      const drawdown = (peak - balance) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    this.stats.maxDrawdown = maxDrawdown;
    return maxDrawdown;
  }

  getStats() {
    const winRate = this.stats.totalTrades > 0
      ? this.stats.wins / this.stats.totalTrades
      : 0;

    const avgWin = this.stats.wins > 0
      ? this.closedPositions.filter(p => p.pnl > 0).reduce((sum, p) => sum + p.pnl, 0) / this.stats.wins
      : 0;

    const avgLoss = this.stats.losses > 0
      ? Math.abs(this.closedPositions.filter(p => p.pnl < 0).reduce((sum, p) => sum + p.pnl, 0)) / this.stats.losses
      : 0;

    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

    const unrealizedPnl = this.positions.reduce((sum, pos) => {
      if (this.currentPrice) {
        const pnl = pos.direction === 'long'
          ? (this.currentPrice - pos.entryPrice) * pos.positionSize / pos.entryPrice
          : (pos.entryPrice - this.currentPrice) * pos.positionSize / pos.entryPrice;
        return sum + pnl;
      }
      return sum;
    }, 0);

    const realizedPnl = this.balance - this.initialBalance;
    const equity = this.balance + unrealizedPnl;

    const totalMarginUsed = this.positions.reduce((sum, pos) => sum + (pos.positionSize / pos.leverage), 0);

    return {
      balance: this.balance,
      initialBalance: this.initialBalance,
      equity,
      realizedPnl,
      unrealizedPnl,
      pnlPercent: ((equity - this.initialBalance) / this.initialBalance) * 100,
      marginUsed: totalMarginUsed,
      openPositions: this.positions.length,
      totalTrades: this.stats.totalTrades,
      wins: this.stats.wins,
      losses: this.stats.losses,
      winRate: winRate * 100,
      avgWin,
      avgLoss,
      profitFactor,
      maxDrawdown: this.stats.maxDrawdown * 100,
      maxConsecutiveWins: this.stats.maxConsecutiveWins,
      maxConsecutiveLosses: this.stats.maxConsecutiveLosses,
      currentConsecutiveWins: this.stats.consecutiveWins,
      currentConsecutiveLosses: this.stats.consecutiveLosses,
      dailyStats: {
        ...this.dailyStats,
        pnlPercent: this.dailyStats.startBalance > 0
          ? (this.dailyStats.pnl / this.dailyStats.startBalance) * 100
          : 0
      }
    };
  }

  getOpenPositions() {
    const currentPrice = this.currentPrice || 0;
    const equity = this.balance + this.calculateUnrealizedPnl();
    return this.positions.map(p => {
      let currentPnl = 0;
      let currentPnlPercent = 0;

      if (currentPrice > 0) {
        const entryValue = p.positionSize;
        currentPnl = p.direction === 'long'
          ? (currentPrice - p.entryPrice) * p.positionSize / p.entryPrice
          : (p.entryPrice - currentPrice) * p.positionSize / p.entryPrice;
        currentPnlPercent = (currentPnl / entryValue) * 100;
      }

      const marginUsed = p.positionSize / p.leverage;
      const positionNotional = p.positionSize;
      const positionSizeBtc = currentPrice > 0 ? positionNotional / currentPrice : 0;
      const positionExposure = (positionNotional / equity) * 100;
      const liquidationPrice = p.direction === 'long'
        ? p.entryPrice * (1 - (1 / p.leverage) + 0.005)
        : p.entryPrice * (1 + (1 / p.leverage) - 0.005);

      return {
        ...p,
        currentPnl,
        currentPnlPercent,
        marginUsed,
        positionNotional,
        positionSizeBtc,
        positionExposure,
        liquidationPrice,
        marginMode: 'cross',
        riskLevel: p.leverage >= 8 ? 'HIGH' : p.leverage >= 5 ? 'MEDIUM' : 'LOW'
      };
    });
  }

  generatePositionId() {
    return `POS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = RiskManager;
