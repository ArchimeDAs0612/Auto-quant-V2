const EventEmitter = require('events');
const OKXWebSocket = require('./okxWebSocket');
const YahooDataSource = require('./yahooDataSource');
const https = require('https');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

class MarketDataAggregator extends EventEmitter {
  constructor() {
    super();
    
    // 主数据源：OKX
    this.okx = new OKXWebSocket();
    
    // 备用数据源：Yahoo Finance
    this.yahoo = new YahooDataSource();
    
    // 当前活跃的数据源
    this.activeSource = null;
    this.previousSource = null;
    
    // OKX健康状态
    this.okxHealthy = false;
    this.okxCheckTimer = null;
    
    // Yahoo健康状态
    this.yahooHealthy = false;
    this.yahooCheckTimer = null;
    
    // 数据状态
    this.data = {
      price: null,
      bid: null,
      ask: null,
      volume24h: null,
      change24h: null,
      change24hPercent: null,
      timestamp: 0,
      source: null,
      isFallback: false,
      latency: 0
    };
    
    // 配置
    this.config = {
      staleThreshold: 5000,
      okxCheckInterval: 3000,
      yahooCheckInterval: 5000,
      switchCooldown: 10000
    };
    
    this.checkTimer = null;
    this.lastSwitchTime = 0;
  }

  async start() {
    console.log('='.repeat(60));
    console.log('[Aggregator] 启动市场数据聚合器');
    console.log('[Aggregator] 主数据源: OKX WebSocket');
    console.log('[Aggregator] 备用数据源: Yahoo Finance BTC-USD');
    console.log('[Aggregator] 注意: 无mock数据，全部真实数据源');
    console.log('='.repeat(60));
    
    this.setupOKXListeners();
    this.setupYahooListeners();
    
    this.connectOKX();
    
    this.startHealthCheck();
    
    this.emit('started');
  }

  setupOKXListeners() {
    this.okx.on('connected', () => {
      console.log('[Aggregator] ✅ OKX WebSocket 连接成功!');
      this.okxHealthy = true;
      this.activeSource = 'okx';
      
      console.log('[Aggregator] 开始订阅 OKX 行情...');
      this.okx.subscribe([
        { channel: 'tickers', instId: 'BTC-USDT-SWAP' }
      ]);
      
      setTimeout(() => {
        this.startCandleRestPolling();
      }, 5000);
      
      this.emit('sourceChanged', { source: 'OKX', reason: 'connected' });
    });

    this.okx.on('ticker', (ticker) => {
      this.okxHealthy = true;
      this.data = {
        price: parseFloat(ticker.last),
        bid: parseFloat(ticker.bidPx),
        ask: parseFloat(ticker.askPx),
        volume24h: parseFloat(ticker.vol24h),
        change24h: parseFloat(ticker.change24h || 0),
        change24hPercent: parseFloat(ticker.change24hPercentage || 0),
        timestamp: Date.now(),
        source: 'OKX',
        isFallback: false,
        latency: this.okx.latency || 0
      };
      
      this.emit('ticker', this.data);
    });

    this.okx.on('candles', (candleData) => {
      this.emit('candles', candleData);
    });

    this.okx.on('disconnected', (info) => {
      console.log(`[Aggregator] ❌ OKX WebSocket 断开: code=${info.code}`);
      this.okxHealthy = false;
      
      if (this.activeSource === 'okx') {
        this.switchToYahoo();
      }
    });

    this.okx.on('error', (error) => {
      console.error('[Aggregator] ❌ OKX 错误:', error.message);
      this.okxHealthy = false;
    });

    this.okx.on('stateChange', (state) => {
      this.emit('okxStateChange', state);
    });
  }

  setupYahooListeners() {
    this.yahoo.on('ticker', (tickerData) => {
      this.yahooHealthy = true;
      
      this.data = {
        price: tickerData.price,
        bid: null,
        ask: null,
        volume24h: tickerData.volume24h,
        change24h: tickerData.change24h,
        change24hPercent: tickerData.change24hPercent,
        timestamp: Date.now(),
        source: 'Yahoo Finance',
        isFallback: true,
        latency: 0
      };
      
      this.emit('ticker', this.data);
    });

    this.yahoo.on('error', (error) => {
      console.error('[Aggregator] ❌ Yahoo 错误:', error.message);
      this.yahooHealthy = false;
    });
  }

  async connectOKX() {
    try {
      await this.okx.connect();
      await this.loadInitialCandles();
    } catch (error) {
      console.error('[Aggregator] ❌ OKX 连接失败:', error.message);
      console.log('[Aggregator] 将自动切换到 Yahoo Finance 备用数据源...');
      this.switchToYahoo();
    }
  }

  async switchToYahoo() {
    const now = Date.now();
    if (now - this.lastSwitchTime < this.config.switchCooldown) {
      console.log('[Aggregator] 切换冷却中，跳过...');
      return;
    }

    if (this.activeSource === 'okxRest') {
      console.log('[Aggregator] 已经是 OKX REST API 数据源');
      return;
    }

    console.log('='.repeat(50));
    console.log('[Aggregator] 🔄 切换到 OKX REST API 备用数据源');
    console.log('[Aggregator] 使用 REST API 轮询获取实时价格');
    console.log('='.repeat(50));

    this.previousSource = this.activeSource;
    this.activeSource = 'okxRest';
    this.lastSwitchTime = now;
    this.okxHealthy = true;

    try {
      await this.startOKXRestPolling();
      this.emit('sourceChanged', { 
        source: 'OKX REST', 
        reason: 'okx_failed',
        isFallback: true 
      });
    } catch (error) {
      console.error('[Aggregator] ❌ OKX REST 启动失败:', error.message);
    }
  }

  async startOKXRestPolling() {
    const fetchTicker = async () => {
      try {
        const data = await this.fetchTickerREST();
        if (data) {
          this.data = { ...data, source: 'OKX REST', isFallback: true };
          this.emit('ticker', this.data);
        }
      } catch (e) {
        console.error('[Aggregator] REST Ticker错误:', e.message);
      }
    };

    await fetchTicker();
    setInterval(fetchTicker, 5000);
  }

  async fetchTickerREST() {
    try {
      const agent = new HttpsProxyAgent('http://127.0.0.1:7897');
      const response = await axios.get('https://www.okx.com/api/v5/market/ticker', {
        params: { instId: 'BTC-USDT-SWAP' },
        httpsAgent: agent,
        proxy: false,
        timeout: 10000
      });
      if (response.data && response.data.data && response.data.data.length > 0) {
        const t = response.data.data[0];
        return {
          price: parseFloat(t.last),
          bid: parseFloat(t.bidPx),
          ask: parseFloat(t.askPx),
          volume24h: parseFloat(t.vol24h),
          change24h: parseFloat(t.change24h || 0),
          change24hPercent: parseFloat(t.change24hPercentage || 0),
          timestamp: Date.now()
        };
      }
    } catch (e) {
      console.error('[Aggregator] REST Ticker错误:', e.message);
    }
    return null;
  }

  startCandleRestPolling() {
    const timeframes = [
      { name: '4H', bar: '4H', limit: 100 },
      { name: '1H', bar: '1H', limit: 100 },
      { name: '15m', bar: '15m', limit: 100 }
    ];

    const fetchCandles = async () => {
      for (const tf of timeframes) {
        try {
          const candles = await this.fetchCandlesREST(tf.name, tf.limit);
          if (candles.length > 0) {
            this.emit('candles', { timeframe: tf.name, data: candles });
          }
        } catch (e) {
          console.error(`[Aggregator] REST ${tf.name} K线错误:`, e.message);
        }
      }
    };

    fetchCandles();
    setInterval(fetchCandles, 60000);
  }

  async switchBackToOKX() {
    if (this.activeSource !== 'yahoo') return;
    if (!this.okxHealthy) return;
    
    console.log('='.repeat(50));
    console.log('[Aggregator] ✅ OKX 已恢复，切回主数据源');
    console.log('[Aggregator] 策略和交易已启用');
    console.log('='.repeat(50));
    
    this.yahoo.stop();
    this.activeSource = 'okx';
    this.lastSwitchTime = Date.now();
    
    this.emit('sourceChanged', { 
      source: 'OKX', 
      reason: 'okx_restored',
      isFallback: false 
    });
  }

  startHealthCheck() {
    this.checkTimer = setInterval(() => {
      this.checkHealth();
    }, 1000);
  }

  checkHealth() {
    const okxHealth = this.okx.getHealthStatus ? this.okx.getHealthStatus() : {};
    
    this.okxHealthy = okxHealth.connected && okxHealth.status === 'healthy';
    
    if (this.activeSource === 'yahoo' && this.okxHealthy) {
      this.switchBackToOKX();
    }
    
    const canTrade = this.activeSource === 'okx' && this.okxHealthy;
    
    const systemState = {
      okxHealthy: this.okxHealthy,
      yahooHealthy: this.yahooHealthy,
      activeSource: this.activeSource,
      dataStatus: this.getDataStatus(),
      canTrade,
      isFallback: this.activeSource === 'yahoo',
      lastUpdateTime: this.data.timestamp,
      timeSinceLastData: Date.now() - this.data.timestamp,
      okxLatency: okxHealth.latency || 0,
      okxReconnectCount: okxHealth.reconnectCount || 0,
      okxStatus: okxHealth.status || 'unknown'
    };
    
    this.emit('systemState', systemState);
  }

  getDataStatus() {
    if (!this.data.price) return 'no_data';
    const timeSinceLastData = Date.now() - this.data.timestamp;
    if (timeSinceLastData > this.config.staleThreshold) return 'stale';
    return 'fresh';
  }

  async fetchCandlesREST(timeframe, limit = 100) {
    const barMap = { '4H': '4H', '1H': '1H', '15m': '15m' };
    const bar = barMap[timeframe] || '1H';

    const fetchWithAxios = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const agent = new HttpsProxyAgent('http://127.0.0.1:7897');
          const response = await axios.get('https://www.okx.com/api/v5/market/candles', {
            params: { instId: 'BTC-USDT-SWAP', bar, limit },
            httpsAgent: agent,
            proxy: false,
            timeout: 15000
          });
          if (response.data && response.data.data && response.data.data.length > 0) {
            const candles = response.data.data.map(c => ({
              timestamp: parseInt(c[0]),
              open: parseFloat(c[1]),
              high: parseFloat(c[2]),
              low: parseFloat(c[3]),
              close: parseFloat(c[4]),
              volume: parseFloat(c[5]),
              volumeCcy: parseFloat(c[6])
            }));
            console.log(`[Aggregator] REST获取 ${timeframe} K线: ${candles.length} 根`);
            return candles;
          }
        } catch (e) {
          if (i < retries - 1) {
            console.log(`[Aggregator] REST ${timeframe} 失败，重试... (${i + 1}/${retries})`);
            await new Promise(r => setTimeout(r, 2000));
          } else {
            console.error(`[Aggregator] REST ${timeframe} K线错误: ${e.message}`);
          }
        }
      }
      return [];
    };

    return fetchWithAxios();
  }

  async loadInitialCandles() {
    console.log('[Aggregator] 通过REST API获取初始K线数据...');

    const timeframes = ['4H', '1H', '15m'];
    const candleData = {};

    for (const tf of timeframes) {
      const candles = await this.fetchCandlesREST(tf, 100);
      if (candles.length > 0) {
        candleData[tf] = candles;
        this.emit('candles', { timeframe: tf, data: candles });
      }
    }

    return candleData;
  }

  getHealthStatus() {
    const okxHealth = this.okx.getHealthStatus ? this.okx.getHealthStatus() : {};
    
    return {
      okx: okxHealth,
      yahoo: { healthy: this.yahooHealthy },
      activeSource: this.activeSource,
      dataStatus: this.getDataStatus(),
      canTrade: this.activeSource === 'okx' && this.okxHealthy
    };
  }

  getData() {
    return {
      ...this.data,
      candles: this.okx.getData ? this.okx.getData().candles : {}
    };
  }

  stop() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    
    this.okx.disconnect();
    this.yahoo.stop();
    
    console.log('[Aggregator] 已停止');
    this.emit('stopped');
  }
}

module.exports = MarketDataAggregator;
