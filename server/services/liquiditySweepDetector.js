const TechnicalIndicators = require('./indicators');

class LiquiditySweepDetector {
  constructor() {
    this.config = {
      sweepThreshold: 0.001,
      wickToBodyRatio: 2.0,
      volumeConfirmation: 1.3,
      retracementMin: 0.5,
      retracementMax: 1.0
    };
    
    this.sweepHistory = [];
    this.maxHistory = 100;
  }

  analyze(candles, timeframe = '1H') {
    if (!candles || candles.length < 20) {
      return { hasSweep: false, type: null, details: {} };
    }

    const currentCandle = candles[candles.length - 1];
    const prevCandles = candles.slice(-10, -1);
    
    const recentHighs = prevCandles.map(c => c.high);
    const recentLows = prevCandles.map(c => c.low);
    const avgVolume = prevCandles.reduce((s, c) => s + (c.volume || 0), 0) / prevCandles.length;
    
    const swingHigh = Math.max(...recentHighs);
    const swingLow = Math.min(...recentLows);
    
    const highSweep = this.detectHighSweep(currentCandle, swingHigh, avgVolume);
    const lowSweep = this.detectLowSweep(currentCandle, swingLow, avgVolume);
    
    const breakout = TechnicalIndicators.detectBreakout(candles, 20, 0.001);
    
    let result = { hasSweep: false, type: null, details: {} };
    
    if (highSweep) {
      result = {
        hasSweep: true,
        type: 'liquidity_sweep_high',
        details: {
          level: swingHigh,
          wickSize: currentCandle.high - currentCandle.close,
          bodySize: Math.abs(currentCandle.close - currentCandle.open),
          volumeRatio: currentCandle.volume / avgVolume,
          retracement: this.calculateRetracement(currentCandle, 'high'),
          isFakeout: this.isFakeout(currentCandle, breakout, 'high'),
          timestamp: currentCandle.timestamp
        }
      };
    } else if (lowSweep) {
      result = {
        hasSweep: true,
        type: 'liquidity_sweep_low',
        details: {
          level: swingLow,
          wickSize: currentCandle.close - currentCandle.low,
          bodySize: Math.abs(currentCandle.close - currentCandle.open),
          volumeRatio: currentCandle.volume / avgVolume,
          retracement: this.calculateRetracement(currentCandle, 'low'),
          isFakeout: this.isFakeout(currentCandle, breakout, 'low'),
          timestamp: currentCandle.timestamp
        }
      };
    }
    
    if (result.hasSweep) {
      this.sweepHistory.push({
        ...result,
        timeframe,
        candleTime: currentCandle.timestamp,
        price: currentCandle.close
      });
      
      if (this.sweepHistory.length > this.maxHistory) {
        this.sweepHistory.shift();
      }
    }
    
    return result;
  }

  detectHighSweep(candle, swingHigh, avgVolume) {
    if (candle.high <= swingHigh) return false;
    
    const wickSize = candle.high - Math.max(candle.open, candle.close);
    const bodySize = Math.abs(candle.close - candle.open);
    
    if (bodySize === 0) return false;
    
    const wickToBodyRatio = wickSize / bodySize;
    
    if (wickToBodyRatio < this.config.wickToBodyRatio) return false;
    
    const sweepDistance = (candle.high - swingHigh) / swingHigh;
    if (sweepDistance > 0.005) return false;
    
    if (candle.volume < avgVolume * 0.8) return false;
    
    const closeBelowHigh = candle.close < candle.high - (candle.high - swingHigh) * 0.5;
    
    return closeBelowHigh;
  }

  detectLowSweep(candle, swingLow, avgVolume) {
    if (candle.low >= swingLow) return false;
    
    const wickSize = Math.min(candle.open, candle.close) - candle.low;
    const bodySize = Math.abs(candle.close - candle.open);
    
    if (bodySize === 0) return false;
    
    const wickToBodyRatio = wickSize / bodySize;
    
    if (wickToBodyRatio < this.config.wickToBodyRatio) return false;
    
    const sweepDistance = (swingLow - candle.low) / swingLow;
    if (sweepDistance > 0.005) return false;
    
    if (candle.volume < avgVolume * 0.8) return false;
    
    const closeAboveLow = candle.close > candle.low + (swingLow - candle.low) * 0.5;
    
    return closeAboveLow;
  }

  calculateRetracement(candle, type) {
    if (type === 'high') {
      const totalDrop = candle.high - candle.low;
      const dropAfterSweep = candle.high - candle.close;
      return totalDrop > 0 ? dropAfterSweep / totalDrop : 0;
    } else {
      const totalRise = candle.high - candle.low;
      const riseAfterSweep = candle.close - candle.low;
      return totalRise > 0 ? riseAfterSweep / totalRise : 0;
    }
  }

  isFakeout(candle, breakout, type) {
    if (!breakout) return false;
    
    if (type === 'high' && breakout.type === 'breakout_up') {
      return candle.close < candle.high - (candle.high - candle.low) * 0.3;
    }
    if (type === 'low' && breakout.type === 'breakout_down') {
      return candle.close > candle.low + (candle.high - candle.low) * 0.3;
    }
    
    return false;
  }

  getRecentSweeps(count = 10) {
    return this.sweepHistory.slice(-count);
  }

  getSweepStats() {
    if (this.sweepHistory.length === 0) {
      return {
        total: 0,
        highSweeps: 0,
        lowSweeps: 0,
        fakeouts: 0,
        fakeoutRate: 0
      };
    }
    
    const highSweeps = this.sweepHistory.filter(s => s.type === 'liquidity_sweep_high').length;
    const lowSweeps = this.sweepHistory.filter(s => s.type === 'liquidity_sweep_low').length;
    const fakeouts = this.sweepHistory.filter(s => s.details.isFakeout).length;
    
    return {
      total: this.sweepHistory.length,
      highSweeps,
      lowSweeps,
      fakeouts,
      fakeoutRate: this.sweepHistory.length > 0 ? fakeouts / this.sweepHistory.length : 0
    };
  }

  shouldTradeAfterSweep(sweepResult, tradeDirection) {
    if (!sweepResult.hasSweep) {
      return { canTrade: true, reason: '无流动性扫除' };
    }
    
    if (sweepResult.details.isFakeout) {
      if (tradeDirection === 'long' && sweepResult.type === 'liquidity_sweep_low') {
        return {
          canTrade: true,
          reason: '下方位被扫除，可能反转做多',
          entryType: 'sweep_reversal_long'
        };
      }
      if (tradeDirection === 'short' && sweepResult.type === 'liquidity_sweep_high') {
        return {
          canTrade: true,
          reason: '上方位被扫除，可能反转做空',
          entryType: 'sweep_reversal_short'
        };
      }
    }
    
    const retracement = sweepResult.details.retracement;
    if (retracement >= this.config.retracementMin && retracement <= this.config.retracementMax) {
      if (tradeDirection === 'long' && sweepResult.type === 'liquidity_sweep_low') {
        return {
          canTrade: false,
          reason: '等待价格收复扫除区域后再入场'
        };
      }
      if (tradeDirection === 'short' && sweepResult.type === 'liquidity_sweep_high') {
        return {
          canTrade: false,
          reason: '等待价格收复扫除区域后再入场'
        };
      }
    }
    
    return { canTrade: true, reason: '扫除后可正常交易' };
  }
}

module.exports = LiquiditySweepDetector;
