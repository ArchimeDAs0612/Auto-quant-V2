const TechnicalIndicators = require('./indicators');
const TrendRegimeDetector = require('./trendRegimeDetector');

class MultiTimeframeAnalyzer {
  constructor() {
    this.cache = {
      '4H': { data: null, timestamp: 0 },
      '1H': { data: null, timestamp: 0 },
      '15m': { data: null, timestamp: 0 }
    };
    this.cacheTimeout = 30000;
  }

  async analyze(candlesByTimeframe) {
    const now = Date.now();

    const timeframe4H = candlesByTimeframe['4H'] || candlesByTimeframe['4h'] || [];
    const timeframe1H = candlesByTimeframe['1H'] || candlesByTimeframe['1h'] || [];
    const timeframe15m = candlesByTimeframe['15m'] || candlesByTimeframe['15m'] || [];

    const regime = TrendRegimeDetector.detectRegime(candlesByTimeframe);

    const analysis4H = this.analyzeTimeframe(timeframe4H, '4H');
    const analysis1H = this.analyzeTimeframe(timeframe1H, '1H');
    const analysis15m = this.analyzeTimeframe(timeframe15m, '15m');

    const tradeSetup = this.evaluateTradeSetup(analysis4H, analysis1H, analysis15m, regime);

    return {
      timeframe4H: analysis4H,
      timeframe1H: analysis1H,
      timeframe15m: analysis15m,
      tradeSetup,
      regime,
      timestamp: now
    };
  }

  analyzeTimeframe(candles, timeframe) {
    if (!candles || candles.length < 20) {
      return { available: false, error: '数据不足' };
    }

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume || 0);

    const ema9 = TechnicalIndicators.calculateEMA(closes, 9);
    const ema20 = TechnicalIndicators.calculateEMA(closes, 20);
    const ema60 = TechnicalIndicators.calculateEMA(closes, 60);
    const ema30 = TechnicalIndicators.calculateEMA(closes, 30);

    const swingAnalysis = TechnicalIndicators.detectHigherHighsLows(candles, 10);

    const atr = TechnicalIndicators.calculateATR(candles, 14);
    const rsi = TechnicalIndicators.calculateRSI(closes, 14);
    const currentPrice = closes[closes.length - 1];

    const recentHigh = Math.max(...highs.slice(-20));
    const recentLow = Math.min(...lows.slice(-20));
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const currentVolume = volumes[volumes.length - 1];

    let ema9Above20 = false;
    let ema9Below20 = false;
    let ema9CrossUp20 = false;
    let ema9CrossDown20 = false;

    if (ema9 && ema20 && ema9.length >= 2 && ema20.length >= 2) {
      const currentEma9 = ema9[ema9.length - 1];
      const currentEma20 = ema20[ema20.length - 1];
      const prevEma9 = ema9[ema9.length - 2];
      const prevEma20 = ema20[ema20.length - 2];

      ema9Above20 = currentEma9 > currentEma20;
      ema9Below20 = currentEma9 < currentEma20;
      ema9CrossUp20 = prevEma9 <= prevEma20 && currentEma9 > currentEma20;
      ema9CrossDown20 = prevEma9 >= prevEma20 && currentEma9 < currentEma20;
    }

    const localHighs = this.findLocalHighs(highs, 5);
    const localLows = this.findLocalLows(lows, 5);
    const lastLocalHigh = localHighs[0] || recentHigh;
    const lastLocalLow = localLows[0] || recentLow;

    const nearLocalHigh = Math.abs(currentPrice - lastLocalHigh) / currentPrice < 0.003;
    const nearLocalLow = Math.abs(currentPrice - lastLocalLow) / currentPrice < 0.003;

    const volumeSpike = currentVolume > avgVolume * 1.2;

    return {
      available: true,
      timeframe,
      candles,
      price: currentPrice,
      high: highs[highs.length - 1],
      low: lows[lows.length - 1],
      ema: {
        ema9: ema9 ? ema9[ema9.length - 1] : null,
        ema20: ema20 ? ema20[ema20.length - 1] : null,
        ema60: ema60 ? ema60[ema60.length - 1] : null,
        ema30: ema30 ? ema30[ema30.length - 1] : null,
        ema9Above20,
        ema9Below20,
        ema9CrossUp20,
        ema9CrossDown20
      },
      atr: atr ? atr[atr.length - 1] : null,
      rsi: rsi ? rsi[rsi.length - 1] : null,
      swingAnalysis,
      volume: {
        current: currentVolume,
        avg: avgVolume,
        spike: volumeSpike
      },
      localHigh: lastLocalHigh,
      localLow: lastLocalLow,
      nearLocalHigh,
      nearLocalLow,
      recentHigh,
      recentLow
    };
  }

  findLocalHighs(highs, window) {
    const peaks = [];
    for (let i = window; i < highs.length - window; i++) {
      let isPeak = true;
      for (let j = i - window; j <= i + window; j++) {
        if (j !== i && highs[j] >= highs[i]) {
          isPeak = false;
          break;
        }
      }
      if (isPeak) {
        peaks.push(highs[i]);
      }
    }
    return peaks;
  }

  findLocalLows(lows, window) {
    const troughs = [];
    for (let i = window; i < lows.length - window; i++) {
      let isTrough = true;
      for (let j = i - window; j <= i + window; j++) {
        if (j !== i && lows[j] <= lows[i]) {
          isTrough = false;
          break;
        }
      }
      if (isTrough) {
        troughs.push(lows[i]);
      }
    }
    return troughs;
  }

  calculate4HSupportResistance(candles4H) {
    if (!candles4H || candles4H.length < 20) {
      return { resistance: null, support: null };
    }

    const highs = candles4H.map(c => c.high);
    const lows = candles4H.map(c => c.low);
    const closes = candles4H.map(c => c.close);
    const currentPrice = closes[closes.length - 1];

    const recentHighs = highs.slice(-20);
    const recentLows = lows.slice(-20);

    const resistanceLevel = Math.max(...recentHighs);
    const supportLevel = Math.min(...recentLows);

    const resistanceDistance = ((resistanceLevel - currentPrice) / currentPrice) * 100;
    const supportDistance = ((currentPrice - supportLevel) / currentPrice) * 100;

    return {
      resistance: resistanceLevel,
      support: supportLevel,
      resistanceDistancePercent: resistanceDistance,
      supportDistancePercent: supportDistance,
      nearResistance: resistanceDistance < 0.8,
      nearSupport: supportDistance < 0.8
    };
  }

  evaluateTradeSetup(analysis4H, analysis1H, analysis15m, regime) {
    const setup = {
      isValid: false,
      direction: null,
      confidence: 0,
      reasons: [],
      entryCriteria: {},
      riskReward: null,
      noTradeReasons: [],
      regime: regime || { regime: 'UNKNOWN', trendStrength: 0 },
      scoreBreakdown: {
        market: 0,
        ema4H: 0,
        rsi: 0,
        ema1H: 0,
        sr: 0,
        entry15m: 0,
        earlyParticipation: 0
      },
      scoreDetails: [],
      totalScore: 0
    };

    console.log('\n========== 入场信号分析 (评分制) ==========');
    console.log(`[时间] ${new Date().toLocaleString()}`);
    console.log(`[价格] ${analysis15m.price?.toFixed(2)}`);
    console.log(`[目标] Score >= 60 即可交易`);

    if (!analysis4H.available || !analysis1H.available || !analysis15m.available) {
      setup.noTradeReasons.push('部分时间框架数据不足');
      console.log('[❌] 部分时间框架数据不足');
      return setup;
    }

    const ema4H = analysis4H.ema;
    const ema1H = analysis1H.ema;
    const ema15m = analysis15m.ema;
    const currentPrice = analysis15m.price;
    const candles4H = analysis4H.candles;
    const rsi15m = analysis15m.rsi;

    if (!ema4H.ema20 || !ema4H.ema60 || !ema1H.ema20 || !ema1H.ema60) {
      setup.noTradeReasons.push('EMA数据不足');
      console.log('[❌] EMA数据不足');
      return setup;
    }

    const ema20_4H = ema4H.ema20;
    const ema60_4H = ema4H.ema60;
    const ema20_1H = ema1H.ema20;
    const ema60_1H = ema1H.ema60;

    let trend4H = null;
    if (ema20_4H > ema60_4H && currentPrice > ema60_4H) {
      trend4H = 'long';
    } else if (ema20_4H < ema60_4H && currentPrice < ema60_4H) {
      trend4H = 'short';
    }

    if (!trend4H) {
      setup.noTradeReasons.push('4H趋势不明确，无法判断方向');
      console.log('[❌] 4H趋势不明确');
      return setup;
    }

    const score = {
      market: 0,
      ema4H: 0,
      rsi: 0,
      ema1H: 0,
      sr: 0,
      entry15m: 0,
      earlyParticipation: 0
    };
    const details = [];

    console.log('\n--- 📊 评分系统 ---');

    if (regime?.regime === 'TRENDING') {
      score.market = 20;
      details.push(`✅ 市场TRENDING (+20)`);
    } else {
      details.push(`❌ 市场非TRENDING (+0)`);
    }
    console.log(`市场状态: ${details[details.length-1]}`);

    score.ema4H = 20;
    details.push(`✅ 4H EMA方向确认 (+20) [${trend4H.toUpperCase()}]`);
    console.log(`4H趋势: ${details[details.length-1]}`);

    let rsiPassed = false;
    if (rsi15m !== null) {
      if (trend4H === 'long' && rsi15m > 45 && rsi15m < 72) {
        score.rsi = 10;
        details.push(`✅ RSI健康(${rsi15m.toFixed(1)}) (+10) [LONG区间45-72]`);
        rsiPassed = true;
      } else if (trend4H === 'short' && rsi15m > 28 && rsi15m < 55) {
        score.rsi = 10;
        details.push(`✅ RSI健康(${rsi15m.toFixed(1)}) (+10) [SHORT区间28-55]`);
        rsiPassed = true;
      } else {
        details.push(`⚠️ RSI(${rsi15m.toFixed(1)}) 不在最佳区间 [LONG:45-72, SHORT:28-55]`);
      }
    } else {
      details.push(`⚠️ RSI数据不可用 (+0)`);
    }
    console.log(`RSI: ${details[details.length-1]}`);

    const ema1HAligned = trend4H === 'long' ? ema20_1H > ema60_1H : ema20_1H < ema60_1H;
    if (ema1HAligned) {
      score.ema1H = 10;
      details.push(`✅ 1H与4H同向 (+10)`);
    } else {
      details.push(`⚠️ 1H与4H反向 (EMA20在EMA60另一侧) (+0)`);
    }
    console.log(`1H结构: ${details[details.length-1]}`);

    const sr = this.calculate4HSupportResistance(candles4H);
    let srPassed = false;
    if (trend4H === 'long' && sr.resistanceDistancePercent > 0.3) {
      score.sr = 10;
      details.push(`✅ 距离阻力位${sr.resistanceDistancePercent.toFixed(2)}% (+10)`);
      srPassed = true;
    } else if (trend4H === 'short' && sr.supportDistancePercent > 0.3) {
      score.sr = 10;
      details.push(`✅ 距离支撑位${sr.supportDistancePercent.toFixed(2)}% (+10)`);
      srPassed = true;
    } else if (trend4H === 'long') {
      details.push(`⚠️ 接近阻力位${sr.resistanceDistancePercent.toFixed(2)}% (+0)`);
    } else {
      details.push(`⚠️ 接近支撑位${sr.supportDistancePercent.toFixed(2)}% (+0)`);
    }
    console.log(`支撑阻力: ${details[details.length-1]}`);

    let entryConditions = 0;
    const entryDetails = [];
    if (trend4H === 'long') {
      if (ema15m.ema9CrossUp20) { entryConditions++; entryDetails.push('EMA9上穿EMA20'); }
      if (ema15m.ema9Above20) { entryConditions++; entryDetails.push('EMA9在EMA20上方'); }
      if (analysis15m.volume.spike) { entryConditions++; entryDetails.push('成交量突破'); }
      if (analysis15m.nearLocalHigh) { entryConditions++; entryDetails.push('突破局部高点'); }
      if (analysis15m.candles?.length >= 2) {
        const last2 = analysis15m.candles.slice(-2);
        if (last2[0].close < last2[1].close && last2[1].close > last2[0].close) {
          entryConditions++; entryDetails.push('连续阳线');
        }
      }
      const lastCandle = analysis15m.candles?.[analysis15m.candles.length - 1];
      if (lastCandle && lastCandle.close > lastCandle.open) {
        const bodyPercent = (lastCandle.close - lastCandle.open) / lastCandle.open * 100;
        if (bodyPercent > 0.3) { entryConditions++; entryDetails.push('阳线实体明显'); }
      }
    } else {
      if (ema15m.ema9CrossDown20) { entryConditions++; entryDetails.push('EMA9下穿EMA20'); }
      if (ema15m.ema9Below20) { entryConditions++; entryDetails.push('EMA9在EMA20下方'); }
      if (analysis15m.volume.spike) { entryConditions++; entryDetails.push('成交量突破'); }
      if (analysis15m.nearLocalLow) { entryConditions++; entryDetails.push('突破局部低点'); }
      if (analysis15m.candles?.length >= 2) {
        const last2 = analysis15m.candles.slice(-2);
        if (last2[0].close > last2[1].close && last2[1].close < last2[0].close) {
          entryConditions++; entryDetails.push('连续阴线');
        }
      }
      const lastCandle = analysis15m.candles?.[analysis15m.candles.length - 1];
      if (lastCandle && lastCandle.close < lastCandle.open) {
        const bodyPercent = (lastCandle.open - lastCandle.close) / lastCandle.open * 100;
        if (bodyPercent > 0.3) { entryConditions++; entryDetails.push('阴线实体明显'); }
      }
    }

    if (entryConditions >= 2) {
      score.entry15m = 20;
      details.push(`✅ 15m入场信号(${entryConditions}个): ${entryDetails.join(',')} (+20)`);
    } else if (entryConditions === 1) {
      score.entry15m = 10;
      details.push(`⚠️ 15m入场信号(仅1个): ${entryDetails.join(',')} (+10)`);
    } else {
      score.entry15m = 0;
      details.push(`❌ 15m无明显入场信号 (+0)`);
    }
    console.log(`15m入场: ${details[details.length-1]}`);

    const totalScore = score.market + score.ema4H + score.rsi + score.ema1H + score.sr + score.entry15m;

    if (totalScore >= 60) {
      if (entryConditions === 0 && (score.market + score.ema4H + score.rsi) >= 40) {
        score.earlyParticipation = 10;
        details.push(`🎯 提前参与奖励 (+10) [核心趋势确认但入场信号未完全]`);
        setup.scoreDetails.push('提前参与趋势初期');
      }
    }

    setup.scoreBreakdown = score;
    setup.scoreDetails = details;
    setup.totalScore = totalScore + score.earlyParticipation;

    console.log(`\n--- 📈 最终评分 ---`);
    console.log(`市场状态: ${score.market}/20`);
    console.log(`4H EMA: ${score.ema4H}/20`);
    console.log(`RSI: ${score.rsi}/10`);
    console.log(`1H结构: ${score.ema1H}/10`);
    console.log(`支撑阻力: ${score.sr}/10`);
    console.log(`15m入场: ${score.entry15m}/20`);
    if (score.earlyParticipation > 0) console.log(`提前参与: +${score.earlyParticipation}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`总分: ${setup.totalScore}/100`);
    console.log(`交易阈值: 60分`);
    console.log(`判定: ${setup.totalScore >= 60 ? '✅ 可交易' : '❌ 分数不足'}`);

    if (setup.totalScore < 60) {
      if (totalScore >= 50) {
        setup.noTradeReasons.push(`评分${totalScore}接近阈值(60)，市场观望中`);
      } else if (totalScore >= 40) {
        setup.noTradeReasons.push(`评分${totalScore}偏低，趋势可能不持续`);
      } else {
        setup.noTradeReasons.push(`评分${totalScore}不足，需更多确认信号`);
      }
      console.log('\n========== 分析结束: 等待更好的机会 ==========\n');
      return setup;
    }

    setup.direction = trend4H;
    setup.isValid = true;
    console.log('\n🎉 评分通过! 计算风控参数...');

    const atr15m = analysis15m.atr || currentPrice * 0.005;
    let stopLossPrice = null;
    let stopLossPercent = 0;

    if (trend4H === 'long') {
      const swingLow = analysis15m.localLow;
      const atrDistance = atr15m * 1.5;
      const potentialSL = swingLow - atrDistance;
      stopLossPercent = Math.max((currentPrice - potentialSL) / currentPrice, 0.005);
      stopLossPercent = Math.min(stopLossPercent, 0.025);
      stopLossPrice = currentPrice * (1 - stopLossPercent);
    } else {
      const swingHigh = analysis15m.localHigh;
      const atrDistance = atr15m * 1.5;
      const potentialSL = swingHigh + atrDistance;
      stopLossPercent = Math.max((potentialSL - currentPrice) / currentPrice, 0.005);
      stopLossPercent = Math.min(stopLossPercent, 0.025);
      stopLossPrice = currentPrice * (1 + stopLossPercent);
    }

    const takeProfitPercent = stopLossPercent * 3.1;
    const takeProfitPrice = trend4H === 'long'
      ? currentPrice * (1 + takeProfitPercent)
      : currentPrice * (1 - takeProfitPercent);

    const stopLossPoints = stopLossPercent * currentPrice;

    setup.riskReward = {
      stopLossPercent,
      takeProfitPercent,
      ratio: 3.1,
      stopLossPoints
    };

    const confidencePercent = Math.round(setup.totalScore);
    setup.confidence = confidencePercent;
    setup.entryCriteria = {
      entryPrice: currentPrice,
      stopLoss: stopLossPrice,
      takeProfit: takeProfitPrice,
      stopLossPoints,
      leverage: this.calculateLeverage(setup.totalScore, stopLossPercent, 1000),
      riskLevel: setup.totalScore >= 80 ? 'High' : setup.totalScore >= 70 ? 'Medium' : 'Low',
      scoreBreakdown: {
        total: setup.totalScore,
        market: setup.scoreBreakdown.market,
        ema4H: setup.scoreBreakdown.ema4H,
        rsi: setup.scoreBreakdown.rsi,
        ema1H: setup.scoreBreakdown.ema1H,
        sr: setup.scoreBreakdown.sr,
        entry15m: setup.scoreBreakdown.entry15m,
        earlyParticipation: setup.scoreBreakdown.earlyParticipation
      },
      scoreDetails: setup.scoreDetails,
      timeframe4H: {
        trend: trend4H,
        ema20: ema20_4H,
        ema60: ema60_4H
      },
      timeframe1H: {
        ema20: ema20_1H,
        ema60: ema60_1H,
        ema1HAligned
      },
      timeframe15m: {
        ema9: ema15m.ema9,
        ema20: ema15m.ema20,
        ema9CrossUp20: ema15m.ema9CrossUp20,
        ema9CrossDown20: ema15m.ema9CrossDown20,
        volumeSpike: analysis15m.volume.spike,
        nearLocalHigh: analysis15m.nearLocalHigh,
        nearLocalLow: analysis15m.nearLocalLow,
        rsi: rsi15m
      },
      supportResistance: sr,
      entryConditions: entryConditions,
      entryDetails: entryDetails
    };

    console.log('\n========== 分析结束: 信号满足 ==========\n');
    return setup;
  }

  calculateLeverage(totalScore, stopLossPercent, balance) {
    let baseLeverage;
    if (totalScore >= 80) {
      baseLeverage = 8;
    } else if (totalScore >= 70) {
      baseLeverage = 5;
    } else {
      baseLeverage = 3;
    }
    
    const riskAmount = balance * 0.05;
    const maxPositionValue = riskAmount / stopLossPercent;
    const maxLeverageByRisk = Math.floor(maxPositionValue / balance);
    
    let leverage = Math.min(baseLeverage, maxLeverageByRisk);
    leverage = Math.max(2, Math.min(leverage, 10));
    
    return leverage;
  }

  getTradingDecision(analysis, hasPosition) {
    const { tradeSetup } = analysis;

    if (hasPosition) {
      return {
        action: 'WAIT',
        reason: '已有持仓中，禁止开新仓',
        noTradeReasons: ['已有持仓中，禁止开新仓'],
        confidence: 0,
        direction: null,
        analysis: this.buildAnalysisSummary(analysis)
      };
    }

    if (!tradeSetup.isValid) {
      return {
        action: 'WAIT',
        reason: tradeSetup.noTradeReasons.length > 0 ? tradeSetup.noTradeReasons[0] : '无有效信号',
        noTradeReasons: tradeSetup.noTradeReasons,
        confidence: tradeSetup.totalScore || 0,
        direction: null,
        analysis: this.buildAnalysisSummary(analysis)
      };
    }

    const confidencePercent = tradeSetup.totalScore || 0;

    if (confidencePercent >= 60) {
      return {
        action: 'SIGNAL',
        reason: `评分制信号 ${tradeSetup.direction === 'long' ? '做多' : '做空'} (${confidencePercent}分)`,
        confidence: confidencePercent,
        direction: tradeSetup.direction,
        entry: tradeSetup.entryCriteria,
        noTradeReasons: [],
        analysis: this.buildAnalysisSummary(analysis)
      };
    }

    return {
      action: 'WEAK_SIGNAL',
      reason: '信号较弱，观望',
      confidence: confidencePercent,
      direction: tradeSetup.direction,
      noTradeReasons: [],
      analysis: this.buildAnalysisSummary(analysis)
    };
  }

  buildAnalysisSummary(analysis) {
    const { timeframe4H, timeframe1H, timeframe15m, tradeSetup, regime } = analysis;
    const sr = tradeSetup?.entryCriteria?.supportResistance;

    return {
      regime: {
        type: regime?.regime || 'UNKNOWN',
        trendStrength: regime?.trendStrength || 0,
        signals: regime?.signals || [],
        reasons: regime?.reasons || []
      },
      score: {
        total: tradeSetup?.totalScore || 0,
        market: tradeSetup?.scoreBreakdown?.market || 0,
        ema4H: tradeSetup?.scoreBreakdown?.ema4H || 0,
        rsi: tradeSetup?.scoreBreakdown?.rsi || 0,
        ema1H: tradeSetup?.scoreBreakdown?.ema1H || 0,
        sr: tradeSetup?.scoreBreakdown?.sr || 0,
        entry15m: tradeSetup?.scoreBreakdown?.entry15m || 0,
        earlyParticipation: tradeSetup?.scoreBreakdown?.earlyParticipation || 0
      },
      scoreDetails: tradeSetup?.scoreDetails || [],
      ema4H: {
        ema20: timeframe4H?.ema?.ema20,
        ema60: timeframe4H?.ema?.ema60,
        ema20Above60: timeframe4H?.ema?.ema20 > timeframe4H?.ema?.ema60,
        priceAboveEma60: timeframe15m?.price > timeframe4H?.ema?.ema60
      },
      timeframe4H: timeframe4H?.ema?.ema20 > timeframe4H?.ema?.ema60 ? 'LONG' : 'SHORT',
      ema1H: {
        ema20: timeframe1H?.ema?.ema20,
        ema60: timeframe1H?.ema?.ema60,
        ema20Above60: timeframe1H?.ema?.ema20 > timeframe1H?.ema?.ema60,
        ema20Below60: timeframe1H?.ema?.ema20 < timeframe1H?.ema?.ema60
      },
      timeframe1H: tradeSetup?.direction === 'long' ? 'LONG' : 'SHORT',
      ema15m: {
        ema9: timeframe15m?.ema?.ema9,
        ema20: timeframe15m?.ema?.ema20,
        ema9CrossUp20: timeframe15m?.ema?.ema9CrossUp20,
        ema9CrossDown20: timeframe15m?.ema?.ema9CrossDown20,
        ema9Above20: timeframe15m?.ema?.ema9Above20,
        ema9Below20: timeframe15m?.ema?.ema9Below20
      },
      rsi: timeframe15m?.rsi || null,
      volumeSpike: timeframe15m?.volume?.spike || false,
      nearLocalHigh: timeframe15m?.nearLocalHigh || false,
      nearLocalLow: timeframe15m?.nearLocalLow || false,
      supportResistance: sr ? {
        resistance: sr.resistance,
        support: sr.support,
        resistanceDistance: sr.resistanceDistancePercent?.toFixed(2),
        supportDistance: sr.supportDistancePercent?.toFixed(2),
        nearResistance: sr.nearResistance,
        nearSupport: sr.nearSupport
      } : null,
      riskReward: tradeSetup?.riskReward?.ratio || 0,
      stopLossPoints: tradeSetup?.riskReward?.stopLossPoints || 0,
      recommendedLeverage: tradeSetup?.entryCriteria?.leverage || 0,
      entryDetails: tradeSetup?.entryCriteria?.entryDetails || [],
      noTradeReasons: tradeSetup?.noTradeReasons || []
    };
  }
}

module.exports = MultiTimeframeAnalyzer;