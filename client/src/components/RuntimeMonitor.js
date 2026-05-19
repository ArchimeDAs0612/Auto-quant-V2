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

const StatusBadge = styled.span`
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
  background: ${props => props.$active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
  color: ${props => props.$active ? '#10b981' : '#ef4444'};
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
`;

const StatusCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  border-left: 3px solid ${props => props.$status === 'running' ? '#10b981' : props.$status === 'warning' ? '#f59e0b' : '#ef4444'};
`;

const StatusLabel = styled.span`
  font-size: 9px;
  color: #6b7280;
  text-transform: uppercase;
`;

const StatusValue = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${props => props.$color || '#e0e0e0'};
  font-family: 'SF Mono', monospace;
`;

const UptimeBar = styled.div`
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin-top: 12px;
  overflow: hidden;
`;

const UptimeProgress = styled.div`
  height: 100%;
  width: ${props => props.$percent}%;
  background: linear-gradient(90deg, #10b981, #00d4ff);
  border-radius: 2px;
  transition: width 1s ease;
`;

function RuntimeMonitor({ heartbeat }) {
  if (!heartbeat) {
    return (
      <Panel>
        <PanelHeader>
          <Title>🖥️ 系统运行时状态</Title>
        </PanelHeader>
        <StatusGrid>
          <StatusCard $status="warning">
            <StatusLabel>等待心跳...</StatusLabel>
            <StatusValue>--</StatusValue>
          </StatusCard>
        </StatusGrid>
      </Panel>
    );
  }

  const memoryPercent = heartbeat.memory ? (heartbeat.memory.heapUsed / heartbeat.memory.heapTotal) * 100 : 0;
  const tickStatus = heartbeat.lastTickAgo < 5000 ? 'running' : heartbeat.lastTickAgo < 30000 ? 'warning' : 'stopped';

  return (
    <Panel>
      <PanelHeader>
        <Title>
          🖥️ 系统运行时状态
          <StatusBadge $active={heartbeat.strategyRunning}>
            {heartbeat.strategyRunning ? '后端运行中' : '已停止'}
          </StatusBadge>
        </Title>
      </PanelHeader>

      <StatusGrid>
        <StatusCard $status={heartbeat.okxHealthy ? 'running' : 'stopped'}>
          <StatusLabel>WebSocket</StatusLabel>
          <StatusValue $color={heartbeat.okxHealthy ? '#10b981' : '#ef4444'}>
            {heartbeat.okxHealthy ? '✅ 已连接' : '❌ 断开'}
          </StatusValue>
        </StatusCard>

        <StatusCard $status="running">
          <StatusLabel>策略引擎</StatusLabel>
          <StatusValue $color={heartbeat.strategyRunning ? '#10b981' : '#ef4444'}>
            {heartbeat.strategyRunning ? '✅ 运行中' : '❌ 已停止'}
          </StatusValue>
        </StatusCard>

        <StatusCard $status={tickStatus}>
          <StatusLabel>最后Tick</StatusLabel>
          <StatusValue>
            {heartbeat.lastTickAgo < 5000 ? '✅ 刚刚' : `${Math.round(heartbeat.lastTickAgo / 1000)}秒前`}
          </StatusValue>
        </StatusCard>

        <StatusCard $status="running">
          <StatusLabel>持仓数量</StatusLabel>
          <StatusValue>{heartbeat.positions || 0}</StatusValue>
        </StatusCard>

        <StatusCard $status="running">
          <StatusLabel>运行时长</StatusLabel>
          <StatusValue>{heartbeat.uptime || '--'}</StatusValue>
        </StatusCard>

        <StatusCard $status="running">
          <StatusLabel>内存使用</StatusLabel>
          <StatusValue>{heartbeat.memory ? `${heartbeat.memory.heapUsed}MB` : '--'}</StatusValue>
        </StatusCard>

        <StatusCard $status="running">
          <StatusLabel>数据源</StatusLabel>
          <StatusValue $color={heartbeat.activeSource === 'okx' ? '#10b981' : '#f59e0b'}>
            {heartbeat.activeSource === 'okx' ? '🟢 OKX' : heartbeat.activeSource === 'yahoo' ? '🟡 Yahoo' : '--'}
          </StatusValue>
        </StatusCard>

        <StatusCard $status="running">
          <StatusLabel>在线客户端</StatusLabel>
          <StatusValue>{heartbeat.clients || 0}</StatusValue>
        </StatusCard>

        <StatusCard $status="running">
          <StatusLabel>最后信号</StatusLabel>
          <StatusValue>
            {heartbeat.lastSignalTime
              ? `${Math.round((Date.now() - heartbeat.lastSignalTime) / 1000 / 60)}分钟前`
              : '无信号'}
          </StatusValue>
        </StatusCard>

        <StatusCard $status="running">
          <StatusLabel>最后推送</StatusLabel>
          <StatusValue>
            {heartbeat.lastPushplusTime
              ? `${Math.round((Date.now() - heartbeat.lastPushplusTime) / 1000 / 60)}分钟前`
              : '未推送'}
          </StatusValue>
        </StatusCard>

        <StatusCard $status={heartbeat.reconnectCount > 5 ? 'warning' : 'running'}>
          <StatusLabel>重连次数</StatusLabel>
          <StatusValue $color={heartbeat.reconnectCount > 5 ? '#f59e0b' : '#e0e0e0'}>
            {heartbeat.reconnectCount || 0}
          </StatusValue>
        </StatusCard>

        <StatusCard $status={memoryPercent > 80 ? 'warning' : 'running'}>
          <StatusLabel>内存占比</StatusLabel>
          <StatusValue $color={memoryPercent > 80 ? '#f59e0b' : '#e0e0e0'}>
            {memoryPercent.toFixed(1)}%
          </StatusValue>
        </StatusCard>
      </StatusGrid>

      <UptimeBar>
        <UptimeProgress $percent={Math.min(100, (heartbeat.uptimeMs % 86400000) / 864000)} />
      </UptimeBar>
    </Panel>
  );
}

export default RuntimeMonitor;
