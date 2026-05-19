const EventEmitter = require('events');
const https = require('https');

const LOCK_DURATION_MS = 10 * 60 * 1000;

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.pushPlusToken = 'aab835d141754e6e9c0d31a4768467b7';
    this.enabled = true;
    this.rateLimitMs = 3000;
    this.lastNotification = 0;
    this.notificationHistory = [];
    this.maxHistory = 100;
    this.notificationLock = {};
  }

  canSend(action, tradeId) {
    const lockKey = tradeId || action;
    const now = Date.now();

    if (this.notificationLock[lockKey]) {
      const elapsed = now - this.notificationLock[lockKey].timestamp;
      if (elapsed < LOCK_DURATION_MS) {
        console.log(`[通知] ${action} 已锁定，${Math.ceil((LOCK_DURATION_MS - elapsed) / 1000)}秒后可再次发送`);
        return false;
      }
    }

    if (now - this.lastNotification < this.rateLimitMs) {
      console.log(`[通知] 频率限制中，等待 ${this.rateLimitMs - (now - this.lastNotification)}ms`);
      return false;
    }

    return true;
  }

  lock(action, tradeId) {
    const lockKey = tradeId || action;
    this.notificationLock[lockKey] = {
      timestamp: Date.now(),
      action
    };

    Object.keys(this.notificationLock).forEach(key => {
      if (Date.now() - this.notificationLock[key].timestamp > LOCK_DURATION_MS * 2) {
        delete this.notificationLock[key];
      }
    });
  }

  async sendPushPlus(title, content, template = 'html') {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        token: this.pushPlusToken,
        title,
        content,
        template
      });

      const options = {
        hostname: 'www.pushplus.plus',
        port: 443,
        path: '/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            if (result.code === 200) {
              resolve(result);
            } else {
              reject(new Error(result.msg || 'PushPlus发送失败'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  async sendDesktop(title, body) {
    console.log(`[桌面通知] ${title}: ${body}`);
    this.emit('notification', { title, message: body, type: 'desktop', timestamp: Date.now() });
    return Promise.resolve();
  }

  async notify(notification) {
    if (!this.enabled) return;

    const now = Date.now();
    if (now - this.lastNotification < this.rateLimitMs) {
      return;
    }

    const formatted = this.formatNotification(notification);
    
    this.notificationHistory.unshift({
      ...formatted,
      timestamp: now
    });

    if (this.notificationHistory.length > this.maxHistory) {
      this.notificationHistory.pop();
    }

    this.lastNotification = now;

    if (notification.type === 'TRADE') {
      try {
        await this.sendPushPlus(formatted.title, formatted.message);
        console.log(`[通知] ${formatted.title}`);
        this.emit('pushplusSent', { title: formatted.title, timestamp: Date.now() });
      } catch (error) {
        console.error('[通知] PushPlus发送失败:', error.message);
        this.emit('pushplusFailed', { title: formatted.title, error: error.message });
      }
    }

    this.emit('notification', formatted);
  }

  formatNotification(notification) {
    switch (notification.type) {
      case 'TRADE':
        return this.formatTradeNotification(notification);
      case 'SIGNAL':
        return this.formatSignalNotification(notification);
      case 'SYSTEM':
        return this.formatSystemNotification(notification);
      case 'ALERT':
        return this.formatAlertNotification(notification);
      default:
        return {
          title: notification.title || '系统通知',
          message: notification.message || JSON.stringify(notification),
          timestamp: Date.now()
        };
    }
  }

  formatTradeNotification(notification) {
    const { action, position, title, message } = notification;
    
    let fullMessage = message;
    if (position) {
      const direction = position.direction === 'long' ? '做多' : '做空';
      fullMessage += `\n\n时间: ${new Date(position.openedAt || Date.now()).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;
    }

    return {
      type: 'TRADE',
      title: title || `交易通知`,
      message: fullMessage,
      timestamp: Date.now()
    };
  }

  formatSignalNotification(notification) {
    const { signal } = notification;

    const directionCN = signal.direction === 'long' ? '🔴 做多' : signal.direction === 'short' ? '🔵 做空' : '⚪ 观望';
    const actionCN = signal.action === 'SIGNAL' ? '信号确认' : signal.action === 'STRONG_SIGNAL' ? '强信号' : '等待';

    return {
      type: 'SIGNAL',
      title: `【${actionCN}】${directionCN}`,
      message: `评分：${signal.confidence}分\n${signal.reason || ''}\n\n时间：${signal.formattedTime || new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
      timestamp: Date.now()
    };
  }

  formatSystemNotification(notification) {
    return {
      type: 'SYSTEM',
      title: notification.title || '📊 系统通知',
      message: notification.message,
      timestamp: Date.now()
    };
  }

  formatAlertNotification(notification) {
    return {
      type: 'ALERT',
      title: notification.title || '⚠️ 警报',
      message: notification.message,
      timestamp: Date.now()
    };
  }

  async sendTradeOpen(position) {
    const action = 'OPEN_' + position.direction.toUpperCase();
    if (!this.canSend(action, position.id)) {
      return;
    }
    this.lock(action, position.id);

    const direction = position.direction === 'long' ? '🟢 BTC 开多' : '🔴 BTC 开空';
    const entryPrice = position.entryPrice?.toFixed(1) || '--';
    const tp = position.takeProfit?.toFixed(1) || '--';
    const sl = position.stopLoss?.toFixed(1) || '--';
    const leverage = position.leverage || 5;
    const positionValue = position.positionNotional || position.positionSize || 0;
    const score = position.confidence || position.signal?.confidence || 0;
    const trend = position.direction === 'long' ? '4H 多头趋势' : '4H 空头趋势';
    const entryReason = position.entryDetails?.join(' + ') || 'EMA 金叉 + 放量突破';

    const message = `
${direction}

入场价：${entryPrice}

杠杆：${leverage}x 全仓

仓位价值：${positionValue.toFixed(0)} USD

止盈：${tp}

止损：${sl}

策略评分：${score} / 100

趋势：${trend}

理由：${entryReason}
    `.trim();

    await this.sendPushPlus(`${direction}`, message, 'html');

    this.emit('notification', {
      type: 'TRADE',
      title: `${direction}`,
      message,
      position,
      timestamp: Date.now()
    });
  }

  async sendTradeClose(position) {
    const action = 'CLOSE_' + (position.id || position.direction.toUpperCase());
    if (!this.canSend(action, position.id)) {
      return;
    }
    this.lock(action, position.id);

    const pnl = position.pnl || 0;
    const pnlPercent = (position.pnlPercent * 100) || 0;
    const closeReason = position.status === 'take_profit' ? '止盈触发' :
                    position.status === 'stop_loss' ? '止损触发' : '手动平仓';

    const durationMs = (position.closedAt || Date.now()) - (position.openedAt || Date.now());
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const durationStr = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;

    const direction = position.direction === 'long' ? '多头' : '空头';
    const directionEmoji = position.direction === 'long' ? '🟢' : '🔴';

    const message = `
${directionEmoji} BTC 平仓完成

收益：${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USD

收益率：${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%

方向：${direction}

平仓原因：${closeReason}

持仓时间：${durationStr}
    `.trim();

    await this.sendPushPlus(`BTC 平仓完成 ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USD`, message, 'html');

    this.emit('notification', {
      type: 'TRADE',
      title: `BTC 平仓完成 ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USD`,
      message,
      position,
      timestamp: Date.now()
    });
  }

  async sendSignal(signal) {
    await this.notify({
      type: 'SIGNAL',
      signal
    });
  }

  async sendSystem(message, title = '系统通知') {
    await this.notify({
      type: 'SYSTEM',
      title,
      message
    });
  }

  async sendAlert(message, title = '⚠️ 警报') {
    await this.notify({
      type: 'ALERT',
      title,
      message
    });
  }

  getHistory() {
    return this.notificationHistory;
  }

  clearHistory() {
    this.notificationHistory = [];
  }
}

module.exports = NotificationService;
