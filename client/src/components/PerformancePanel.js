import React from 'react';
import styled from 'styled-components';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const Panel = styled.div`
  padding: 16px;
  height: 100%;
  overflow-y: auto;
`;

const PanelTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &::before {
    content: '';
    width: 4px;
    height: 16px;
    background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%);
    border-radius: 2px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
`;

const StatCard = styled.div`
  background: linear-gradient(135deg, #1a2332 0%, #0d1421 100%);
  border: 1px solid #2a3441;
  border-radius: 10px;
  padding: 12px;
  transition: all 0.2s;
  
  &:hover {
    border-color: #00d4ff;
    transform: translateY(-2px);
  }
`;

const StatLabel = styled.div`
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${props => {
    if (props.positive) return '#10b981';
    if (props.negative) return '#ef4444';
    return '#e0e0e0';
  }};
  font-family: 'SF Mono', monospace;
`;

const ChartContainer = styled.div`
  background: linear-gradient(135deg, #1a2332 0%, #0d1421 100%);
  border: 1px solid #2a3441;
  border-radius: 10px;
  padding: 16px;
  height: 200px;
`;

const ChartTitle = styled.div`
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 12px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: #6b7280;
  font-size: 14px;
`;

// 模拟数据
const mockEquityData = [
  { time: '1', value: 1000 },
  { time: '2', value: 1020 },
  { time: '3', value: 1015 },
  { time: '4', value: 1040 },
  { time: '5', value: 1035 },
  { time: '6', value: 1060 },
  { time: '7', value: 1080 },
  { time: '8', value: 1075 },
  { time: '9', value: 1100 },
  { time: '10', value: 1120 },
];

function PerformancePanel({ performance }) {
  if (!performance) {
    return (
      <Panel>
        <PanelTitle>绩效统计</PanelTitle>
        <EmptyState>加载中...</EmptyState>
      </Panel>
    );
  }

  const isProfitable = parseFloat(performance.totalReturn) > 0;

  return (
    <Panel>
      <PanelTitle>绩效统计</PanelTitle>
      
      <StatsGrid>
        <StatCard>
          <StatLabel>总收益</StatLabel>
          <StatValue positive={isProfitable} negative={!isProfitable}>
            {isProfitable ? '+' : ''}{performance.totalReturn}%
          </StatValue>
        </StatCard>
        
        <StatCard>
          <StatLabel>当前资金</StatLabel>
          <StatValue>{parseFloat(performance.currentBalance).toFixed(2)} RMB</StatValue>
        </StatCard>
        
        <StatCard>
          <StatLabel>胜率</StatLabel>
          <StatValue positive={parseFloat(performance.winRate) > 50}>
            {performance.winRate}%
          </StatValue>
        </StatCard>
        
        <StatCard>
          <StatLabel>盈亏比</StatLabel>
          <StatValue positive={parseFloat(performance.profitFactor) > 1}>
            {performance.profitFactor}
          </StatValue>
        </StatCard>
        
        <StatCard>
          <StatLabel>最大回撤</StatLabel>
          <StatValue negative>{performance.maxDrawdown}%</StatValue>
        </StatCard>
        
        <StatCard>
          <StatLabel>夏普比率</StatLabel>
          <StatValue positive={parseFloat(performance.sharpeRatio) > 1}>
            {performance.sharpeRatio}
          </StatValue>
        </StatCard>
        
        <StatCard>
          <StatLabel>总交易</StatLabel>
          <StatValue>{performance.totalTrades} 笔</StatValue>
        </StatCard>
        
        <StatCard>
          <StatLabel>盈利交易</StatLabel>
          <StatValue positive>{performance.winningTrades} 笔</StatValue>
        </StatCard>
      </StatsGrid>

      <ChartContainer>
        <ChartTitle>资金曲线</ChartTitle>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={mockEquityData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
            <XAxis 
              dataKey="time" 
              stroke="#6b7280" 
              fontSize={10}
              tickLine={false}
            />
            <YAxis 
              stroke="#6b7280" 
              fontSize={10}
              tickLine={false}
              domain={['dataMin - 20', 'dataMax + 20']}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1a2332', 
                border: '1px solid #2a3441',
                borderRadius: '8px'
              }}
              itemStyle={{ color: '#e0e0e0' }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#00d4ff" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorValue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Panel>
  );
}

export default PerformancePanel;
