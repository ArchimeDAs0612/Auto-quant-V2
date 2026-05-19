class TechnicalIndicators {
  static calculateEMA(prices, period) {
    if (!prices || prices.length < period) return null;
    
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, p) => sum + p, 0) / period;
    const result = [ema];
    
    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
      result.push(ema);
    }
    
    return result;
  }

  static calculateSMA(prices, period) {
    if (!prices || prices.length < period) return null;
    
    const result = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((s, p) => s + p, 0);
      result.push(sum / period);
    }
    
    return result;
  }

  static calculateATR(candles, period = 14) {
    if (!candles || candles.length < period + 1) return null;
    
    const trueRanges = [];
    
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }

    return this.calculateEMA(trueRanges, period);
  }

  static calculateRSI(prices, period = 14) {
    if (!prices || prices.length < period + 1) return null;

    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 0; i < period; i++) {
      if (changes[i] > 0) avgGain += changes[i];
      else avgLoss += Math.abs(changes[i]);
    }
    avgGain /= period;
    avgLoss /= period;

    const rsiValues = [100 - (100 / (1 + avgGain / (avgLoss || 0.0001)))];

    for (let i = period; i < changes.length; i++) {
      const gain = changes[i] > 0 ? changes[i] : 0;
      const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgGain / (avgLoss || 0.0001);
      rsiValues.push(100 - (100 / (1 + rs)));
    }

    return rsiValues;
  }

  static calculateADX(candles, period = 14) {
    if (!candles || candles.length < period * 2 + 1) return null;
    
    const trueRanges = [];
    const plusDM = [];
    const minusDM = [];
    
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevHigh = candles[i - 1].high;
      const prevLow = candles[i - 1].low;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - candles[i - 1].close),
        Math.abs(low - candles[i - 1].close)
      );
      trueRanges.push(tr);
      
      const upMove = high - prevHigh;
      const downMove = prevLow - low;
      
      if (upMove > downMove && upMove > 0) {
        plusDM.push(upMove);
      } else {
        plusDM.push(0);
      }
      
      if (downMove > upMove && downMove > 0) {
        minusDM.push(downMove);
      } else {
        minusDM.push(0);
      }
    }
    
    const atr = this.calculateEMA(trueRanges, period);
    const plusDI = [];
    const minusDI = [];
    
    for (let i = period - 1; i < trueRanges.length; i++) {
      const sumPlusDM = plusDM.slice(i - period + 1, i + 1).reduce((s, v) => s + v, 0);
      const sumMinusDM = minusDM.slice(i - period + 1, i + 1).reduce((s, v) => s + v, 0);
      
      plusDI.push((sumPlusDM / atr[i - period + 1]) * 100);
      minusDI.push((sumMinusDM / atr[i - period + 1]) * 100);
    }
    
    const dx = [];
    for (let i = 0; i < plusDI.length; i++) {
      const diSum = plusDI[i] + minusDI[i];
      if (diSum > 0) {
        dx.push((Math.abs(plusDI[i] - minusDI[i]) / diSum) * 100);
      } else {
        dx.push(0);
      }
    }
    
    const adx = this.calculateEMA(dx, period);
    
    return {
      adx: adx ? adx[adx.length - 1] : null,
      plusDI: plusDI.length > 0 ? plusDI[plusDI.length - 1] : null,
      minusDI: minusDI.length > 0 ? minusDI[minusDI.length - 1] : null
    };
  }

  static calculateRVOL(candles, period = 20) {
    if (!candles || candles.length < period) return null;
    
    const volumes = candles.map(c => c.volume || 0);
    const sma = this.calculateSMA(volumes, period);
    
    if (!sma || sma.length === 0) return null;
    
    const avgVolume = sma[sma.length - 1];
    const currentVolume = volumes[volumes.length - 1];
    
    return currentVolume / avgVolume;
  }

  static calculateVolumeProfile(candles, bins = 50) {
    if (!candles || candles.length < 10) return null;
    
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    
    for (const candle of candles) {
      if (candle.low < minPrice) minPrice = candle.low;
      if (candle.high > maxPrice) maxPrice = candle.high;
    }
    
    const priceRange = maxPrice - minPrice;
    const binSize = priceRange / bins;
    
    const volumeByPrice = {};
    
    for (const candle of candles) {
      const binIndex = Math.floor((candle.close - minPrice) / binSize);
      const priceLevel = minPrice + (binIndex + 0.5) * binSize;
      
      if (!volumeByPrice[priceLevel]) {
        volumeByPrice[priceLevel] = 0;
      }
      volumeByPrice[priceLevel] += candle.volume || 0;
    }
    
    let maxVolume = 0;
    let poc = null;
    
    for (const [price, volume] of Object.entries(volumeByPrice)) {
      if (volume > maxVolume) {
        maxVolume = volume;
        poc = parseFloat(price);
      }
    }
    
    const sortedPrices = Object.keys(volumeByPrice).map(Number).sort((a, b) => a - b);
    const totalVolume = Object.values(volumeByPrice).reduce((s, v) => s + v, 0);
    
    let cumVolume = 0;
    const valueArea = [];
    
    for (const price of sortedPrices) {
      cumVolume += volumeByPrice[price];
      if (cumVolume <= totalVolume * 0.7) {
        valueArea.push(price);
      }
    }
    
    return {
      poc,
      maxVolume,
      valueAreaHigh: Math.max(...valueArea),
      valueAreaLow: Math.min(...valueArea),
      volumeByPrice
    };
  }

  static detectHigherHighsLows(candles, period = 10) {
    if (!candles || candles.length < period * 2) return { trend: 'undefined', higherHighs: false, higherLows: false };
    
    const highs = [];
    const lows = [];
    
    for (let i = 1; i < candles.length - 1; i++) {
      if (candles[i].high > candles[i - 1].high && candles[i].high > candles[i + 1].high) {
        highs.push(candles[i].high);
      }
      if (candles[i].low < candles[i - 1].low && candles[i].low < candles[i + 1].low) {
        lows.push(candles[i].low);
      }
    }
    
    if (highs.length < 2 || lows.length < 2) {
      return { trend: 'undefined', higherHighs: false, higherLows: false };
    }
    
    const recentHighs = highs.slice(-2);
    const recentLows = lows.slice(-2);
    
    const higherHighs = recentHighs[1] > recentHighs[0];
    const higherLows = recentLows[1] > recentLows[0];
    const lowerHighs = recentHighs[1] < recentHighs[0];
    const lowerLows = recentLows[1] < recentLows[0];
    
    let trend = 'undefined';
    if (higherHighs && higherLows) trend = 'uptrend';
    else if (lowerHighs && lowerLows) trend = 'downtrend';
    else if (higherHighs && !higherLows) trend = 'potentially_reversing_up';
    else if (lowerHighs && !lowerLows) trend = 'potentially_reversing_down';
    else trend = 'ranging';
    
    return {
      trend,
      higherHighs,
      higherLows,
      lowerHighs,
      lowerLows,
      recentHighs,
      recentLows
    };
  }

  static detectBreakout(candles, lookback = 20, threshold = 0.001) {
    if (!candles || candles.length < lookback + 1) return null;
    
    const recentCandles = candles.slice(-lookback);
    const currentCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    
    const highestHigh = Math.max(...recentCandles.map(c => c.high));
    const lowestLow = Math.min(...recentCandles.map(c => c.low));
    
    const breakoutUp = currentCandle.close > highestHigh && prevCandle.close <= highestHigh;
    const breakoutDown = currentCandle.close < lowestLow && prevCandle.close >= lowestLow;
    
    if (breakoutUp) {
      return { type: 'breakout_up', level: highestHigh, strength: (currentCandle.close - highestHigh) / highestHigh };
    }
    if (breakoutDown) {
      return { type: 'breakout_down', level: lowestLow, strength: (lowestLow - currentCandle.close) / lowestLow };
    }
    
    return null;
  }

  static calculateStochastic(candles, period = 14, kPeriod = 3, dPeriod = 3) {
    if (!candles || candles.length < period) return null;
    
    const recentCandles = candles.slice(-period);
    const highestHigh = Math.max(...recentCandles.map(c => c.high));
    const lowestLow = Math.min(...recentCandles.map(c => c.low));
    const currentClose = candles[candles.length - 1].close;
    
    const k = highestHigh === lowestLow ? 50 : ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    return { k, d: k };
  }
}

module.exports = TechnicalIndicators;
