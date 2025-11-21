# 东华二手书平台 (DHU Secondhand Books)

一个面向校园二手书交易 + 众包配送的全栈原型。前端：React + TypeScript + Vite + Ant Design；后端：FastAPI + SQLAlchemy；数据库：MySQL。

> 本 README 提供“保姆级”部署教程（Linux / Windows），包括一键脚本、手动命令、数据库初始化、功能验证与排错。

## 目录
1. 快速体验
2. 环境准备
3. 保姆级部署（Linux）
4. 保姆级部署（Windows）
5. 一键脚本命令说明
6. 手动启动（不使用脚本）
7. 数据库初始化与种子数据
8. 功能验证流程（发布 / 购买 / 配送）
9. 环境变量
10. 常见问题排查 FAQ
11. Git 提交与推送教程
12. 下一步 Roadmap

---
## 1. 快速体验
```bash
# Linux / macOS (首次)
chmod +x scripts/run_mvp.sh
./scripts/run_mvp.sh start

# Windows (CMD)
run.bat start
```
前端默认地址：http://localhost:5173  后端 API: http://127.0.0.1:8000

---
## 2. 环境准备
| 组件 | 版本建议 | 备注 |
|------|----------|------|
| Python | ≥ 3.10 | 后端运行 & 虚拟环境 |
| Node.js | ≥ 16 | 前端构建与开发 |
| MySQL Server | 5.7/8.x | 需创建用户与库 |
| Git | 最新 | 代码版本管理 |

Linux 依赖建议：
```bash
sudo apt update
sudo apt install -y python3-venv mysql-client build-essential
```

---
## 3. 保姆级部署（Linux / macOS）
### 步骤 1：克隆代码
```bash
git clone https://github.com/Inaglyite/software_engineer.git
cd software_engineer
```
### 步骤 2：配置数据库
1. 登录 MySQL：`mysql -u Inaglyite -p`（输入密码：H20041227j）
2. 创建数据库（若不存在）：
```sql
CREATE DATABASE IF NOT EXISTS dhu_secondhand_platform DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
### 步骤 3：填写环境变量（可选）
创建文件 `backend/.env`：
```
DB_USER=Inaglyite
DB_PASS=H20041227j
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=dhu_secondhand_platform
```
### 步骤 4：运行脚本
```bash
chmod +x scripts/run_mvp.sh
./scripts/run_mvp.sh start   # 初始化数据库、启动后端与前端
./scripts/run_mvp.sh status  # 查看运行状态
```
### 步骤 5：验证
```bash
curl http://127.0.0.1:8000/api/health
curl http://127.0.0.1:8000/api/books
curl http://127.0.0.1:8000/api/debug/info
```
看到书籍示例即成功。

---
## 4. 保姆级部署（Windows）
### 步骤 1：克隆代码
在 PowerShell 或 CMD：
```bat
git clone https://github.com/Inaglyite/software_engineer.git
cd software_engineer
```
### 步骤 2：配置数据库（使用 MySQL Workbench 或命令行）
```sql
CREATE DATABASE IF NOT EXISTS dhu_secondhand_platform DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
### 步骤 3：创建后端虚拟环境 + 前端依赖（自动）
```bat
run.bat init
```
### 步骤 4：启动
```bat
run.bat start
```
### 步骤 5：验证
浏览器访问：http://localhost:5173 与 http://127.0.0.1:8000/docs

---
## 5. 一键脚本命令说明
### Linux 脚本 `scripts/run_mvp.sh`
```bash
./scripts/run_mvp.sh start       # 初始化数据库 + 启动后端与前端
./scripts/run_mvp.sh backend     # 只启后端
./scripts/run_mvp.sh frontend    # 只启前端
./scripts/run_mvp.sh db-only     # 仅导入数据库(若不存在)
./scripts/run_mvp.sh status      # 查看状态
./scripts/run_mvp.sh stop        # 停止后端与前端
./scripts/run_mvp.sh restart     # 重启后端
./scripts/run_mvp.sh kill-port   # 释放被占用的 8000 端口
./scripts/run_mvp.sh seed        # 执行种子数据脚本
./scripts/run_mvp.sh logs        # 快速查看最新日志
```
### Windows 脚本 `run.bat`
```bat
run.bat init       REM 初始化(后端 venv + 前端依赖)
run.bat start      REM 启动后端 + 前端
run.bat backend    REM 仅启动后端
run.bat frontend   REM 仅启动前端
run.bat status     REM 显示状态
run.bat stop       REM 停止(需要手动关闭窗口)
run.bat seed       REM 种子数据导入
run.bat logs       REM 查看日志文件路径提示
```

---
## 6. 手动启动（不使用脚本）
### 后端
```bash
python -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
export DB_USER=Inaglyite DB_PASS=H20041227j DB_HOST=127.0.0.1 DB_PORT=3306 DB_NAME=dhu_secondhand_platform
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```
### 前端
```bash
npm install
npm run dev
```

---
## 7. 数据库初始化与种子数据
自动导入：首次执行 `./scripts/run_mvp.sh start` 会检查数据库是否存在，不存在则执行 `database/SecondHandData.sql`，并在应用启动事件中插入基础书籍与用户。
手动种子：
```bash
./scripts/run_mvp.sh seed
# 或 Windows
run.bat seed
```
脚本会再次确保存在一个 seed 用户并补充至少 2 本书。

---
## 8. 功能验证流程
1. 注册用户：`POST /api/users`
```bash
curl -X POST http://127.0.0.1:8000/api/users -H 'Content-Type: application/json' -d '{"student_id":"20250001","name":"测试用户","phone":"13800001111","password":"pass123"}'
```
2. 发布书籍：使用返回的 `id` 作为 `seller_id`
```bash
curl -X POST http://127.0.0.1:8000/api/books -H 'Content-Type: application/json' -d '{"isbn":"9787111549999","title":"操作系统实践","author":"测试作者","original_price":88,"selling_price":35,"condition_level":"good","description":"演示发布","seller_id":"<用户ID>"}'
```
3. 查询书籍：`GET /api/books`
4. 创建订单（购买）：`POST /api/orders`
```bash
curl -X POST http://127.0.0.1:8000/api/orders -H 'Content-Type: application/json' -d '{"book_id":"<书籍ID>","buyer_id":"<买家用户ID>","delivery_method":"meetup","meetup_location":"图书馆门口"}'
```
5. 订单状态更新：`PATCH /api/orders/{order_id}` → 完成/取消会同步书籍状态。

---
## 9. 环境变量
| 变量 | 默认值 | 说明 |
|------|--------|------|
| DB_USER | Inaglyite | MySQL 用户名 |
| DB_PASS | H20041227j | MySQL 密码 |
| DB_HOST | 127.0.0.1 | 主机地址 |
| DB_PORT | 3306 | 端口 |
| DB_NAME | dhu_secondhand_platform | 数据库名 |

可放入 `backend/.env` 或在运行命令前临时导出：
```bash
export DB_USER=Inaglyite DB_PASS=H20041227j DB_NAME=dhu_secondhand_platform
```

---
## 10. 常见问题排查 FAQ
| 问题 | 可能原因 | 解决 |
|------|----------|------|
| address already in use | 端口被旧进程占用 | `./scripts/run_mvp.sh kill-port` 或手动 kill |
| Seller not found | 发布时 seller_id 不存在 | 先调用 /api/users 创建用户并用其 id |
| hashed_password 列错误 | 初始 SQL 缺少列 | 应用启动已尝试添加；可重新导入 SQL 或手动 ALTER |
| 前端不显示新书 | 使用了 mock 或缓存 | 刷新、检查网络请求是否指向 8000 端口 |
| 书籍不能下架 | 前端未调用 PATCH 接口 | 调用 `/api/books/{id}/status` body: `{"status":"off_shelf"}` |
| 订单未改变书籍状态 | 状态逻辑仅在 create/complete/cancel 中 | 检查响应与书籍状态字段 |

查看日志：
```bash
./scripts/run_mvp.sh logs
```

---
## 11. Git 提交与推送教程
首次推送：
```bash
git init   # 若仓库未初始化
# 添加远程（已存在则跳过）
git remote add origin https://github.com/Inaglyite/software_engineer.git
# 查看变更
git status
# 添加所有文件
git add .
# 提交
git commit -m "feat: 初始项目文档与脚本"
# 推送到 master 分支
git push -u origin master
```
如果出现 TLS 断开错误，可尝试：
```bash
git config --global http.postBuffer 524288000
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999
```
或使用 SSH：
```bash
# 生成 SSH 密钥（若无）
ssh-keygen -t ed25519 -C "your_email@example.com"
# 将公钥加入 GitHub，然后：
git remote set-url origin git@github.com:Inaglyite/software_engineer.git
```

---
## 12. 下一步 Roadmap
- ✅ 基础书籍 CRUD / 订单创建
- 🔜 用户登录 / JWT 授权
- 🔜 配送任务接单流程
- 🔜 图片上���（封面）
- 🔜 分页 / 排序 / 筛选
- 🔜 Alembic 迁移管理

---
## 贡献方式
欢迎提交 PR：
1. 分支命名：`feat/xxx` `fix/xxx`
2. 提交信息：`feat: 描述` / `fix: 描述`
3. 确保脚本与接口可正常运行：
```bash
./scripts/run_mvp.sh status
npm run build
```

## 许可证
当前为内部原型，尚未指定开源许可证（可后续选择 MIT / Apache-2.0）。

---
如果部署或功能测试遇到其它问题，可以在 Issues 中描述复现步骤与日志片段（`./scripts/run_mvp.sh logs` 输出）以便快速定位。祝你开发顺利！
