import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

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

const TradeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TradeCard = styled.div`
  background: ${props => props.pnl >= 0 
    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)'
    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.02) 100%)'
  };
  border: 1px solid ${props => props.pnl >= 0 
    ? 'rgba(16, 185, 129, 0.2)'
    : 'rgba(239, 68, 68, 0.2)'
  };
  border-radius: 10px;
  padding: 12px;
  transition: all 0.2s;
  
  &:hover {
    border-color: ${props => props.pnl >= 0 ? '#10b981' : '#ef4444'};
    transform: translateX(4px);
  }
`;

const TradeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const TradeSide = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${props => props.side === 'LONG' ? '#10b981' : '#ef4444'};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const TradePnl = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${props => props.pnl >= 0 ? '#10b981' : '#ef4444'};
  font-family: 'SF Mono', monospace;
`;

const TradeDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  font-size: 11px;
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const DetailLabel = styled.span`
  color: #6b7280;
`;

const DetailValue = styled.span`
  color: #e0e0e0;
  font-family: 'SF Mono', monospace;
`;

const TradeTime = styled.div`
  font-size: 10px;
  color: #6b7280;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid ${props => props.pnl >= 0 
    ? 'rgba(16, 185, 129, 0.1)'
    : 'rgba(239, 68, 68, 0.1)'
  };
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: #6b7280;
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
`;

// 模拟交易历史数据
const mockTrades = [
  {
    id: '1',
    side: 'LONG',
    entryPrice: 43250.50,
    exitPrice: 44100.00,
    pnl: 85.50,
    pnlPercent: 8.55,
    leverage: 5,
    duration: 180,
    closedAt: '2024-01-15 14:30:00'
  },
  {
    id: '2',
    side: 'SHORT',
    entryPrice: 44500.00,
    exitPrice: 43800.00,
    pnl: 70.00,
    pnlPercent: 7.00,
    leverage: 5,
    duration: 120,
    closedAt: '2024-01-14 09:15:00'
  },
  {
    id: '3',
    side: 'LONG',
    entryPrice: 42800.00,
    exitPrice: 42550.00,
    pnl: -25.00,
    pnlPercent: -2.50,
    leverage: 5,
    duration: 60,
    closedAt: '2024-01-13 16:45:00'
  },
  {
    id: '4',
    side: 'LONG',
    entryPrice: 42100.00,
    exitPrice: 42950.00,
    pnl: 85.00,
    pnlPercent: 8.50,
    leverage: 5,
    duration: 240,
    closedAt: '2024-01-12 11:20:00'
  }
];

function TradeHistory() {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const response = await fetch('/api/history');
      const data = await response.json();
      if (data && data.length > 0) {
        setTrades(data);
      } else {
        setTrades(mockTrades);
      }
    } catch (error) {
      console.error('获取交易历史失败:', error);
      setTrades(mockTrades);
    }
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };

  return (
    <Panel>
      <PanelTitle>交易历史</PanelTitle>
      
      {trades.length === 0 ? (
        <EmptyState>
          <EmptyIcon>📈</EmptyIcon>
          <div>暂无交易记录</div>
        </EmptyState>
      ) : (
        <TradeList>
          {trades.map((trade) => (
            <TradeCard key={trade.id} pnl={trade.pnl}>
              <TradeHeader>
                <TradeSide side={trade.side}>
                  {trade.side === 'LONG' ? '🟢' : '🔴'} {trade.side}
                </TradeSide>
                <TradePnl pnl={trade.pnl}>
                  {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)} RMB
                </TradePnl>
              </TradeHeader>
              
              <TradeDetails>
                <DetailItem>
                  <DetailLabel>入场</DetailLabel>
                  <DetailValue>{trade.entryPrice?.toFixed(2)}</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>出场</DetailLabel>
                  <DetailValue>{trade.exitPrice?.toFixed(2)}</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>收益率</DetailLabel>
                  <DetailValue style={{ color: trade.pnlPercent >= 0 ? '#10b981' : '#ef4444' }}>
                    {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent?.toFixed(2)}%
                  </DetailValue>
                </DetailItem>
              </TradeDetails>
              
              <TradeTime pnl={trade.pnl}>
                {trade.closedAt} · 持仓{formatDuration(trade.duration)}
              </TradeTime>
            </TradeCard>
          ))}
        </TradeList>
      )}
    </Panel>
  );
}

export default TradeHistory;
