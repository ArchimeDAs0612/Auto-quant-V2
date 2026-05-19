import React from 'react';
import styled from 'styled-components';

const StatusBarContainer = styled.div`
  height: 40px;
  background: #0d1421;
  border-top: 1px solid #2a3441;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  font-size: 12px;
`;

const StatusGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`;

const StatusItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9ca3af;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    if (props.status === 'connected' || props.status === 'running') return '#10b981';
    if (props.status === 'error' || props.status === 'disconnected') return '#ef4444';
    return '#f59e0b';
  }};
  box-shadow: 0 0 6px ${props => {
    if (props.status === 'connected' || props.status === 'running') return 'rgba(16, 185, 129, 0.5)';
    if (props.status === 'error' || props.status === 'disconnected') return 'rgba(239, 68, 68, 0.5)';
    return 'rgba(245, 158, 11, 0.5)';
  }};
`;

const StatusText = styled.span`
  color: #e0e0e0;
  font-weight: 500;
`;

const Version = styled.div`
  color: #6b7280;
  font-size: 11px;
`;

function StatusBar({ systemStatus, performance }) {
  return (
    <StatusBarContainer>
      <StatusGroup>
        <StatusItem>
          <StatusDot status={systemStatus?.connectionStatus} />
          <span>OKX</span>
          <StatusText>
            {systemStatus?.connectionStatus === 'connected' ? '已连接' : '未连接'}
          </StatusText>
        </StatusItem>
        
        <StatusItem>
          <StatusDot status={systemStatus?.isRunning ? 'running' : 'stopped'} />
          <span>交易引擎</span>
          <StatusText>
            {systemStatus?.isRunning ? '运行中' : '已停止'}
          </StatusText>
        </StatusItem>
        
        <StatusItem>
          <span>当前资金:</span>
          <StatusText style={{ color: '#00d4ff' }}>
            {performance ? `${parseFloat(performance.currentBalance).toFixed(2)} RMB` : '--'}
          </StatusText>
        </StatusItem>
        
        <StatusItem>
          <span>总收益:</span>
          <StatusText style={{ 
            color: performance && parseFloat(performance.totalReturn) >= 0 ? '#10b981' : '#ef4444'
          }}>
            {performance ? `${parseFloat(performance.totalReturn) >= 0 ? '+' : ''}${performance.totalReturn}%` : '--'}
          </StatusText>
        </StatusItem>
      </StatusGroup>
      
      <Version>BTC Trend Following System v1.0.0</Version>
    </StatusBarContainer>
  );
}

export default StatusBar;
