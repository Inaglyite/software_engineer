# 东华二手书平台 (DHU Secondhand Books)

一个面向校园二手书交易 + 众包配送的全栈原型，支持书籍发布/收藏/购买、订单支付、众包配送、评价体系与个人中心。前端：React + TypeScript + Vite + Ant Design；后端：FastAPI + SQLAlchemy 2.x + Alembic；数据库：MySQL 8；鉴权：简单 Token（可扩展 JWT）。

> 本 README 提供“保姆级”部署教程（Linux / Windows），包含一键脚本、手动命令、数据库初始化、Alembic 迁移、功能验证与排错。

## Checklist
- [ ] 快速体验 / Tech Stack
- [ ] 环境准备
- [ ] 保姆级部署（Linux）
- [ ] 保姆级部署（Windows）
- [ ] 脚本命令说明
- [ ] 手动启动 & Alembic 迁移
- [ ] 数据库 & 种子数据
- [ ] 功能验证流程
- [ ] 环境变量
- [ ] FAQ
- [ ] Git 推送指引
- [ ] Roadmap / Feature Highlight

---
## 1. 快速体验 & Feature Highlight
| 功能 | 描述 |
|------|------|
| 书籍管理 | 发布/编辑/删除/上下架，必填 ISBN、书名、作者、出版社、封面；可选出版年份/版次/多图。 |
| 收藏夹 | `POST /api/books/{id}/favorite` 与 `DELETE /favorite`，前端个人中心支持查看。 |
| 购买流程 | `/books/{id}/purchase` → 生成 15 分钟待支付订单；未支付自动释放库存。 |
| 支付/订单 | 订单状态、支付状态联动，个人中心可查看「我的订单/售出/在售」。 |
| 评价体系 | 买家/卖家可对完成订单写评价，支持标签/匿名。 |
| 众包配送 | 订单可生成 Delivery Task，配送员接单、状态流转。 |
| 后端管理页 | `/admin` 提供书籍 / 订单 / 用户审查与下架。 |
| 静态资源 | `/uploads` 存储封面/相册，支持多图上传。 |

### 技术栈
- **前端**：Vite + React + TypeScript + Ant Design + Axios
- **后端**：FastAPI、Pydantic v2、SQLAlchemy 2.0 ORM（自定义 Mixins、关联关系）
- **数据库**：MySQL 8（推荐），通过 `database/SecondHandData.sql` 初始化
- **迁移**：Alembic（`alembic revision --autogenerate` / `alembic upgrade head`）
- **依赖管理**：pip + requirements.txt / npm + package-lock
- **脚本**：`scripts/run_mvp.sh`（Linux）与 `run.bat`（Windows）一键起停

---
## 2. 环境准备
| 组件 | 版本建议 | 备注 |
|------|----------|------|
| Python | ≥ 3.10 | 建议 3.11+，需 `python3-venv` |
| Node.js | ≥ 18 | Vite dev server |
| MySQL | 8.x（支持 5.7） | 已创建用户 `Inaglyite / H20041227j` |
| Git | 最新 | clone / push |
| OpenSSL / cryptography | 最新 | MySQL caching_sha2_auth 需 `cryptography` Python 包 |

Linux 依赖示例：
```bash
sudo apt update
sudo apt install -y python3-venv mysql-client build-essential
```

---
## 3. 保姆级部署（Linux / macOS）
1. **克隆**
   ```bash
   git clone https://github.com/Inaglyite/software_engineer.git
   cd software_engineer
   ```
2. **数据库**（首次）
   ```sql
   CREATE DATABASE IF NOT EXISTS dhu_secondhand_platform
     DEFAULT CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci;
   ```
3. **环境变量（可选）**：创建 `backend/.env`
   ```env
   DB_USER=Inaglyite
   DB_PASS=H20041227j
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=dhu_secondhand_platform
   ```
4. **一键脚本**
   ```bash
   chmod +x scripts/run_mvp.sh
   ./scripts/run_mvp.sh start     # 初始化 DB + 创建 venv + 启动前后端
   ./scripts/run_mvp.sh status    # 查看 PID / 端口
   ./scripts/run_mvp.sh logs      # 打印后端日志路径
   ```
5. **验证**
   ```bash
   curl http://127.0.0.1:8000/api/health
   curl http://127.0.0.1:8000/api/books
   ```
   浏览器打开：http://localhost:5173

---
## 4. 保姆级部署（Windows）
1. **克隆**
   ```bat
git clone https://github.com/Inaglyite/software_engineer.git
cd software_engineer
   ```
2. **MySQL**：使用 Workbench / 命令行执行与 Linux 相同的建库 SQL。
3. **初始化 & 启动**
   ```bat
run.bat init    REM 创建 venv + 安装依赖
run.bat start   REM 启动前端/后端
   ```
4. **验证**：浏览器访问 http://localhost:5173 与 http://127.0.0.1:8000/docs

---
## 5. 脚本命令速查
### Linux：`scripts/run_mvp.sh`
```bash
./scripts/run_mvp.sh start       # 初始化 DB + 启动
./scripts/run_mvp.sh stop        # 停止前后端
./scripts/run_mvp.sh restart     # 重启后端
./scripts/run_mvp.sh backend     # 仅后端（uvicorn）
./scripts/run_mvp.sh frontend    # 仅前端（npm run dev）
./scripts/run_mvp.sh seed        # 执行 scripts/seed_data.py
./scripts/run_mvp.sh status      # 显示 PID、端口
./scripts/run_mvp.sh kill-port   # 释放 8000
./scripts/run_mvp.sh logs        # tail 后端日志
```

### Windows：`run.bat`
```bat
run.bat init
run.bat start
run.bat backend
run.bat frontend
run.bat status
run.bat stop
run.bat seed
run.bat logs
```

---
## 6. 手动启动 + Alembic 迁移
### 后端
```bash
python -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
export DB_USER=Inaglyite DB_PASS=H20041227j DB_NAME=dhu_secondhand_platform
alembic upgrade head   # 同步 schema（首次需先 revision）
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```
> 如果提示 `cryptography` 缺失：`pip install cryptography`

### 前端
```bash
npm install
npm run dev
```

### Alembic 工作流
```bash
cd backend
source .venv/bin/activate
alembic revision --autogenerate -m "feat: update schema"
alembic upgrade head
```
- `backend/alembic.ini` 已指向本地 MySQL；也可通过 `.env` 覆盖。
- 模型定义位于 `backend/app/models/*.py`，包含 mixin / 关联关系。

---
## 7. 数据库初始化与种子数据
- **自动导入**：首次 `./scripts/run_mvp.sh start` 会检测数据库，必要时执行 `database/SecondHandData.sql`，并通过 `startup` 钩子补充列（publisher/cover/pickup_location 等）。
- **手动执行脚本**：
  ```bash
  mysql -u Inaglyite -p dhu_secondhand_platform < database/SecondHandData.sql
  ./scripts/run_mvp.sh seed
  ```
- **种子内容**：`seed_data.py` 创建一个种子卖家与至少两本书，便于验证前端。

---
## 8. 功能验证流程（API 示例）
```bash
# 1. 注册用户
curl -X POST http://127.0.0.1:8000/api/users \
  -H 'Content-Type: application/json' \
  -d '{"student_id":"20250001","name":"Alice","phone":"13800001111","password":"pass123"}'

# 2. 登录，得到 token
curl -X POST http://127.0.0.1:8000/api/login \
  -H 'Content-Type: application/json' \
  -d '{"student_id":"20250001","password":"pass123"}'

# 3. 发布书籍（带封面/相册）
curl -H "Authorization: Bearer <token>" \
  -H 'Content-Type: application/json' \
  -d '{
        "isbn":"9787111122225",
        "title":"活着",
        "author":"余华",
        "publisher":"作家出版社",
        "original_price":50,
        "selling_price":10,
        "condition_level":"good",
        "cover_image":"/uploads/demo.jpg",
        "gallery_images":["/uploads/demo.jpg"],
        "seller_id":"<user_id>"
      }' \
  http://127.0.0.1:8000/api/books

# 4. 搜索/收藏/下单
curl http://127.0.0.1:8000/api/books?q=%E6%B4%BB%E7%9D%80
curl -H "Authorization: Bearer <token>" -X POST http://127.0.0.1:8000/api/books/<book_id>/favorite
curl -H "Authorization: Bearer <token>" -X POST http://127.0.0.1:8000/api/books/<book_id>/purchase

# 5. 付款 & 评价
curl -H "Authorization: Bearer <token>" -X POST http://127.0.0.1:8000/api/orders/<order_id>/pay -d '{"payment_method":"wechat"}'
curl -H "Authorization: Bearer <token>" -X POST http://127.0.0.1:8000/api/orders/<order_id>/reviews -d '{"rating":5,"content":"好书"}'
```

---
## 9. 环境变量
| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DB_USER` | Inaglyite | MySQL 用户名 |
| `DB_PASS` | H20041227j | MySQL 密码 |
| `DB_HOST` | 127.0.0.1 | 数据库地址 |
| `DB_PORT` | 3306 | 端口 |
| `DB_NAME` | dhu_secondhand_platform | 库名 |
| `PAYMENT_WINDOW_MINUTES` | 15 | 待付款时限 |
| `UVICORN_RELOAD` | false | 手动设置热重载 |

---
## 10. FAQ & 排障
| 问题 | 可能原因 | 解决 |
|------|----------|------|
| `address already in use` | 上次后端未关闭 | `./scripts/run_mvp.sh kill-port` 或 `fuser -k 8000/tcp` |
| `Seller not found` | 发布书籍时 `seller_id` 不存在 | 先创建用户 / 使用登陆返回的 `user_id` |
| `Book not available` | 书籍已被保留/售出 | 在个人中心上架/取消订单 |
| `Cannot drop index ...` | Alembic 尝试删除 FK 依赖索引 | 调整迁移脚本：先删除 FK 再删索引或跳过 |
| `RuntimeError: cryptography required` | MySQL caching_sha2_password | `pip install cryptography` 后重试 |
| 前端 UI 不居中 | CSS 使用 px | 使用 `flex`/`grid` 或修改 `App.css` |
| 书籍详情返回 | React Router 状态缓存 | 目前已修复，若仍复现请刷新并清理缓存 |

查看日志：`tail -f .logs/backend.out`

---
## 11. Git 提交与推送
```bash
git status
git add .
git commit -m "feat: update orm + docs"
git push -u origin master
```
若出现 `GnuTLS recv error (-110)`：
```bash
git config --global http.postBuffer 524288000
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999
```
或改用 SSH：`git remote set-url origin git@github.com:Inaglyite/software_engineer.git`

---
## 12. Roadmap
- ✅ 书籍 CRUD / 收藏 / 订单 / 配送任务 / 评价 / 个人中心
- ✅ Alembic + SQLAlchemy ORM 重构（BookImage、Courier、Favorite、Review、Chat、Announcement 等模型）
- 🔜 JWT / Refresh Token & RBAC
- 🔜 图片上传直传 OSS / CDN
- 🔜 WebSocket 聊天、消息推送
- 🔜 完整支付流程（第三方接口）
- 🔜 更细粒度的后台权限 + 数据可视化

## 贡献方式
1. Fork & Clone；2. 新建分支 `feat/xxx`；3. 提交前运行 `npm run build` 与 `./scripts/run_mvp.sh status`；4. 提交 PR 描述改动与测试结果。

欢迎反馈 Bug 或提交改进！
