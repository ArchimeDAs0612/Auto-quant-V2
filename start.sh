#!/bin/bash

# BTC趋势跟随交易系统启动脚本

echo "🚀 启动BTC趋势跟随交易系统..."

# 创建必要的目录
mkdir -p logs
mkdir -p data

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js未安装"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: npm未安装"
    exit 1
fi

# 安装依赖
echo "📦 安装后端依赖..."
npm install

# 检查.env文件
if [ ! -f .env ]; then
    echo "⚠️  未找到.env文件，使用默认配置"
    cp .env.example .env
fi

# 使用PM2启动（如果已安装）
if command -v pm2 &> /dev/null; then
    echo "🔄 使用PM2启动系统..."
    pm2 start ecosystem.config.js
    pm2 save
    echo "✅ 系统已启动"
    echo "📊 查看日志: pm2 logs btc-trend-following"
    echo "🌐 访问地址: http://localhost:3001"
else
    # 直接启动
    echo "🔄 直接启动系统..."
    echo "💡 提示: 安装PM2可实现24h自动运行 (npm install -g pm2)"
    node server/index.js
fi
