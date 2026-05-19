const axios = require('axios');
const EventEmitter = require('events');

class YahooDataSource extends EventEmitter {
  constructor() {
    super();
    
    this.isRunning = false;
    this.lastPrice = null;
    this.lastUpdateTime = 0;
    this.sourceName = 'Yahoo Finance';
    
    // Yahoo Finance API配置
    this.config = {
      symbol: 'BTC-USD',
      interval: 2000,  // 2秒轮询
      timeout: 10000
    };
    
    this.pollTimer = null;
  }

  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[Yahoo] Starting BTC-USD data source...');
    this.emit('started');
    
    // 立即获取一次数据
    await this.fetchData();
    
    // 开始轮询
    this.startPolling();
  }

  stop() {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    console.log('[Yahoo] Stopped');
    this.emit('stopped');
  }

  startPolling() {
    if (!this.isRunning) return;
    
    this.pollTimer = setTimeout(async () => {
      await this.fetchData();
      this.startPolling();
    }, this.config.interval);
  }

  async fetchData() {
    try {
      // Yahoo Finance API endpoint
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${this.config.symbol}`;
      
      const response = await axios.get(url, {
        timeout: this.config.timeout,
        params: {
          interval: '1m',
          range: '1d'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      const data = response.data;
      
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        throw new Error('Invalid response format');
      }

      const result = data.chart.result[0];
      const meta = result.meta;
      const timestamps = result.timestamp;
      const prices = result.indicators.quote[0];
      
      // 获取最新价格
      const lastIndex = timestamps.length - 1;
      const currentPrice = meta.regularMarketPrice || prices.close[lastIndex];
      const previousClose = meta.previousClose || meta.chartPreviousClose;
      
      if (!currentPrice) {
        throw new Error('No price data available');
      }

      this.lastPrice = currentPrice;
      this.lastUpdateTime = Date.now();

      // 计算24h变化（使用previousClose作为参考）
      const priceChange = previousClose ? currentPrice - previousClose : 0;
      const priceChangePercent = previousClose ? (priceChange / previousClose) * 100 : 0;

      // 构建统一格式的数据
      const tickerData = {
        price: currentPrice,
        bid: currentPrice * 0.9995,  // 模拟买卖价差
        ask: currentPrice * 1.0005,
        volume24h: meta.regularMarketVolume || 0,
        change24h: priceChange,
        change24hPercent: priceChangePercent,
        timestamp: this.lastUpdateTime,
        source: this.sourceName,
        latency: 0  // HTTP请求没有持续latency
      };

      this.emit('ticker', tickerData);

    } catch (error) {
      console.error('[Yahoo] Fetch error:', error.message);
      this.emit('error', error);
    }
  }

  getHealthStatus() {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;
    
    return {
      running: this.isRunning,
      connected: this.isRunning && this.lastPrice !== null,
      lastUpdateTime: this.lastUpdateTime,
      timeSinceLastUpdate,
      stale: timeSinceLastUpdate > 10000,  // 10秒无更新视为stale
      price: this.lastPrice,
      source: this.sourceName
    };
  }

  getData() {
    return {
      price: this.lastPrice,
      timestamp: this.lastUpdateTime,
      source: this.sourceName
    };
  }
}

module.exports = YahooDataSource;
