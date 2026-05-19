import React from 'react';
import styled from 'styled-components';

const Panel = styled.div`
  background: #0d1421;
  padding: 20px;
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

const StatusCard = styled.div`
  background: linear-gradient(135deg, #1a2332 0%, #0d1421 100%);
  border: 1px solid #2a3441;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
`;

const StatusHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const StatusLabel = styled.div`
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatusValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${props => {
    if (props.running) return '#10b981';
    if (props.error) return '#ef4444';
    return '#f59e0b';
  }};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    if (props.running) return '#10b981';
    if (props.error) return '#ef4444';
    return '#f59e0b';
  }};
  box-shadow: 0 0 8px ${props => {
    if (props.running) return '#10b981';
    if (props.error) return '#ef4444';
    return '#f59e0b';
  }};
`;

const PositionCard = styled.div`
  background: ${props => props.side === 'LONG' 
    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)'
    : props.side === 'SHORT'
    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)'
    : 'linear-gradient(135deg, #1a2332 0%, #0d1421 100%)'
  };
  border: 1px solid ${props => props.side === 'LONG' 
    ? 'rgba(16, 185, 129, 0.3)'
    : props.side === 'SHORT'
    ? 'rgba(239, 68, 68, 0.3)'
    : '#2a3441'
  };
  border-radius: 12px;
  padding: 16px;
`;

const PositionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const PositionSide = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${props => props.side === 'LONG' ? '#10b981' : props.side === 'SHORT' ? '#ef4444' : '#6b7280'};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PositionBadge = styled.div`
  background: ${props => props.side === 'LONG' 
    ? 'rgba(16, 185, 129, 0.2)'
    : props.side === 'SHORT'
    ? 'rgba(239, 68, 68, 0.2)'
    : 'rgba(107, 114, 128, 0.2)'
  };
  color: ${props => props.side === 'LONG' ? '#10b981' : props.side === 'SHORT' ? '#ef4444' : '#6b7280'};
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
`;

const PositionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const PositionItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ItemLabel = styled.div`
  font-size: 11px;
  color: #6b7280;
`;

const ItemValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
  font-family: 'SF Mono', monospace;
`;

const PnLDisplay = styled.div`
  background: ${props => props.pnl >= 0 
    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)'
    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)'
  };
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
  text-align: center;
`;

const PnLLabel = styled.div`
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 4px;
`;

const PnLValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.pnl >= 0 ? '#10b981' : '#ef4444'};
  font-family: 'SF Mono', monospace;
`;

const PnLPercent = styled.div`
  font-size: 12px;
  color: ${props => props.pnl >= 0 ? '#10b981' : '#ef4444'};
  margin-top: 4px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
`;

const EmptyText = styled.div`
  font-size: 14px;
  margin-bottom: 8px;
`;

const EmptySubtext = styled.div`
  font-size: 12px;
  opacity: 0.7;
`;

const MarketRegime = styled.div`
  background: ${props => {
    switch(props.regime) {
      case 'trending': return 'rgba(16, 185, 129, 0.1)';
      case 'ranging': return 'rgba(245, 158, 11, 0.1)';
      case 'choppy': return 'rgba(239, 68, 68, 0.1)';
      default: return 'rgba(107, 114, 128, 0.1)';
    }
  }};
  border: 1px solid ${props => {
    switch(props.regime) {
      case 'trending': return 'rgba(16, 185, 129, 0.3)';
      case 'ranging': return 'rgba(245, 158, 11, 0.3)';
      case 'choppy': return 'rgba(239, 68, 68, 0.3)';
      default: return 'rgba(107, 114, 128, 0.3)';
    }
  }};
  color: ${props => {
    switch(props.regime) {
      case 'trending': return '#10b981';
      case 'ranging': return '#f59e0b';
      case 'choppy': return '#ef4444';
      default: return '#6b7280';
    }
  }};
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
`;

function PositionPanel({ position, systemStatus }) {
  const getRegimeText = (regime) => {
    switch(regime) {
      case 'trending': return '趋势市场 - 可交易';
      case 'ranging': return '震荡市场 - 禁止交易';
      case 'choppy': return '杂乱市场 - 禁止交易';
      default: return '分析中...';
    }
  };

  return (
    <Panel>
      <PanelTitle>系统状态</PanelTitle>
      
      <StatusCard>
        <StatusHeader>
          <StatusLabel>运行状态</StatusLabel>
          <StatusValue running={systemStatus?.isRunning}>
            <StatusDot running={systemStatus?.isRunning} />
            {systemStatus?.isRunning ? '运行中' : '已停止'}
          </StatusValue>
        </StatusHeader>
        <StatusHeader>
          <StatusLabel>连接状态</StatusLabel>
          <StatusValue 
            running={systemStatus?.connectionStatus === 'connected'}
            error={systemStatus?.connectionStatus === 'disconnected'}
          >
            {systemStatus?.connectionStatus === 'connected' ? '已连接' : '未连接'}
          </StatusValue>
        </StatusHeader>
      </StatusCard>

      <PanelTitle>当前持仓</PanelTitle>
      
      {position ? (
        <PositionCard side={position.side}>
          <PositionHeader>
            <PositionSide side={position.side}>
              {position.side === 'LONG' ? '🟢' : '🔴'} {position.side}
            </PositionSide>
            <PositionBadge side={position.side}>
              {position.leverage}x
            </PositionBadge>
          </PositionHeader>

          <PositionGrid>
            <PositionItem>
              <ItemLabel>入场价</ItemLabel>
              <ItemValue>{position.entryPrice?.toFixed(2)}</ItemValue>
            </PositionItem>
            <PositionItem>
              <ItemLabel>当前价</ItemLabel>
              <ItemValue>{position.currentPrice?.toFixed(2)}</ItemValue>
            </PositionItem>
            <PositionItem>
              <ItemLabel>止损</ItemLabel>
              <ItemValue style={{ color: '#ef4444' }}>{position.stopLoss?.toFixed(2)}</ItemValue>
            </PositionItem>
            <PositionItem>
              <ItemLabel>止盈</ItemLabel>
              <ItemValue style={{ color: '#10b981' }}>{position.takeProfit?.toFixed(2)}</ItemValue>
            </PositionItem>
            <PositionItem>
              <ItemLabel>仓位</ItemLabel>
              <ItemValue>{position.size?.toFixed(6)} BTC</ItemValue>
            </PositionItem>
            <PositionItem>
              <ItemLabel>保证金</ItemLabel>
              <ItemValue>{position.margin?.toFixed(2)} RMB</ItemValue>
            </PositionItem>
          </PositionGrid>

          <PnLDisplay pnl={position.unrealizedPnL}>
            <PnLLabel>未实现盈亏</PnLLabel>
            <PnLValue pnl={position.unrealizedPnL}>
              {position.unrealizedPnL >= 0 ? '+' : ''}{position.unrealizedPnL?.toFixed(2)} RMB
            </PnLValue>
            <PnLPercent pnl={position.unrealizedPnL}>
              {position.unrealizedPnLPercent >= 0 ? '+' : ''}{position.unrealizedPnLPercent?.toFixed(2)}%
            </PnLPercent>
          </PnLDisplay>
        </PositionCard>
      ) : (
        <PositionCard>
          <EmptyState>
            <EmptyIcon>📊</EmptyIcon>
            <EmptyText>暂无持仓</EmptyText>
            <EmptySubtext>等待交易信号...</EmptySubtext>
          </EmptyState>
        </PositionCard>
      )}

      <MarketRegime regime={systemStatus?.marketRegime}>
        {getRegimeText(systemStatus?.marketRegime)}
      </MarketRegime>
    </Panel>
  );
}

export default PositionPanel;
