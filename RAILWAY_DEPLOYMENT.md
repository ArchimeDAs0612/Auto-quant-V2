# Railway 部署指南

## 重要说明

Vercel 无法满足您的需求，原因如下：
- Serverless Functions 有 10-60 秒超时限制
- 不支持长期运行的 WebSocket 连接
- 无状态的，不适合 24/7 运行的服务

Railway 是最佳选择：
- ✅ 持久化服务，无超时限制
- ✅ 支持 WebSocket 长期连接
- ✅ 内置 PostgreSQL 数据库
- ✅ GitHub 集成自动部署
- ✅ 免费额度（500小时/月）

---

## 部署步骤

### 步骤 1：准备 GitHub 仓库

首先需要将项目推送到 GitHub：

```bash
cd /Users/archimeda/Desktop/vibecoding/Auto—quant-V2

# 初始化 Git（如果尚未初始化）
git init
git add .
git commit -m "Prepare for Railway deployment"

# 在 GitHub 创建新仓库，然后：
git remote add origin https://github.com/YOUR_USERNAME/Auto—quant-V2.git
git branch -M main
git push -u origin main
```

### 步骤 2：创建 Railway 账号

1. 访问 https://railway.app
2. 使用 GitHub 账号登录
3. 点击 "New Project" → "Deploy from GitHub repo"
4. 选择您的仓库

### 步骤 3：配置数据库

Railway 会自动创建 PostgreSQL 数据库：

1. 在 Railway Dashboard 中，点击您的项目
2. 点击 "Add Plugin" → "PostgreSQL"
3. Railway 会自动设置 `DATABASE_URL` 环境变量

### 步骤 4：配置环境变量

在 Railway Dashboard 中添加以下环境变量：

```
NODE_ENV = production
PORT = 3001
PUSHPLUS_TOKEN = aab835d141754e6e9c0d31a4768467b7
INITIAL_BALANCE = 1000
MAX_LEVERAGE = 10
MIN_RR = 3
MIN_STOP_LOSS_POINTS = 500
MAX_RISK_PER_TRADE = 0.02
MAX_DAILY_LOSS = 0.06
MAX_DRAWDOWN = 0.15
```

### 步骤 5：部署

Railway 会自动：
1. 检测项目类型（Node.js）
2. 安装依赖（包括 PostgreSQL 客户端）
3. 执行构建
4. 启动服务

点击 "Deploy" 开始部署。

### 步骤 6：配置域名（可选）

1. 在 Railway Dashboard 中，点击您的服务
2. 点击 "Settings" → "Networking"
3. 添加自定义域名

---

## 部署后验证

部署完成后，访问 Railway 提供的 URL（例如：`https://your-project.up.railway.app`）

检查：
- ✅ WebSocket 是否连接
- ✅ BTC 价格是否实时更新
- ✅ K线图是否正常显示
- ✅ 交易策略是否持续运行
- ✅ 持仓状态是否持久化

---

## 常见问题

### Q: Railway 免费额度用完会怎样？
A: 服务会暂停，需要升级付费计划或等待下个月额度刷新。

### Q: 如何查看日志？
A: 在 Railway Dashboard 中，点击 "Logs" 查看实时日志。

### Q: 如何 SSH 到服务器？
A: Railway 不支持 SSH，但可以通过日志调试。

### Q: 数据会丢失吗？
A: PostgreSQL 数据库是持久化的，但文件系统不是。如果需要持久化文件，考虑使用 Railway 的持久磁盘或对象存储。

---

## 成本估算

- ** Hobby 计划**: $5/月
  - 500 小时运行时间
  - 1GB 内存
  - 共享 CPU

- ** Pro 计划**: $20/月
  - 无限运行时间
  - 2GB 内存
  - 专用 CPU

---

## 替代方案

如果 Railway 不适合您，还有以下选择：

1. **Render** - 类似的 PaaS，支持持久服务
2. **Fly.io** - 边缘部署，低延迟
3. **DigitalOcean App Platform** - 简单易用
4. **AWS/GCP/Azure** - 完全控制，需要更多配置

---

## 技术细节

### 数据库支持
项目现在同时支持：
- **SQLite** - 本地开发（`NODE_ENV != production`）
- **PostgreSQL** - Railway 生产环境（`NODE_ENV = production`）

### WebSocket
- 使用 `ws` 库
- Railway 支持 WebSocket 长连接
- 路径：`/ws`

### 健康检查
Railway 会自动检查 `/health` 端点（需要添加）