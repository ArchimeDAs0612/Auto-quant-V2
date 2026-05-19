import React, { useMemo } from 'react';
import styled from 'styled-components';

const MarketPanel = styled.div`
  background: rgba(30, 35, 42, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  overflow-y: auto;
`;

const Section = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 10px 12px;
`;

const SectionTitle = styled.div`
  font-size: 9px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
`;

const CurrentPrice = styled.span`
  font-size: 22px;
  font-weight: 700;
  font-family: 'SF Mono', monospace;
  color: ${props => props.$positive ? '#22c55e' : '#f87171'};
`;

const PriceChange = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${props => props.$positive ? '#22c55e' : '#f87171'};
`;

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
`;

const StatLabel = styled.span`
  font-size: 10px;
  color: #6b7280;
`;

const StatValue = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #e0e0e0;
  font-family: 'SF Mono', monospace;
`;

const TrendRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
`;

const TrendLabel = styled.span`
  font-size: 10px;
  color: #9ca3af;
`;

const TrendValue = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${props => {
    if (props.$trend === 'bullish' || props.$trend === 'long') return '#22c55e';
    if (props.$trend === 'bearish' || props.$trend === 'short') return '#f87171';
    return '#f59e0b';
  }};
`;

const TrendDot = styled.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${props => {
    if (props.$trend === 'bullish' || props.$trend === 'long') return '#22c55e';
    if (props.$trend === 'bearish' || props.$trend === 'short') return '#f87171';
    return '#f59e0b';
  }};
  margin-right: 6px;
  box-shadow: 0 0 6px ${props => {
    if (props.$trend === 'bullish' || props.$trend === 'long') return 'rgba(34, 197, 94, 0.5)';
    if (props.$trend === 'bearish' || props.$trend === 'short') return 'rgba(248, 113, 113, 0.5)';
    return 'rgba(245, 158, 11, 0.5)';
  }};
`;

const ScoreBar = styled.div`
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin-top: 6px;
  overflow: hidden;
`;

const ScoreFill = styled.div`
  height: 100%;
  width: ${props => props.$percent}%;
  background: linear-gradient(90deg, #22c55e, #6366f1);
  border-radius: 2px;
  transition: width 0.3s ease;
`;

const HeatMapGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
`;

const HeatItem = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 6px 8px;
  text-align: center;
`;

const HeatSymbol = styled.div`
  font-size: 9px;
  color: #6b7280;
  margin-bottom: 2px;
`;

const HeatValue = styled.div`
  font-size: 11px;
  font-weight: 600;
  font-family: 'SF Mono', monospace;
  color: ${props => props.$positive ? '#22c55e' : '#f87171'};
`;

const PositionSummary = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 10px 12px;
`;

const PositionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const PositionBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: ${props => props.$long ? 'rgba(34, 197, 94, 0.2)' : 'rgba(248, 113, 113, 0.2)'};
  color: ${props => props.$long ? '#22c55e' : '#f87171'};
`;

const PositionPnL = styled.div`
  font-size: 16px;
  font-weight: 700;
  font-family: 'SF Mono', monospace;
  color: ${props => props.$positive ? '#22c55e' : '#f87171'};
  margin-bottom: 6px;
`;

const WaitingReasons = styled.div`
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 8px;
  padding: 10px 12px;
`;

const WaitingTitle = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: #f59e0b;
  margin-bottom: 8px;
`;

const WaitingItem = styled.div`
  font-size: 10px;
  color: #9ca3af;
  padding: 2px 0;
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: '•';
    color: #f59e0b;
  }
`;

const BiasIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const BiasBadge = styled.span`
  font-size: 12px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 4px;
  background: ${props => props.$long ? 'rgba(34, 197, 94, 0.2)' : props.$short ? 'rgba(248, 113, 113, 0.2)' : 'rgba(156, 163, 175, 0.2)'};
  color: ${props => props.$long ? '#22c55e' : props.$short ? '#f87171' : '#9ca3af'};
`;

function MarketOverviewPanel({ btcPrice, priceChange, priceChangePercent, signal, openPositions, currentPrice, tradingEnabled }) {
  const formatPrice = (price) => {
    if (!price) return '--';
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const currentPosition = openPositions && openPositions.length > 0 ? openPositions[0] : null;

  const unrealizedPnL = currentPosition?.currentPnl ?? 0;

  const positionDuration = useMemo(() => {
    if (!currentPosition?.openedAt) return '--';
    const ms = Date.now() - currentPosition.openedAt;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }, [currentPosition]);

  const trend4H = signal?.analysis?.trend === 'long' ? 'bullish' : signal?.analysis?.trend === 'short' ? 'bearish' : 'neutral';
  const trend1H = signal?.analysis?.ema4H?.ema21 > signal?.analysis?.ema4H?.ema55 ? 'bullish' : signal?.analysis?.ema4H?.ema21 < signal?.analysis?.ema4H?.ema55 ? 'bearish' : 'neutral';
  const momentum15m = signal?.analysis?.rsi > 60 ? 'overbought' : signal?.analysis?.rsi < 40 ? 'oversold' : 'pullback';

  const aiBias = signal?.direction === 'long' ? 'LONG' : signal?.direction === 'short' ? 'SHORT' : 'NEUTRAL';
  const aiScore = signal?.analysis?.score?.total || 0;
  const leverageRec = signal?.analysis?.recommendedLeverage || signal?.entry?.leverage || 5;
  const marketRegime = signal?.noTradeReasons?.length > 0 ? 'WAITING' : aiBias !== 'NEUTRAL' ? 'TRENDING' : 'RANGE';

  const waitReasons = signal?.noTradeReasons?.length > 0 ? signal.noTradeReasons : [
    'No breakout signal',
    'Volume weak',
    currentPosition ? 'Position active' : 'Waiting for setup'
  ].slice(0, 3);

  const heatMapData = [
    { symbol: 'BTC', change: priceChangePercent || 0 },
    { symbol: 'ETH', change: 1.8 },
    { symbol: 'SOL', change: -0.5 },
    { symbol: 'BNB', change: 0.9 },
    { symbol: 'XRP', change: -0.3 },
    { symbol: 'ADA', change: 2.1 },
  ];

  return (
    <MarketPanel>
      <Section>
        <SectionTitle>BTC / USDT</SectionTitle>
        <PriceRow>
          <CurrentPrice $positive={priceChange >= 0}>
            {btcPrice ? `$${formatPrice(btcPrice)}` : '--'}
          </CurrentPrice>
          <PriceChange $positive={priceChange >= 0}>
            {priceChange >= 0 ? '+' : ''}{priceChangePercent?.toFixed(2) || '0.00'}%
          </PriceChange>
        </PriceRow>
        <StatRow style={{ marginTop: 8 }}>
          <StatLabel>24H High</StatLabel>
          <StatValue>$77,850</StatValue>
        </StatRow>
        <StatRow>
          <StatLabel>24H Low</StatLabel>
          <StatValue>$76,200</StatValue>
        </StatRow>
        <StatRow>
          <StatLabel>24H Vol</StatLabel>
          <StatValue>$2.4B</StatValue>
        </StatRow>
        <StatRow>
          <StatLabel>Funding</StatLabel>
          <StatValue>0.0001%</StatValue>
        </StatRow>
      </Section>

      <Section>
        <SectionTitle>Multi-Timeframe Trend</SectionTitle>
        <TrendRow>
          <TrendLabel>4H Trend</TrendLabel>
          <TrendValue $trend={trend4H}>
            <TrendDot $trend={trend4H} />
            {trend4H === 'bullish' ? 'Bullish' : trend4H === 'bearish' ? 'Bearish' : 'Neutral'}
          </TrendValue>
        </TrendRow>
        <TrendRow>
          <TrendLabel>1H Trend</TrendLabel>
          <TrendValue $trend={trend1H}>
            <TrendDot $trend={trend1H} />
            {trend1H === 'bullish' ? 'Bullish' : trend1H === 'bearish' ? 'Bearish' : 'Neutral'}
          </TrendValue>
        </TrendRow>
        <TrendRow>
          <TrendLabel>15m Momentum</TrendLabel>
          <TrendValue $trend={momentum15m === 'overbought' ? 'bullish' : momentum15m === 'oversold' ? 'bearish' : 'neutral'}>
            <TrendDot $trend={momentum15m === 'overbought' ? 'bullish' : momentum15m === 'oversold' ? 'bearish' : 'neutral'} />
            {momentum15m === 'overbought' ? 'Overbought' : momentum15m === 'oversold' ? 'Oversold' : 'Pullback'}
          </TrendValue>
        </TrendRow>
      </Section>

      <Section>
        <SectionTitle>AI Strategy</SectionTitle>
        <TrendRow>
          <TrendLabel>Current Bias</TrendLabel>
          <BiasIndicator>
            <BiasBadge $long={aiBias === 'LONG'} $short={aiBias === 'SHORT'}>
              {aiBias}
            </BiasBadge>
          </BiasIndicator>
        </TrendRow>
        <TrendRow>
          <TrendLabel>Trade Score</TrendLabel>
          <StatValue>{aiScore}/100</StatValue>
        </TrendRow>
        <ScoreBar>
          <ScoreFill $percent={aiScore} />
        </ScoreBar>
        <TrendRow style={{ marginTop: 8 }}>
          <TrendLabel>Market Regime</TrendLabel>
          <TrendValue $trend={marketRegime === 'TRENDING' ? 'bullish' : marketRegime === 'WAITING' ? 'neutral' : 'neutral'}>
            {marketRegime}
          </TrendValue>
        </TrendRow>
        <TrendRow>
          <TrendLabel>Recommended Lev.</TrendLabel>
          <StatValue>{leverageRec}x</StatValue>
        </TrendRow>
      </Section>

      {currentPosition ? (
        <PositionSummary>
          <SectionTitle>Current Position</SectionTitle>
          <PositionHeader>
            <PositionBadge $long={currentPosition.direction === 'long'}>
              {currentPosition.direction === 'long' ? 'LONG' : 'SHORT'} {currentPosition.leverage || 1}x
            </PositionBadge>
            <span style={{ fontSize: 10, color: '#6b7280' }}>
              {currentPosition.marginMode || 'Cross'} Margin
            </span>
          </PositionHeader>
          <PositionPnL $positive={unrealizedPnL >= 0}>
            {unrealizedPnL >= 0 ? '+' : ''}{unrealizedPnL.toFixed(2)} USD
          </PositionPnL>
          <StatRow>
            <StatLabel>Entry</StatLabel>
            <StatValue>${formatPrice(currentPosition.entryPrice)}</StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>Duration</StatLabel>
            <StatValue>{positionDuration}</StatValue>
          </StatRow>
        </PositionSummary>
      ) : (
        <WaitingReasons>
          <WaitingTitle>Waiting For Setup</WaitingTitle>
          {waitReasons.map((reason, idx) => (
            <WaitingItem key={idx}>{reason}</WaitingItem>
          ))}
        </WaitingReasons>
      )}

      <Section>
        <SectionTitle>Market Heat</SectionTitle>
        <HeatMapGrid>
          {heatMapData.map((item) => (
            <HeatItem key={item.symbol}>
              <HeatSymbol>{item.symbol}</HeatSymbol>
              <HeatValue $positive={item.change >= 0}>
                {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
              </HeatValue>
            </HeatItem>
          ))}
        </HeatMapGrid>
      </Section>
    </MarketPanel>
  );
}

export default React.memo(MarketOverviewPanel);