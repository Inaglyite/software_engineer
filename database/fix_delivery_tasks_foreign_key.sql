-- 修改 delivery_tasks 表，移除 courier_id 的外键约束
-- 执行此SQL来修复接单失败的问题

USE dhu_secondhand_platform;

-- 1. 查看当前外键约束
SELECT
    CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
    TABLE_SCHEMA = 'dhu_secondhand_platform'
    AND TABLE_NAME = 'delivery_tasks'
    AND REFERENCED_TABLE_NAME IS NOT NULL;

-- 2. 删除外键约束（如果存在）
-- 注意：约束名称可能不同，请根据上面查询结果调整
-- ALTER TABLE delivery_tasks DROP FOREIGN KEY delivery_tasks_ibfk_2;

-- 3. 如果需要，可以重新添加索引（但不是外键）
-- ALTER TABLE delivery_tasks ADD INDEX idx_courier_id (courier_id);

-- 完成后，任何用户都可以接单了

