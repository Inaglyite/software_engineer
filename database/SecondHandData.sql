-- 东华大学众包二手书交易平台数据库脚本
-- 创建数据库
CREATE DATABASE IF NOT EXISTS dhu_secondhand_platform
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE dhu_secondhand_platform;

-- 用户表
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    student_id VARCHAR(20) UNIQUE NOT NULL COMMENT '学号',
    name VARCHAR(50) NOT NULL COMMENT '姓名',
    email VARCHAR(100) UNIQUE COMMENT '邮箱',
    phone VARCHAR(20) NOT NULL COMMENT '手机号',
    avatar_url VARCHAR(500) COMMENT '头像URL',
    hashed_password VARCHAR(128) NULL COMMENT '密码哈希',
    credit_score INT DEFAULT 100 COMMENT '信用分，初始100分',
    total_transactions INT DEFAULT 0 COMMENT '总交易次数',
    positive_reviews INT DEFAULT 0 COMMENT '好评数',
    negative_reviews INT DEFAULT 0 COMMENT '差评数',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_student_id (student_id),
    INDEX idx_phone (phone),
    INDEX idx_credit_score (credit_score)
) COMMENT '用户表';

-- 书籍分类表
CREATE TABLE book_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL COMMENT '分类名称',
    description TEXT COMMENT '分类描述',
    parent_id INT DEFAULT NULL COMMENT '父分类ID',
    sort_order INT DEFAULT 0 COMMENT '排序',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (parent_id) REFERENCES book_categories(id),
    INDEX idx_parent_id (parent_id)
) COMMENT '书籍分类表';

-- 书籍信息表
CREATE TABLE books (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    isbn VARCHAR(20) NOT NULL COMMENT 'ISBN号',
    title VARCHAR(200) NOT NULL COMMENT '书名',
    author VARCHAR(100) NOT NULL COMMENT '作者',
    publisher VARCHAR(100) COMMENT '出版社',
    publish_date DATE COMMENT '出版日期',
    edition VARCHAR(50) COMMENT '版次',
    category_id INT COMMENT '分类ID',
    cover_image VARCHAR(500) COMMENT '封面图片',
    description TEXT COMMENT '书籍描述',

    -- 标准化字段
    original_price DECIMAL(10,2) NOT NULL COMMENT '原价',
    selling_price DECIMAL(10,2) NOT NULL COMMENT '售价',
    condition_level ENUM('excellent', 'good', 'fair', 'poor') NOT NULL COMMENT '品相等级',
    condition_description TEXT COMMENT '品相详细描述',

    -- 交易相关
    seller_id VARCHAR(36) NOT NULL COMMENT '卖家ID',
    status ENUM('available', 'reserved', 'sold', 'off_shelf') DEFAULT 'available' COMMENT '书籍状态',
    view_count INT DEFAULT 0 COMMENT '浏览数',
    favorite_count INT DEFAULT 0 COMMENT '收藏数',

    -- 审核相关
    is_approved BOOLEAN DEFAULT FALSE COMMENT '是否审核通过',
    approved_by VARCHAR(36) COMMENT '审核人',
    approved_at TIMESTAMP NULL COMMENT '审核时间',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES book_categories(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),

    INDEX idx_isbn (isbn),
    INDEX idx_seller_id (seller_id),
    INDEX idx_status (status),
    INDEX idx_category_id (category_id),
    INDEX idx_price (selling_price),
    INDEX idx_created_at (created_at)
) COMMENT '书籍信息表';

-- 书籍图片表
CREATE TABLE book_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id VARCHAR(36) NOT NULL COMMENT '书籍ID',
    image_url VARCHAR(500) NOT NULL COMMENT '图片URL',
    sort_order INT DEFAULT 0 COMMENT '排序',
    is_primary BOOLEAN DEFAULT FALSE COMMENT '是否主图',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    INDEX idx_book_id (book_id)
) COMMENT '书籍图片表';

-- 订单表
CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_number VARCHAR(50) UNIQUE NOT NULL COMMENT '订单编号',
    book_id VARCHAR(36) NOT NULL COMMENT '书籍ID',
    buyer_id VARCHAR(36) NOT NULL COMMENT '买家ID',
    seller_id VARCHAR(36) NOT NULL COMMENT '卖家ID',

    -- 价格信息
    book_price DECIMAL(10,2) NOT NULL COMMENT '书籍价格',
    delivery_fee DECIMAL(10,2) DEFAULT 0 COMMENT '配送费',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '总金额',

    -- 交易信息
    status ENUM('pending', 'confirmed', 'paid', 'shipping', 'completed', 'cancelled', 'refunded') DEFAULT 'pending' COMMENT '订单状态',
    delivery_method ENUM('meetup', 'delivery') NOT NULL COMMENT '配送方式',
    meetup_location VARCHAR(200) COMMENT '见面地点',
    meetup_time TIMESTAMP NULL COMMENT '见面时间',

    -- 支付信息
    payment_method ENUM('wechat', 'alipay', 'cash') COMMENT '支付方式',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending' COMMENT '支付状态',
    paid_at TIMESTAMP NULL COMMENT '支付时间',

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL COMMENT '完成时间',
    cancelled_at TIMESTAMP NULL COMMENT '取消时间',

    FOREIGN KEY (book_id) REFERENCES books(id),
    FOREIGN KEY (buyer_id) REFERENCES users(id),
    FOREIGN KEY (seller_id) REFERENCES users(id),

    INDEX idx_order_number (order_number),
    INDEX idx_buyer_id (buyer_id),
    INDEX idx_seller_id (seller_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) COMMENT '订单表';

-- 众包配送员表
CREATE TABLE couriers (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    id_card_number VARCHAR(20) NOT NULL COMMENT '身份证号',
    id_card_front VARCHAR(500) COMMENT '身份证正面',
    id_card_back VARCHAR(500) COMMENT '身份证反面',
    student_card VARCHAR(500) COMMENT '学生证照片',
    status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending' COMMENT '审核状态',
    total_orders INT DEFAULT 0 COMMENT '总接单数',
    completed_orders INT DEFAULT 0 COMMENT '完成订单数',
    rating DECIMAL(3,2) DEFAULT 5.0 COMMENT '评分',
    is_online BOOLEAN DEFAULT FALSE COMMENT '是否在线接单',
    last_online_time TIMESTAMP NULL COMMENT '最后上线时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_is_online (is_online)
) COMMENT '众包配送员表';

-- 配送任务表
CREATE TABLE delivery_tasks (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_id VARCHAR(36) NOT NULL COMMENT '订单ID',
    courier_id VARCHAR(36) COMMENT '配送员ID',
    pickup_location VARCHAR(200) NOT NULL COMMENT '取书地点',
    delivery_location VARCHAR(200) NOT NULL COMMENT '送书地点',
    delivery_fee DECIMAL(10,2) NOT NULL COMMENT '配送费',
    status ENUM('pending', 'accepted', 'picked_up', 'delivering', 'delivered', 'cancelled') DEFAULT 'pending' COMMENT '配送状态',
    estimated_duration INT COMMENT '预计时长(分钟)',
    actual_duration INT COMMENT '实际时长(分钟)',
    pickup_code VARCHAR(10) COMMENT '取书码',
    delivery_code VARCHAR(10) COMMENT '送达码',
    accepted_at TIMESTAMP NULL COMMENT '接单时间',
    picked_up_at TIMESTAMP NULL COMMENT '取书时间',
    delivered_at TIMESTAMP NULL COMMENT '送达时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (courier_id) REFERENCES couriers(id),

    INDEX idx_order_id (order_id),
    INDEX idx_courier_id (courier_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) COMMENT '配送任务表';

-- 评价表
CREATE TABLE reviews (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_id VARCHAR(36) NOT NULL COMMENT '订单ID',
    reviewer_id VARCHAR(36) NOT NULL COMMENT '评价人ID',
    reviewed_id VARCHAR(36) NOT NULL COMMENT '被评价人ID',
    role ENUM('buyer', 'seller', 'courier') NOT NULL COMMENT '评价角色',
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5) COMMENT '评分1-5',
    content TEXT COMMENT '评价内容',
    tags JSON COMMENT '评价标签',
    is_anonymous BOOLEAN DEFAULT FALSE COMMENT '是否匿名',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_id) REFERENCES users(id),

    UNIQUE KEY unique_order_reviewer (order_id, reviewer_id, role),
    INDEX idx_reviewed_id (reviewed_id),
    INDEX idx_rating (rating),
    INDEX idx_created_at (created_at)
) COMMENT '评价表';

-- 收藏表
CREATE TABLE favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    book_id VARCHAR(36) NOT NULL COMMENT '书籍ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,

    UNIQUE KEY unique_user_book (user_id, book_id),
    INDEX idx_user_id (user_id),
    INDEX idx_book_id (book_id)
) COMMENT '收藏表';

-- 聊天会话表
CREATE TABLE chat_sessions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user1_id VARCHAR(36) NOT NULL COMMENT '用户1ID',
    user2_id VARCHAR(36) NOT NULL COMMENT '用户2ID',
    book_id VARCHAR(36) COMMENT '关联书籍ID',
    last_message TEXT COMMENT '最后一条消息',
    last_message_at TIMESTAMP NULL COMMENT '最后消息时间',
    unread_count_user1 INT DEFAULT 0 COMMENT '用户1未读消息数',
    unread_count_user2 INT DEFAULT 0 COMMENT '用户2未读消息数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user1_id) REFERENCES users(id),
    FOREIGN KEY (user2_id) REFERENCES users(id),
    FOREIGN KEY (book_id) REFERENCES books(id),

    UNIQUE KEY unique_user_pair (user1_id, user2_id, book_id),
    INDEX idx_user1_id (user1_id),
    INDEX idx_user2_id (user2_id),
    INDEX idx_last_message_at (last_message_at)
) COMMENT '聊天会话表';

-- 聊天消息表
CREATE TABLE chat_messages (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    session_id VARCHAR(36) NOT NULL COMMENT '会话ID',
    sender_id VARCHAR(36) NOT NULL COMMENT '发送者ID',
    message_type ENUM('text', 'image', 'system') DEFAULT 'text' COMMENT '消息类型',
    content TEXT NOT NULL COMMENT '消息内容',
    image_url VARCHAR(500) COMMENT '图片URL',
    is_read BOOLEAN DEFAULT FALSE COMMENT '是否已读',
    read_at TIMESTAMP NULL COMMENT '阅读时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id),

    INDEX idx_session_id (session_id),
    INDEX idx_sender_id (sender_id),
    INDEX idx_created_at (created_at)
) COMMENT '聊天消息表';

-- 系统公告表
CREATE TABLE announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL COMMENT '公告标题',
    content TEXT NOT NULL COMMENT '公告内容',
    author_id VARCHAR(36) NOT NULL COMMENT '发布人ID',
    is_pinned BOOLEAN DEFAULT FALSE COMMENT '是否置顶',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否有效',
    publish_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (author_id) REFERENCES users(id),

    INDEX idx_publish_at (publish_at),
    INDEX idx_is_pinned (is_pinned),
    INDEX idx_is_active (is_active)
) COMMENT '系统公告表';

-- 初始化数据
INSERT INTO book_categories (name, description, sort_order) VALUES
('教材类', '各专业课程教材', 1),
('教辅类', '考试辅导书籍', 2),
('文学类', '小说、散文等文学作品', 3),
('科技类', '计算机、工程技术等', 4),
('经济类', '经济、管理、金融', 5),
('艺术类', '美术、音乐、设计', 6),
('外语类', '外语学习书籍', 7),
('其他', '其他类别书籍', 8);

-- 创建管理员用户（初始密码需要加密处理）
INSERT INTO users (id, student_id, name, phone, credit_score) VALUES
(UUID(), 'admin001', '系统管理员', '13800138000', 100);

-- 创建索引优化查询性能
CREATE INDEX idx_books_search ON books(title, author, publisher);
CREATE INDEX idx_orders_composite ON orders(buyer_id, status, created_at);
CREATE INDEX idx_delivery_tasks_composite ON delivery_tasks(status, created_at);

-- 创建视图便于统计查询
CREATE VIEW book_statistics AS
SELECT
    b.id,
    b.title,
    b.seller_id,
    u.name as seller_name,
    b.view_count,
    b.favorite_count,
    COUNT(DISTINCT f.id) as actual_favorites,
    COUNT(DISTINCT o.id) as order_count
FROM books b
LEFT JOIN users u ON b.seller_id = u.id
LEFT JOIN favorites f ON b.id = f.book_id
LEFT JOIN orders o ON b.id = o.book_id AND o.status = 'completed'
GROUP BY b.id, b.title, b.seller_id, u.name, b.view_count, b.favorite_count;

-- 输出创建完成信息
SELECT '东华大学众包二手书交易平台数据库创建完成!' as message;