import { useEffect, useState } from 'react';
import { Card, List, Tag, Button, message, Space, Typography, Result, Empty } from 'antd';
import { ReloadOutlined, CheckOutlined, CarOutlined } from '@ant-design/icons';
import api from '../services/api';
import { PageShell } from '../components/PageShell';
import { palette, statusColorMap } from '../theme/design';

const { Title, Text } = Typography;

interface DeliveryTask {
  id: string;
  order_id: string;
  courier_id?: string | null;
  pickup_location: string;
  delivery_location: string;
  delivery_fee: number;
  status: string;
}

export default function DeliveryTasks() {
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<DeliveryTask[]>('/delivery_tasks');
      setTasks(data);
    } catch (e: unknown) {
      const detail =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setError(detail || '加载失败');
      message.error(detail || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const accept = async (id: string) => {
    try {
      await api.post(`/delivery_tasks/${id}/accept`);
      message.success('接单成功');
      load();
    } catch (e: unknown) {
      const detail =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      message.error(detail || '接单失败');
    }
  };

  return (
    <PageShell>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Text style={{ color: palette.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Courier</Text>
            <Title level={3} style={{ margin: 0, color: palette.text }}>
              配送订单
            </Title>
          </div>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            刷新
          </Button>
        </Space>

        {error && (
          <Result
            status="error"
            title="加载配送任务失败"
            subTitle={error}
            extra={<Button onClick={load}>重试</Button>}
          />
        )}

        <Card bordered={false} style={{ borderRadius: 18 }} bodyStyle={{ padding: 0 }}>
          <List
            dataSource={tasks}
            loading={loading}
            locale={{ emptyText: <Empty description="暂无待配送任务" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            renderItem={(t) => {
              const accepted = t.status !== 'pending';
              return (
                <List.Item style={{ padding: 24 }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                      <Space size="small">
                        <CarOutlined style={{ color: palette.accent }} />
                        <Text strong>任务ID: {t.id}</Text>
                      </Space>
                      <Tag color={statusColorMap[t.status] || (accepted ? 'blue' : 'orange')}>
                        {t.status}
                      </Tag>
                    </Space>
                    <Text type="secondary">订单号：{t.order_id}</Text>
                    <Text>取书地点：{t.pickup_location}</Text>
                    <Text>送书地点：{t.delivery_location}</Text>
                    <Text strong>配送费：¥{t.delivery_fee}</Text>
                    {!accepted ? (
                      <Button
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={() => accept(t.id)}
                        style={{ alignSelf: 'flex-start' }}
                      >
                        接单
                      </Button>
                    ) : (
                      <Text type="secondary">
                        已被接单{t.courier_id ? `，配送员ID: ${t.courier_id}` : ''}
                      </Text>
                    )}
                  </Space>
                </List.Item>
              );
            }}
          />
        </Card>
      </Space>
    </PageShell>
  );
}
