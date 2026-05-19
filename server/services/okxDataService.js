const WebSocket = require('ws');
const axios = require('axios');

class OKXDataService {
  constructor() {
    this.ws = null;
    this.baseURL = 'https://www.okx.com';
    this.wsURL = 'wss://ws.okex.com:8443/ws/v5/public';
    this.marketData = {
      '4H': [],
      '1H': [],
      '15m': []
    };
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.subscriptions = new Set();
    this.useRestApi = true; // 默认使用REST API模式
    this.lastUpdateTime = Date.now();
  }

  async connect() {
    if (this.useRestApi) {
      console.log('📡 使用REST API模式');
      this.startRestApiMode();
      return;
    }

    try {
      await this.connectWebSocket();
    } catch (error) {
      console.log('⚠️ WebSocket连接失败，切换到REST API模式');
      this.useRestApi = true;
      this.startRestApiMode();
    }
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsURL, {
          handshakeTimeout: 10000,
          rejectUnauthorized: false
        });
        
        const timeout = setTimeout(() => {
          this.ws.terminate();
          reject(new Error('WebSocket连接超时'));
        }, 15000);

        this.ws.on('open', () => {
          clearTimeout(timeout);
          console.log('✅ OKX WebSocket 连接成功');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.subscribeToChannels();
          
          // 获取历史数据
          this.fetchAllHistoricalData();
          
          resolve();
        });

        this.ws.on('message', (data) => {
          this.lastUpdateTime = Date.now();
          this.handleMessage(data);
        });

        this.ws.on('error', (error) => {
          clearTimeout(timeout);
          console.error('WebSocket 错误:', error.message);
        });

        this.ws.on('close', () => {
          console.log('WebSocket 连接关闭');
          this.isConnected = false;
          if (!this.useRestApi) {
            this.attemptReconnect();
          }
        });

        this.ws.on('ping', () => {
          this.ws.pong();
        });

      } catch (error) {
        clearTimeout(timeout);
        console.error('连接失败:', error);
        reject(error);
      }
    });
  }

  startRestApiMode() {
    console.log('📡 启动REST API轮询模式');
    this.isConnected = true;
    
    // 立即获取一次数据
    this.fetchAllHistoricalData();
    
    // 每5秒轮询一次
    setInterval(() => {
      this.fetchAllHistoricalData();
    }, 5000);
  }

  async fetchAllHistoricalData() {
    try {
      await Promise.all([
        this.fetchHistoricalData('4H', 200),
        this.fetchHistoricalData('1H', 200),
        this.fetchHistoricalData('15m', 200)
      ]);
      this.lastUpdateTime = Date.now();
    } catch (error) {
      console.error('获取历史数据失败:', error.message);
    }
  }

  subscribeToChannels() {
    const channels = [
      { channel: 'tickers', instId: 'BTC-USDT-SWAP' },
      { channel: 'candle', instId: 'BTC-USDT-SWAP', bar: '4H' },
      { channel: 'candle', instId: 'BTC-USDT-SWAP', bar: '1H' },
      { channel: 'candle', instId: 'BTC-USDT-SWAP', bar: '15m' }
    ];

    const subscribeMsg = {
      op: 'subscribe',
      args: channels
    };

    this.ws.send(JSON.stringify(subscribeMsg));
    console.log('📡 已订阅行情频道');
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      if (message.event === 'subscribe') {
        console.log(`✅ 订阅成功: ${message.arg.channel}`);
        return;
      }

      if (message.data && message.arg) {
        const { channel, instId } = message.arg;
        
        if (channel.startsWith('candle')) {
          this.processCandleData(channel, message.data);
        } else if (channel === 'tickers') {
          this.processTickerData(message.data);
        }
      }
    } catch (error) {
      console.error('处理消息错误:', error);
    }
  }

  processCandleData(channel, data) {
    const timeframe = channel.replace('candle', '');
    const candles = data.map(c => ({
      timestamp: parseInt(c[0]),
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5]),
      volumeCcy: parseFloat(c[6])
    }));

    if (this.marketData[timeframe]) {
      this.marketData[timeframe] = this.mergeCandles(this.marketData[timeframe], candles);
      
      if (this.marketData[timeframe].length > 500) {
        this.marketData[timeframe] = this.marketData[timeframe].slice(-500);
      }
    }
  }

  processTickerData(data) {
    if (data && data[0]) {
      this.lastPrice = parseFloat(data[0].last);
      this.lastTicker = data[0];
    }
  }

  mergeCandles(existing, newCandles) {
    const merged = [...existing];
    
    for (const candle of newCandles) {
      const index = merged.findIndex(c => c.timestamp === candle.timestamp);
      if (index >= 0) {
        merged[index] = candle;
      } else {
        merged.push(candle);
      }
    }
    
    return merged.sort((a, b) => a.timestamp - b.timestamp);
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('⚠️ 切换到REST API模式');
      this.useRestApi = true;
      this.startRestApiMode();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`🔄 ${delay/1000}秒后尝试重连... (尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(err => {
        console.error('重连失败:', err.message);
      });
    }, delay);
  }

  async fetchHistoricalData(timeframe, limit = 200) {
    try {
      const bar = this.convertTimeframe(timeframe);
      const response = await axios.get(`${this.baseURL}/api/v5/market/candles`, {
        params: {
          instId: 'BTC-USDT-SWAP',
          bar,
          limit
        },
        timeout: 10000
      });

      if (response.data && response.data.data) {
        const candles = response.data.data.map(c => ({
          timestamp: parseInt(c[0]),
          open: parseFloat(c[1]),
          high: parseFloat(c[2]),
          low: parseFloat(c[3]),
          close: parseFloat(c[4]),
          volume: parseFloat(c[5]),
          volumeCcy: parseFloat(c[6])
        })).reverse();

        this.marketData[timeframe] = candles;
        
        // 更新最新价格
        if (candles.length > 0) {
          this.lastPrice = candles[candles.length - 1].close;
        }
        
        return candles;
      }
    } catch (error) {
      console.error(`获取历史数据失败 (${timeframe}):`, error.message);
    }
    return [];
  }

  convertTimeframe(tf) {
    const mapping = {
      '4H': '4H',
      '1H': '1H',
      '15m': '15m'
    };
    return mapping[tf] || tf;
  }

  getMarketData() {
    return this.marketData;
  }

  getCurrentPrice() {
    return this.lastPrice;
  }

  isDataFresh() {
    return Date.now() - this.lastUpdateTime < 60000; // 1分钟内更新过
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

module.exports = OKXDataService;
