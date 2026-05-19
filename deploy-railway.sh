#!/bin/bash

# ============================================
# Railway 自动化部署脚本
# ============================================

echo "🚀 BTC 量化交易平台 - Railway 部署"
echo "=========================================="

# 检查 Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI 未安装，正在安装..."
    npm install -g @railway/cli
fi

# 登录 Railway（使用 Token）
echo ""
echo "📝 请在浏览器中授权 Railway 登录..."
echo "如果您已经在终端中完成登录，请按 Enter"
echo ""

# 尝试使用 token 登录
echo "🔐 尝试使用 Token 登录..."
RAILWAY_TOKEN="7419c9b4-a485-4c88-bb8a-3178ded5919a"

# 创建项目
echo ""
echo "📦 创建 Railway 项目..."
npx railway init --name "Auto-quant-V2" --json

# 获取项目 ID
PROJECT_ID=$(npx railway status --json | grep -o '"projectId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ 无法获取项目 ID"
    exit 1
fi

echo "✅ 项目创建成功: $PROJECT_ID"

# 添加 PostgreSQL 插件
echo ""
echo "🗄️ 添加 PostgreSQL 数据库..."
npx railway add --plugin postgresql

# 配置环境变量
echo ""
echo "⚙️ 配置环境变量..."
npx railway variables set NODE_ENV=production
npx railway variables set PORT=3001
npx railway variables set PUSHPLUS_TOKEN=aab835d141754e6e9c0d31a4768467b7
npx railway variables set INITIAL_BALANCE=1000

# 部署
echo ""
echo "🚀 开始部署..."
npx railway up

# 获取部署 URL
echo ""
echo "⏳ 等待部署完成..."
sleep 30

URL=$(npx railway status --json | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$URL" ]; then
    echo "⚠️ 部署可能需要几分钟时间"
    echo "请访问 Railway Dashboard 查看部署状态: https://railway.app/dashboard"
else
    echo ""
    echo "=========================================="
    echo "✅ 部署成功！"
    echo "🌐 访问地址: $URL"
    echo "=========================================="
fi

echo ""
echo "📋 后续步骤："
echo "1. 访问 $URL 检查系统运行状态"
echo "2. 在 Railway Dashboard 中查看日志"
echo "3. 配置自定义域名（可选）"