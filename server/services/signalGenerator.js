const EventEmitter = require('events');
const MultiTimeframeAnalyzer = require('./multiTimeframeAnalyzer');

class SignalGenerator extends EventEmitter {
  constructor() {
    super();
    this.analyzer = new MultiTimeframeAnalyzer();
    this.lastSignal = null;
    this.lastSignalTime = 0;
    this.signalCooldown = 300000;
    this.positionSignalCooldown = 600000;
    this.lastAnalysis = null;
  }

  async generateSignals(candlesByTimeframe, hasPosition = false) {
    const analysis = await this.analyzer.analyze(candlesByTimeframe);
    this.lastAnalysis = analysis;

    const decision = this.analyzer.getTradingDecision(analysis, hasPosition);
    
    const signal = {
      ...decision,
      analysis,
      timestamp: Date.now(),
      id: this.generateSignalId()
    };
    
    this.emit('signal', signal);
    
    return signal;
  }

  generateSignalId() {
    return `SIG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  shouldEmitSignal(signal) {
    const now = Date.now();
    
    if (signal.action === 'WAIT') {
      return false;
    }
    
    if (this.lastSignal && (now - this.lastSignalTime) < this.signalCooldown) {
      return false;
    }
    
    if (signal.direction === this.lastSignal?.direction && (now - this.lastSignalTime) < this.positionSignalCooldown) {
      return false;
    }
    
    if (signal.confidence < 50) {
      return false;
    }
    
    return true;
  }

  processSignal(signal) {
    if (!this.shouldEmitSignal(signal)) {
      return null;
    }
    
    this.lastSignal = signal;
    this.lastSignalTime = signal.timestamp;
    
    const formattedSignal = this.formatSignal(signal);
    
    this.emit('tradeSignal', formattedSignal);
    
    return formattedSignal;
  }

  formatSignal(signal) {
    const directionCN = signal.direction === 'long' ? '做多' : signal.direction === 'short' ? '做空' : '观望';
    const actionCN = {
      'STRONG_SIGNAL': '🔴 强信号',
      'SIGNAL': '🟠 信号',
      'WEAK_SIGNAL': '🟡 弱信号',
      'WAIT': '⚪ 等待'
    }[signal.action] || signal.action;

    const analysis = signal.analysis || {};
    const tradeSetup = analysis.tradeSetup || {};

    return {
      id: signal.id,
      action: signal.action,
      actionCN,
      direction: signal.direction,
      directionCN,
      confidence: Math.round(signal.confidence),
      reason: signal.reason,
      entry: signal.entry,
      noTradeReasons: signal.noTradeReasons || [],
      analysis: {
        score: tradeSetup.scoreBreakdown ? {
          total: tradeSetup.totalScore || 0,
          market: tradeSetup.scoreBreakdown.market || 0,
          ema4H: tradeSetup.scoreBreakdown.ema4H || 0,
          rsi: tradeSetup.scoreBreakdown.rsi || 0,
          ema1H: tradeSetup.scoreBreakdown.ema1H || 0,
          sr: tradeSetup.scoreBreakdown.sr || 0,
          entry15m: tradeSetup.scoreBreakdown.entry15m || 0,
          earlyParticipation: tradeSetup.scoreBreakdown.earlyParticipation || 0
        } : null,
        scoreDetails: tradeSetup.scoreDetails || [],
        timeframe4H: analysis.timeframe4H?.ema?.ema20 > analysis.timeframe4H?.ema?.ema60 ? 'LONG' : 'SHORT',
        timeframe1H: signal.direction === 'long' ? 'LONG' : 'SHORT',
        timeframe15M: signal.direction === 'long' ? 'LONG' : 'SHORT',
        ema4H: {
          ema20: analysis.timeframe4H?.ema?.ema20,
          ema60: analysis.timeframe4H?.ema?.ema60,
          ema20Above60: analysis.timeframe4H?.ema?.ema20 > analysis.timeframe4H?.ema?.ema60
        },
        ema1H: {
          ema20: analysis.timeframe1H?.ema?.ema20,
          ema60: analysis.timeframe1H?.ema?.ema60,
          ema20Above60: analysis.timeframe1H?.ema?.ema20 > analysis.timeframe1H?.ema?.ema60
        },
        ema15m: {
          ema9: analysis.timeframe15m?.ema?.ema9,
          ema20: analysis.timeframe15m?.ema?.ema20,
          ema9CrossUp20: analysis.timeframe15m?.ema?.ema9CrossUp20,
          ema9CrossDown20: analysis.timeframe15m?.ema?.ema9CrossDown20,
          ema9Above20: analysis.timeframe15m?.ema?.ema9Above20,
          ema9Below20: analysis.timeframe15m?.ema?.ema9Below20
        },
        rsi: analysis.timeframe15m?.rsi || null,
        volumeSpike: analysis.timeframe15m?.volume?.spike || false,
        nearLocalHigh: analysis.timeframe15m?.nearLocalHigh || false,
        nearLocalLow: analysis.timeframe15m?.nearLocalLow || false,
        supportResistance: tradeSetup.entryCriteria?.supportResistance || null,
        riskReward: tradeSetup.riskReward?.ratio || 0,
        stopLossPoints: tradeSetup.riskReward?.stopLossPoints || 0,
        recommendedLeverage: tradeSetup.entryCriteria?.leverage || 0,
        entryDetails: tradeSetup.entryCriteria?.entryDetails || [],
        noTradeReasons: signal.noTradeReasons || []
      },
      timestamp: signal.timestamp,
      formattedTime: new Date(signal.timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    };
  }

  getSignalStatus() {
    const now = Date.now();
    const cooldownRemaining = Math.max(0, this.signalCooldown - (now - this.lastSignalTime));
    
    return {
      lastSignal: this.lastSignal ? this.formatSignal(this.lastSignal) : null,
      lastSignalTime: this.lastSignalTime,
      cooldownRemaining,
      isInCooldown: cooldownRemaining > 0,
      lastAnalysis: this.lastAnalysis
    };
  }

  reset() {
    this.lastSignal = null;
    this.lastSignalTime = 0;
    this.lastAnalysis = null;
    this.emit('reset');
  }
}

module.exports = SignalGenerator;
