import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Descriptions, Button, message, Spin, Alert, Space, Divider, Typography, Tag, Result, Form, Input, Checkbox, InputNumber, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { fetchOrder, payOrder, cancelOrder, requestDelivery } from '../services/orders';
import { fetchBook } from '../services/books';
import type { Order } from '../types/order';
import type { Book } from '../types/book';
import { PageShell } from '../components/PageShell';
import { palette, statusColorMap } from '../theme/design';

const { Title, Text } = Typography;

export default function Payment() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deliveryForm] = Form.useForm();
  const [arrangeDelivery, setArrangeDelivery] = useState(false);
  const [deliverySubmitting, setDeliverySubmitting] = useState(false);

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

  useEffect(() => {
    if (order?.delivery_method === 'delivery') {
      setArrangeDelivery(true);
      deliveryForm.setFieldsValue({
        pickup_location: order.pickup_location,
        delivery_location: order.delivery_location,
        delivery_fee: order.delivery_fee,
        preferred_time: order.meetup_time ? dayjs(order.meetup_time) : undefined,
      });
    }
  }, [order, deliveryForm]);

  const handleApplyDelivery = async (values: { pickup_location: string; delivery_location: string; delivery_fee: number; preferred_time?: dayjs.Dayjs }) => {
    if (!order) return;
    setDeliverySubmitting(true);
    try {
      const updated = await requestDelivery(order.id, {
        pickup_location: values.pickup_location,
        delivery_location: values.delivery_location,
        delivery_fee: values.delivery_fee,
        preferred_time: values.preferred_time ? values.preferred_time.toISOString() : undefined,
      });
      setOrder(updated);
      message.success('已申请众包配送');
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? '申请配送失败');
    } finally {
      setDeliverySubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin size="large" tip="正在加载订单..." />
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <Result
          status="error"
          title="无法加载订单"
          subTitle={error}
          extra={<Button type="primary" onClick={load}>重试</Button>}
        />
      </PageShell>
    );
  }

  if (!order) {
    return (
      <PageShell>
        <Alert type="warning" message="订单不存在" />
      </PageShell>
    );
  }

  const pending = order.payment_status === 'pending';

  return (
    <PageShell>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space align="center" style={{ justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Text style={{ color: palette.muted, textTransform: 'uppercase' }}>Payment</Text>
            <Title level={3} style={{ margin: 0 }}>订单支付</Title>
          </div>
          <Button type="text" onClick={() => navigate(-1)}>
            返回
          </Button>
        </Space>

        {order.payment_status !== 'pending' && (
          <Alert type="info" message={`当前状态: ${order.status}`} showIcon />
        )}

        <Card bordered={false} style={{ borderRadius: 18 }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card type="inner" title="支付倒计时" bordered={false} style={{ background: palette.background }}>
              <Text strong>{countdownText}</Text>
              <div style={{ marginTop: 8 }}>
                <Tag color={statusColorMap[order.payment_status] || 'default'}>支付状态：{order.payment_status}</Tag>
              </div>
            </Card>

            <Card type="inner" title="书籍信息" bordered={false} style={{ background: palette.background }}>
              {book ? (
                <Descriptions column={{ xs: 1, sm: 1, md: 2 }} bordered size="small">
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

            <Card type="inner" title="订单信息" bordered={false} style={{ background: palette.background }}>
              <Descriptions column={{ xs: 1, sm: 1, md: 2 }} bordered size="small">
                <Descriptions.Item label="订单号">{order.order_number}</Descriptions.Item>
                <Descriptions.Item label="订单金额">¥{order.total_amount}</Descriptions.Item>
                <Descriptions.Item label="配送方式">{order.delivery_method === 'meetup' ? '自提/面交' : '配送'}</Descriptions.Item>
                <Descriptions.Item label="取书地点">{order.pickup_location || order.meetup_location || '待定'}</Descriptions.Item>
                <Descriptions.Item label="送书地点">{order.delivery_location || '待定'}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{order.created_at}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card type="inner" title="配送选项" bordered={false} style={{ background: palette.background }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Checkbox checked={arrangeDelivery} onChange={(e) => setArrangeDelivery(e.target.checked)}>
                  申请众包配送（需要填写取送地点与配送费）
                </Checkbox>
                {arrangeDelivery && (
                  <Form
                    layout="vertical"
                    form={deliveryForm}
                    initialValues={{ delivery_fee: 5 }}
                    onFinish={handleApplyDelivery}
                  >
                    <Form.Item label="取书地点" name="pickup_location" rules={[{ required: true, message: '请输入取书地点' }]}>
                      <Input placeholder="如：宿舍楼下" />
                    </Form.Item>
                    <Form.Item label="送书地点" name="delivery_location" rules={[{ required: true, message: '请输入送书地点' }]}>
                      <Input placeholder="如：XX教学楼" />
                    </Form.Item>
                    <Form.Item label="配送费用 (¥)" name="delivery_fee" rules={[{ required: true, message: '请输入配送费用' }]}>
                      <InputNumber min={0} step={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item label="期望送达时间" name="preferred_time">
                      <DatePicker showTime style={{ width: '100%' }} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={deliverySubmitting}>
                      保存配送需求
                    </Button>
                  </Form>
                )}
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="书籍价格">¥{order.book_price}</Descriptions.Item>
                  <Descriptions.Item label="配送费用">¥{order.delivery_fee ?? 0}</Descriptions.Item>
                  <Descriptions.Item label="总金额">¥{order.total_amount}</Descriptions.Item>
                </Descriptions>
              </Space>
            </Card>

            <Divider />

            <Space size="middle" wrap>
              <Button danger onClick={handleCancel} disabled={submitting || !pending}>
                取消订单
              </Button>
              <Button type="primary" onClick={handlePay} loading={submitting} disabled={!pending}>
                确认付款
              </Button>
            </Space>
          </Space>
        </Card>
      </Space>
    </PageShell>
  );
}
