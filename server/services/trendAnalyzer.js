class TrendAnalyzer {
  constructor() {
    this.emaPeriods = { fast: 21, medium: 55, slow: 200 };
    this.adxPeriod = 14;
    this.atrPeriod = 14;
    this.volumeLookback = 20;
    this.minADX = 25;
    this.minRR = 3;
  }

  analyze(marketData) {
    const { '4H': data4H, '1H': data1H, '15m': data15m } = marketData;
    
    if (!data4H || !data1H || !data15m || 
        data4H.length < 200 || data1H.length < 200 || data15m.length < 50) {
      return {
        marketRegime: 'insufficient_data',
        signal: null,
        trend: 'unknown'
      };
    }

    const regime = this.detectMarketRegime(data4H, data1H);
    
    if (regime !== 'trending') {
      return {
        marketRegime: regime,
        signal: null,
        trend: 'unknown',
        reason: '非趋势市场，禁止交易'
      };
    }

    const trend4H = this.analyze4H(data4H);
    const structure1H = this.analyze1H(data1H, trend4H.direction);
    
    if (!structure1H.isValid) {
      return {
        marketRegime: regime,
        signal: null,
        trend: trend4H.direction,
        reason: '1H结构不健康'
      };
    }

    const entry15m = this.analyze15m(data15m, trend4H.direction, structure1H);
    
    if (!entry15m.isValid) {
      return {
        marketRegime: regime,
        signal: null,
        trend: trend4H.direction,
        reason: '15m无有效进场点'
      };
    }

    const liquiditySweep = this.detectLiquiditySweep(data15m, trend4H.direction);
    if (liquiditySweep.detected && liquiditySweep.isFake) {
      return {
        marketRegime: regime,
        signal: null,
        trend: trend4H.direction,
        reason: '检测到假突破/流动性清扫'
      };
    }

    const signal = this.generateSignal(
      trend4H,
      structure1H,
      entry15m,
      data1H,
      data15m
    );

    return {
      marketRegime: regime,
      trend: trend4H.direction,
      signal: signal,
      analysis: {
        ema4H: trend4H.ema,
        ema1H: structure1H.ema,
        adx: trend4H.adx,
        atr: trend4H.atr,
        volumeProfile: this.calculateVolumeProfile(data1H),
        session: this.getCurrentSession()
      }
    };
  }

  analyze4H(data) {
    const ema21 = this.calculateEMA(data, 21);
    const ema55 = this.calculateEMA(data, 55);
    const ema200 = this.calculateEMA(data, 200);
    const adx = this.calculateADX(data, 14);
    const atr = this.calculateATR(data, 14);
    
    const current = data[data.length - 1];
    const currentEMA21 = ema21[ema21.length - 1];
    const currentEMA55 = ema55[ema55.length - 1];
    const currentEMA200 = ema200[ema200.length - 1];
    const currentADX = adx[adx.length - 1];
    const currentATR = atr[atr.length - 1];

    let direction = 'neutral';
    if (current.close > currentEMA21 && currentEMA21 > currentEMA55 && currentEMA55 > currentEMA200) {
      direction = 'long';
    } else if (current.close < currentEMA21 && currentEMA21 < currentEMA55 && currentEMA55 < currentEMA200) {
      direction = 'short';
    }

    const isTrending = currentADX > 25;

    return {
      direction,
      isTrending,
      adx: currentADX,
      atr: currentATR,
      ema: { ema21: currentEMA21, ema55: currentEMA55, ema200: currentEMA200 },
      strength: this.calculateTrendStrength(data, direction)
    };
  }

  analyze1H(data, direction4H) {
    const ema21 = this.calculateEMA(data, 21);
    const ema55 = this.calculateEMA(data, 55);
    const swings = this.identifySwings(data, 5);
    
    const current = data[data.length - 1];
    const currentEMA21 = ema21[ema21.length - 1];
    const currentEMA55 = ema55[ema55.length - 1];

    let isValid = false;
    let structure = 'unknown';

    if (direction4H === 'long') {
      const higherHighs = this.checkHigherHighs(swings.highs, 3);
      const higherLows = this.checkHigherLows(swings.lows, 3);
      const pullback = this.checkPullback(data, ema21, ema55, 'long');
      
      if ((higherHighs || higherLows) && pullback) {
        isValid = true;
        structure = higherHighs ? 'higher_high' : 'higher_low';
      }
    } else if (direction4H === 'short') {
      const lowerLows = this.checkLowerLows(swings.lows, 3);
      const lowerHighs = this.checkLowerHighs(swings.highs, 3);
      const pullback = this.checkPullback(data, ema21, ema55, 'short');
      
      if ((lowerLows || lowerHighs) && pullback) {
        isValid = true;
        structure = lowerLows ? 'lower_low' : 'lower_high';
      }
    }

    return {
      isValid,
      structure,
      ema: { ema21: currentEMA21, ema55: currentEMA55 },
      swings,
      recentHigh: swings.highs[swings.highs.length - 1],
      recentLow: swings.lows[swings.lows.length - 1]
    };
  }

  analyze15m(data, direction, structure1H) {
    const ema21 = this.calculateEMA(data, 21);
    const ema55 = this.calculateEMA(data, 55);
    const current = data[data.length - 1];
    const currentEMA21 = ema21[ema21.length - 1];
    const currentEMA55 = ema55[ema55.length - 1];

    let isValid = false;
    let entryPrice = null;
    let stopLoss = null;
    let takeProfit = null;

    if (direction === 'long') {
      const aboveEMA = current.close > currentEMA21 && currentEMA21 > currentEMA55;
      const nearSupport = this.isNearLevel(current.close, structure1H.recentLow, 0.005);
      
      if (aboveEMA && nearSupport) {
        isValid = true;
        entryPrice = current.close;
        stopLoss = Math.min(structure1H.recentLow * 0.995, current.close * 0.985);
        takeProfit = current.close + (current.close - stopLoss) * 3;
      }
    } else if (direction === 'short') {
      const belowEMA = current.close < currentEMA21 && currentEMA21 < currentEMA55;
      const nearResistance = this.isNearLevel(current.close, structure1H.recentHigh, 0.005);
      
      if (belowEMA && nearResistance) {
        isValid = true;
        entryPrice = current.close;
        stopLoss = Math.max(structure1H.recentHigh * 1.005, current.close * 1.015);
        takeProfit = current.close - (stopLoss - current.close) * 3;
      }
    }

    return {
      isValid,
      entryPrice,
      stopLoss,
      takeProfit,
      rr: entryPrice && stopLoss ? Math.abs((takeProfit - entryPrice) / (entryPrice - stopLoss)) : 0
    };
  }

  detectMarketRegime(data4H, data1H) {
    const adx4H = this.calculateADX(data4H, 14);
    const currentADX = adx4H[adx4H.length - 1];
    
    const atr4H = this.calculateATR(data4H, 14);
    const avgATR = atr4H.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const currentATR = atr4H[atr4H.length - 1];
    
    const bbWidth = this.calculateBollingerBandWidth(data4H, 20);
    
    if (currentADX < 20 && bbWidth < 0.03) {
      return 'ranging';
    }
    
    if (currentADX > 25 && currentATR > avgATR * 0.8) {
      return 'trending';
    }
    
    if (this.detectChoppyMarket(data1H)) {
      return 'choppy';
    }
    
    return 'uncertain';
  }

  detectLiquiditySweep(data, direction) {
    const lookback = 10;
    const recent = data.slice(-lookback);
    const current = data[data.length - 1];
    
    const highs = recent.map(c => c.high);
    const lows = recent.map(c => c.low);
    const recentHigh = Math.max(...highs);
    const recentLow = Math.min(...lows);
    
    let detected = false;
    let isFake = false;

    if (direction === 'long') {
      if (current.low < recentLow * 1.002 && current.close > recentLow * 1.005) {
        detected = true;
        isFake = current.close > recent.slice(-2)[0].close;
      }
    } else {
      if (current.high > recentHigh * 0.998 && current.close < recentHigh * 0.995) {
        detected = true;
        isFake = current.close < recent.slice(-2)[0].close;
      }
    }

    return { detected, isFake };
  }

  calculateVolumeProfile(data, bins = 24) {
    const prices = data.map(c => c.close);
    const volumes = data.map(c => c.volume);
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const binSize = (maxPrice - minPrice) / bins;
    
    const profile = new Array(bins).fill(0);
    
    for (let i = 0; i < data.length; i++) {
      const binIndex = Math.min(Math.floor((prices[i] - minPrice) / binSize), bins - 1);
      profile[binIndex] += volumes[i];
    }
    
    const maxVolume = Math.max(...profile);
    const pocIndex = profile.indexOf(maxVolume);
    const poc = minPrice + pocIndex * binSize;
    
    return {
      poc,
      valueArea: this.calculateValueArea(profile, minPrice, binSize),
      profile: profile.map((v, i) => ({
        price: minPrice + i * binSize,
        volume: v
      }))
    };
  }

  calculateValueArea(profile, minPrice, binSize, percentile = 0.7) {
    const totalVolume = profile.reduce((a, b) => a + b, 0);
    const targetVolume = totalVolume * percentile;
    
    const sorted = profile.map((v, i) => ({ volume: v, index: i }))
      .sort((a, b) => b.volume - a.volume);
    
    let accumulatedVolume = 0;
    const valueAreaIndices = [];
    
    for (const item of sorted) {
      accumulatedVolume += item.volume;
      valueAreaIndices.push(item.index);
      if (accumulatedVolume >= targetVolume) break;
    }
    
    const minIndex = Math.min(...valueAreaIndices);
    const maxIndex = Math.max(...valueAreaIndices);
    
    return {
      low: minPrice + minIndex * binSize,
      high: minPrice + maxIndex * binSize
    };
  }

  getCurrentSession() {
    const now = new Date();
    const hour = now.getUTCHours();
    
    if (hour >= 0 && hour < 8) return 'asia';
    if (hour >= 8 && hour < 16) return 'europe';
    return 'america';
  }

  generateSignal(trend4H, structure1H, entry15m, data1H, data15m) {
    const rr = entry15m.rr;
    const stopDistance = Math.abs(entry15m.entryPrice - entry15m.stopLoss);
    
    if (rr < 3) return null;
    if (stopDistance < 500) return null;

    const volumeProfile = this.calculateVolumeProfile(data1H);
    const isNearPOC = this.isNearLevel(entry15m.entryPrice, volumeProfile.poc, 0.01);
    
    if (isNearPOC) {
      return null;
    }

    const session = this.getCurrentSession();
    const rvol = this.calculateRVOL(data15m, 20);
    
    if (rvol < 1.2) {
      return null;
    }

    return {
      action: trend4H.direction === 'long' ? 'LONG' : 'SHORT',
      entryPrice: entry15m.entryPrice,
      stopLoss: entry15m.stopLoss,
      takeProfit: entry15m.takeProfit,
      rr: rr,
      reason: `${trend4H.direction.toUpperCase()} | 4H趋势确认 | 1H${structure1H.structure} | RR=${rr.toFixed(2)} | ${session}盘`,
      metadata: {
        adx: trend4H.adx,
        atr: trend4H.atr,
        rvol,
        session,
        volumeProfile: volumeProfile.poc
      }
    };
  }

  calculateEMA(data, period) {
    const k = 2 / (period + 1);
    const ema = [data[0].close];
    
    for (let i = 1; i < data.length; i++) {
      ema.push(data[i].close * k + ema[i - 1] * (1 - k));
    }
    
    return ema;
  }

  calculateATR(data, period) {
    const atr = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        atr.push(data[i].high - data[i].low);
      } else {
        const tr1 = data[i].high - data[i].low;
        const tr2 = Math.abs(data[i].high - data[i - 1].close);
        const tr3 = Math.abs(data[i].low - data[i - 1].close);
        const tr = Math.max(tr1, tr2, tr3);
        
        if (i < period) {
          atr.push(tr);
        } else {
          atr.push((atr[i - 1] * (period - 1) + tr) / period);
        }
      }
    }
    
    return atr;
  }

  calculateADX(data, period) {
    const dmPlus = [];
    const dmMinus = [];
    const tr = [];
    
    for (let i = 1; i < data.length; i++) {
      const highDiff = data[i].high - data[i - 1].high;
      const lowDiff = data[i - 1].low - data[i].low;
      
      dmPlus.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
      dmMinus.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
      
      const tr1 = data[i].high - data[i].low;
      const tr2 = Math.abs(data[i].high - data[i - 1].close);
      const tr3 = Math.abs(data[i].low - data[i - 1].close);
      tr.push(Math.max(tr1, tr2, tr3));
    }
    
    const smooth = (arr, period) => {
      const smoothed = [];
      let sum = arr.slice(0, period).reduce((a, b) => a + b, 0);
      smoothed.push(sum);
      
      for (let i = period; i < arr.length; i++) {
        sum = sum - sum / period + arr[i];
        smoothed.push(sum);
      }
      
      return smoothed;
    };
    
    const smoothedTR = smooth(tr, period);
    const smoothedDMPlus = smooth(dmPlus, period);
    const smoothedDMMinus = smooth(dmMinus, period);
    
    const diPlus = smoothedDMPlus.map((dm, i) => (dm / smoothedTR[i]) * 100);
    const diMinus = smoothedDMMinus.map((dm, i) => (dm / smoothedTR[i]) * 100);
    
    const dx = diPlus.map((dip, i) => 
      Math.abs(dip - diMinus[i]) / (dip + diMinus[i]) * 100
    );
    
    const adx = [];
    let adxSum = dx.slice(0, period).reduce((a, b) => a + b, 0);
    adx.push(adxSum / period);
    
    for (let i = period; i < dx.length; i++) {
      adx.push((adx[adx.length - 1] * (period - 1) + dx[i]) / period);
    }
    
    return [0, ...adx];
  }

  identifySwings(data, strength = 5) {
    const highs = [];
    const lows = [];
    
    for (let i = strength; i < data.length - strength; i++) {
      const isHigh = data.slice(i - strength, i).every(c => c.high <= data[i].high) &&
                     data.slice(i + 1, i + strength + 1).every(c => c.high <= data[i].high);
      
      const isLow = data.slice(i - strength, i).every(c => c.low >= data[i].low) &&
                    data.slice(i + 1, i + strength + 1).every(c => c.low >= data[i].low);
      
      if (isHigh) highs.push(data[i].high);
      if (isLow) lows.push(data[i].low);
    }
    
    return { highs, lows };
  }

  checkHigherHighs(highs, count = 3) {
    if (highs.length < count) return false;
    const recent = highs.slice(-count);
    return recent.every((h, i) => i === 0 || h > recent[i - 1]);
  }

  checkHigherLows(lows, count = 3) {
    if (lows.length < count) return false;
    const recent = lows.slice(-count);
    return recent.every((l, i) => i === 0 || l > recent[i - 1]);
  }

  checkLowerLows(lows, count = 3) {
    if (lows.length < count) return false;
    const recent = lows.slice(-count);
    return recent.every((l, i) => i === 0 || l < recent[i - 1]);
  }

  checkLowerHighs(highs, count = 3) {
    if (highs.length < count) return false;
    const recent = highs.slice(-count);
    return recent.every((h, i) => i === 0 || h < recent[i - 1]);
  }

  checkPullback(data, ema21, ema55, direction) {
    const current = data[data.length - 1];
    const currentEMA21 = ema21[ema21.length - 1];
    const currentEMA55 = ema55[ema55.length - 1];
    
    if (direction === 'long') {
      return current.close > currentEMA21 && currentEMA21 > currentEMA55;
    } else {
      return current.close < currentEMA21 && currentEMA21 < currentEMA55;
    }
  }

  isNearLevel(price, level, threshold = 0.005) {
    return Math.abs(price - level) / level < threshold;
  }

  calculateRVOL(data, period = 20) {
    const currentVolume = data[data.length - 1].volume;
    const avgVolume = data.slice(-period - 1, -1).reduce((a, b) => a + b.volume, 0) / period;
    return currentVolume / avgVolume;
  }

  calculateTrendStrength(data, direction) {
    const returns = [];
    for (let i = 1; i < data.length; i++) {
      returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
    }
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const positiveReturns = returns.filter(r => r > 0).length;
    
    if (direction === 'long') {
      return positiveReturns / returns.length;
    } else {
      return 1 - (positiveReturns / returns.length);
    }
  }

  calculateBollingerBandWidth(data, period = 20, multiplier = 2) {
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b.close, 0);
      sma.push(sum / period);
    }
    
    const stdDev = [];
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = sma[i - period + 1];
      const variance = slice.reduce((a, b) => a + Math.pow(b.close - mean, 2), 0) / period;
      stdDev.push(Math.sqrt(variance));
    }
    
    const currentSMA = sma[sma.length - 1];
    const currentStdDev = stdDev[stdDev.length - 1];
    
    return (currentStdDev * multiplier * 2) / currentSMA;
  }

  detectChoppyMarket(data, threshold = 0.3) {
    const returns = [];
    for (let i = 1; i < data.length; i++) {
      returns.push(Math.abs((data[i].close - data[i - 1].close) / data[i - 1].close));
    }
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const directionChanges = returns.filter((r, i) => 
      i > 0 && ((r > 0) !== (returns[i - 1] > 0))
    ).length;
    
    return (directionChanges / returns.length) > threshold;
  }
}

module.exports = TrendAnalyzer;
