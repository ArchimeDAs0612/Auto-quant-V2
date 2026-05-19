import React, { useEffect, useState } from 'react';
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
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
`;

const StatusCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const StatusLabel = styled.span`
  font-size: 10px;
  color: #6b7280;
  text-transform: uppercase;
`;

const StatusValue = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.$active ? '#10b981' : '#ef4444'};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const StatusDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${props => props.$active ? '#10b981' : '#ef4444'};
  box-shadow: 0 0 6px ${props => props.$active ? '#10b981' : '#ef4444'};
`;

const LogList = styled.div`
  max-height: 150px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const LogItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  font-size: 10px;
`;

const LogTime = styled.span`
  color: #6b7280;
  font-family: 'SF Mono', monospace;
`;

const LogMessage = styled.span`
  color: ${props => props.$type === 'success' ? '#10b981' : props.$type === 'error' ? '#ef4444' : '#e0e0e0'};
`;

const TestButton = styled.button`
  padding: 8px 16px;
  background: ${props => props.$primary ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)'};
  border: 1px solid ${props => props.$primary ? '#10b981' : '#8b5cf6'};
  border-radius: 6px;
  color: ${props => props.$primary ? '#10b981' : '#8b5cf6'};
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.$primary ? 'rgba(16, 185, 129, 0.3)' : 'rgba(139, 92, 246, 0.3)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

function NotificationPanel({ onTestDesktop, onTestPushPlus }) {
  const [logs, setLogs] = useState([]);
  const [desktopEnabled, setDesktopEnabled] = useState(false);
  const [browserPermission, setBrowserPermission] = useState('unknown');
  const [pushplusStatus] = useState('unknown');

  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
      setDesktopEnabled(Notification.permission === 'granted');
    }
  }, []);

  const addLog = (message, type = 'info') => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    setLogs(prev => [{ time, message, type }, ...prev].slice(0, 50));
  };

  const handleTestDesktop = async () => {
    if (!desktopEnabled) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setBrowserPermission(permission);
        setDesktopEnabled(permission === 'granted');
        if (permission !== 'granted') {
          addLog('浏览器通知权限被拒绝', 'error');
          return;
        }
      }
    }
    addLog('正在发送桌面通知...', 'info');
    onTestDesktop();
  };

  const handleTestPushPlus = () => {
    addLog('正在发送PushPlus通知...', 'info');
    onTestPushPlus();
  };

  return (
    <Panel>
      <PanelHeader>
        <Title>
          🔔 通知系统
          <StatusBadge $active={desktopEnabled && browserPermission === 'granted'}>
            {desktopEnabled && browserPermission === 'granted' ? '已启用' : '未启用'}
          </StatusBadge>
        </Title>
      </PanelHeader>

      <StatusGrid>
        <StatusCard>
          <StatusLabel>浏览器通知</StatusLabel>
          <StatusValue $active={browserPermission === 'granted'}>
            <StatusDot $active={browserPermission === 'granted'} />
            {browserPermission === 'granted' ? '已授权' : browserPermission === 'denied' ? '已拒绝' : '待授权'}
          </StatusValue>
        </StatusCard>
        <StatusCard>
          <StatusLabel>macOS通知</StatusLabel>
          <StatusValue $active={desktopEnabled}>
            <StatusDot $active={desktopEnabled} />
            {desktopEnabled ? '运行中' : '未运行'}
          </StatusValue>
        </StatusCard>
        <StatusCard>
          <StatusLabel>PushPlus</StatusLabel>
          <StatusValue $active={pushplusStatus === 'connected'}>
            <StatusDot $active={pushplusStatus === 'connected'} />
            {pushplusStatus === 'connected' ? '已连接' : pushplusStatus === 'error' ? '错误' : '未知'}
          </StatusValue>
        </StatusCard>
      </StatusGrid>

      <LogList>
        {logs.map((log, i) => (
          <LogItem key={i}>
            <LogTime>{log.time}</LogTime>
            <LogMessage $type={log.type}>{log.message}</LogMessage>
          </LogItem>
        ))}
        {logs.length === 0 && (
          <LogItem>
            <LogTime>--:--:--</LogTime>
            <LogMessage>等待通知测试...</LogMessage>
          </LogItem>
        )}
      </LogList>

      <ButtonGroup>
        <TestButton $primary onClick={handleTestDesktop}>
          🖥️ 测试桌面通知
        </TestButton>
        <TestButton onClick={handleTestPushPlus}>
          📱 测试PushPlus
        </TestButton>
      </ButtonGroup>
    </Panel>
  );
}

export default NotificationPanel;
