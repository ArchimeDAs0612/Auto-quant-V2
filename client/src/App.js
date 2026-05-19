import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import EquityCurve from './components/EquityCurve';
import NotificationPanel from './components/NotificationPanel';
import RuntimeMonitor from './components/RuntimeMonitor';
import TradeDecisionRules from './components/TradeDecisionRules';
import PersistenceStatus from './components/PersistenceStatus';
import ErrorBoundary from './components/ErrorBoundary';
import MarketOverviewPanel from './components/MarketOverviewPanel';
import persistenceService from './services/DataPersistenceService';

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  background: linear-gradient(180deg, #111315 0%, #15181C 100%);
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro', 'Segoe UI', sans-serif;
  overflow: hidden;
`;

const Header = styled.header`
  height: 56px;
  background: rgba(21, 24, 28, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
`;

const Title = styled.h1`
  font-size: 17px;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0;
  letter-spacing: -0.01em;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const DataSourceBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => {
    if (props.$source === 'OKX') return 'rgba(34, 197, 94, 0.12)';
    if (props.$source === 'Yahoo Finance') return 'rgba(251, 191, 36, 0.12)';
    return 'rgba(248, 113, 113, 0.12)';
  }};
  color: ${props => {
    if (props.$source === 'OKX') return '#22c55e';
    if (props.$source === 'Yahoo Finance') return '#fbbf24';
    return '#f87171';
  }};
  border: 1px solid ${props => {
    if (props.$source === 'OKX') return 'rgba(34, 197, 94, 0.2)';
    if (props.$source === 'Yahoo Finance') return 'rgba(251, 191, 36, 0.2)';
    return 'rgba(248, 113, 113, 0.2)';
  }};
`;

const SourceDot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${props => {
    if (props.$source === 'OKX') return '#22c55e';
    if (props.$source === 'Yahoo Finance') return '#fbbf24';
    return '#f87171';
  }};
`;

const TradingStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => props.enabled ? 'rgba(34, 197, 94, 0.12)' : 'rgba(248, 113, 113, 0.12)'};
  color: ${props => props.enabled ? '#22c55e' : '#f87171'};
  border: 1px solid ${props => props.enabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(248, 113, 113, 0.2)'};
`;

const MainContent = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 260px 1fr 320px;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
`;

const Panel = styled.div`
  background: rgba(30, 35, 42, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
`;

const PanelTitle = styled.h3`
  font-size: 11px;
  font-weight: 600;
  color: #8b949e;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SignalPanel = styled(Panel)`
  flex: 1.5;
`;

const SignalContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
`;

const SignalBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  background: ${props => {
    if (props.$action === 'STRONG_SIGNAL') return props.$direction === 'long' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(248, 113, 113, 0.2)';
    if (props.$action === 'SIGNAL') return 'rgba(251, 191, 36, 0.2)';
    return 'rgba(107, 114, 128, 0.15)';
  }};
  color: ${props => {
    if (props.$action === 'STRONG_SIGNAL') return props.$direction === 'long' ? '#22c55e' : '#f87171';
    if (props.$action === 'SIGNAL') return '#fbbf24';
    return '#9ca3af';
  }};
  border: 1px solid ${props => {
    if (props.$action === 'STRONG_SIGNAL') return props.$direction === 'long' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(248, 113, 113, 0.4)';
    if (props.$action === 'SIGNAL') return 'rgba(251, 191, 36, 0.4)';
    return 'rgba(107, 114, 128, 0.3)';
  }};
  width: fit-content;
`;

const ScoreBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin-top: 8px;
`;

const ScoreBarFill = styled.div`
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  overflow: hidden;
`;

const ScoreBarProgress = styled.div`
  height: 100%;
  width: ${props => props.$percent}%;
  background: ${props => props.$percent >= 60 ? '#22c55e' : props.$percent >= 40 ? '#fbbf24' : '#f87171'};
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const ScoreText = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${props => props.$percent >= 60 ? '#22c55e' : props.$percent >= 40 ? '#fbbf24' : '#f87171'};
  min-width: 50px;
  text-align: right;
`;

const ReasonPanel = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
`;

const ReasonTitle = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`;

const ReasonRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
  font-size: 11px;
  color: ${props => props.$pass ? '#22c55e' : props.$fail ? '#f87171' : '#8b949e'};
`;

const ReasonIcon = styled.span`
  font-size: 10px;
  width: 14px;
`;

const ReasonText = styled.span`
  flex: 1;
  color: #e2e8f0;
`;

const ReasonScore = styled.span`
  color: #a78bfa;
  font-weight: 600;
`;

const PositionLabel = styled.span`
  font-size: 9px;
  color: #6b7280;
  text-transform: uppercase;
`;

const PositionRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  font-size: 12px;
`;

const PositionCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: ${props => props.$color || '#e2e8f0'};
  font-family: 'SF Mono', monospace;
`;

const HistoryPanel = styled(Panel)`
  flex: 0.9;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const HistoryTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
`;

const HistoryRow = styled(PositionRow)`
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  background: ${props => props.$pnl >= 0 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(248, 113, 113, 0.08)'};
`;

const CompactLogContainer = styled.div`
  background: rgba(20, 25, 32, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  max-height: 120px;
  overflow-y: auto;
  font-family: 'SF Mono', monospace;
  font-size: 10px;
  line-height: 1.4;
  padding: 8px;
`;

const LogEntry = styled.div`
  color: ${props => {
    if (props.$type === 'error') return '#f87171';
    if (props.$type === 'success') return '#22c55e';
    if (props.$type === 'warn') return '#fbbf24';
    if (props.$type === 'price') return '#38bdf8';
    if (props.$type === 'trade') return '#a78bfa';
    return '#8b949e';
  }};
  padding: 2px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DebugPanel = styled.div`
  background: rgba(30, 10, 10, 0.95);
  border: 1px solid rgba(255, 100, 100, 0.3);
  border-radius: 8px;
  padding: 10px;
  font-family: 'SF Mono', monospace;
  font-size: 9px;
`;

const DebugTitle = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: #f87171;
  margin-bottom: 8px;
`;

const DebugSection = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
`;

const DebugLabel = styled.span`
  color: #8b949e;
`;

const DebugValue = styled.span`
  color: ${props => props.$pnl != null ? (props.$pnl >= 0 ? '#22c55e' : '#f87171') : '#e2e8f0'};
`;

const PositionMonitorCard = styled.div`
  background: linear-gradient(180deg, rgba(30, 35, 42, 0.98) 0%, rgba(15, 18, 24, 1) 100%);
  border: 1px solid ${props => props.$isLong ? 'rgba(34, 197, 94, 0.35)' : 'rgba(248, 113, 113, 0.35)'};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
`;

const PositionHistoryWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

const PositionMainRow = styled.div`
  display: flex;
  padding: 14px 16px;
  gap: 16px;
  align-items: stretch;
`;

const PositionLeftCol = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 140px;
`;

const PositionRightCol = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DirectionBadge = styled.div`
  font-size: 20px;
  font-weight: 800;
  color: ${props => props.$isLong ? '#22c55e' : '#f87171'};
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const LeverageBadge = styled.div`
  display: inline-block;
  background: ${props => props.$isLong ? 'rgba(34, 197, 94, 0.15)' : 'rgba(248, 113, 113, 0.15)'};
  color: ${props => props.$isLong ? '#22c55e' : '#f87171'};
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
  width: fit-content;
`;

const PnLDisplay = styled.div`
  margin-top: auto;
`;

const PnLAmountBig = styled.div`
  font-size: 26px;
  font-weight: 800;
  color: ${props => props.$pnl >= 0 ? '#22c55e' : '#f87171'};
  line-height: 1.1;
`;

const PnLPercentBig = styled.div`
  font-size: 13px;
  color: ${props => props.$pnl >= 0 ? '#22c55e' : '#f87171'};
  opacity: 0.85;
  margin-top: 2px;
`;

const DataRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

const DataPill = styled.div`
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  padding: 6px 10px;
  min-width: 70px;
`;

const PillLabel = styled.div`
  font-size: 9px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
`;

const PillValue = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  font-family: 'SF Mono', monospace;
`;

const PillValueGreen = styled(PillValue)`
  color: #22c55e;
`;

const PillValueRed = styled(PillValue)`
  color: #f87171;
`;

const PillValueYellow = styled(PillValue)`
  color: #fbbf24;
`;

const PillValueBlue = styled(PillValue)`
  color: #38bdf8;
`;

const RiskBadge = styled.div`
  display: inline-block;
  background: ${props => props.$level === 'HIGH' ? 'rgba(248, 113, 113, 0.15)' : props.$level === 'MEDIUM' ? 'rgba(251, 191, 36, 0.12)' : 'rgba(34, 197, 94, 0.12)'};
  color: ${props => props.$level === 'HIGH' ? '#f87171' : props.$level === 'MEDIUM' ? '#fbbf24' : '#22c55e'};
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
`;

const SignalRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.04);
`;

const SignalTitle = styled.div`
  font-size: 9px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-right: 4px;
`;

const SignalChip = styled.div`
  font-size: 10px;
  color: ${props => props.$active ? '#22c55e' : '#4b5563'};
  background: ${props => props.$active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.03)'};
  padding: 2px 7px;
  border-radius: 3px;
`;

const ScoreChip = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ScoreLabel = styled.span`
  font-size: 9px;
  color: #6b7280;
  text-transform: uppercase;
`;

const ScoreValue = styled.span`
  font-size: 16px;
  font-weight: 800;
  color: ${props => props.$score >= 70 ? '#22c55e' : props.$score >= 50 ? '#fbbf24' : '#f87171'};
`;

const DurationChip = styled.div`
  font-size: 11px;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
  padding: 3px 8px;
  border-radius: 4px;
`;

const NoPositionCard = styled.div`
  background: linear-gradient(135deg, rgba(30, 35, 42, 0.95) 0%, rgba(20, 25, 32, 0.98) 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  color: #6b7280;
  font-size: 18px;
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
`;

const CenterColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
`;

function App() {
  const [activeSource, setActiveSource] = useState(null);
  const [btcPrice, setBtcPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(0);
  const [priceChangePercent, setPriceChangePercent] = useState(0);
  const [tradingEnabled, setTradingEnabled] = useState(false);
  const [logs, setLogs] = useState([]);

  const [signal, setSignal] = useState(null);
  const [tradingStats, setTradingStats] = useState(null);
  const [equityStats, setEquityStats] = useState(null);
  const [openPositions, setOpenPositions] = useState([]);
  const [history, setHistory] = useState([]);
  const [equityCurve, setEquityCurve] = useState([{ time: Date.now(), equity: 1000 }]);
  const [heartbeat, setHeartbeat] = useState(null);
  const wsRef = useRef(null);
  const lastTickerRef = useRef(0);
  const lastEquityUpdateRef = useRef(0);
  const recoveredFromLocalRef = useRef(false);
  const localPositionsRef = useRef(null);
  const localEquityCurveRef = useRef(null);

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-200), { timestamp, message, type }]);
  }, []);

  useEffect(() => {
    const wsUrl = `ws://localhost:3001/ws`;
    addLog(`正在连接 ${wsUrl}...`, 'info');

    const websocket = new WebSocket(wsUrl);
    wsRef.current = websocket;

    websocket.onopen = () => {
      addLog('已连接后端服务器', 'success');
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'init':
            setBtcPrice(message.data.btcPrice);
            setTradingStats(message.data.tradingStats);
            setEquityStats(message.data.equityStats || null);

            const backendHasPositions = message.data.openPositions && message.data.openPositions.length > 0;
            const localPositions = localPositionsRef.current;

            if (!backendHasPositions && localPositions && localPositions.length > 0 && !recoveredFromLocalRef.current) {
              console.log('[App] Restoring positions from localStorage:', localPositions.length);
              setOpenPositions(localPositions);
              recoveredFromLocalRef.current = true;
              addLog(`🔄 持仓已恢复: ${localPositions.length} 个仓位`, 'success');
            } else {
              setOpenPositions(message.data.openPositions || []);
            }

            if (message.data.history && message.data.history.length > 0) {
              setHistory(message.data.history);
              console.log('[App] Restored history:', message.data.history.length, 'trades');
            }

            if (message.data.signal) setSignal(message.data.signal);

            const backendHasEquity = message.data.equityCurve && message.data.equityCurve.length > 0;
            const localEquity = localEquityCurveRef.current;
            if (!backendHasEquity && localEquity && localEquity.length > 0 && !recoveredFromLocalRef.current) {
              console.log('[App] Restoring equity curve from localStorage');
              setEquityCurve(localEquity);
            } else if (message.data.equityCurve) {
              setEquityCurve(message.data.equityCurve);
            }

            addLog(`系统状态: ${message.data.message}`, message.data.okxHealthy ? 'success' : 'warn');
            break;

          case 'sourceChanged':
            if (message.data.source === 'OKX') {
              setActiveSource('OKX');
              setTradingEnabled(message.data.tradingEnabled);
              addLog('✅ OKX 连接成功，开始接收真实永续合约行情', 'success');
            } else if (message.data.source === 'Yahoo Finance') {
              setActiveSource('Yahoo Finance');
              setTradingEnabled(false);
              addLog('⚠️ OKX 断开，切换到 Yahoo Finance（策略暂停）', 'warn');
            }
            break;

          case 'systemState':
            setTradingEnabled(message.data.tradingEnabled);
            break;

          case 'ticker':
            const now = Date.now();
            if (now - lastTickerRef.current < 500) break;
            lastTickerRef.current = now;
            setBtcPrice(message.data.price);
            setPriceChange(message.data.change24h || 0);
            setPriceChangePercent(message.data.change24hPercent || 0);
            break;

          case 'signal':
            setSignal(message.data);
            addLog(`${message.data.actionCN} ${message.data.directionCN} 置信度: ${message.data.confidence}%`, 'trade');
            break;

          case 'positionOpened':
            setOpenPositions(prev => [...prev, message.data]);
            setTradingEnabled(false);
            addLog(`📈 开仓: ${message.data.direction} @ ${message.data.entryPrice}`, 'trade');
            break;

          case 'positionClosed':
            setOpenPositions(prev => prev.filter(p => p.id !== message.data.id));
            setHistory(prev => [message.data, ...prev]);
            setTradingEnabled(true);
            addLog(`📊 平仓: ${message.data.status} ${message.data.pnl >= 0 ? '+' : ''}${message.data.pnl?.toFixed(2)}`, 'trade');
            break;

          case 'positionUpdate':
            setOpenPositions(prev => prev.map(p => p.id === message.data.id ? message.data : p));
            break;

          case 'equityUpdate':
            const equityNow = Date.now();
            if (equityNow - lastEquityUpdateRef.current < 1000) break;
            lastEquityUpdateRef.current = equityNow;
            setEquityCurve(prev => {
              const newPoint = { time: message.data.timestamp, equity: message.data.equity };
              const newCurve = message.data.history || [...prev, newPoint];
              if (newCurve.length > 1000) newCurve.shift();
              return newCurve;
            });
            if (message.data.equity !== undefined) {
              setTradingStats(prev => prev ? {
                ...prev,
                equity: message.data.equity,
                unrealizedPnl: message.data.unrealizedPnl,
                balance: message.data.balance
              } : null);
            }
            if (message.data.balance !== undefined) {
              setEquityStats(prev => prev ? {
                ...prev,
                currentEquity: message.data.equity,
                unrealizedPnl: message.data.unrealizedPnl
              } : {
                currentEquity: message.data.equity,
                unrealizedPnl: message.data.unrealizedPnl,
                balance: message.data.balance
              });
            }
            break;

          case 'heartbeat':
            setHeartbeat(message.data);
            break;

          case 'notificationResult':
            addLog(message.data.success ? `✅ 通知发送成功` : `❌ 通知发送失败: ${message.data.error}`, message.data.success ? 'success' : 'error');
            break;

          default:
            break;
        }
      } catch (error) {
        addLog(`解析错误: ${error.message}`, 'error');
      }
    };

    websocket.onclose = () => {
      addLog('与后端断开连接', 'error');
    };

    websocket.onerror = () => {
      addLog('WebSocket错误', 'error');
    };

    return () => websocket.close();
  }, [addLog]);

  useEffect(() => {
    const savedData = persistenceService.loadData();
    if (savedData) {
      console.log('[App] Found saved data, will restore after WebSocket init');
      localPositionsRef.current = savedData.openPositions || [];
      localEquityCurveRef.current = savedData.equityCurve || [];
    }
  }, []);

  useEffect(() => {
    if (openPositions && openPositions.length > 0) {
      const data = {
        openPositions,
        equityCurve,
        tradingStats,
        history,
        _meta: { version: 1, savedAt: Date.now() }
      };
      persistenceService.saveData(data);
      console.log('[App] Immediately saved positions:', openPositions.length);
    }
  }, [openPositions, equityCurve, tradingStats, history]);

  useEffect(() => {
    const getDataForSave = () => ({
      activeSource,
      btcPrice,
      tradingEnabled,
      tradingStats,
      openPositions,
      history,
      equityCurve,
      heartbeat,
      logs: logs.slice(-100)
    });

    persistenceService.startAutoSave(getDataForSave, 5000);

    const unsubVisibility = persistenceService.setupVisibilityHandler(getDataForSave);
    const unsubUnload = persistenceService.setupBeforeUnload(getDataForSave);

    window.onRestoreData = (data) => {
      console.log('[App] Restoring data:', data);
      if (data.tradingStats) setTradingStats(data.tradingStats);
      if (data.openPositions) setOpenPositions(data.openPositions);
      if (data.history) setHistory(data.history);
      if (data.equityCurve) setEquityCurve(data.equityCurve);
      if (data.logs) setLogs(data.logs);
    };

    return () => {
      persistenceService.stopAutoSave();
      unsubVisibility();
      unsubUnload();
    };
  }, [activeSource, btcPrice, tradingEnabled, tradingStats, openPositions, history, equityCurve, heartbeat, logs]);

  const formatPrice = (price) => {
    if (!price) return '--';
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getSourceDisplay = () => {
    if (activeSource === 'OKX') return '🟢 OKX';
    if (activeSource === 'Yahoo Finance') return '🟡 Yahoo Finance';
    return '🔴 --';
  };

  const testDesktopNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('BTC Trading System Test', {
        body: 'Desktop Notification Working\nBTC Real-Time System Connected Successfully',
        icon: '📈'
      });
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'testNotification', data: { channel: 'desktop' } }));
    }
  };

  const testPushPlus = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'testNotification', data: { channel: 'pushplus' } }));
    }
  };

  const getSignalDisplay = () => {
    if (!signal) return { text: '等待信号...', action: 'WAIT', direction: null };
    return {
      text: `${signal.actionCN} ${signal.directionCN}`,
      action: signal.action,
      direction: signal.direction,
      confidence: signal.confidence,
      reason: signal.reason
    };
  };

  const signalInfo = getSignalDisplay();

  return (
    <Container>
      <Header>
        <Title>BTC 趋势跟随交易系统</Title>
        <HeaderRight>
          <DataSourceBadge $source={activeSource}>
            <SourceDot $source={activeSource} />
            {getSourceDisplay()}
          </DataSourceBadge>
          <TradingStatus enabled={tradingEnabled}>
            {tradingEnabled ? '✓ 交易就绪' : '○ 等待信号'}
          </TradingStatus>
        </HeaderRight>
      </Header>

      <ErrorBoundary>
      <MainContent>
        <ErrorBoundary>
          <MarketOverviewPanel
            btcPrice={btcPrice}
            priceChange={priceChange}
            priceChangePercent={priceChangePercent}
            signal={signal}
            openPositions={openPositions}
            currentPrice={btcPrice}
            tradingEnabled={tradingEnabled}
          />
        </ErrorBoundary>

        <CenterColumn>
          <ErrorBoundary>
          <SignalPanel>
            <PanelTitle>交易信号</PanelTitle>
            <SignalContainer>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <SignalBadge $action={signalInfo.action} $direction={signalInfo.direction}>
                  {signalInfo.text}
                </SignalBadge>
                {signal?.analysis?.score && (
                  <ScoreText $percent={signal.analysis.score.total}>
                    {signal.analysis.score.total}/100
                  </ScoreText>
                )}
              </div>

              {signal?.analysis?.score && (
                <ScoreBar>
                  <ScoreBarFill>
                    <ScoreBarProgress $percent={signal.analysis.score.total} />
                  </ScoreBarFill>
                </ScoreBar>
              )}

              {signal?.analysis?.scoreDetails?.length > 0 ? (
                <ReasonPanel>
                  <ReasonTitle>Trade Reasoning</ReasonTitle>
                  {signal.analysis.scoreDetails.map((detail, idx) => {
                    const isPass = detail.includes('✅') || detail.includes('🎯');
                    const isFail = detail.includes('❌');
                    const scoreMatch = detail.match(/\(\+(\d+)\)/);
                    return (
                      <ReasonRow key={idx} $pass={isPass} $fail={isFail}>
                        <ReasonIcon>{isPass ? '✓' : isFail ? '✗' : '•'}</ReasonIcon>
                        <ReasonText>{detail.replace(/^[✅❌⚠️🎯]\s*/, '').replace(/\s*\(\+\d+\)$/, '')}</ReasonText>
                        {scoreMatch && <ReasonScore>+{scoreMatch[1]}</ReasonScore>}
                      </ReasonRow>
                    );
                  })}
                </ReasonPanel>
              ) : signal?.noTradeReasons?.length > 0 ? (
                <ReasonPanel>
                  <ReasonTitle>No Trade Reason</ReasonTitle>
                  {signal.noTradeReasons.map((reason, idx) => (
                    <ReasonRow key={idx} $fail>
                      <ReasonIcon>✗</ReasonIcon>
                      <ReasonText>{reason}</ReasonText>
                    </ReasonRow>
                  ))}
                </ReasonPanel>
              ) : null}
            </SignalContainer>
          </SignalPanel>
          </ErrorBoundary>

          <PositionHistoryWrapper>
          {openPositions.length === 0 ? (
                <NoPositionCard>
                  🔍 暂无持仓 - 等待交易信号
                </NoPositionCard>
              ) : (
                openPositions.map(pos => {
                  const isLong = pos.direction === 'long';
                  const pnl = pos.currentPnl || 0;
                  const pnlPercent = pos.currentPnlPercent || 0;
                  const positionDuration = pos.openedAt
                    ? (() => {
                        const ms = Date.now() - pos.openedAt;
                        const hours = Math.floor(ms / (1000 * 60 * 60));
                        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
                        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                      })()
                    : '--';
                  const tradeScore = pos.tradeScore || signal?.analysis?.totalScore || 0;
                  const riskLevel = pos.riskLevel || 'MEDIUM';
                  const signalDetails = signal?.analysis?.scoreDetails || [];
                  return (
                    <PositionMonitorCard key={pos.id} $isLong={isLong}>
                      <PositionMainRow>
                        <PositionLeftCol>
                          <DirectionBadge $isLong={isLong}>
                            {isLong ? '🟢 LONG' : '🔴 SHORT'}
                          </DirectionBadge>
                          <LeverageBadge $isLong={isLong}>{pos.leverage || 1}x</LeverageBadge>
                          <RiskBadge $level={riskLevel}>{riskLevel}</RiskBadge>
                          <PnLDisplay>
                            <PnLAmountBig $pnl={pnl}>
                              {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                            </PnLAmountBig>
                            <PnLPercentBig $pnl={pnl}>
                              ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                            </PnLPercentBig>
                          </PnLDisplay>
                        </PositionLeftCol>
                        <PositionRightCol>
                          <DataRow>
                            <DataPill>
                              <PillLabel>Entry</PillLabel>
                              <PillValue>{formatPrice(pos.entryPrice)}</PillValue>
                            </DataPill>
                            <DataPill>
                              <PillLabel>Current</PillLabel>
                              <PillValueBlue>{btcPrice ? formatPrice(btcPrice) : '--'}</PillValueBlue>
                            </DataPill>
                            <DataPill>
                              <PillLabel>Size</PillLabel>
                              <PillValue>{(pos.positionNotional || pos.positionSize)?.toFixed(0)}</PillValue>
                            </DataPill>
                            <DataPill>
                              <PillLabel>Margin</PillLabel>
                              <PillValue>{(pos.marginUsed || (pos.positionSize / (pos.leverage || 1)))?.toFixed(0)}</PillValue>
                            </DataPill>
                          </DataRow>
                          <DataRow>
                            <DataPill>
                              <PillLabel>TP</PillLabel>
                              <PillValueGreen>{formatPrice(pos.takeProfit)}</PillValueGreen>
                            </DataPill>
                            <DataPill>
                              <PillLabel>SL</PillLabel>
                              <PillValueRed>{formatPrice(pos.stopLoss)}</PillValueRed>
                            </DataPill>
                            <DataPill>
                              <PillLabel>Liq</PillLabel>
                              <PillValueYellow>{pos.liquidationPrice ? formatPrice(pos.liquidationPrice) : '--'}</PillValueYellow>
                            </DataPill>
                            <DataPill>
                              <PillLabel>Exposure</PillLabel>
                              <PillValue>{(pos.positionExposure || 0).toFixed(1)}%</PillValue>
                            </DataPill>
                          </DataRow>
                        </PositionRightCol>
                      </PositionMainRow>
                      <SignalRow>
                        <SignalTitle>Signals:</SignalTitle>
                        {signalDetails.length > 0 ? signalDetails.slice(0, 4).map((detail, i) => (
                          <SignalChip key={i} $active={true}>✓ {detail}</SignalChip>
                        )) : (
                          <>
                            <SignalChip $active={true}>✓ 评分制</SignalChip>
                            <SignalChip $active={tradeScore >= 70}>✓ {tradeScore >= 70 ? '高置信' : '中置信'}</SignalChip>
                          </>
                        )}
                        <ScoreChip>
                          <ScoreLabel>Score</ScoreLabel>
                          <ScoreValue $score={tradeScore}>{tradeScore}</ScoreValue>
                        </ScoreChip>
                        <DurationChip>⏱ {positionDuration}</DurationChip>
                      </SignalRow>
                    </PositionMonitorCard>
                  );
                })
              )}

          <HistoryPanel>
            <PanelTitle>交易历史 ({history.length})</PanelTitle>
            <HistoryTable>
              {history.length === 0 ? (
                <div style={{ color: '#6b7280', padding: 20, textAlign: 'center' }}>
                  暂无交易记录
                </div>
              ) : (
                history.slice(0, 10).map(pos => (
                  <HistoryRow key={pos.id} $pnl={pos.pnl}>
                    <PositionCell $color={pos.direction === 'long' ? '#22c55e' : '#f87171'}>
                      <PositionLabel>方向</PositionLabel>
                      {pos.direction === 'long' ? '🔴 多' : '🔵 空'}
                    </PositionCell>
                    <PositionCell>
                      <PositionLabel>入场</PositionLabel>
                      {formatPrice(pos.entryPrice)}
                    </PositionCell>
                    <PositionCell>
                      <PositionLabel>出场</PositionLabel>
                      {formatPrice(pos.exitPrice)}
                    </PositionCell>
                    <PositionCell $color={pos.pnl >= 0 ? '#22c55e' : '#f87171'}>
                      <PositionLabel>盈亏</PositionLabel>
                      {pos.pnl >= 0 ? '+' : ''}{pos.pnl.toFixed(2)}
                    </PositionCell>
                    <PositionCell>
                      <PositionLabel>结果</PositionLabel>
                      {pos.status === 'take_profit' ? '✓止盈' : '✗止损'}
                    </PositionCell>
                  </HistoryRow>
                ))
              )}
            </HistoryTable>
          </HistoryPanel>
          </PositionHistoryWrapper>
        </CenterColumn>

        <RightColumn>
          <ErrorBoundary>
          <EquityCurve
            stats={tradingStats}
            equityCurve={equityCurve}
            equityStats={equityStats}
            openPositions={openPositions}
            currentPrice={btcPrice}
          />
          </ErrorBoundary>

          <RuntimeMonitor heartbeat={heartbeat} />

          <CompactLogContainer>
            {logs.slice(-8).map((log, index) => (
              <LogEntry key={index} $type={log.type}>
                {log.message}
              </LogEntry>
            ))}
          </CompactLogContainer>

          <NotificationPanel
            onTestDesktop={testDesktopNotification}
            onTestPushPlus={testPushPlus}
          />

          <TradeDecisionRules signal={signal} />

          <DebugPanel>
            <DebugTitle>🔍 Position Debug</DebugTitle>
            <DebugSection>
              <DebugLabel>openPositions.count</DebugLabel>
              <DebugValue>{openPositions.length}</DebugValue>
            </DebugSection>
            {openPositions[0] && (
              <>
                <DebugSection>
                  <DebugLabel>OP.direction</DebugLabel>
                  <DebugValue>{openPositions[0].direction}</DebugValue>
                </DebugSection>
                <DebugSection>
                  <DebugLabel>OP.leverage</DebugLabel>
                  <DebugValue>{openPositions[0].leverage}</DebugValue>
                </DebugSection>
                <DebugSection>
                  <DebugLabel>OP.entryPrice</DebugLabel>
                  <DebugValue>{openPositions[0].entryPrice}</DebugValue>
                </DebugSection>
                <DebugSection>
                  <DebugLabel>OP.currentPnl</DebugLabel>
                  <DebugValue $pnl={openPositions[0].currentPnl}>{openPositions[0].currentPnl?.toFixed(2)}</DebugValue>
                </DebugSection>
                <DebugSection>
                  <DebugLabel>btcPrice</DebugLabel>
                  <DebugValue>{btcPrice}</DebugValue>
                </DebugSection>
              </>
            )}
            <DebugSection>
              <DebugLabel>signal.direction</DebugLabel>
              <DebugValue>{signal?.direction || 'null'}</DebugValue>
            </DebugSection>
            <DebugSection>
              <DebugLabel>signal.entryPrice</DebugLabel>
              <DebugValue>{signal?.entry?.entryPrice || 'null'}</DebugValue>
            </DebugSection>
          </DebugPanel>
        </RightColumn>
      </MainContent>
      </ErrorBoundary>
      <PersistenceStatus />
    </Container>
  );
}

export default App;
