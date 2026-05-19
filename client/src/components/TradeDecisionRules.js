import React from 'react';
import styled from 'styled-components';

const Panel = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 16px;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #e0e0e0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ConfidenceScore = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: ${props => {
    if (props.$score >= 70) return 'rgba(16, 185, 129, 0.2)';
    if (props.$score >= 40) return 'rgba(245, 158, 11, 0.2)';
    return 'rgba(239, 68, 68, 0.2)';
  }};
  border-radius: 6px;
  border: 1px solid ${props => {
    if (props.$score >= 70) return 'rgba(16, 185, 129, 0.4)';
    if (props.$score >= 40) return 'rgba(245, 158, 11, 0.4)';
    return 'rgba(239, 68, 68, 0.4)';
  }};
`;

const ScoreValue = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: ${props => {
    if (props.$score >= 70) return '#10b981';
    if (props.$score >= 40) return '#f59e0b';
    return '#ef4444';
  }};
`;

const ScoreLabel = styled.span`
  font-size: 10px;
  color: #6b7280;
  text-transform: uppercase;
`;

const Section = styled.div`
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const RuleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const RuleItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
  font-size: 11px;
`;

const RuleIcon = styled.span`
  font-size: 12px;
  color: ${props => props.$passed ? '#10b981' : '#ef4444'};
`;

const RuleName = styled.span`
  flex: 1;
  color: ${props => props.$passed ? '#e0e0e0' : '#9ca3af'};
`;

const RuleValue = styled.span`
  font-family: 'SF Mono', monospace;
  font-size: 10px;
  color: ${props => props.$passed ? '#10b981' : '#ef4444'};
`;

const NoTradeSection = styled.div`
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
  margin-top: 12px;
`;

const NoTradeTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #ef4444;
  margin-bottom: 8px;
`;

const NoTradeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const NoTradeItem = styled.div`
  font-size: 10px;
  color: #f87171;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ReadyToTradeSection = styled.div`
  padding: 12px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 6px;
  margin-bottom: 12px;
`;

const ReadyTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #10b981;
  margin-bottom: 4px;
`;

const ReadySubtitle = styled.div`
  font-size: 10px;
  color: #6b7280;
`;

const MarketRegimePanel = styled.div`
  padding: 12px;
  background: ${props => props.$regime === 'TRENDING'
    ? 'rgba(16, 185, 129, 0.1)'
    : 'rgba(245, 158, 11, 0.1)'};
  border: 1px solid ${props => props.$regime === 'TRENDING'
    ? 'rgba(16, 185, 129, 0.3)'
    : 'rgba(245, 158, 11, 0.3)'};
  border-radius: 6px;
  margin-bottom: 12px;
`;

const RegimeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const RegimeTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
`;

const RegimeBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: ${props => props.$regime === 'TRENDING'
    ? 'rgba(16, 185, 129, 0.2)'
    : 'rgba(245, 158, 11, 0.2)'};
  color: ${props => props.$regime === 'TRENDING' ? '#10b981' : '#f59e0b'};
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
`;

const StrengthBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
`;

const StrengthFill = styled.div`
  width: ${props => props.$strength}%;
  height: 100%;
  background: ${props => {
    if (props.$strength >= 60) return 'linear-gradient(90deg, #10b981, #34d399)';
    if (props.$strength >= 40) return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
    return 'linear-gradient(90deg, #ef4444, #f87171)';
  }};
  transition: width 0.3s ease;
`;

const RegimeSignals = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const SignalTag = styled.div`
  font-size: 9px;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  color: #9ca3af;
`;

const StrategyScorePanel = styled.div`
  padding: 14px;
  background: ${props => props.$canTrade ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'};
  border: 1px solid ${props => props.$canTrade ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'};
  border-radius: 8px;
  margin-bottom: 12px;
`;

const ScorePanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const ScoreTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #e0e0e0;
`;

const ScoreDecision = styled.div`
  font-size: 14px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 4px;
  background: ${props => {
    if (props.$direction === 'long') return 'rgba(16, 185, 129, 0.2)';
    if (props.$direction === 'short') return 'rgba(239, 68, 68, 0.2)';
    return 'rgba(107, 114, 128, 0.2)';
  }};
  color: ${props => {
    if (props.$direction === 'long') return '#10b981';
    if (props.$direction === 'short') return '#ef4444';
    return '#9ca3af';
  }};
`;

const ScoreTotal = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 8px;
`;

const ScoreValueLarge = styled.span`
  font-size: 36px;
  font-weight: 700;
  color: ${props => props.$canTrade ? '#10b981' : '#f59e0b'};
  font-family: 'SF Mono', monospace;
`;

const ScoreMax = styled.span`
  font-size: 16px;
  color: #6b7280;
`;

const ScoreThreshold = styled.span`
  font-size: 11px;
  color: #9ca3af;
  margin-left: auto;
`;

const ScoreBar = styled.div`
  position: relative;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
`;

const ScoreBarFill = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: ${props => props.$percent}%;
  background: ${props => props.$canTrade ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)'};
  transition: width 0.3s ease;
`;

const ScoreThresholdLine = styled.div`
  position: absolute;
  left: ${props => props.$left}%;
  top: -2px;
  width: 2px;
  height: 12px;
  background: #ef4444;
  border-radius: 1px;
`;

const ScoreBreakdown = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
`;

const ScoreItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
`;

const ScoreItemIcon = styled.span`
  font-size: 12px;
`;

const ScoreItemName = styled.span`
  flex: 1;
  font-size: 10px;
  color: #9ca3af;
`;

const ScoreItemValue = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${props => props.$passed ? '#10b981' : '#6b7280'};
  font-family: 'SF Mono', monospace;
`;

const ScoreReasons = styled.div`
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ScoreReason = styled.div`
  font-size: 10px;
  color: ${props => props.$isPositive ? '#10b981' : '#f59e0b'};
`;

const LeveragePanel = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  margin-top: 12px;
`;

const LeverageItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const LeverageLabel = styled.div`
  font-size: 9px;
  color: #6b7280;
  text-transform: uppercase;
`;

const LeverageValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${props => {
    if (props.$level === 'High') return '#ef4444';
    if (props.$level === 'Medium') return '#f59e0b';
    return '#10b981';
  }};
`;

function TradeDecisionRules({ signal }) {
  if (!signal) {
    return (
      <Panel>
        <PanelHeader>
          <Title>📋 交易决策规则</Title>
        </PanelHeader>
        <NoTradeSection>
          <NoTradeTitle>⏳ 等待系统分析...</NoTradeTitle>
          <NoTradeList>
            <NoTradeItem>📊 正在收集市场数据</NoTradeItem>
            <NoTradeItem>📈 正在计算技术指标</NoTradeItem>
          </NoTradeList>
        </NoTradeSection>
      </Panel>
    );
  }

  const isLong = signal.direction === 'long';
  const hasSignal = signal.action === 'SIGNAL' || signal.action === 'STRONG_SIGNAL';
  const score = signal.analysis?.score || {};
  const totalScore = score.total || 0;
  const threshold = 60;
  const canTrade = totalScore >= threshold;

  const scoreBreakdown = [
    { name: '市场状态', value: score.market || 0, max: 20, icon: '🌡️' },
    { name: '4H EMA方向', value: score.ema4H || 0, max: 20, icon: '⏱️' },
    { name: 'RSI健康', value: score.rsi || 0, max: 10, icon: '📊' },
    { name: '1H结构', value: score.ema1H || 0, max: 10, icon: '📈' },
    { name: '支撑/阻力', value: score.sr || 0, max: 10, icon: '📍' },
    { name: '15m入场', value: score.entry15m || 0, max: 20, icon: '🎯' }
  ];

  if (score.earlyParticipation > 0) {
    scoreBreakdown.push({ name: '提前参与', value: score.earlyParticipation, max: 10, icon: '🚀' });
  }

  const rules = {
    trend4H: [
      { name: 'EMA20 > EMA60', passed: signal.analysis?.ema4H?.ema20Above60, value: signal.analysis?.timeframe4H || '--' },
      { name: '价格在EMA60上方', passed: signal.analysis?.timeframe4H === 'LONG', value: signal.analysis?.timeframe4H === 'LONG' ? '✅ 是' : '❌ 否' }
    ],
    structure1H: [
      { name: 'EMA20在EMA60同侧', passed: isLong ? signal.analysis?.ema1H?.ema20Above60 : signal.analysis?.ema1H?.ema20Below60, value: signal.analysis?.ema1H?.ema20Above60 ? 'EMA20>EMA60' : 'EMA20<EMA60' }
    ],
    momentum: [
      { name: 'RSI 45-72区间(做多)', passed: isLong ? (signal.analysis?.rsi || 0) > 45 && (signal.analysis?.rsi || 0) < 72 : true, value: signal.analysis?.rsi ? signal.analysis.rsi.toFixed(1) : '--' },
      { name: 'RSI 28-55区间(做空)', passed: isLong ? true : (signal.analysis?.rsi || 100) < 55 && (signal.analysis?.rsi || 100) > 28, value: signal.analysis?.rsi ? signal.analysis.rsi.toFixed(1) : '--' }
    ],
    entry15m: [
      { name: 'EMA9上/下穿EMA20', passed: isLong ? signal.analysis?.ema15m?.ema9CrossUp20 : signal.analysis?.ema15m?.ema9CrossDown20, value: isLong ? (signal.analysis?.ema15m?.ema9CrossUp20 ? '✅ 金叉' : '❌ 未金叉') : (signal.analysis?.ema15m?.ema9CrossDown20 ? '✅ 死叉' : '❌ 未死叉') },
      { name: '成交量突破', passed: signal.analysis?.volumeSpike, value: signal.analysis?.volumeSpike ? '✅ 是' : '❌ 否' },
      { name: '突破局部高低点', passed: isLong ? signal.analysis?.nearLocalHigh : signal.analysis?.nearLocalLow, value: isLong ? (signal.analysis?.nearLocalHigh ? '✅ 是' : '❌ 否') : (signal.analysis?.nearLocalLow ? '✅ 是' : '❌ 否') }
    ],
    supportResistance: signal.analysis?.supportResistance ? [
      { name: '4H阻力位距离 >0.3%', passed: parseFloat(signal.analysis?.supportResistance?.resistanceDistance || 0) > 0.3, value: `${signal.analysis?.supportResistance?.resistanceDistance || '--'}%` },
      { name: '4H支撑位距离 >0.3%', passed: parseFloat(signal.analysis?.supportResistance?.supportDistance || 0) > 0.3, value: `${signal.analysis?.supportResistance?.supportDistance || '--'}%` }
    ] : [],
    risk: [
      { name: '盈亏比 >= 3', passed: (signal.analysis?.riskReward || 0) >= 3, value: `1:${signal.analysis?.riskReward?.toFixed(1) || '--'}` },
      { name: '推荐杠杆', passed: true, value: `${signal.analysis?.recommendedLeverage || '--'}x` }
    ]
  };

  const noTradeReasons = signal.noTradeReasons || (signal.action === 'WAIT' ? [signal.reason] : []);

  const renderSection = (title, sectionRules, icon) => {
    if (!sectionRules || sectionRules.length === 0) return null;
    return (
      <Section>
        <SectionTitle>{icon} {title}</SectionTitle>
        <RuleList>
          {sectionRules.map((rule, i) => (
            <RuleItem key={i}>
              <RuleIcon $passed={rule.passed}>{rule.passed ? '✅' : '❌'}</RuleIcon>
              <RuleName $passed={rule.passed}>{rule.name}</RuleName>
              <RuleValue $passed={rule.passed}>{rule.value}</RuleValue>
            </RuleItem>
          ))}
        </RuleList>
      </Section>
    );
  };

  return (
    <Panel>
      <PanelHeader>
        <Title>📋 交易决策规则</Title>
        <ConfidenceScore $score={signal.confidence || 0}>
          <ScoreLabel>置信度</ScoreLabel>
          <ScoreValue $score={signal.confidence || 0}>{signal.confidence || 0}%</ScoreValue>
        </ConfidenceScore>
      </PanelHeader>

      <StrategyScorePanel $canTrade={canTrade}>
        <ScorePanelHeader>
          <ScoreTitle>📊 Strategy Score</ScoreTitle>
          <ScoreDecision $canTrade={canTrade} $direction={signal.direction}>
            {signal.direction === 'long' ? '📈 LONG' : signal.direction === 'short' ? '📉 SHORT' : '⏸️ WAIT'}
          </ScoreDecision>
        </ScorePanelHeader>
        <ScoreTotal>
          <ScoreValueLarge $canTrade={canTrade}>{totalScore}</ScoreValueLarge>
          <ScoreMax>/100</ScoreMax>
          <ScoreThreshold>阈值: {threshold}</ScoreThreshold>
        </ScoreTotal>
        <ScoreBar>
          <ScoreBarFill $percent={Math.min((totalScore / 100) * 100, 100)} $canTrade={canTrade} />
          <ScoreThresholdLine $left={(threshold / 100) * 100} />
        </ScoreBar>
        <ScoreBreakdown>
          {scoreBreakdown.map((item, i) => (
            <ScoreItem key={i}>
              <ScoreItemIcon>{item.icon}</ScoreItemIcon>
              <ScoreItemName>{item.name}</ScoreItemName>
              <ScoreItemValue $passed={item.value >= item.max * 0.5}>{item.value}/{item.max}</ScoreItemValue>
            </ScoreItem>
          ))}
        </ScoreBreakdown>
        {signal.analysis?.scoreDetails && signal.analysis.scoreDetails.length > 0 && (
          <ScoreReasons>
            {signal.analysis.scoreDetails.map((d, i) => (
              <ScoreReason key={i} $isPositive={d.includes('✅') || d.includes('🎯')}>{d}</ScoreReason>
            ))}
          </ScoreReasons>
        )}
        {canTrade && signal.entry && (
          <LeveragePanel>
            <LeverageItem>
              <LeverageLabel>推荐杠杆</LeverageLabel>
              <LeverageValue $level={signal.entry.riskLevel || 'Medium'}>
                {signal.entry.leverage || signal.analysis?.recommendedLeverage || 3}x
              </LeverageValue>
            </LeverageItem>
            <LeverageItem>
              <LeverageLabel>风险等级</LeverageLabel>
              <LeverageValue $level={signal.entry.riskLevel || 'Medium'}>
                {signal.entry.riskLevel || 'Medium'}
              </LeverageValue>
            </LeverageItem>
            <LeverageItem>
              <LeverageLabel>预期RR比</LeverageLabel>
              <LeverageValue $level="Low">
                1:{signal.analysis?.riskReward?.toFixed(1) || '3.0'}
              </LeverageValue>
            </LeverageItem>
            <LeverageItem>
              <LeverageLabel>信号质量</LeverageLabel>
              <LeverageValue $level={totalScore >= 80 ? 'High' : totalScore >= 70 ? 'Medium' : 'Low'}>
                {totalScore}/100
              </LeverageValue>
            </LeverageItem>
          </LeveragePanel>
        )}
      </StrategyScorePanel>

      {signal.analysis?.regime && (
        <MarketRegimePanel $regime={signal.analysis.regime.type}>
          <RegimeHeader>
            <RegimeTitle>
              🌡️ 市场状态
            </RegimeTitle>
            <RegimeBadge $regime={signal.analysis.regime.type}>
              {signal.analysis.regime.type === 'TRENDING' ? '🟢 TRENDING' : '🟡 CHOPPY'}
            </RegimeBadge>
          </RegimeHeader>
          <StrengthBar>
            <StrengthFill $strength={signal.analysis.regime.trendStrength || 0} />
          </StrengthBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>趋势强度</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: signal.analysis.regime.trendStrength >= 60 ? '#10b981' : signal.analysis.regime.trendStrength >= 40 ? '#f59e0b' : '#ef4444' }}>
              {signal.analysis.regime.trendStrength || 0}/100
            </div>
          </div>
          {signal.analysis.regime.signals && signal.analysis.regime.signals.length > 0 && (
            <RegimeSignals>
              {signal.analysis.regime.signals.map((s, i) => (
                <SignalTag key={i} style={{ color: s.passed ? '#10b981' : '#6b7280' }}>
                  {s.passed ? '✅' : '❌'} {s.reason}
                </SignalTag>
              ))}
            </RegimeSignals>
          )}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 10, color: signal.analysis.regime.type === 'TRENDING' ? '#10b981' : '#f59e0b' }}>
              {signal.analysis.regime.type === 'TRENDING' ? '✅ Trading Enabled' : '❌ Trading Disabled'}
            </div>
          </div>
        </MarketRegimePanel>
      )}

      {hasSignal && (
        <ReadyToTradeSection>
          <ReadyTitle>🎯 {isLong ? '📈 做多信号' : '📉 做空信号'}</ReadyTitle>
          <ReadySubtitle>
            {signal.reason} - 置信度 {signal.confidence}%
          </ReadySubtitle>
        </ReadyToTradeSection>
      )}

      {renderSection('4H 趋势', rules.trend4H, '⏱️')}
      {renderSection('1H 结构', rules.structure1H, '📊')}
      {renderSection('RSI 动量', rules.momentum, '📈')}
      {renderSection('15m 入场', rules.entry15m, '🎯')}
      {renderSection('4H 支撑/压力', rules.supportResistance, '📍')}
      {renderSection('风控', rules.risk, '🛡️')}

      {noTradeReasons.length > 0 && (
        <NoTradeSection>
          <NoTradeTitle>🚫 当前不开单原因</NoTradeTitle>
          <NoTradeList>
            {noTradeReasons.slice(0, 5).map((reason, i) => (
              <NoTradeItem key={i}>• {reason}</NoTradeItem>
            ))}
          </NoTradeList>
        </NoTradeSection>
      )}
    </Panel>
  );
}

export default TradeDecisionRules;