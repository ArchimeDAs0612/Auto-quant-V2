import React, { useEffect, useRef, useState, useMemo } from 'react';
import styled from 'styled-components';

const Canvas = styled.canvas`
  width: 100%;
  height: 180px;
  background: transparent;
  border-radius: 8px;
`;

const EquityPanelContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
`;

const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  border-left: 2px solid ${props => props.$color || '#6b7280'};
`;

const StatLabel = styled.span`
  font-size: 9px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatValue = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${props => props.$color || '#e0e0e0'};
  font-family: 'SF Mono', monospace;
`;

const TimeRangeSelector = styled.div`
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px;
  border-radius: 6px;
  width: fit-content;
`;

const TimeButton = styled.button`
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.$active ? '#6366f1' : 'transparent'};
  color: ${props => props.$active ? '#fff' : '#9ca3af'};

  &:hover {
    background: ${props => props.$active ? '#6366f1' : 'rgba(255, 255, 255, 0.1)'};
  }
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CurrentEquity = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const EquityLabel = styled.span`
  font-size: 10px;
  color: #6b7280;
  text-transform: uppercase;
`;

const EquityValue = styled.span`
  font-size: 20px;
  font-weight: 700;
  font-family: 'SF Mono', monospace;
  color: ${props => props.$positive ? '#22c55e' : '#f87171'};
`;

const PnLText = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${props => props.$positive ? '#22c55e' : '#f87171'};
  margin-left: 8px;
`;

function EquityCurve({ stats, equityCurve, openPositions, currentPrice, equityStats }) {
  const canvasRef = useRef(null);
  const [timeRange, setTimeRange] = useState('1D');
  const displayStatsRef = useRef({
    currentEquity: 1000,
    initialBalance: 1000,
    maxEquity: 1000,
    minEquity: 1000,
    maxDrawdown: 0,
    totalPnl: 0,
    winRate: 0,
    profitFactor: 0
  });
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    try {
      if (equityStats && typeof equityStats === 'object') {
        displayStatsRef.current = {
          currentEquity: equityStats.currentEquity ?? stats?.equity ?? stats?.balance ?? 1000,
          initialBalance: equityStats.initialBalance ?? stats?.initialBalance ?? stats?.balance ?? 1000,
          maxEquity: equityStats.maxEquity ?? stats?.equity ?? stats?.balance ?? 1000,
          minEquity: equityStats.minEquity ?? stats?.equity ?? stats?.balance ?? 1000,
          maxDrawdown: equityStats.maxDrawdown ?? stats?.maxDrawdown ?? 0,
          totalPnl: equityStats.totalPnl ?? stats?.realizedPnl ?? 0,
          winRate: equityStats.winRate ?? stats?.winRate ?? 0,
          profitFactor: equityStats.profitFactor ?? stats?.profitFactor ?? 0
        };
      } else if (stats && typeof stats === 'object') {
        displayStatsRef.current = {
          currentEquity: stats.equity ?? stats.balance ?? 1000,
          initialBalance: stats.initialBalance ?? stats.balance ?? 1000,
          maxEquity: stats.equity ?? stats.balance ?? 1000,
          minEquity: stats.equity ?? stats.balance ?? 1000,
          maxDrawdown: stats.maxDrawdown ?? 0,
          totalPnl: stats.realizedPnl ?? 0,
          winRate: stats.winRate ?? 0,
          profitFactor: stats.profitFactor ?? 0
        };
      }
      forceUpdate(n => n + 1);
    } catch (e) {
      console.error('[EquityCurve] stats update error:', e);
    }
  }, [equityStats, stats]);

  useEffect(() => {
    try {
      const canvas = canvasRef.current;
      if (!canvas || !equityCurve || !Array.isArray(equityCurve) || equityCurve.length === 0) {
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width || 800;
      const height = canvas.height || 180;

      if (width <= 0 || height <= 0) return;

      ctx.clearRect(0, 0, width, height);

      const validData = equityCurve.filter(p => p && typeof p.equity === 'number' && isFinite(p.equity));
      if (validData.length < 2) return;

      const values = validData.map(p => p.equity);
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);

      if (!isFinite(minVal) || !isFinite(maxVal)) return;

      const range = maxVal - minVal || 1;
      const padding = { top: 20, right: 60, bottom: 30, left: 10 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight * i) / 4;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        const value = maxVal - (range * i) / 4;
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px SF Mono';
        ctx.textAlign = 'left';
        ctx.fillText(`$${value.toFixed(0)}`, width - padding.right + 5, y + 3);
      }

      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, 'rgba(34, 197, 94, 0.25)');
      gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');

      ctx.beginPath();
      validData.forEach((point, i) => {
        const x = padding.left + (i / (validData.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((point.equity - minVal) / range) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      const lastEquity = validData[validData.length - 1]?.equity ?? 1000;
      const firstEquity = validData[0]?.equity ?? 1000;
      const isProfit = lastEquity >= firstEquity;

      ctx.strokeStyle = isProfit ? '#22c55e' : '#f87171';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
      ctx.lineTo(padding.left, padding.top + chartHeight);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.fillStyle = isProfit ? '#22c55e' : '#f87171';
      ctx.font = 'bold 11px SF Mono';
      ctx.textAlign = 'right';
      ctx.fillText(`$${lastEquity.toFixed(2)}`, width - padding.right, padding.top - 5);
    } catch (e) {
      console.error('[EquityCurve] canvas render error:', e);
    }
  }, [equityCurve]);

  const unrealizedPnL = useMemo(() => {
    if (!openPositions || !Array.isArray(openPositions) || openPositions.length === 0) {
      return 0;
    }
    return openPositions.reduce((sum, pos) => {
      return sum + (pos.currentPnl || 0);
    }, 0);
  }, [openPositions]);

  const totalPnL = (displayStatsRef.current.totalPnl || 0) + unrealizedPnL;
  const totalPnLPercent = displayStatsRef.current.initialBalance
    ? (totalPnL / displayStatsRef.current.initialBalance) * 100
    : 0;

  const currentEquityDisplay = displayStatsRef.current.currentEquity || stats?.equity || stats?.balance || 1000;

  return (
    <EquityPanelContainer>
      <HeaderRow>
        <CurrentEquity>
          <EquityLabel>当前权益</EquityLabel>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <EquityValue $positive={totalPnL >= 0}>
              ${typeof currentEquityDisplay === 'number' && isFinite(currentEquityDisplay) ? currentEquityDisplay.toFixed(2) : '1000.00'}
            </EquityValue>
            <PnLText $positive={totalPnL >= 0}>
              {typeof totalPnL === 'number' && isFinite(totalPnL) ? `${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}` : '+0.00'}
              {' '}
              ({typeof totalPnLPercent === 'number' && isFinite(totalPnLPercent) ? `${totalPnLPercent >= 0 ? '+' : ''}${totalPnLPercent.toFixed(2)}` : '+0.00'}%)
            </PnLText>
          </div>
        </CurrentEquity>
        <TimeRangeSelector>
          {['1D', '7D', '30D', 'ALL'].map(range => (
            <TimeButton
              key={range}
              $active={timeRange === range}
              onClick={() => setTimeRange(range)}
            >
              {range}
            </TimeButton>
          ))}
        </TimeRangeSelector>
      </HeaderRow>

      <StatsGrid>
        <StatCard $color="#6366f1">
          <StatLabel>初始资金</StatLabel>
          <StatValue>${displayStatsRef.current.initialBalance?.toFixed(0) || '1000'}</StatValue>
        </StatCard>
        <StatCard $color="#22c55e">
          <StatLabel>最高权益</StatLabel>
          <StatValue>${displayStatsRef.current.maxEquity?.toFixed(0) || '1000'}</StatValue>
        </StatCard>
        <StatCard $color={unrealizedPnL >= 0 ? '#22c55e' : '#f87171'}>
          <StatLabel>浮盈浮亏</StatLabel>
          <StatValue $color={unrealizedPnL >= 0 ? '#22c55e' : '#f87171'}>
            {typeof unrealizedPnL === 'number' && isFinite(unrealizedPnL) ? `${unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}` : '+0.00'}
          </StatValue>
        </StatCard>
        <StatCard $color="#f59e0b">
          <StatLabel>最大回撤</StatLabel>
          <StatValue>{displayStatsRef.current.maxDrawdown?.toFixed(2) || '0.00'}%</StatValue>
        </StatCard>
        <StatCard $color="#22c55e">
          <StatLabel>胜率</StatLabel>
          <StatValue>{displayStatsRef.current.winRate?.toFixed(1) || '0.0'}%</StatValue>
        </StatCard>
        <StatCard $color="#22c55e">
          <StatLabel>盈亏比</StatLabel>
          <StatValue>{displayStatsRef.current.profitFactor?.toFixed(2) || '0.00'}</StatValue>
        </StatCard>
      </StatsGrid>

      <Canvas ref={canvasRef} width={800} height={180} />
    </EquityPanelContainer>
  );
}

export default React.memo(EquityCurve);