const TechnicalIndicators = require('./indicators');

class MarketRegimeDetector {
  constructor() {
    this.config = {
      adxTrendThreshold: 15,
      adxStrongTrendThreshold: 25,
      emaSeparationThreshold: 0.003,
      volumeSpikeThreshold: 1.5,
      consolidationThreshold: 0.02
    };
  }

  analyze(candles) {
    if (!candles || candles.length < 50) {
      return { regime: 'unknown', confidence: 0, details: {} };
    }

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume || 0);

    const ema21 = TechnicalIndicators.calculateEMA(closes, 21);
    const ema55 = TechnicalIndicators.calculateEMA(closes, 55);
    const ema200 = TechnicalIndicators.calculateEMA(closes, 200);
    const adxData = TechnicalIndicators.calculateADX(candles, 14);
    const atr = TechnicalIndicators.calculateATR(candles, 14);

    console.log('[Debug] indicators - ema21:', !!ema21, 'ema55:', !!ema55, 'ema200:', !!ema200, 'adxData:', !!adxData, 'atr:', !!atr);

    if (!ema21 || !ema55 || !ema200 || !adxData || !atr) {
      return { regime: 'unknown', confidence: 0, details: {} };
    }

    const currentEMA21 = ema21[ema21.length - 1];
    const currentEMA55 = ema55[ema55.length - 1];
    const currentEMA200 = ema200[ema200.length - 1];
    const currentPrice = closes[closes.length - 1];
    const currentADX = adxData.adx;
    const currentATR = atr[atr.length - 1];

    const emaAlignment = this.checkEMAAlignment(ema21, ema55, ema200);
    const pricePosition = this.getPricePosition(currentPrice, currentEMA21, currentEMA55, currentEMA200);
    const volatilityRegime = this.detectVolatilityRegime(atr, candles);
    const volumeRegime = this.detectVolumeRegime(volumes);

    let regime = 'ranging';
    let confidence = 0;
    let trendStrength = 0;

    if (currentADX > this.config.adxStrongTrendThreshold) {
      if (adxData.plusDI > adxData.minusDI) {
        regime = 'strong_uptrend';
        trendStrength = Math.min((currentADX - 40) / 20, 1);
      } else {
        regime = 'strong_downtrend';
        trendStrength = Math.min((currentADX - 40) / 20, 1);
      }
      confidence = Math.min(currentADX / 60, 1);
    } else if (currentADX > this.config.adxTrendThreshold) {
      if (adxData.plusDI > adxData.minusDI) {
        regime = 'uptrend';
      } else {
        regime = 'downtrend';
      }
      trendStrength = (currentADX - 25) / 25;
      confidence = Math.min(currentADX / 50, 1);
    } else {
      regime = 'ranging';
      confidence = 1 - (currentADX / 25);
      trendStrength = 0;
    }

    console.log('[Debug] ADX:', currentADX, 'threshold:', this.config.adxTrendThreshold, '-> regime:', regime);

    const swingAnalysis = TechnicalIndicators.detectHigherHighsLows(candles, 10);
    const breakout = TechnicalIndicators.detectBreakout(candles, 20, 0.001);

    return {
      regime,
      confidence,
      trendStrength,
      details: {
        adx: currentADX,
        plusDI: adxData.plusDI,
        minusDI: adxData.minusDI,
        atr: currentATR,
        ema21: currentEMA21,
        ema55: currentEMA55,
        ema200: currentEMA200,
        emaAlignment,
        pricePosition,
        volatilityRegime,
        volumeRegime,
        swingAnalysis,
        breakout,
        adxTrendThreshold: this.config.adxTrendThreshold,
        adxStrongTrendThreshold: this.config.adxStrongTrendThreshold
      }
    };
  }

  checkEMAAlignment(ema21, ema55, ema200) {
    if (ema21.length < 2 || ema55.length < 2 || ema200.length < 2) {
      return 'unknown';
    }

    const current21 = ema21[ema21.length - 1];
    const current55 = ema55[ema55.length - 1];
    const current200 = ema200[ema200.length - 1];
    const prev21 = ema21[ema21.length - 2];
    const prev55 = ema55[ema55.length - 2];
    const prev200 = ema200[ema200.length - 2];

    const bullAlign = current21 > current55 && current55 > current200 && prev21 > prev55 && prev55 > prev200;
    const bearAlign = current21 < current55 && current55 < current200 && prev21 < prev55 && prev55 < prev200;

    if (bullAlign) return 'bullish_aligned';
    if (bearAlign) return 'bearish_aligned';
    if (current21 > current55 && current55 > current200) return 'partial_bullish';
    if (current21 < current55 && current55 < current200) return 'partial_bearish';
    return 'mixed';
  }

  getPricePosition(price, ema21, ema55, ema200) {
    if (price > ema21 && price > ema55 && price > ema200) return 'above_all';
    if (price > ema21 && price > ema55) return 'above_ema21_55';
    if (price > ema21 && price > ema200) return 'above_ema21_200';
    if (price > ema55 && price > ema200) return 'above_ema55_200';
    if (price > ema21) return 'above_ema21';
    if (price > ema55) return 'above_ema55';
    if (price > ema200) return 'above_ema200';
    if (price < ema21 && price < ema55 && price < ema200) return 'below_all';
    if (price < ema21 && price < ema55) return 'below_ema21_55';
    if (price < ema21 && price < ema200) return 'below_ema21_200';
    if (price < ema55 && price < ema200) return 'below_ema55_200';
    if (price < ema21) return 'below_ema21';
    if (price < ema55) return 'below_ema55';
    if (price < ema200) return 'below_ema200';
    return 'mixed';
  }

  detectVolatilityRegime(atr, candles) {
    if (!atr || atr.length < 20 || !candles) return 'unknown';

    const recentATR = atr.slice(-20);
    const atrChange = (atr[atr.length - 1] - atr[atr.length - 20]) / atr[atr.length - 20];

    const avgTrueRange = recentATR.reduce((s, v) => s + v, 0) / recentATR.length;
    const currentPrice = candles[candles.length - 1].close;
    const atrPercent = (avgTrueRange / currentPrice) * 100;

    if (atrPercent > 3) return 'high_volatility';
    if (atrPercent > 1.5) return 'normal_volatility';
    return 'low_volatility';
  }

  detectVolumeRegime(volumes) {
    if (!volumes || volumes.length < 20) return 'unknown';

    const avgVolume = volumes.slice(-20).reduce((s, v) => s + v, 0) / 20;
    const currentVolume = volumes[volumes.length - 1];
    const volumeRatio = currentVolume / avgVolume;

    if (volumeRatio > 2) return 'extreme_high';
    if (volumeRatio > 1.5) return 'high';
    if (volumeRatio > 0.5) return 'normal';
    return 'low';
  }

  isTradable(regimeDetails) {
    const { regime, confidence, details } = regimeDetails;

    if (regime === 'unknown' || regime === 'ranging') {
      return {
        tradable: false,
        reason: regime === 'ranging' ? '市场处于震荡整理阶段，禁止交易' : '市场状态未知'
      };
    }

    if (details.volatilityRegime === 'high_volatility') {
      return {
        tradable: false,
        reason: '波动率过高，风险较大'
      };
    }

    if (details.volumeRegime === 'low') {
      return {
        tradable: false,
        reason: '成交量过低，市场不活跃'
      };
    }

    if (details.swingAnalysis && details.swingAnalysis.trend === 'ranging') {
      return {
        tradable: false,
        reason: '价格结构处于震荡，无明确趋势'
      };
    }

    return {
      tradable: true,
      reason: '市场条件满足交易要求'
    };
  }

  getTrendDirection(regimeDetails) {
    const { regime, details } = regimeDetails;

    if (regime.includes('uptrend') || regime.includes('strong_uptrend')) {
      return 'long';
    }
    if (regime.includes('downtrend') || regime.includes('strong_downtrend')) {
      return 'short';
    }

    if (details.swingAnalysis) {
      if (details.swingAnalysis.higherHighs && details.swingAnalysis.higherLows) {
        return 'long';
      }
      if (details.swingAnalysis.lowerHighs && details.swingAnalysis.lowerLows) {
        return 'short';
      }
    }

    return 'neutral';
  }
}

module.exports = MarketRegimeDetector;
