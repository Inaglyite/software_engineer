#!/usr/bin/env bash
# 东华大学众包二手书交易平台 MVP 一键脚本
# 功能: 初始化数据库(如未存在) + 启动后端(uvicorn) + 启动前端(vite) + 停止/状态查看
# 使用: ./scripts/run_mvp.sh start | stop | status | db-only | backend | frontend
# 环境变量可覆盖: DB_USER DB_PASS DB_HOST DB_PORT DB_NAME PYTHON_BIN
# 提示: 密码以 -p 形式传递，会出现在进程列表中，仅适合本地开发环境。

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SQL_FILE="$ROOT_DIR/database/SecondHandData.sql"
VENV_DIR="$ROOT_DIR/backend/.venv"
BACKEND_PID_FILE="$ROOT_DIR/backend/backend.pid"
FRONTEND_PID_FILE="$ROOT_DIR/frontend.pid"
LOG_DIR="$ROOT_DIR/.logs"
mkdir -p "$LOG_DIR"

DB_USER="${DB_USER:-Inaglyite}"
DB_PASS="${DB_PASS:-H20041227j}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-dhu_secondhand_platform}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
UVICORN_HOST="${UVICORN_HOST:-127.0.0.1}"
UVICORN_PORT="${UVICORN_PORT:-8000}"

color() { local c="$1"; shift; printf "\033[%sm%s\033[0m\n" "$c" "$*"; }
info(){ color 36 "$*"; }
success(){ color 32 "$*"; }
warn(){ color 33 "$*"; }
error(){ color 31 "$*"; }

usage(){
  cat <<EOF
用法: $0 [command]
命令:
  start          初始化并启动后端+前端
  db-only        仅导入数据库
  backend        启动后端
  frontend       启动前端
  stop           停止后端+前端
  status         查看运行状态
  restart        重启后端(包含端口检测)
  force-backend  强制杀端口后再启动后端
  kill-port      释放被占用的后端端口
  help           显示此帮助
示例:
  DB_PASS=xxx $0 start
EOF
}

check_mysql(){
  if ! command -v mysql >/dev/null 2>&1; then
    error "未找到 mysql 客户端，请安装: sudo apt-get install -y mysql-client"
    exit 1
  fi
}

ensure_db(){
  check_mysql
  info "检查数据库是否存在: $DB_NAME"
  if mysql -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" -P "$DB_PORT" -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='$DB_NAME'" | grep -q "$DB_NAME"; then
    success "数据库已存在，跳过导入。"
  else
    if [ ! -f "$SQL_FILE" ]; then
      error "找不到 SQL 文件: $SQL_FILE"
      exit 1
    fi
    info "导入 SQL 文件: $SQL_FILE"
    mysql -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" -P "$DB_PORT" < "$SQL_FILE" || { error "导入失败"; exit 1; }
    success "数据库导入完成。"
  fi
}

ensure_venv(){
  if [ ! -d "$VENV_DIR" ]; then
    info "创建 Python 虚拟环境..."
    $PYTHON_BIN -m venv "$VENV_DIR" || { error "创建虚拟环境失败"; exit 1; }
  fi
  # shellcheck source=/dev/null
  source "$VENV_DIR/bin/activate"
  if [ ! -f "$VENV_DIR/installed.flag" ]; then
    info "安装后端依赖..."
    pip install --upgrade pip >/dev/null 2>&1 || true
    pip install -r "$ROOT_DIR/backend/requirements.txt" || { error "pip 安装失败"; exit 1; }
    touch "$VENV_DIR/installed.flag"
    success "后端依赖安装完成。"
  fi
}

port_pid(){
  local p
  if command -v lsof >/dev/null 2>&1; then
    p=$(lsof -t -i TCP:"$UVICORN_PORT" -sTCP:LISTEN 2>/dev/null || true)
  elif command -v ss >/dev/null 2>&1; then
    p=$(ss -ltnp 2>/dev/null | awk -v port=":$UVICORN_PORT" '$4 ~ port {gsub(/pid=/,"",$NF); gsub(/,/,"",$NF); print $NF}' | cut -d'=' -f2 || true)
  fi
  echo "$p"
}
check_port(){
  local p; p=$(port_pid)
  if [ -n "$p" ]; then
    if [ -f "$BACKEND_PID_FILE" ] && [ "$(cat "$BACKEND_PID_FILE")" = "$p" ]; then
      return 0
    fi
    warn "端口 $UVICORN_PORT 已被进程 PID $p 占用。若需强制释放可运行: $0 kill-port"
    return 1
  fi
  return 0
}
kill_port(){
  local p; p=$(port_pid)
  if [ -n "$p" ]; then
    info "强制杀掉占用端口 $UVICORN_PORT 的进程 PID $p"
    kill "$p" || sudo kill -9 "$p" || true
    sleep 1
  else
    warn "端口 $UVICORN_PORT 当前未被占用。"
  fi
}
restart_backend(){
  stop_backend
  kill_port || true
  start_backend
}

start_backend(){
  if ! check_port; then
    error "后端端口被占用，启动终止。可运行: $0 force-backend 或 $0 kill-port"
    return 1
  fi
  if [ -f "$BACKEND_PID_FILE" ] && kill -0 "$(cat "$BACKEND_PID_FILE")" 2>/dev/null; then
    warn "后端已在运行 (PID $(cat "$BACKEND_PID_FILE"))"
    return
  fi
  ensure_venv
  export DB_USER DB_PASS DB_HOST DB_PORT DB_NAME
  info "启动后端 uvicorn..."
  (cd "$ROOT_DIR" && nohup "$VENV_DIR/bin/uvicorn" backend.app.main:app \
     --host "$UVICORN_HOST" --port "$UVICORN_PORT" --reload \
     > "$LOG_DIR/backend.out" 2>&1 & echo $! > "$BACKEND_PID_FILE")
  sleep 1
  if kill -0 "$(cat "$BACKEND_PID_FILE")" 2>/dev/null; then
    success "后端启动成功，日志: $LOG_DIR/backend.out"
  else
    error "后端启动失败，查看日志: $LOG_DIR/backend.out"
    exit 1
  fi
}

start_frontend(){
  if [ -f "$FRONTEND_PID_FILE" ] && kill -0 "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null; then
    warn "前端已在运行 (PID $(cat "$FRONTEND_PID_FILE"))"
    return
  fi
  if [ ! -d "$ROOT_DIR/node_modules" ]; then
    info "安装前端依赖..."
    (cd "$ROOT_DIR" && npm install) || { error "npm install 失败"; exit 1; }
  fi
  info "启动前端 Vite Dev Server..."
  (cd "$ROOT_DIR" && nohup npm run dev > "$LOG_DIR/frontend.out" 2>&1 & echo $! > "$FRONTEND_PID_FILE")
  sleep 1
  if kill -0 "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null; then
    success "前端启动成功，日志: $LOG_DIR/frontend.out"
  else
    error "前端启动失败，查看日志: $LOG_DIR/frontend.out"
    exit 1
  fi
}

stop_backend(){
  if [ -f "$BACKEND_PID_FILE" ]; then
    local pid
    pid="$(cat "$BACKEND_PID_FILE")"
    if kill -0 "$pid" 2>/dev/null; then
      info "停止后端 PID $pid"
      kill "$pid" || true
    fi
    rm -f "$BACKEND_PID_FILE"
  fi
}

stop_frontend(){
  if [ -f "$FRONTEND_PID_FILE" ]; then
    local pid
    pid="$(cat "$FRONTEND_PID_FILE")"
    if kill -0 "$pid" 2>/dev/null; then
      info "停止前端 PID $pid"
      kill "$pid" || true
    fi
    rm -f "$FRONTEND_PID_FILE"
  fi
}

status(){
  echo "---- 状态 ----"
  if [ -f "$BACKEND_PID_FILE" ] && kill -0 "$(cat "$BACKEND_PID_FILE")" 2>/dev/null; then
    success "后端运行中 PID $(cat "$BACKEND_PID_FILE") (http://$UVICORN_HOST:$UVICORN_PORT)"
  else
    warn "后端未运行"
  fi
  if [ -f "$FRONTEND_PID_FILE" ] && kill -0 "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null; then
    success "前端运行中 PID $(cat "$FRONTEND_PID_FILE") (http://localhost:5173)"
  else
    warn "前端未运行"
  fi
  echo "--------------"
}

COMMAND="${1:-help}"
case "$COMMAND" in
  start)
    ensure_db; start_backend; start_frontend; status ;;
  db-only)
    ensure_db ;;
  backend)
    ensure_db; start_backend ;;
  frontend)
    start_frontend ;;
  stop)
    stop_backend; stop_frontend; status ;;
  status)
    status ;;
  restart)
    restart_backend ;;
  force-backend)
    kill_port; start_backend ;;
  kill-port)
    kill_port ;;
  help|--help|-h)
    usage ;;
  *)
    error "未知命令: $COMMAND"; usage; exit 1 ;;
 esac

