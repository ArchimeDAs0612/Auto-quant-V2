# BTC趋势跟随量化交易系统

一个专业的低频、高确定性BTC趋势跟随量化交易平台。

## 核心特点

- **低频交易** - 少开单，少止损，少手续费损耗
- **高确定性** - 严格筛选高概率时刻，避免震荡和假突破
- **趋势跟随** - 只抓大趋势，一波趋势只做一次核心交易
- **真实行情** - 使用OKX官方WebSocket，Tick级实时价格
- **24h运行** - 后台自动运行，无需人工干预
- **实时通知** - PushPlus微信通知，第一时间掌握交易动态

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    前端交易终端 (React)                       │
│         深色主题 | K线图表 | 实时持仓 | 收益曲线 | 通知        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Express)                     │
│              REST API | WebSocket | 认证                      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   核心交易引擎 (Node.js)                       │
│  趋势分析 | 信号生成 | 风控管理 | 订单执行 | 模拟账户          │
└─────────────────────────────────────────────────────────────┘
                              │
                    OKX WebSocket (真实行情)
```

## 核心交易逻辑

### 三层时间框架分析

1. **4H** - 决定市场大方向（只做多或只做空）
2. **1H** - 确认趋势结构健康（higher high / higher low / 回踩结构）
3. **15m** - 精准低风险进场（不决定趋势）

### 核心指标

- EMA21 / EMA55 / EMA200
- ADX（趋势强度）
- ATR（波动率）
- RVOL（相对成交量）
- Volume Profile（成交量分布）

### 市场环境检测

- **趋势市** - 可交易
- **震荡市** - 禁止交易
- **假突破环境** - 禁止交易

### 严格风控

- 单仓模式：同一时间只能有一个仓位
- RR >= 3：必须满足3:1以上的风险收益比
- 止损 > 500点：避免正常波动扫损
- 最大杠杆10x
- 初始资金1000 RMB（模拟账户）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑.env文件，配置PushPlus Token等
```

### 3. 启动系统

```bash
# 开发模式
npm run dev

# 生产模式（推荐）
./start.sh

# 或使用PM2实现24h运行
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. 访问系统

打开浏览器访问: http://localhost:3001

## 项目结构

```
├── server/
│   ├── index.js                 # 主服务器
│   ├── services/
│   │   ├── okxDataService.js    # OKX行情服务
│   │   ├── trendAnalyzer.js     # 趋势分析引擎
│   │   ├── riskManager.js       # 风险管理
│   │   ├── paperTrading.js      # 模拟交易
│   │   └── notificationService.js # 通知服务
│   └── database.js              # 数据库管理
├── client/
│   ├── src/
│   │   ├── App.js               # 主应用
│   │   └── components/          # UI组件
│   └── public/
├── data/                        # 数据库存储
├── logs/                        # 日志文件
├── ecosystem.config.js          # PM2配置
└── start.sh                     # 启动脚本
```

## API接口

### REST API

- `GET /api/status` - 系统状态
- `GET /api/position` - 当前持仓
- `GET /api/history` - 交易历史
- `GET /api/performance` - 绩效统计

### WebSocket

连接 `ws://localhost:3001` 接收实时更新：

```json
{
  "type": "marketUpdate",
  "data": {
    "price": 45000.50,
    "analysis": { ... },
    "systemStatus": { ... }
  }
}
```

## 通知配置

系统使用PushPlus发送微信通知，配置你的Token：

1. 访问 http://www.pushplus.plus/
2. 登录并获取Token
3. 在.env文件中设置 `PUSHPLUS_TOKEN=你的Token`

## 系统要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- 内存 >= 2GB
- 磁盘空间 >= 1GB

## 24h自动运行

使用PM2实现24小时后台运行：

```bash
# 安装PM2
npm install -g pm2

# 启动系统
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs btc-trend-following

# 重启系统
pm2 restart btc-trend-following

# 停止系统
pm2 stop btc-trend-following

# 设置开机自启
pm2 startup
pm2 save
```

## 日志查看

```bash
# 实时查看日志
tail -f logs/combined.log

# 查看错误日志
tail -f logs/error.log
```

## 安全提示

- 请妥善保管你的PushPlus Token
- 建议在生产环境使用反向代理（Nginx）
- 定期备份数据库文件（data/trading.db）

## 免责声明

本系统仅供学习和研究使用，不构成投资建议。加密货币交易风险极高，请谨慎投资。

## License

MIT
