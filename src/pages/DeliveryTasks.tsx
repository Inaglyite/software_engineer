import { useEffect, useState } from 'react';
import { Card, List, Tag, Button, message } from 'antd';
import api from '../services/api';

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

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<DeliveryTask[]>('/delivery_tasks');
      setTasks(data);
    } catch (e: unknown) {
      const detail = (e && typeof e === 'object' && 'response' in e) ? (e as any).response?.data?.detail : undefined;
      message.error(detail || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const accept = async (id: string) => {
    try {
      await api.post(`/delivery_tasks/${id}/accept`);
      message.success('接单成功');
      load();
    } catch (e: unknown) {
      const detail = (e && typeof e === 'object' && 'response' in e) ? (e as any).response?.data?.detail : undefined;
      message.error(detail || '接单失败');
    }
  };

  return (
    <Card title="配送订单" extra={<Button onClick={load} loading={loading}>刷新</Button>} style={{ background: '#fff' }}>
      <List
        dataSource={tasks}
        loading={loading}
        renderItem={(t) => {
          const accepted = t.status !== 'pending';
          return (
            <List.Item>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>任务ID: {t.id}</strong>
                  <Tag color={accepted ? 'blue' : 'orange'}>{t.status}</Tag>
                </div>
                <div>取书地点: {t.pickup_location}</div>
                <div>送书地点: {t.delivery_location}</div>
                <div>配送费: ¥{t.delivery_fee}</div>
                {!accepted && <Button type="primary" size="small" onClick={() => accept(t.id)}>接单</Button>}
                {accepted && <div style={{ fontSize: 12, color: '#555' }}>已被接单{t.courier_id ? `，配送员ID: ${t.courier_id}` : ''}</div>}
              </div>
            </List.Item>
          );
        }}
      />
    </Card>
  );
}
