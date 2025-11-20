# 东华大学众包二手书交易平台

一个面向校园二手书交易的全栈原型，前端基于 React + TypeScript + Vite，后端使用 FastAPI + SQLAlchemy，数据库使用 MySQL（脚本可迁移 Postgres）。

## 技术栈
- 前端：React 18 + TypeScript + Vite + Ant Design
- 后端：FastAPI, SQLAlchemy
- 数据库：MySQL (开发脚本 `database/SecondHandData.sql`)

## 运行方式概览
你可以使用两种方式启动项目：
1. 跨平台脚本（推荐）
2. 手动命令

### 方式一：脚本一键运行

Linux / MacOS:
```bash
./scripts/run_mvp.sh start          # 初始化数据库（如不存在）并启动后端+前端
./scripts/run_mvp.sh status         # 查看状态
./scripts/run_mvp.sh stop           # 停止后端与前端
./scripts/run_mvp.sh backend        # 仅启动后端
./scripts/run_mvp.sh frontend       # 仅启动前端
./scripts/run_mvp.sh restart        # 重启后端（含端口检测）
./scripts/run_mvp.sh kill-port      # 强制释放被占用的 8000 端口
```
可覆盖的环境变量：`DB_USER DB_PASS DB_HOST DB_PORT DB_NAME`
示例：
```bash
DB_USER=Inaglyite DB_PASS=H20041227j ./scripts/run_mvp.sh start
```

Windows (PowerShell / CMD):
```bat
run.bat init        REM 初始化（创建虚拟环境 + 安装依赖）
run.bat start       REM 启动后端 + 前端
run.bat backend     REM 仅启动后端
run.bat frontend    REM 仅启动前端
run.bat status      REM 查看进程状态
run.bat stop        REM 停止（删除标记，手动关闭窗口）
```
环境变量可在执行前设置：
```bat
set DB_USER=Inaglyite
set DB_PASS=H20041227j
run.bat start
```

### 方式二：手动命令（后端 + 前端）

后端（Linux/Mac）:
```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
export DB_USER=Inaglyite DB_PASS=H20041227j DB_HOST=127.0.0.1 DB_PORT=3306 DB_NAME=dhu_secondhand_platform
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```
后端（Windows CMD）:
```bat
python -m venv backend\.venv
backend\.venv\Scripts\activate.bat
pip install -r backend\requirements.txt
set DB_USER=Inaglyite
set DB_PASS=H20041227j
set DB_HOST=127.0.0.1
set DB_PORT=3306
set DB_NAME=dhu_secondhand_platform
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

前端:
```bash
npm install
npm run dev   # http://localhost:5173
```

## 常用验证命令
```bash
curl http://127.0.0.1:8000/api/health           # 后端健康检查
curl http://127.0.0.1:8000/api/books            # 获取书籍列表
curl http://127.0.0.1:8000/api/debug/info       # 查看调试信息（用户 / 书籍计数）
```
发布一本书（替换 seller_id 为你创建的用户ID）：
```bash
curl -X POST http://127.0.0.1:8000/api/books \
  -H 'Content-Type: application/json' \
  -d '{
    "isbn":"9787111544933",
    "title":"操作系统概念",
    "author":"Abraham Silberschatz",
    "original_price":108,
    "selling_price":35,
    "condition_level":"fair",
    "description":"接口发布验证",
    "seller_id":"<你的用户ID>"
  }'
```

## 目录结构（简化）
```
backend/
  app/
    main.py              # FastAPI 入口 + 种子数据
    database.py          # 数据库连接与 Session
    models/              # SQLAlchemy 模型
scripts/run_mvp.sh       # Linux/Mac 管理脚本
run.bat                  # Windows 管理脚本
src/                     # 前端源码
  components/            # Layout 等公共组件
  pages/                 # Home / Books / Publish / BookDetail 等
  services/              # axios 封装与业务请求
  types/                 # TypeScript 类型
  index.css              # 全局样式
```

## 环境变量说明
| 变量 | 默认值 | 说明 |
|------|--------|------|
| DB_USER | Inaglyite | 数据库用户名 |
| DB_PASS | H20041227j | 数据库密码 |
| DB_HOST | 127.0.0.1 | 数据库主机 |
| DB_PORT | 3306 | 数据库端口 |
| DB_NAME | dhu_secondhand_platform | 数据库名称 |

可以通过命令前添加变量来覆盖，或创建 `backend/.env` 文件：
```
DB_USER=Inaglyite
DB_PASS=H20041227j
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=dhu_secondhand_platform
```

## 常见问题排查
| 问题 | 原因 | 解决 |
|------|------|------|
| address already in use | 端口被遗留进程占用 | `./scripts/run_mvp.sh kill-port` 或手动 kill |
| Unknown column hashed_password | 使用旧数据库脚本 | 重新导入 `database/SecondHandData.sql` |
| Seller not found | 发布时用户ID不存在 | 先调用 `/api/users` 注册并使用返回的 id |
| 前端始终是 mock 数据 | 后端未启动或 500 | 查看 Network 返回码，确认后端正常 |

## 下一阶段规划 (Roadmap)
1. 用户注册 / 登录 / JWT 认证
2. 订单创建与状态流转
3. 收藏 / 浏览统计 / 推荐位
4. 分页 & 排序 & 过滤（书籍列表）
5. Alembic 迁移管理数据库结构
6. 文件上传（书籍图片）与 CDN 集成

## 贡献与提交
提交前检查：
```bash
npm run build              # 前端构建
./scripts/run_mvp.sh status # 确认后端运行或可启动
```
Git 基础忽略已在 `.gitignore` 包含：node_modules、`backend/.venv`、日志、构建产物。欢迎在 PR 中补充更多规则。

## 许可证
当前为校园内部原型，后续可选择 MIT / Apache-2.0 等开源许可证。暂未指定。
