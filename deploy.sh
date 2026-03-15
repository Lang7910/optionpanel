#!/usr/bin/env bash
set -euo pipefail

# ============================================================
#  Options Panel — 一键部署 / 更新脚本
#  用法:
#    ./deploy.sh          首次部署（构建并启动）
#    ./deploy.sh update   拉取最新代码并重新部署
#    ./deploy.sh stop     停止所有服务
#    ./deploy.sh logs     查看实时日志
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# Check docker
command -v docker >/dev/null 2>&1 || error "Docker 未安装，请先安装 Docker"
docker compose version >/dev/null 2>&1 || error "Docker Compose 未安装"

case "${1:-deploy}" in
  deploy)
    info "🚀 首次部署 Options Panel..."
    info "构建镜像..."
    docker compose build --no-cache
    info "启动服务..."
    docker compose up -d
    info "等待服务就绪..."
    sleep 5
    if curl -sf http://localhost:7188/health > /dev/null 2>&1; then
      info "✅ 后端就绪: http://localhost:7188"
    else
      warn "后端可能仍在启动，请稍等..."
    fi
    info "✅ 前端地址: http://localhost:7189"
    info "📋 查看日志: ./deploy.sh logs"
    ;;

  update)
    info "🔄 拉取最新代码..."
    git fetch --all
    CURRENT_BRANCH=$(git branch --show-current)
    git pull origin "$CURRENT_BRANCH"
    info "重新构建镜像..."
    docker compose build
    info "滚动更新服务..."
    docker compose up -d --force-recreate
    sleep 5
    if curl -sf http://localhost:7188/health > /dev/null 2>&1; then
      info "✅ 更新完成！后端: http://localhost:7188"
    else
      warn "后端可能仍在启动..."
    fi
    info "✅ 前端: http://localhost:7189"
    # 清理旧镜像
    docker image prune -f 2>/dev/null || true
    info "🧹 已清理旧镜像"
    ;;

  stop)
    info "⏹️  停止所有服务..."
    docker compose down
    info "✅ 已停止"
    ;;

  logs)
    docker compose logs -f --tail=100
    ;;

  restart)
    info "🔄 重启服务..."
    docker compose restart
    info "✅ 已重启"
    ;;

  status)
    docker compose ps
    ;;

  *)
    echo "用法: $0 {deploy|update|stop|logs|restart|status}"
    echo ""
    echo "  deploy   - 首次构建并部署"
    echo "  update   - git pull + 重新构建部署"
    echo "  stop     - 停止所有服务"
    echo "  logs     - 查看实时日志"
    echo "  restart  - 重启服务"
    echo "  status   - 查看服务状态"
    exit 1
    ;;
esac
