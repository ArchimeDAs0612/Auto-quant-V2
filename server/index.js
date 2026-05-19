const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
require('dotenv').config();

const MarketDataAggregator = require('./services/marketDataAggregator');
const PaperTrading = require('./services/paperTrading');
const NotificationService = require('./services/notificationService');
const Database = require('./database');

const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server, path: '/ws' });

app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

const db = new Database();

const aggregator = new MarketDataAggregator();
const paperTrading = new PaperTrading(1000);
const notifications = new NotificationService();

const systemState = {
  okxHealthy: false,
  activeSource: null,
  dataStatus: 'no_data',
  canTrade: false,
  btcPrice: null,
  lastTickTime: 0,
  okxLatency: 0,
  okxReconnectCount: 0,
  signal: null,
  tradingEnabled: false,
  startTime: Date.now(),
  lastHeartbeat: Date.now(),
  lastSignalTime: null,
  lastCandleUpdate: null,
  lastPushplusTime: null,
  consecutiveHeartbeats: 0
};

const clients = new Set();
let lastSignalGeneration = 0;
let lastSignalNotification = 0;
const SIGNAL_COOLDOWN = 30000;
const NOTIFICATION_INTERVAL = 300000;

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    rss: Math.round(usage.rss / 1024 / 1024)
  };
}

function heartbeat() {
  const now = Date.now();
  const uptime = now - systemState.startTime;
  const timeSinceLastTick = now - systemState.lastTickTime;
  const memory = getMemoryUsage();

  console.log('='.repeat(60));
  console.log('[HEARTBEAT] 系统运行时状态');
  console.log('='.repeat(60));
  console.log(`⏱️  Uptime: ${formatUptime(uptime)}`);
  console.log(`💰 BTC Price: $${systemState.btcPrice?.toLocaleString() || '--'}`);
  console.log(`📡 WebSocket: ${systemState.okxHealthy ? '✅ Connected' : '❌ Disconnected'}`);
  console.log(`📊 Data Source: ${systemState.activeSource || '--'}`);
  console.log(`📈 Last Tick: ${timeSinceLastTick < 5000 ? '✅ Recent' : `⚠️ ${Math.round(timeSinceLastTick / 1000)}s ago`}`);
  console.log(`🎯 Strategy: ${paperTrading.isRunning ? '✅ Running' : '❌ Stopped'}`);
  console.log(`📊 Positions: ${paperTrading.riskManager?.positions?.length || 0}`);
  console.log(`🔔 Last PushPlus: ${systemState.lastPushplusTime ? new Date(systemState.lastPushplusTime).toLocaleTimeString() : 'Never'}`);
  console.log(`📊 Memory: ${memory.heapUsed}MB / ${memory.heapTotal}MB (RSS: ${memory.rss}MB)`);
  console.log(`👥 Clients: ${clients.size}`);
  console.log(`🔄 Reconnects: ${systemState.okxReconnectCount}`);
  console.log('='.repeat(60));

  systemState.lastHeartbeat = now;
  systemState.consecutiveHeartbeats++;

  broadcastToClients({
    type: 'heartbeat',
    data: {
      uptime: formatUptime(uptime),
      uptimeMs: uptime,
      btcPrice: systemState.btcPrice,
      okxHealthy: systemState.okxHealthy,
      activeSource: systemState.activeSource,
      lastTickAgo: timeSinceLastTick,
      strategyRunning: paperTrading.isRunning,
      positions: paperTrading.riskManager?.positions?.length || 0,
      lastSignalTime: systemState.lastSignalTime,
      lastCandleUpdate: systemState.lastCandleUpdate,
      lastPushplusTime: systemState.lastPushplusTime,
      memory: memory,
      clients: clients.size,
      reconnectCount: systemState.okxReconnectCount,
      timestamp: now
    }
  });

  const tradingStats = paperTrading.getStats ? paperTrading.getStats() : paperTrading.riskManager?.getStats ? paperTrading.riskManager.getStats() : null;
  const minutesSinceStart = uptime / (1000 * 60);
  const fourHoursInMinutes = 4 * 60;
  if (minutesSinceStart >= fourHoursInMinutes && Math.floor(minutesSinceStart / fourHoursInMinutes) === Math.floor((minutesSinceStart - 60000) / fourHoursInMinutes)) {
    const openPositions = paperTrading.riskManager?.positions || [];
    let positionsHtml = '';
    if (openPositions.length > 0) {
      positionsHtml = '<h3>📊 当前持仓</h3><table style="width:100%; border-collapse: collapse;">';
      positionsHtml += '<tr style="background:#f0f0f0;"><td><b>方向</b></td><td><b>仓位</b></td><td><b>杠杆</b></td><td><b>入场价</b></td><td><b>浮盈亏</b></td></tr>';
      for (const pos of openPositions) {
        const dir = pos.direction === 'long' ? '📈多' : '📉空';
        const pnl = pos.unrealizedPnl || 0;
        const pnlColor = pnl >= 0 ? 'green' : 'red';
        positionsHtml += `<tr><td>${dir}</td><td>${pos.positionSize.toFixed(0)}</td><td>${pos.leverage}x</td><td>${pos.entryPrice.toFixed(0)}</td><td style="color:${pnlColor}">${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</td></tr>`;
      }
      positionsHtml += '</table>';
    }

    const statusMsg = `<h2>📊 BTC交易系统 - 定时状态</h2>
<hr>
<h3>⏱️ 系统运行</h3>
<table style="width:100%; border-collapse: collapse;">
  <tr><td><b>运行时间:</b></td><td>${formatUptime(uptime)}</td></tr>
  <tr><td><b>BTC价格:</b></td><td>$${systemState.btcPrice?.toLocaleString() || '--'}</td></tr>
  <tr><td><b>数据源:</b></td><td>${systemState.activeSource || '--'}</td></tr>
</table>

<h3>💰 账户状态</h3>
<table style="width:100%; border-collapse: collapse;">
  <tr><td><b>账户余额:</b></td><td>$${tradingStats?.balance?.toFixed(2) || '--'}</td></tr>
  <tr><td><b>持仓数:</b></td><td>${openPositions.length}</td></tr>
  <tr><td><b>浮盈/亏:</b></td><td>$${tradingStats?.unrealizedPnl?.toFixed(2) || '0.00'}</td></tr>
</table>

<h3>📈 交易统计</h3>
<table style="width:100%; border-collapse: collapse;">
  <tr><td><b>总交易:</b></td><td>${tradingStats?.totalTrades || 0}</td></tr>
  <tr><td><b>胜率:</b></td><td>${tradingStats?.winRate ? (tradingStats.winRate * 100).toFixed(1) + '%' : '--'}</td></tr>
  <tr><td><b>盈利:</b></td><td>$${tradingStats?.avgWin?.toFixed(2) || '0.00'}</td></tr>
  <tr><td><b>亏损:</b></td><td>$${tradingStats?.avgLoss?.toFixed(2) || '0.00'}</td></tr>
  <tr><td><b>利润因子:</b></td><td>${tradingStats?.profitFactor?.toFixed(2) || '0.00'}</td></tr>
  <tr><td><b>最大回撤:</b></td><td>${tradingStats?.maxDrawdown ? (tradingStats.maxDrawdown * 100).toFixed(1) + '%' : '0%'}</td></tr>
</table>

${positionsHtml}
<hr>
<p><b>🕐 时间:</b> ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>`;

    notifications.sendPushPlus('📊 BTC系统定时状态', statusMsg).then(() => {
      systemState.lastPushplusTime = now;
    }).catch(err => {
      console.error('[Heartbeat] PushPlus发送失败:', err.message);
    });
  }
}

function startHeartbeat() {
  setInterval(heartbeat, 60000);
  console.log('[Heartbeat] 心跳日志已启动 (每分钟输出)');
}

async function sendScheduledStatusNotification() {
  const stats = paperTrading.riskManager.getStats();
  const positions = paperTrading.riskManager.getOpenPositions();
  const balance = stats?.balance || 0;
  const pnlPercent = stats?.pnlPercent || 0;
  const winRate = stats?.winRate || 0;
  const totalTrades = stats?.totalTrades || 0;
  const currentPrice = systemState.btcPrice || 0;

  const uptime = formatUptime(Date.now() - systemState.startTime);

  let positionInfo = '无持仓';
  if (positions && positions.length > 0) {
    const pos = positions[0];
    positionInfo = `${pos.direction === 'long' ? '做多' : '做空'} @ ${pos.entryPrice}\n浮动盈亏: ${pos.unrealizedPnl || 0}`;
  }

  const statusContent = `
📊 BTC交易系统状态报告
⏰ ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

💰 账户信息
余额: $${balance.toFixed(2)}
收益率: ${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%
胜率: ${winRate.toFixed(1)}%
交易次数: ${totalTrades}

📈 市场信息
BTC价格: $${currentPrice.toLocaleString()}
运行时长: ${uptime}

📍 持仓状态
${positionInfo}

🛡️ 策略状态
简化趋势策略运行中
每2小时定时推送
`;

  try {
    await notifications.sendPushPlus('📊 BTC交易系统状态报告', statusContent);
    await notifications.sendDesktop('📊 定时状态报告', `余额: $${balance.toFixed(2)} | 收益率: ${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}% | ${positions.length > 0 ? '有持仓' : '无持仓'}`);
    console.log('[通知] 2小时定时状态报告已发送');
  } catch (e) {
    console.error('[通知] 定时报告发送失败:', e.message);
  }
}

function startScheduledNotifications() {
  sendScheduledStatusNotification();

  setInterval(sendScheduledStatusNotification, 1 * 60 * 60 * 1000);
  console.log('[通知] 定时通知已启动 (每1小时)');
}

async function initSystem() {
  console.log('='.repeat(60));
  console.log('BTC趋势跟随交易系统 - 初始化');
  console.log('='.repeat(60));

  try {
    await db.init();
    console.log('[DB] Database initialized');
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error.message);
  }

  setupAggregatorListeners();
  setupPaperTradingListeners();
  setupNotificationListeners();

  aggregator.start();
  paperTrading.start();
  startHeartbeat();
  startScheduledNotifications();

  let mockGenerated = false;
  const checkForRealCandles = () => {
    if (mockGenerated) return;

    const realCandleCount = Object.values(paperTrading.candles).filter(c => c && c.length >= 100).length;

    if (realCandleCount >= 2) {
      console.log(`[Mock] 跳过 - 已获取 ${realCandleCount}/3 个时间框真实K线数据`);
      mockGenerated = true;
    } else if (!mockGenerated) {
      console.log(`[Mock] 检查K线状态: ${realCandleCount}/3 时间框有数据`);
    }
  };

  const checkInterval = setInterval(checkForRealCandles, 3000);
  setTimeout(() => {
    clearInterval(checkInterval);
    if (!mockGenerated) {
      const realCandleCount = Object.values(paperTrading.candles).filter(c => c && c.length >= 100).length;
      if (realCandleCount === 0) {
        console.log('[Mock] 生成模拟数据...');
        generateMockCandles();
      } else {
        console.log(`[Mock] 跳过 - 已获取 ${realCandleCount}/3 个时间框真实K线数据`);
      }
      mockGenerated = true;
    }
  }, 35000);
}

function generateMockCandles() {
  const now = Date.now();
  const timeframes = {
    '4H': 4 * 60 * 60 * 1000,
    '1H': 60 * 60 * 1000,
    '15m': 15 * 60 * 1000
  };

  const basePrice = systemState.btcPrice || 81000;
  const trendDirection = Math.random() > 0.5 ? 1 : -1;

  for (const [tf, interval] of Object.entries(timeframes)) {
    const existingData = paperTrading.candles?.[tf];
    if (existingData && existingData.length > 100) {
      console.log(`[Mock] 跳过 ${tf} - 已有 ${existingData.length} 根真实K线`);
      continue;
    }

    const candles = [];
    const startPrice = basePrice * 0.75;
    let price = startPrice;
    const trendStrength = 0.015;
    const candleCount = 250;

    for (let i = candleCount; i >= 0; i--) {
      const timestamp = now - (i * interval);
      const progress = (candleCount - i) / candleCount;
      const trendComponent = progress * basePrice * trendStrength * trendDirection;
      const noise = (Math.random() - 0.5) * price * 0.005;
      price = startPrice + trendComponent + noise;
      const open = price - (Math.random() - 0.5) * price * 0.002;
      const close = price;
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low = Math.min(open, close) * (1 - Math.random() * 0.005);
      const volume = 200 + Math.random() * 300;

      candles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume,
        volumeCcy: volume * close
      });
    }

    paperTrading.updateCandles(tf, candles);
    const trendText = trendDirection > 0 ? '上涨' : '下跌';
    console.log(`[Mock] 生成 ${tf} 模拟K线: ${candles.length} 根, 起始:${startPrice.toFixed(0)} 最新:${candles[candles.length-1].close.toFixed(0)} 趋势:${trendText}`);
  }

  setTimeout(async () => {
    console.log('[Debug] 开始生成信号...');
    const signal = await paperTrading.generateSignal();
    console.log('[Debug] 信号结果:', signal);
    if (signal) {
      console.log('[Strategy] 模拟信号生成成功:', signal.actionCN, signal.directionCN, '置信度:', signal.confidence + '%');
    } else {
      console.log('[Debug] 信号生成为null');
    }
  }, 1000);
}

function setupAggregatorListeners() {
  aggregator.on('sourceChanged', ({ source, reason }) => {
    console.log(`[System] 数据源切换: ${source} (${reason})`);
    systemState.activeSource = source;
    systemState.canTrade = (source === 'okx');
    systemState.tradingEnabled = systemState.canTrade && paperTrading.riskManager.positions.length === 0;

    broadcastToClients({
      type: 'sourceChanged',
      data: {
        source: source === 'okx' ? 'OKX' : 'Yahoo Finance',
        canTrade: systemState.canTrade,
        tradingEnabled: systemState.tradingEnabled,
        reason
      }
    });
  });

  aggregator.on('ticker', (data) => {
    systemState.btcPrice = data.price;
    systemState.lastTickTime = data.timestamp;

    paperTrading.updatePrice(data.price);

    broadcastToClients({
      type: 'ticker',
      data: {
        price: data.price,
        bid: data.bid,
        ask: data.ask,
        volume24h: data.volume24h,
        change24h: data.change24h,
        change24hPercent: data.change24hPercent,
        source: data.source,
        timestamp: data.timestamp
      }
    });
  });

  aggregator.on('candles', async (candleData) => {
    const timeframe = candleData.timeframe;
    const candles = candleData.data;
    if (!candles || candles.length === 0) {
      console.log('[Debug] 蜡烛数据为空:', timeframe);
      return;
    }
    console.log('[Debug] 收到蜡烛数据:', timeframe, '数量:', candles.length, '最新:', candles[candles.length-1]?.close);
    paperTrading.updateCandles(timeframe, candles);
    systemState.lastCandleUpdate = Date.now();
    broadcastToClients({ type: 'candles', data: candleData });

    const allTimeframes = ['4H', '1H', '15m'];
    const hasAllData = allTimeframes.every(tf => paperTrading.candles[tf]?.length >= 50);

    if (hasAllData) {
      console.log('[Debug] 所有时间框架数据已就绪，开始生成信号...');
      const now = Date.now();
      if (now - lastSignalGeneration >= SIGNAL_COOLDOWN) {
        lastSignalGeneration = now;
        console.log('[Debug] 开始生成信号...');
        const signal = await paperTrading.generateSignal();
        if (signal) {
          console.log('[Strategy] 信号生成成功:', signal.actionCN, signal.directionCN, '置信度:', signal.confidence + '%');

          const regime = signal.analysis?.regime;
          const now = Date.now();
          if (now - lastSignalNotification >= NOTIFICATION_INTERVAL) {
            lastSignalNotification = now;
            const msg = `[${new Date().toLocaleTimeString()}]
市场: ${regime?.type || '?'} (${regime?.trendStrength || 0}/100)
信号: ${signal.actionCN} ${signal.directionCN}
原因: ${signal.reason || signal.noTradeReasons?.slice(0,2).join(', ') || '无'}
价格: $${signal.price?.toFixed(2) || '?'}`;

            notifications.sendPushPlus('📊 信号评估', msg).catch(e => console.log('[通知] 发送失败:', e.message));
          }
        } else {
          console.log('[Debug] 信号生成为空');
        }
      }
    }
  });

  aggregator.on('systemState', (state) => {
    systemState.okxHealthy = state.okxHealthy;
    systemState.activeSource = state.activeSource;
    systemState.dataStatus = state.dataStatus;
    systemState.canTrade = state.okxHealthy && state.activeSource === 'okx';
    systemState.tradingEnabled = systemState.canTrade && paperTrading.riskManager.positions.length === 0;
    systemState.okxLatency = state.okxLatency;
    systemState.okxReconnectCount = state.okxReconnectCount;
  });
}

function setupPaperTradingListeners() {
  paperTrading.on('signalTriggered', (signal) => {
    console.log('[Signal]', signal.actionCN, signal.directionCN, '置信度:', signal.confidence + '%');
    systemState.signal = signal;
    systemState.lastSignalTime = Date.now();

    notifications.sendSignal(signal);

    broadcastToClients({
      type: 'signal',
      data: signal
    });
  });

  paperTrading.on('positionOpened', (position) => {
    console.log('[Trade] 开仓:', position.direction, '价格:', position.entryPrice, '仓位:', position.positionSize);
    systemState.tradingEnabled = false;

    notifications.sendTradeOpen(position);

    broadcastToClients({
      type: 'positionOpened',
      data: position
    });
  });

  paperTrading.on('positionClosed', (position) => {
    console.log('[Trade] 平仓:', position.direction, position.status, '盈亏:', position.pnl.toFixed(2));
    systemState.tradingEnabled = paperTrading.riskManager.canOpenPosition().allowed;

    notifications.sendTradeClose(position);

    broadcastToClients({
      type: 'positionClosed',
      data: position
    });
  });

  paperTrading.on('positionUpdate', (position) => {
    broadcastToClients({ type: 'positionUpdate', data: position });
  });

  paperTrading.on('equityUpdate', (equityData) => {
    broadcastToClients({ type: 'equityUpdate', data: equityData });
  });

  paperTrading.on('notification', (notification) => {
    broadcastToClients({
      type: 'notification',
      data: notification
    });
  });
}

function setupNotificationListeners() {
  notifications.on('notification', (notification) => {
    console.log('[通知]', notification.title);
  });

  notifications.on('pushplusSent', (data) => {
    systemState.lastPushplusTime = data.timestamp;
  });

  notifications.on('pushplusFailed', (data) => {
    console.error('[PushPlus] 发送失败:', data.error);
  });
}

function broadcastToClients(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

wss.on('connection', (ws, req) => {
  console.log('[Client] New connection from:', req.socket.remoteAddress);
  clients.add(ws);

  const health = aggregator.getHealthStatus();
  const data = aggregator.getData();
  const tradingStatus = paperTrading.getStatus();

  ws.send(JSON.stringify({
    type: 'init',
    data: {
      okxHealthy: health.okx.connected || false,
      activeSource: health.activeSource,
      dataStatus: health.dataStatus,
      canTrade: health.canTrade,
      tradingEnabled: systemState.tradingEnabled,
      btcPrice: data.price,
      source: data.source,
      signal: systemState.signal,
      tradingStats: paperTrading.riskManager.getStats(),
      openPositions: paperTrading.riskManager.getOpenPositions(),
      equityCurve: paperTrading.getEquityCurve(),
      message: getStatusMessage(health)
    }
  }));

  ws.on('close', () => {
    console.log('[Client] Disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('[Client] Error:', error.message);
    clients.delete(ws);
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      if (message.type === 'testNotification') {
        if (message.data.channel === 'desktop') {
          console.log('[Notification] Testing desktop notification...');
          notifications.sendDesktop('BTC Trading System Test', 'Desktop Notification Working\nBTC Real-Time System Connected Successfully');
          ws.send(JSON.stringify({ type: 'notificationResult', data: { success: true } }));
        } else if (message.data.channel === 'pushplus') {
          console.log('[Notification] Testing PushPlus notification...');
          notifications.sendPushPlus('BTC Trading System Online', 'OKX real-time connection success\nWebSocket connected\nBTC live price active\nNotification system working')
            .then(() => {
              systemState.lastPushplusTime = Date.now();
              ws.send(JSON.stringify({ type: 'notificationResult', data: { success: true } }));
            })
            .catch((err) => {
              ws.send(JSON.stringify({ type: 'notificationResult', data: { success: false, error: err.message } }));
            });
        }
      }
    } catch (error) {
      console.error('[Message] Parse error:', error.message);
    }
  });
});

function getStatusMessage(health) {
  if (health.canTrade) return 'OKX已连接 - 交易就绪';
  if (health.activeSource === 'yahoo') return 'Yahoo Finance备用 - 交易暂停';
  if (health.dataStatus === 'no_data') return '等待市场数据...';
  return '正在连接市场数据源...';
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/status', (req, res) => {
  const health = aggregator.getHealthStatus();
  const data = aggregator.getData();
  const tradingStatus = paperTrading.getStatus();

  res.json({
    okxHealthy: health.okx.connected || false,
    yahooHealthy: health.yahoo.connected || false,
    activeSource: health.activeSource,
    dataStatus: health.dataStatus,
    canTrade: health.canTrade,
    tradingEnabled: systemState.tradingEnabled,
    btcPrice: data.price,
    source: data.source,
    lastTickTime: systemState.lastTickTime,
    okxLatency: systemState.okxLatency,
    okxReconnectCount: systemState.okxReconnectCount,
    clientCount: clients.size,
    signal: systemState.signal,
    tradingStats: paperTrading.riskManager.getStats(),
    openPositions: paperTrading.riskManager.getOpenPositions(),
    history: paperTrading.getHistory(),
    equityCurve: paperTrading.getEquityCurve()
  });
});

app.get('/api/health', (req, res) => {
  res.json(aggregator.getHealthStatus());
});

app.get('/api/trading', (req, res) => {
  const timeRange = req.query.timeRange || 'ALL';
  res.json({
    status: paperTrading.getStatus(),
    stats: paperTrading.riskManager.getStats(),
    equityStats: paperTrading.getEquityStats(),
    openPositions: paperTrading.riskManager.getOpenPositions(),
    history: paperTrading.getHistory(),
    equityCurve: paperTrading.getEquityCurve(timeRange)
  });
});

app.get('/api/notifications', (req, res) => {
  res.json(notifications.getHistory());
});

app.post('/api/trading/reset', (req, res) => {
  paperTrading.reset();
  systemState.signal = null;
  systemState.tradingEnabled = true;
  res.json({ success: true, message: '交易系统已重置' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Server] 运行在端口 ${PORT}`);
  console.log(`[Server] WebSocket: ws://localhost:${PORT}/ws`);
  console.log('='.repeat(60));

  initSystem();
});

process.on('SIGINT', () => {
  console.log('\n[System] 关闭中...');
  paperTrading.saveState();
  paperTrading.stop();
  aggregator.stop();
  server.close(() => {
    console.log('[Server] 已关闭');
    process.exit(0);
  });
});
