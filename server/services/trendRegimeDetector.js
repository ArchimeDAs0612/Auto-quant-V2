const TechnicalIndicators = require('./indicators');

class TrendRegimeDetector {
  static detectRegime(candlesByTimeframe) {
    const result = {
      regime: 'CHOPPY',
      trendStrength: 0,
      signals: [],
      reasons: []
    };

    const timeframe4H = candlesByTimeframe['4H'] || candlesByTimeframe['4h'] || [];
    const timeframe1H = candlesByTimeframe['1H'] || candlesByTimeframe['1h'] || [];
    const timeframe15m = candlesByTimeframe['15m'] || candlesByTimeframe['15m'] || [];

    if (timeframe4H.length < 20 || timeframe1H.length < 20) {
      result.reasons.push('数据不足');
      return result;
    }

    let trendScore = 0;
    const maxScore = 100;

    const emaSlopeScore = this.checkEMASlope(timeframe4H);
    trendScore += emaSlopeScore.score;
    result.signals.push(emaSlopeScore);

    const structureScore = this.check1HStructure(timeframe1H);
    trendScore += structureScore.score;
    result.signals.push(structureScore);

    const atrScore = this.checkATRExpansion(timeframe4H);
    trendScore += atrScore.score;
    result.signals.push(atrScore);

    const emaAlignmentScore = this.checkEMAAlignment(timeframe4H);
    trendScore += emaAlignmentScore.score;
    result.signals.push(emaAlignmentScore);

    result.trendStrength = Math.min(trendScore, maxScore);

    if (result.trendStrength >= 40) {
      result.regime = 'TRENDING';
    } else {
      result.regime = 'CHOPPY';
      if (trendScore < 20) {
        result.reasons.push('市场明显震荡');
      } else if (trendScore < 40) {
        result.reasons.push('趋势信号不足');
      }
    }

    if (emaSlopeScore.passed) {
      result.reasons.push(emaSlopeScore.reason);
    }
    if (structureScore.passed) {
      result.reasons.push(structureScore.reason);
    }
    if (atrScore.passed) {
      result.reasons.push(atrScore.reason);
    }
    if (emaAlignmentScore.passed) {
      result.reasons.push(emaAlignmentScore.reason);
    }

    return result;
  }

  static checkEMASlope(candles, period = 55) {
    const closes = candles.map(c => c.close);
    const ema = TechnicalIndicators.calculateEMA(closes, period);

    if (!ema || ema.length < 10) {
      return { score: 0, passed: false, reason: '', details: {} };
    }

    const recentEma = ema.slice(-10);
    const firstEma = recentEma[0];
    const lastEma = recentEma[recentEma.length - 1];

    if (!firstEma || firstEma === 0) {
      return { score: 0, passed: false, reason: '', details: {} };
    }

    const slopePercent = ((lastEma - firstEma) / firstEma) * 100;
    const threshold = 0.1;

    let score = 0;
    let passed = false;
    let reason = '';

    if (Math.abs(slopePercent) > threshold) {
      passed = true;
      score = 30;
      reason = slopePercent > 0 ? 'EMA55向上倾斜' : 'EMA55向下倾斜';

      if (Math.abs(slopePercent) > 0.3) {
        score = 40;
        reason = slopePercent > 0 ? 'EMA55强势向上' : 'EMA55强势向下';
      }
    } else {
      reason = 'EMA55横盘缠绕';
    }

    return {
      score,
      passed,
      reason,
      details: {
        slope: slopePercent,
        threshold,
        emaValue: lastEma
      }
    };
  }

  static check1HStructure(candles) {
    if (candles.length < 30) {
      return { score: 0, passed: false, reason: '', details: {} };
    }

    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    const window = 5;
    let higherHighs = 0;
    let higherLows = 0;
    let lowerHighs = 0;
    let lowerLows = 0;

    for (let i = window; i < highs.length - window; i++) {
      const currentHigh = highs[i];
      const prevHigh = highs[i - window];

      if (currentHigh > prevHigh) {
        higherHighs++;
      } else if (currentHigh < prevHigh) {
        lowerHighs++;
      }

      const currentLow = lows[i];
      const prevLow = lows[i - window];

      if (currentLow > prevLow) {
        higherLows++;
      } else if (currentLow < prevLow) {
        lowerLows++;
      }
    }

    const totalStructure = higherHighs + higherLows + lowerHighs + lowerLows;
    const threshold = 3;

    let score = 0;
    let passed = false;
    let reason = '';

    const isUptrend = higherHighs >= threshold && higherLows >= threshold;
    const isDowntrend = lowerHighs >= threshold && lowerLows >= threshold;

    if (isUptrend) {
      passed = true;
      score = 25;
      reason = '1H上升结构(HH+HL)';
    } else if (isDowntrend) {
      passed = true;
      score = 25;
      reason = '1H下降结构(LH+LL)';
    } else if (totalStructure < 4) {
      reason = '1H结构不连续';
    } else {
      reason = '1H结构混乱';
    }

    return {
      score,
      passed,
      reason,
      details: {
        higherHighs,
        higherLows,
        lowerHighs,
        lowerLows,
        threshold
      }
    };
  }

  static checkATRExpansion(candles, period = 14) {
    if (candles.length < 30) {
      return { score: 0, passed: false, reason: '', details: {} };
    }

    const atr = TechnicalIndicators.calculateATR(candles, period);

    if (!atr || atr.length < 20) {
      return { score: 0, passed: false, reason: '', details: {} };
    }

    const recentAtr = atr.slice(-5);
    const pastAtr = atr.slice(-20, -5);

    const recentAvg = recentAtr.reduce((a, b) => a + b, 0) / recentAtr.length;
    const pastAvg = pastAtr.reduce((a, b) => a + b, 0) / pastAtr.length;

    if (!recentAvg || !pastAvg || pastAvg === 0) {
      return { score: 0, passed: false, reason: '', details: {} };
    }

    const expansionRatio = recentAvg / pastAvg;
    const threshold = 1.1;

    let score = 0;
    let passed = false;
    let reason = '';

    if (expansionRatio > threshold) {
      passed = true;
      score = 20;
      reason = 'ATR扩张';

      if (expansionRatio > 1.3) {
        score = 25;
        reason = 'ATR明显扩张';
      }
    } else if (expansionRatio < 0.9) {
      reason = 'ATR收缩(震荡)';
    } else {
      reason = 'ATR平稳';
    }

    return {
      score,
      passed,
      reason,
      details: {
        recentAtr: recentAvg,
        pastAtr: pastAvg,
        expansionRatio,
        threshold
      }
    };
  }

  static checkEMAAlignment(candles) {
    const closes = candles.map(c => c.close);

    const ema20 = TechnicalIndicators.calculateEMA(closes, 20);
    const ema60 = TechnicalIndicators.calculateEMA(closes, 60);

    if (!ema20 || !ema60 || ema20.length < 10 || ema60.length < 10) {
      return { score: 0, passed: false, reason: '', details: {} };
    }

    const recentEma20 = ema20.slice(-10);
    const recentEma60 = ema60.slice(-10);

    let crosses = 0;
    for (let i = 1; i < recentEma20.length; i++) {
      const prevAbove = recentEma20[i - 1] > recentEma60[i - 1];
      const currAbove = recentEma20[i] > recentEma60[i];
      if (prevAbove !== currAbove) {
        crosses++;
      }
    }

    const threshold = 1;
    let score = 0;
    let passed = false;
    let reason = '';

    if (crosses <= threshold) {
      passed = true;
      score = 15;
      const isLong = recentEma20[recentEma20.length - 1] > recentEma60[recentEma60.length - 1];
      reason = isLong ? 'EMA多头排列稳定' : 'EMA空头排列稳定';
    } else {
      reason = `EMA频繁穿越(${crosses}次)`;
    }

    return {
      score,
      passed,
      reason,
      details: {
        crosses,
        threshold,
        ema20Value: recentEma20[recentEma20.length - 1],
        ema60Value: recentEma60[recentEma60.length - 1]
      }
    };
  }

  static shouldTrade(regime, hasPosition) {
    if (regime.regime !== 'TRENDING') {
      return {
        allowed: false,
        reason: '市场震荡，禁止交易'
      };
    }

    if (regime.trendStrength < 40) {
      return {
        allowed: false,
        reason: '趋势强度不足'
      };
    }

    if (hasPosition) {
      return {
        allowed: true,
        reason: '持有仓位，继续趋势交易'
      };
    }

    return {
      allowed: true,
      reason: '趋势市场，允许开仓'
    };
  }
}

module.exports = TrendRegimeDetector;