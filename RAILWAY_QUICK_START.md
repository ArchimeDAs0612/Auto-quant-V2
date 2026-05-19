# 🎯 Railway 部署快速指南

## ✅ 已完成
- ✅ 代码已推送到 GitHub: https://github.com/ArchimeDAs0612/Auto-quant-V2
- ✅ Railway Token 已准备: `7419c9b4-a485-4c88-bb8a-3178ded5919a`
- ✅ 部署配置文件已就绪

---

## 🚀 您需要做的（仅需 3 分钟）

### 步骤 1：创建 Railway 项目

1. **打开 Railway Dashboard**
   👉 https://railway.app/dashboard

2. **点击 "New Project"**
   选择 **"Deploy from GitHub repo"**

3. **安装 Railway GitHub App**
   - 点击 "Configure GitHub App"
   - 在 GitHub 上授权 Railway 访问您的仓库
   - 选择 `Auto-quant-V2` 仓库

4. **项目创建成功！**
   Railway 会自动检测 Node.js 项目并开始部署

---

### 步骤 2：添加 PostgreSQL 数据库

1. 在 Railway Dashboard 中，点击您的项目
2. 点击 **"Add Plugin"**
3. 选择 **"PostgreSQL"**
4. Railway 会自动：
   - 创建 PostgreSQL 数据库
   - 设置 `DATABASE_URL` 环境变量

---

### 步骤 3：配置环境变量

在 Railway Dashboard 中，点击 **"Variables"**，添加：

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

---

### 步骤 4：等待部署完成

Railway 会自动：
1. 克隆 GitHub 仓库
2. 安装依赖（npm install）
3. 构建前端（npm run build）
4. 启动服务

⏱️ 部署时间：约 2-5 分钟

---

### 步骤 5：获取访问 URL

部署成功后，在 Railway Dashboard 中：
1. 点击您的服务
2. 查看 **"Settings"** → **"Networking"**
3. 找到 **"Public URL"**

URL 格式：`https://auto-quant-v2.up.railway.app`

---

## ✅ 验证部署

访问您的 URL 后，检查：

- ✅ WebSocket 连接成功
- ✅ BTC 价格实时更新
- ✅ K线图正常显示
- ✅ 交易策略运行中
- ✅ PushPlus 通知正常
- ✅ 持仓状态持久化

---

## 📊 部署架构

```
GitHub (Auto-quant-V2)
    ↓ 代码推送
Railway
    ├─ Frontend (Next.js build)
    ├─ Backend (Express server)
    ├─ WebSocket (ws)
    └─ PostgreSQL (数据持久化)
            ↓
        BTC OKX API
            ↓
        PushPlus (通知)
```

---

## 🔧 常见问题

### Q: 部署失败怎么办？
A: 在 Railway Dashboard 中查看 "Logs"，常见问题：
- 端口配置错误 → 确保 `PORT=3001`
- 依赖安装失败 → 检查 `package.json`
- 构建失败 → 检查 `npm run build` 输出

### Q: 如何查看日志？
A: Railway Dashboard → 您的服务 → "Logs"

### Q: 如何重启服务？
A: Railway Dashboard → 您的服务 → "Redeploy"

### Q: 数据会丢失吗？
A: PostgreSQL 是持久化的，但应用重启会清空内存状态。
   历史交易和权益曲线会保留在数据库中。

---

## 💰 成本

- **Hobby 计划**: $5/月
  - 500 小时运行时间
  - 1GB 内存
  - 适合 24/7 运行

- **Free 额度**: $5 免费额度（5美元）
  - 可以使用一段时间

---

## 🎉 完成！

部署成功后，告诉我您的 URL，我帮您验证系统状态！

**示例 URL**: `https://auto-quant-v2.up.railway.app`