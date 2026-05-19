# 🔧 Railway 构建失败 - 故障排查指南

## 🚨 常见错误及解决方案

---

## 错误 1: "npm ERR! missing package.json"

### 症状
```
Error: Could not find package.json
```

### 原因
Railway 没有正确检测到项目根目录

### 解决方案

1. 在 Railway Dashboard 中，点击失败的服务
2. 进入 **"Settings"**
3. 找到 **"Root Directory"**
4. 留空（使用默认）或设置为 `/`
5. 点击 **"Redeploy"**

---

## 错误 2: "npm ERR! Could not install dependencies"

### 症状
```
npm ERR! code ENOENT
npm ERR! syscall open
npm ERR! npm install failed
```

### 原因
依赖安装失败，可能网络问题或 package.json 配置错误

### 解决方案

**方案 A: 清理缓存并重试**

1. 在 Railway Dashboard 中，点击失败的服务
2. 点击 **"Redeploy"** 按钮旁边的 **⋮** 菜单
3. 选择 **"Redeploy with Clean Cache"**

**方案 B: 使用 .npmrc 配置**

在项目根目录创建 `.npmrc` 文件：

```
registry=https://registry.npmjs.org/
prefer-offline=false
```

然后推送代码

---

## 错误 3: "npm ERR! node-gyp rebuild failed"

### 症状
```
npm ERR! gyp ERR! stack Error: not found: make
npm ERR! gyp ERR! stack not found: python
```

### 原因
构建原生模块缺少编译工具

### 解决方案

Railway 不支持原生模块。如果必须使用，确保在 railway.json 中配置：

```json
{
  "build": {
    "nixpacks": {
      "pkgs": ["nodejs_20_x", "python3", "make", "gcc"]
    }
  }
}
```

---

## 错误 4: "PORT environment variable not set"

### 症状
```
Error: listen EADDRINUSE :::3000
Error: PORT environment variable not set
```

### 解决方案

1. 在 Railway Dashboard 中，进入 **"Variables"**
2. 点击 **"Raw Editor"**
3. 添加：
   ```
   PORT=3001
   NODE_ENV=production
   ```
4. 保存后点击 **"Redeploy"**

---

## 错误 5: "npm ERR! Maximum call stack size exceeded"

### 症状
```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed
```

### 解决方案

Railway 默认内存可能不足。解决方案：

1. 在 Railway Dashboard 中，进入 **"Settings"**
2. 找到 **"Runtime"** 或 **"Plan"**
3. 升级到 Hobby 计划（$5/月），获得更多内存
4. 或在 railway.json 中配置构建选项

---

## 错误 6: "Build timeout"

### 症状
```
error: executor failed running [/bin/sh -c npm run build]:
 timeout: sending signal kill
```

### 解决方案

**方案 A: 增加构建超时时间**

Railway 默认构建超时是 10 分钟。如果前端构建时间较长：

1. 考虑优化前端构建
2. 或在 railway.json 中配置：

```json
{
  "deploy": {
    "timeoutSecs": 600
  }
}
```

**方案 B: 优化构建流程**

如果项目很大，可以将前端构建和后端分离，或使用更快的构建工具。

---

## 🔍 如何查看详细日志

### 步骤 1: 进入部署日志

1. 打开 https://railway.app/dashboard
2. 点击您的项目
3. 点击失败的服务
4. 点击 **"Logs"** 标签

### 步骤 2: 复制关键错误

滚动到日志最底部，找到以 `Error` 或 `failed` 开头的行，复制给我

### 步骤 3: 常见日志位置

- **Build logs**: 包含 `npm install` 和 `npm run build` 输出
- **Deploy logs**: 包含应用启动日志
- **Runtime logs**: 包含运行时的错误

---

## 🎯 最常见的 3 个问题

根据我们的项目，最可能的问题是：

### 问题 1: 环境变量未设置 ⭐⭐⭐

**必须设置以下环境变量：**

在 Railway Dashboard → 您的服务 → **"Variables"**，添加：

```
NODE_ENV=production
PORT=3001
PUSHPLUS_TOKEN=aab835d141754e6e9c0d31a4768467b7
INITIAL_BALANCE=1000
MAX_LEVERAGE=10
MIN_RR=3
MIN_STOP_LOSS_POINTS=500
MAX_RISK_PER_TRADE=0.02
MAX_DAILY_LOSS=0.06
MAX_DRAWDOWN=0.15
```

### 问题 2: 缺少 PostgreSQL ⭐⭐

**必须添加 PostgreSQL 插件：**

1. 在 Railway Dashboard 中
2. 点击项目名称旁边的 **"+"** 按钮
3. 选择 **"PostgreSQL"**
4. 等待数据库创建完成
5. Railway 会自动设置 `DATABASE_URL` 环境变量

### 问题 3: 端口配置错误 ⭐

**确保服务监听正确的端口：**

Railway 会注入 `PORT` 环境变量（通常是 3000 或随机端口）。

确保代码中：
- 使用 `process.env.PORT || 3001`
- 不要硬编码端口

---

## ✅ 完整的修复步骤

### 步骤 1: 检查项目设置

1. 打开 Railway Dashboard
2. 点击您的项目
3. 检查 **"Settings"** → **"Source"**
4. 确认：
   - **Repository**: `ArchimeDAs0612/Auto-quant-V2`
   - **Branch**: `main`
   - **Root Directory**: `/` (或留空)

### 步骤 2: 添加环境变量

1. 点击 **"Variables"**
2. 添加所有必要的环境变量（见上方）
3. 点击 **"Save Changes"**

### 步骤 3: 添加数据库

1. 点击 **"Add Plugin"**
2. 选择 **"PostgreSQL"**
3. 等待创建完成

### 步骤 4: 重新部署

1. 点击 **"Redeploy"** 按钮
2. 等待 3-5 分钟
3. 查看 **"Logs"** 确认是否成功

---

## 📞 如果还是失败

请将以下信息发给我：

1. **完整的错误日志**（从 Logs 页面复制）
2. **截图**（如果有）
3. **当前的环境变量列表**（模糊处理敏感信息）

我会帮您具体分析！

---

## 🎯 快速修复命令

如果您想要我帮您修复代码，请告诉我具体的错误信息。

或者您可以：

### 尝试这个快速修复

在 Railway Dashboard 中：

1. 删除现有服务
2. 重新创建，选择 **"Empty Project"**
3. 手动连接 GitHub 仓库
4. 按照上面的步骤配置

---

**最可能的问题：环境变量或数据库未配置**

请先检查这两项！🙏