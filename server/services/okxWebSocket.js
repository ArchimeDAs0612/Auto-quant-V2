const WebSocket = require('ws');
const EventEmitter = require('events');
const zlib = require('zlib');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');

class OKXWebSocket extends EventEmitter {
  constructor() {
    super();
    
    this.wsUrl = 'wss://ws.okx.com:8443/ws/v5/public';
    this.ws = null;
    
    this.proxyConfig = this.detectProxy();
    
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionState = 'disconnected';
    
    this.lastPingTime = 0;
    this.lastPongTime = 0;
    this.lastMessageTime = 0;
    this.reconnectCount = 0;
    this.latency = 0;
    
    this.subscriptions = new Set();
    
    this.data = {
      ticker: null,
      candles: {
        '4H': [],
        '1H': [],
        '15m': []
      }
    };
    
    this.config = {
      pingInterval: 25000,
      pongTimeout: 10000,
      reconnectInterval: 3000,
      maxReconnectAttempts: 999
    };
    
    this.pingTimer = null;
    this.pongTimer = null;
    this.reconnectTimer = null;
  }

  detectProxy() {
    const proxy = {
      enabled: false,
      type: 'none',
      host: null,
      port: null,
      url: null
    };

    const envProxy = process.env.ALL_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (envProxy) {
      try {
        const url = new URL(envProxy);
        proxy.enabled = true;
        proxy.type = url.protocol === 'socks5:' ? 'socks5' : 'http';
        proxy.host = url.hostname;
        proxy.port = parseInt(url.port);
        proxy.url = envProxy;
        return proxy;
      } catch (e) {}
    }

    const { execSync } = require('child_process');
    try {
      const output = execSync('networksetup -getwebproxy "Wi-Fi" 2>/dev/null || networksetup -getwebproxy "Ethernet" 2>/dev/null').toString();
      const lines = output.split('\n');
      let enabled = false;
      let server = null;
      let port = null;
      
      for (const line of lines) {
        if (line.includes('Enabled: Yes')) enabled = true;
        if (line.includes('Server:')) server = line.split(':')[1].trim();
        if (line.includes('Port:')) port = parseInt(line.split(':')[1].trim());
      }
      
      if (enabled && server && port) {
        proxy.enabled = true;
        proxy.type = 'http';
        proxy.host = server;
        proxy.port = port;
        proxy.url = `http://${server}:${port}`;
        return proxy;
      }
    } catch (e) {}

    proxy.enabled = true;
    proxy.type = 'http';
    proxy.host = '127.0.0.1';
    proxy.port = 7897;
    proxy.url = `http://127.0.0.1:7897`;
    
    return proxy;
  }

  printProxyInfo() {
    console.log('='.repeat(50));
    console.log('[OKX] 代理配置信息:');
    console.log(`[OKX]   Proxy Enabled: ${this.proxyConfig.enabled ? '是' : '否'}`);
    console.log(`[OKX]   Proxy Type: ${this.proxyConfig.type}`);
    console.log(`[OKX]   Proxy Host: ${this.proxyConfig.host}`);
    console.log(`[OKX]   Proxy Port: ${this.proxyConfig.port}`);
    console.log(`[OKX]   Proxy URL: ${this.proxyConfig.url}`);
    console.log('='.repeat(50));
  }

  async connect() {
    if (this.isConnecting) {
      console.log('[OKX] 已经在连接中...');
      return;
    }

    if (this.isConnected) {
      console.log('[OKX] 已经连接');
      return;
    }

    this.isConnecting = true;
    this.connectionState = 'connecting';
    this.emit('stateChange', this.connectionState);

    this.printProxyInfo();
    console.log('[OKX] 正在连接 OKX WebSocket...');
    console.log(`[OKX]   Target: ${this.wsUrl}`);
    console.log('[OKX]   等待服务器响应...');

    return new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        this.isConnecting = false;
        this.connectionState = 'error';
        this.emit('stateChange', this.connectionState);
        const error = new Error('连接超时 (30秒)');
        console.error('[OKX] ❌ 连接超时');
        this.emit('error', error);
        reject(error);
      }, 30000);

      try {
        const wsOptions = {
          handshakeTimeout: 30000,
          rejectUnauthorized: false
        };

        if (this.proxyConfig.enabled) {
          console.log(`[OKX] 使用代理: ${this.proxyConfig.type}://${this.proxyConfig.host}:${this.proxyConfig.port}`);
          
          if (this.proxyConfig.type === 'http') {
            wsOptions.agent = new HttpsProxyAgent({
              host: this.proxyConfig.host,
              port: this.proxyConfig.port,
              protocol: 'http:'
            });
          } else {
            wsOptions.agent = new SocksProxyAgent(this.proxyConfig.url);
          }
        }

        console.log('[OKX] 正在初始化 WebSocket 连接...');
        this.ws = new WebSocket(this.wsUrl, wsOptions);

        this.ws.on('open', () => {
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.isConnecting = false;
          this.connectionState = 'connected';
          this.lastPingTime = Date.now();
          this.lastPongTime = Date.now();
          this.lastMessageTime = Date.now();
          this.reconnectCount = 0;
          
          console.log('='.repeat(50));
          console.log('[OKX] ✅ WebSocket 连接成功!');
          console.log(`[OKX]   服务器: ${this.wsUrl}`);
          console.log(`[OKX]   本地时间: ${new Date().toISOString()}`);
          console.log('='.repeat(50));
          
          this.emit('connected');
          this.emit('stateChange', this.connectionState);
          
          this.startHeartbeat();
          this.resubscribe();
          
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });

        this.ws.on('ping', (data) => {
          console.log('[OKX]   ↗️ 收到服务器 Ping');
          this.ws.pong(data);
          this.lastPingTime = Date.now();
        });

        this.ws.on('pong', () => {
          const now = Date.now();
          this.lastPongTime = now;
          this.latency = now - this.lastPingTime;
          console.log(`[OKX]   ↙️ 收到服务器 Pong, 延迟: ${this.latency}ms`);
        });

        this.ws.on('error', (error) => {
          clearTimeout(connectionTimeout);
          this.isConnecting = false;
          this.connectionState = 'error';
          console.error('[OKX] ❌ WebSocket 错误:', error.message);
          this.emit('error', error);
          this.emit('stateChange', this.connectionState);
          reject(error);
        });

        this.ws.on('close', (code, reason) => {
          console.log(`[OKX] WebSocket 关闭: code=${code}, reason=${reason.toString() || '无'}`);
          this.isConnected = false;
          this.isConnecting = false;
          this.connectionState = 'disconnected';
          this.emit('disconnected', { code, reason: reason.toString() });
          this.emit('stateChange', this.connectionState);
          
          this.stopHeartbeat();
          this.scheduleReconnect();
        });

      } catch (error) {
        clearTimeout(connectionTimeout);
        this.isConnecting = false;
        this.connectionState = 'error';
        console.error('[OKX] ❌ 创建 WebSocket 失败:', error.message);
        this.emit('error', error);
        this.emit('stateChange', this.connectionState);
        reject(error);
      }
    });
  }

  handleMessage(data) {
    this.lastMessageTime = Date.now();

    let messageData = data;
    if (data[0] === 0x1f && data[1] === 0x8b) {
      try {
        messageData = zlib.gunzipSync(data);
      } catch (e) {
        console.error('[OKX] 解压gzip失败:', e.message);
        return;
      }
    }

    let message;
    try {
      message = JSON.parse(messageData.toString());
    } catch (e) {
      return;
    }

    if (message.event === 'subscribe') {
      console.log(`[OKX]   ✓ 订阅确认: ${message.arg.channel} ${message.arg.instId}`);
      return;
    }

    if (message.event === 'error') {
      console.error('[OKX] 服务器错误:', message.msg);
      this.emit('serverError', message);
      return;
    }

    if (message.data && message.arg) {
      const { channel, instId, bar } = message.arg;

      if (channel === 'tickers') {
        const ticker = message.data[0];
        this.data.ticker = ticker;
        console.log(`[OKX] 📊 Ticker更新: $${parseFloat(ticker.last).toLocaleString()} @ ${new Date().toISOString()}`);
        this.emit('ticker', ticker);
      } else if (channel === 'candle' && bar) {
        const timeframe = bar;
        this.processCandleData(timeframe, message.data);
      } else if (channel.startsWith('candle')) {
        const timeframe = channel.replace('candle', '');
        this.processCandleData(timeframe, message.data);
      }
    }
  }

  processCandleData(timeframe, data) {
    const candles = data.map(c => ({
      timestamp: parseInt(c[0]),
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5]),
      volumeCcy: parseFloat(c[6])
    }));

    if (this.data.candles[timeframe]) {
      const existing = this.data.candles[timeframe];
      const merged = [...existing];
      
      for (const candle of candles) {
        const idx = merged.findIndex(c => c.timestamp === candle.timestamp);
        if (idx >= 0) {
          merged[idx] = candle;
        } else {
          merged.push(candle);
        }
      }
      
      merged.sort((a, b) => a.timestamp - b.timestamp);
      this.data.candles[timeframe] = merged.slice(-500);
      
      this.emit('candles', { timeframe, data: this.data.candles[timeframe] });
    }
  }

  subscribe(args) {
    if (!this.isConnected) {
      console.log('[OKX] 无法订阅: 未连接');
      return false;
    }

    const subscribeMsg = {
      op: 'subscribe',
      args: Array.isArray(args) ? args : [args]
    };

    subscribeMsg.args.forEach(arg => {
      this.subscriptions.add(JSON.stringify(arg));
      console.log(`[OKX] 正在订阅: ${arg.channel} ${arg.instId}`);
    });

    this.ws.send(JSON.stringify(subscribeMsg));
    return true;
  }

  unsubscribe(args) {
    if (!this.isConnected) return false;

    const unsubscribeMsg = {
      op: 'unsubscribe',
      args: Array.isArray(args) ? args : [args]
    };

    unsubscribeMsg.args.forEach(arg => {
      this.subscriptions.delete(JSON.stringify(arg));
    });

    this.ws.send(JSON.stringify(unsubscribeMsg));
    return true;
  }

  resubscribe() {
    if (this.subscriptions.size === 0) return;
    const args = Array.from(this.subscriptions).map(s => JSON.parse(s));
    this.subscribe(args);
  }

  startHeartbeat() {
    this.pingTimer = setInterval(() => {
      if (!this.isConnected) return;
      
      try {
        this.ws.ping();
        this.lastPingTime = Date.now();
        
        this.pongTimer = setTimeout(() => {
          const timeSinceLastPong = Date.now() - this.lastPongTime;
          if (timeSinceLastPong > this.config.pongTimeout + this.config.pingInterval) {
            console.log('[OKX] Pong超时, 重新连接...');
            this.ws.terminate();
          }
        }, this.config.pongTimeout);
        
      } catch (error) {
        console.error('[OKX] 发送Ping失败:', error.message);
      }
    }, this.config.pingInterval);
  }

  stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectCount >= this.config.maxReconnectAttempts) {
      console.error('[OKX] 已达到最大重连次数，停止重连');
      this.emit('maxReconnectReached');
      return;
    }

    this.reconnectCount++;
    console.log(`[OKX] ${this.config.reconnectInterval/1000}秒后重连... (第${this.reconnectCount}次)`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('[OKX] 重连失败:', error.message);
      });
    }, this.config.reconnectInterval);
  }

  getHealthStatus() {
    const now = Date.now();
    const timeSinceLastMessage = now - this.lastMessageTime;
    const timeSinceLastPong = now - this.lastPongTime;
    
    let status = 'unknown';
    if (!this.isConnected) {
      status = 'disconnected';
    } else if (timeSinceLastMessage > 5000) {
      status = 'stale';
    } else if (timeSinceLastPong > 35000) {
      status = 'no_pong';
    } else {
      status = 'healthy';
    }

    return {
      connected: this.isConnected,
      state: this.connectionState,
      status,
      latency: this.latency,
      lastMessageTime: this.lastMessageTime,
      lastPongTime: this.lastPongTime,
      timeSinceLastMessage,
      timeSinceLastPong,
      reconnectCount: this.reconnectCount
    };
  }

  getData() {
    return {
      ticker: this.data.ticker,
      candles: this.data.candles
    };
  }

  disconnect() {
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.connectionState = 'disconnected';
    this.subscriptions.clear();
  }
}

module.exports = OKXWebSocket;
