东华大学众包二手书交易平台 - 开发提示词文档
项目概述

项目名称: 东华大学众包二手书交易平台
技术栈: React + TypeScript + FastAPI + PostgreSQL
开发模式: 前后端分离架构
前端开发提示词 (React + TypeScript)
1. 项目初始化
bash

# 创建React + TypeScript项目
npx create-vite@latest dhu-secondhand-books --template react-ts
cd dhu-secondhand-books
npm install

# 安装必要依赖
npm install react-router-dom @reduxjs/toolkit react-redux
npm install axios @types/axios
npm install antd @ant-design/icons
npm install @types/node

2. 项目结构规划
text

src/
├── components/          # 公共组件
│   ├── Layout/         # 布局组件
│   ├── BookCard/       # 书籍卡片
│   ├── SearchBar/      # 搜索组件
│   └── UserAvatar/     # 用户头像
├── pages/              # 页面组件
│   ├── Home/           # 首页
│   ├── Books/          # 书籍列表
│   ├── BookDetail/     # 书籍详情
│   ├── Publish/        # 发布书籍
│   ├── Profile/        # 个人中心
│   ├── Orders/         # 订单管理
│   └── Admin/          # 后台管理
├── services/           # API服务
│   ├── api.ts
│   ├── auth.ts
│   └── books.ts
├── store/              # 状态管理
│   ├── slices/
│   └── index.ts
├── types/              # TypeScript类型定义
│   ├── book.ts
│   ├── user.ts
│   └── order.ts
├── utils/              # 工具函数
└── App.tsx

3. 核心TypeScript类型定义
typescript

// types/book.ts
export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  price: number;
  originalPrice: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  description: string;
  images: string[];
  sellerId: string;
  status: 'available' | 'sold' | 'reserved';
  createdAt: string;
}

// types/user.ts
export interface User {
  id: string;
  studentId: string;
  name: string;
  avatar?: string;
  creditScore: number;
  phone: string;
}

// types/order.ts
export interface Order {
  id: string;
  bookId: string;
  buyerId: string;
  sellerId: string;
  status: 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled';
  deliveryMethod: 'meetup' | 'delivery';
  courierId?: string;
  totalAmount: number;
  createdAt: string;
}

4. 主要页面组件提示词
首页 (Home Page)
typescript

// 功能需求:
// - 搜索栏（按书名、ISBN、作者搜索）
// - 书籍分类展示
// - 推荐书籍轮播
// - 最新上架书籍
// - 热门交易区域

书籍发布页面 (Publish Page)
typescript

// 功能需求:
// - ISBN扫码识别（调用摄像头）
// - 自动填充书籍信息
// - 品相选择（优秀/良好/一般/较差）
// - 价格输入与建议
// - 图片上传（最多5张）
// - 描述信息填写

书籍详情页面 (BookDetail Page)
typescript

// 功能需求:
// - 书籍信息完整展示
// - 卖家信用信息
// - 在线沟通入口
// - 购买流程引导
// - 相似书籍推荐

后端开发提示词 (FastAPI + Python)
1. 项目初始化
bash

# 创建FastAPI项目
mkdir dhu-secondhand-backend
cd dhu-secondhand-backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows

# 安装依赖
pip install fastapi uvicorn sqlalchemy psycopg2-binary pymysql
pip install python-multipart python-jose[cryptography] passlib[bcrypt]
pip install alembic redis requests

2. 项目结构规划
text

backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI应用入口
│   ├── database.py          # 数据库配置
│   ├── models/              # 数据模型
│   │   ├── user.py
│   │   ├── book.py
│   │   ├── order.py
│   │   └── delivery.py
│   ├── schemas/             # Pydantic模型
│   ├── routes/              # API路由
│   │   ├── auth.py
│   │   ├── books.py
│   │   ├── orders.py
│   │   ├── users.py
│   │   └── admin.py
│   ├── core/                # 核心配置
│   │   ├── config.py
│   │   ├── security.py
│   │   └── dependencies.py
│   └── services/            # 业务逻辑
│       ├── auth_service.py
│       ├── book_service.py
│       └── order_service.py
├── alembic/                 # 数据库迁移
├── requirements.txt
└── Dockerfile

3. 核心API接口设计
认证相关
python

# 接口列表:
# POST /api/auth/login - 校园统一认证登录
# POST /api/auth/refresh - 刷新token
# GET /api/auth/me - 获取当前用户信息

书籍相关
python

# 接口列表:
# GET /api/books - 获取书籍列表（支持搜索、分页、筛选）
# POST /api/books - 发布新书籍
# GET /api/books/{book_id} - 获取书籍详情
# PUT /api/books/{book_id} - 更新书籍信息
# DELETE /api/books/{book_id} - 删除书籍
# GET /api/books/recommend - 推荐书籍

订单相关
python

# 接口列表:
# POST /api/orders - 创建订单
# GET /api/orders - 获取用户订单列表
# GET /api/orders/{order_id} - 获取订单详情
# PUT /api/orders/{order_id} - 更新订单状态
# POST /api/orders/{order_id}/delivery - 发布配送需求

4. 数据库模型提示词
用户模型 (User)
python

# 字段需求:
# - id: 主键
# - student_id: 学号（唯一）
# - name: 姓名
# - hashed_password: 加密密码
# - avatar_url: 头像URL
# - credit_score: 信用分
# - phone: 手机号
# - created_at: 创建时间

书籍模型 (Book)
python

# 字段需求:
# - id: 主键
# - isbn: ISBN号
# - title: 书名
# - author: 作者
# - publisher: 出版社
# - price: 售价
# - original_price: 原价
# - condition: 品相等级
# - description: 描述
# - images: 图片URL列表
# - seller_id: 卖家ID
# - status: 状态
# - view_count: 浏览数

部署配置提示词
Docker配置
dockerfile

# 前端Dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

环境变量配置
bash

# .env 文件示例
DATABASE_URL=postgresql://user:pass@localhost/dhu_secondhand
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
UPLOAD_DIR=./uploads

开发阶段规划
第一阶段 (MVP)

    用户认证系统

    书籍发布与浏览

    基础搜索功能

    订单创建流程

第二阶段

    众包物流系统

    在线沟通功能

    信用评价体系

    支付接口集成

第三阶段

    推荐算法

    数据统计分析

    移动端优化

    性能优化

注意事项

    安全性: 实现JWT认证、输入验证、SQL注入防护

    性能: 使用Redis缓存热点数据，数据库索引优化

    可扩展性: 采用微服务架构思想，模块化设计

    用户体验: 响应式设计，加载状态优化，错误处理