# BTC趋势跟随量化交易系统 - 项目总结

## 项目完成状态

### 核心功能模块

| 模块 | 状态 | 说明 |
|------|------|------|
| 后端服务架构 | 完成 | Node.js + Express + WebSocket |
| OKX行情接入 | 完成 | 支持WebSocket和REST API双模式 |
| 多时间框架分析 | 完成 | 4H/1H/15m三层结构 |
| 核心指标计算 | 完成 | EMA/ADX/ATR/RVOL/Volume Profile |
| 市场环境检测 | 完成 | 趋势/震荡/杂乱市场识别 |
| 流动性清扫检测 | 完成 | 假突破识别 |
| 交易时段过滤 | 完成 | 亚洲/欧洲/美盘时段 |
| 风控系统 | 完成 | 单仓模式/RR>=3/止损>500点 |
| 模拟账户系统 | 完成 | Paper Trading + 绩效统计 |
| PushPlus通知 | 完成 | 微信实时通知 |
| 前端交易终端 | 完成 | React + TradingView风格 |
| 24h自动运行 | 完成 | PM2配置支持 |

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    前端交易终端 (React)                       │
│         深色主题 | K线图表 | 实时持仓 | 收益曲线 | 通知        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Express)                     │
│              REST API | WebSocket | 静态文件                  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   核心交易引擎 (Node.js)                       │
│  趋势分析 | 信号生成 | 风控管理 | 订单执行 | 模拟账户          │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│              数据层 (SQLite + 内存缓存)                       │
│    K线数据 | 持仓记录 | 交易历史 | 系统状态                   │
└─────────────────────────────────────────────────────────────┘
                              │
                    OKX API (WebSocket/REST)
```

## 核心交易逻辑

### 1. 三层时间框架
- **4H**: 决定市场大方向（只做多或只做空）
- **1H**: 确认趋势结构健康（higher high / higher low）
- **15m**: 精准低风险进场（不决定趋势）

### 2. 市场环境检测
- ADX > 25: 趋势市场，允许交易
- ADX < 20 + 布林带收窄: 震荡市场，禁止交易
- 杂乱市场检测: 禁止交易

### 3. 严格风控
- 单仓模式: 同一时间只能有一个仓位
- RR >= 3: 必须满足3:1以上风险收益比
- 止损 > 500点: 避免正常波动扫损
- 最大杠杆10x
- 初始资金1000 RMB（模拟账户）

### 4. 信号生成条件
1. 4H趋势明确（EMA排列）
2. 1H结构健康（higher highs/lows或pullback）
3. 15m出现精准进场点
4. 无假突破/流动性清扫
5. 不在POC区域
6. RVOL > 1.2
7. RR >= 3
8. 止损距离 > 500点

## 项目文件结构

```
Auto—quant-V2/
├── server/
│   ├── index.js                    # 主服务器入口
│   ├── database.js                 # SQLite数据库管理
│   └── services/
│       ├── okxDataService.js       # OKX行情服务
│       ├── trendAnalyzer.js        # 趋势分析引擎
│       ├── riskManager.js          # 风险管理
│       ├── paperTrading.js         # 模拟交易
│       └── notificationService.js  # 通知服务
├── client/
│   ├── public/
│   └── src/
│       ├── App.js                  # 主应用
│       └── components/
│           ├── Chart.js            # K线图表
│           ├── PositionPanel.js    # 持仓面板
│           ├── PerformancePanel.js # 绩效面板
│           ├── TradeHistory.js     # 交易历史
│           └── StatusBar.js        # 状态栏
├── data/                           # 数据库文件
├── logs/                           # 日志文件
├── package.json                    # 后端依赖
├── client/package.json             # 前端依赖
├── ecosystem.config.js             # PM2配置
├── start.sh                        # 启动脚本
├── .env                            # 环境变量
└── README.md                       # 项目文档
```

## 使用方法

### 1. 安装依赖
```bash
npm install
cd client && npm install
```

### 2. 配置环境变量
编辑 `.env` 文件：
```env
PORT=3001
PUSHPLUS_TOKEN=你的PushPlusToken
```

### 3. 构建前端
```bash
cd client && npm run build
```

### 4. 启动系统
```bash
# 开发模式
npm run dev

# 生产模式
./start.sh

# 或使用PM2
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. 访问系统
打开浏览器访问: http://localhost:3001

## API接口

### REST API
- `GET /api/status` - 系统状态
- `GET /api/position` - 当前持仓
- `GET /api/history` - 交易历史
- `GET /api/performance` - 绩效统计

### WebSocket
连接 `ws://localhost:3001` 接收实时更新

## 注意事项

1. **网络连接**: 当前环境可能存在网络限制，OKX API连接可能不稳定
2. **PushPlus通知**: 需要配置有效的Token才能接收微信通知
3. **24h运行**: 建议使用PM2实现后台自动运行和开机自启
4. **数据备份**: 定期备份 `data/trading.db` 文件

## 后续优化方向

1. 添加更多交易所支持（Binance, Bybit等）
2. 实现真实交易接口（需要API Key）
3. 添加更多技术指标（MACD, RSI, Bollinger Bands等）
4. 优化前端图表性能
5. 添加策略回测功能
6. 实现多币种支持

## 技术栈

- **后端**: Node.js, Express, WebSocket, SQLite
- **前端**: React, styled-components, lightweight-charts, recharts
- **数据源**: OKX API
- **通知**: PushPlus
- **进程管理**: PM2

## 免责声明

本系统仅供学习和研究使用，不构成投资建议。加密货币交易风险极高，请谨慎投资。
