import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Descriptions, Button, message, Spin, Alert, Space, Divider } from 'antd';
import { fetchOrder, payOrder, cancelOrder } from '../services/orders';
import { fetchBook } from '../services/books';
import type { Order } from '../types/order';
import type { Book } from '../types/book';

export default function Payment() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrder(orderId);
      setOrder(data);
      const b = await fetchBook(data.book_id);
      setBook(b);
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? e?.message ?? '加载失败';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const countdownText = useMemo(() => {
    if (!order?.payment_due_at) return '支付截止时间未知';
    const due = new Date(order.payment_due_at).getTime();
    const now = Date.now();
    const diff = Math.max(0, due - now);
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return diff > 0 ? `剩余 ${minutes} 分 ${seconds} 秒支付` : '支付超时，订单将被取消';
  }, [order?.payment_due_at, loading]);

  useEffect(() => {
    if (!order?.payment_due_at) return;
    const timer = setInterval(() => {
      setOrder((prev) => (prev ? { ...prev } : prev));
    }, 1000);
    return () => clearInterval(timer);
  }, [order?.payment_due_at]);

  const handlePay = async () => {
    if (!order) return;
    setSubmitting(true);
    try {
      const paid = await payOrder(order.id);
      message.success('支付完成');
      setOrder(paid);
      navigate('/personal');
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? '支付失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    setSubmitting(true);
    try {
      const cancelled = await cancelOrder(order.id);
      message.info('订单已取消');
      setOrder(cancelled);
      navigate('/books');
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? '取消失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spin />;
  if (error) return <Alert type="error" message={error} />;
  if (!order) return <Alert type="warning" message="订单不存在" />;

  return (
    <Card title="订单支付" extra={<Button onClick={() => navigate(-1)}>返回</Button>}>
      {order.payment_status !== 'pending' && (
        <Alert type="info" message={`当前状态: ${order.status}`} style={{ marginBottom: 16 }} />
      )}
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card type="inner" title="支付倒计时">
          {countdownText}
        </Card>
        <Card type="inner" title="书籍信息">
          {book ? (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="书名">{book.title}</Descriptions.Item>
              <Descriptions.Item label="作者">{book.author}</Descriptions.Item>
              <Descriptions.Item label="ISBN">{book.isbn}</Descriptions.Item>
              <Descriptions.Item label="售价">¥{book.selling_price}</Descriptions.Item>
              <Descriptions.Item label="品相">{book.condition_level}</Descriptions.Item>
              <Descriptions.Item label="描述">{book.description}</Descriptions.Item>
            </Descriptions>
          ) : (
            <Alert type="warning" message="无法加载书籍信息" />
          )}
        </Card>
        <Card type="inner" title="订单信息">
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="订单号">{order.order_number}</Descriptions.Item>
            <Descriptions.Item label="订单金额">¥{order.total_amount}</Descriptions.Item>
            <Descriptions.Item label="配送方式">{order.delivery_method === 'meetup' ? '自提/面交' : '配送'}</Descriptions.Item>
            <Descriptions.Item label="取书地点">{order.pickup_location || order.meetup_location || '待定'}</Descriptions.Item>
            <Descriptions.Item label="送书地点">{order.delivery_location || '待定'}</Descriptions.Item>
          </Descriptions>
        </Card>
        <Divider />
        <Space>
          <Button danger onClick={handleCancel} disabled={submitting || order.payment_status !== 'pending'}>
            取消订单
          </Button>
          <Button type="primary" onClick={handlePay} loading={submitting} disabled={order.payment_status !== 'pending'}>
            确认付款
          </Button>
        </Space>
      </Space>
    </Card>
  );
}

