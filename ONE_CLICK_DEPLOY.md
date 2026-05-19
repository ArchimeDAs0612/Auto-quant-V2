# 🚀 一键部署到 Railway（简化版）

## 现状
✅ 所有代码准备完成
✅ GitHub Actions 工作流已配置
✅ Railway 配置文件已就绪

---

## 您需要做的（仅需 5 分钟）

### 步骤 1：推送代码到 GitHub

在终端运行以下命令：

```bash
cd /Users/archimeda/Desktop/vibecoding/Auto—quant-V2

# 创建 GitHub 仓库（需要您在 GitHub 上手动创建空仓库）
git remote add origin https://github.com/YOUR_USERNAME/Auto—quant-V2.git
git branch -M main
git push -u origin main
```

### 步骤 2：在 Railway 中连接 GitHub

1. 打开浏览器访问：**https://railway.app/dashboard**
2. 点击 **"New Project"**
3. 选择 **"Deploy from GitHub repo"**
4. 点击 **"Configure GitHub App"**
5. 在 GitHub 上授权安装 Railway App
6. 选择 `Auto—quant-V2` 仓库

### 步骤 3：在 Railway 中添加 PostgreSQL

1. 在项目中点击 **"Add Plugin"**
2. 选择 **"PostgreSQL"**
3. Railway 会自动创建数据库并设置 `DATABASE_URL`

### 步骤 4：配置环境变量

在 Railway Dashboard 中，点击您的服务 → **"Variables"**，添加：

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

### 步骤 5：部署！

Railway 会自动：
- 检测 Node.js 项目
- 安装依赖
- 构建前端
- 启动服务

点击 **"Deploy"** 按钮即可！

---

## 部署完成后

访问 Railway 给您的 URL，例如：
`https://auto-quant-v2.up.railway.app`

验证：
- ✅ WebSocket 连接
- ✅ BTC 价格实时更新
- ✅ 交易策略运行
- ✅ 持仓状态持久化
- ✅ PushPlus 通知正常

---

## 故障排除

### Railway 显示 "Build Failed"
检查日志，常见问题：
- Node 版本不兼容 → 使用 Node 20
- 端口配置错误 → 确保 `PORT=3001`
- 依赖安装失败 → 检查 `package.json`

### 数据库连接失败
确保 PostgreSQL 插件已添加，`DATABASE_URL` 环境变量已自动设置。

### WebSocket 不工作
Railway 支持 WebSocket 长连接，确保客户端连接的是正确的 `/ws` 路径。

---

## 成本
- Railway Hobby 计划：**$5/月**
- 包含：500 小时运行时间，1GB 内存
- 24/7 运行，每月约 $0.007/小时

---

## 替代方案
如果 Railway 不方便，也可以考虑：
- **Render.com** - 类似 PaaS，免费额度更多
- **Fly.io** - 边缘部署，低延迟
- **DigitalOcean App Platform** - 简单易用

---

**给我您的 GitHub 仓库 URL，我将帮您完成后续验证！**