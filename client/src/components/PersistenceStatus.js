import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import persistenceService from '../services/DataPersistenceService';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const Container = styled.div`
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
`;

const StatusCard = styled.div`
  background: rgba(13, 20, 33, 0.95);
  border: 1px solid ${props => {
    if (props.$type === 'success') return 'rgba(16, 185, 129, 0.3)';
    if (props.$type === 'warning') return 'rgba(245, 158, 11, 0.3)';
    if (props.$type === 'error') return 'rgba(239, 68, 68, 0.3)';
    return 'rgba(107, 114, 128, 0.3)';
  }};
  border-radius: 8px;
  padding: 12px 16px;
  min-width: 280px;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: ${pulse} 2s ease-in-out infinite;
`;

const StatusHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const StatusTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: ${props => {
    if (props.$type === 'success') return '#10b981';
    if (props.$type === 'warning') return '#f59e0b';
    if (props.$type === 'error') return '#ef4444';
    return '#6b7280';
  }};
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #e0e0e0;
  }
`;

const StatusContent = styled.div`
  font-size: 11px;
  color: #9ca3af;
  line-height: 1.6;
`;

const StatusRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
`;

const StatusLabel = styled.span`
  color: #6b7280;
`;

const StatusValue = styled.span`
  color: #e0e0e0;
  font-family: 'SF Mono', monospace;
`;

const RecoveryButton = styled.button`
  margin-top: 8px;
  padding: 6px 12px;
  background: rgba(0, 212, 255, 0.15);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 6px;
  color: #00d4ff;
  font-size: 11px;
  cursor: pointer;
  width: 100%;
  &:hover {
    background: rgba(0, 212, 255, 0.25);
  }
`;

const ClearButton = styled.button`
  margin-top: 4px;
  padding: 4px 8px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 4px;
  color: #ef4444;
  font-size: 10px;
  cursor: pointer;
  &:hover {
    background: rgba(239, 68, 68, 0.2);
  }
`;

function PersistenceStatus() {
  const [showStatus, setShowStatus] = useState(false);
  const [status, setStatus] = useState({ saveStatus: 'idle' });
  const [recoveryInfo, setRecoveryInfo] = useState(null);
  const [showRecovered, setShowRecovered] = useState(false);

  useEffect(() => {
    const unsubRecovery = persistenceService.on('recovery', (result) => {
      setRecoveryInfo(result);
      if (result && result.found) {
        setShowRecovered(true);
        setTimeout(() => setShowRecovered(false), 5000);
      }
    });

    const unsubSave = persistenceService.on('save', () => {
      setStatus(persistenceService.getStatus());
    });

    setStatus(persistenceService.getStatus());

    const checkInterval = setInterval(() => {
      setStatus(persistenceService.getStatus());
    }, 5000);

    return () => {
      unsubRecovery();
      unsubSave();
      clearInterval(checkInterval);
    };
  }, []);

  const formatTime = (timestamp) => {
    if (!timestamp) return '--';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const handleRestore = () => {
    const data = persistenceService.loadData();
    if (data && window.onRestoreData) {
      window.onRestoreData(data);
    }
    setShowStatus(false);
  };

  const handleClear = () => {
    if (window.confirm('确定清除所有本地保存的数据吗？')) {
      persistenceService.clearData();
      setRecoveryInfo(null);
      setShowStatus(false);
    }
  };

  const getStatusType = () => {
    if (recoveryInfo?.error || status.saveStatus === 'error') return 'error';
    if (showRecovered || recoveryInfo?.found) return 'success';
    if (status.lastSaveTime) return 'success';
    return 'idle';
  };

  if (!showStatus && !showRecovered) {
    return (
      <Container>
        {status.lastSaveTime && (
          <StatusCard $type="success" style={{ animation: 'none', minWidth: 'auto', padding: '6px 10px' }}>
            <StatusTitle $type="success" style={{ fontSize: '10px' }}>
              <StatusDot />
              已保存 {formatTime(status.lastSaveTime)}
            </StatusTitle>
          </StatusCard>
        )}
        <StatusCard
          $type="idle"
          style={{ animation: 'none', minWidth: 'auto', padding: '6px 10px', cursor: 'pointer' }}
          onClick={() => setShowStatus(true)}
        >
          <StatusTitle $type="idle" style={{ fontSize: '10px' }}>
            💾 本地存储
          </StatusTitle>
        </StatusCard>
      </Container>
    );
  }

  return (
    <Container>
      {showRecovered && (
        <StatusCard $type="success">
          <StatusHeader>
            <StatusTitle $type="success">
              <StatusDot /> ✅ 数据已恢复
            </StatusTitle>
          </StatusHeader>
          <StatusContent>
            已从本地存储恢复之前的会话数据
          </StatusContent>
        </StatusCard>
      )}

      <StatusCard $type={getStatusType()}>
        <StatusHeader>
          <StatusTitle $type={getStatusType()}>
            <StatusDot /> 💾 数据持久化状态
          </StatusTitle>
          <CloseButton onClick={() => setShowStatus(false)}>✕</CloseButton>
        </StatusHeader>

        <StatusContent>
          <StatusRow>
            <StatusLabel>保存状态:</StatusLabel>
            <StatusValue>
              {status.saveStatus === 'saved' ? '✅ 已保存' : status.saveStatus === 'error' ? '❌ 错误' : '⏳ 等待中'}
            </StatusValue>
          </StatusRow>
          <StatusRow>
            <StatusLabel>上次保存:</StatusLabel>
            <StatusValue>{formatTime(status.lastSaveTime)}</StatusValue>
          </StatusRow>
          <StatusRow>
            <StatusLabel>本地数据:</StatusLabel>
            <StatusValue>{recoveryInfo?.found ? '✅ 有' : '❌ 无'}</StatusValue>
          </StatusRow>
          <StatusRow>
            <StatusLabel>存储大小:</StatusLabel>
            <StatusValue>{formatSize(status.storageSize)}</StatusValue>
          </StatusRow>
          {recoveryInfo?.savedAt && (
            <StatusRow>
              <StatusLabel>保存时间:</StatusLabel>
              <StatusValue>{new Date(recoveryInfo.savedAt).toLocaleString('zh-CN')}</StatusValue>
            </StatusRow>
          )}
        </StatusContent>

        {recoveryInfo?.found && (
          <RecoveryButton onClick={handleRestore}>
            恢复此数据
          </RecoveryButton>
        )}

        {recoveryInfo?.found && (
          <ClearButton onClick={handleClear}>
            清除本地数据
          </ClearButton>
        )}
      </StatusCard>
    </Container>
  );
}

export default PersistenceStatus;
