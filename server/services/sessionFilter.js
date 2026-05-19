const TechnicalIndicators = require('./indicators');

class SessionFilter {
  constructor() {
    this.sessions = {
      sydney: { name: '悉尼盘', startHour: 21, endHour: 4, quality: 'low' },
      tokyo: { name: '东京盘', startHour: 0, endHour: 8, quality: 'medium' },
      london: { name: '伦敦盘', startHour: 8, endHour: 16, quality: 'high' },
      newyork: { name: '纽约盘', startHour: 13, endHour: 21, quality: 'high' }
    };
    
    this.config = {
      minVolumeRatio: 0.5,
      optimalVolumeRatio: 1.0,
      highVolumeRatio: 1.5
    };
  }

  getCurrentSession() {
    const utcHour = new Date().getUTCHours();
    
    for (const [key, session] of Object.entries(this.sessions)) {
      if (session.startHour > session.endHour) {
        if (utcHour >= session.startHour || utcHour < session.endHour) {
          return { ...session, key };
        }
      } else {
        if (utcHour >= session.startHour && utcHour < session.endHour) {
          return { ...session, key };
        }
      }
    }
    
    return { name: '未知', quality: 'unknown', key: 'unknown' };
  }

  getSessionInfo() {
    const currentSession = this.getCurrentSession();
    const utcTime = new Date().toISOString();
    
    const overlappingSessions = [];
    const utcHour = new Date().getUTCHours();
    
    for (const [key, session] of Object.entries(this.sessions)) {
      let isActive = false;
      if (session.startHour > session.endHour) {
        isActive = utcHour >= session.startHour || utcHour < session.endHour;
      } else {
        isActive = utcHour >= session.startHour && utcHour < session.endHour;
      }
      
      if (isActive) {
        overlappingSessions.push(session.name);
      }
    }
    
    return {
      currentSession,
      utcTime,
      utcHour,
      overlappingSessions,
      isPeakSession: currentSession.quality === 'high'
    };
  }

  analyzeVolume(candles) {
    if (!candles || candles.length < 20) {
      return { volumeRegime: 'unknown', analysis: {} };
    }

    const volumes = candles.map(c => c.volume || 0);
    const avgVolume = volumes.slice(-20).reduce((s, v) => s + v, 0) / 20;
    const currentVolume = volumes[volumes.length - 1];
    const volumeRatio = currentVolume / avgVolume;
    
    const volumeProfile = TechnicalIndicators.calculateVolumeProfile(candles, 50);
    const rvol = TechnicalIndicators.calculateRVOL(candles, 20);
    
    let volumeRegime = 'normal';
    if (volumeRatio > 2) volumeRegime = 'extreme_high';
    else if (volumeRatio > 1.5) volumeRegime = 'high';
    else if (volumeRatio < 0.3) volumeRegime = 'very_low';
    else if (volumeRatio < 0.5) volumeRegime = 'low';
    
    const currentSession = this.getCurrentSession();
    
    let sessionVolumeMultiplier = 1.0;
    if (currentSession.quality === 'high') sessionVolumeMultiplier = 1.3;
    else if (currentSession.quality === 'medium') sessionVolumeMultiplier = 1.0;
    else if (currentSession.quality === 'low') sessionVolumeMultiplier = 0.7;
    
    const adjustedVolumeRatio = volumeRatio / sessionVolumeMultiplier;
    
    return {
      volumeRegime,
      volumeRatio,
      adjustedVolumeRatio,
      rvol,
      avgVolume,
      currentVolume,
      volumeProfile,
      isVolumeConfirmed: adjustedVolumeRatio >= this.config.minVolumeRatio,
      isHighVolume: adjustedVolumeRatio >= this.config.highVolumeRatio,
      currentSession: currentSession.name
    };
  }

  canTrade(candles) {
    const sessionInfo = this.getSessionInfo();
    const volumeAnalysis = this.analyzeVolume(candles);
    
    const reasons = [];
    let canTrade = true;
    
    if (sessionInfo.currentSession.quality === 'low') {
      canTrade = false;
      reasons.push('当前为低质量交易时段（悉尼/东京盘）');
    }
    
    if (volumeAnalysis.volumeRegime === 'very_low') {
      canTrade = false;
      reasons.push('成交量极低，市场不活跃');
    }
    
    if (volumeAnalysis.volumeRegime === 'extreme_high' && volumeAnalysis.adjustedVolumeRatio > 3) {
      canTrade = false;
      reasons.push('成交量异常放大，可能是主力操作');
    }
    
    if (sessionInfo.overlappingSessions.length === 0) {
      canTrade = false;
      reasons.push('非主要交易时段');
    }
    
    return {
      canTrade,
      reasons,
      sessionInfo,
      volumeAnalysis,
      recommendation: this.getRecommendation(sessionInfo, volumeAnalysis)
    };
  }

  getRecommendation(sessionInfo, volumeAnalysis) {
    const session = sessionInfo.currentSession;
    const volume = volumeAnalysis.volumeRatio;
    
    if (session.quality === 'high' && volume >= 1.5) {
      return {
        action: 'optimal',
        description: '最佳交易时段，成交量活跃',
        leverage: 'normal',
        positionSize: 'full'
      };
    }
    
    if (session.quality === 'high' && volume >= 1.0) {
      return {
        action: 'good',
        description: '高质量时段，可以交易',
        leverage: 'normal',
        positionSize: 'normal'
      };
    }
    
    if (session.quality === 'medium' && volume >= 1.0) {
      return {
        action: 'caution',
        description: '中等质量时段，谨慎交易',
        leverage: 'reduced',
        positionSize: 'reduced'
      };
    }
    
    if (volume < 0.5) {
      return {
        action: 'avoid',
        description: '成交量过低，避免交易',
        leverage: 'none',
        positionSize: 'none'
      };
    }
    
    return {
      action: 'wait',
      description: '等待更好的交易机会',
      leverage: 'reduced',
      positionSize: 'small'
    };
  }

  isPeakTradingHours() {
    const utcHour = new Date().getUTCHours();
    
    const londonOverlap = utcHour >= 8 && utcHour <= 16;
    const nyOverlap = utcHour >= 13 && utcHour <= 21;
    
    const londonStart = utcHour >= 8 && utcHour <= 12;
    const nyStart = utcHour >= 13 && utcHour <= 17;
    const bothActive = (londonOverlap && nyOverlap);
    
    return {
      isActive: londonOverlap || nyOverlap,
      isOverlap: bothActive,
      londonSessionActive: londonOverlap,
      nySessionActive: nyOverlap,
      bestEntryWindow: bothActive || londonStart || nyStart
    };
  }
}

module.exports = SessionFilter;
