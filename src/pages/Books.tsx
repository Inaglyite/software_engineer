import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchBooks } from '../services/books';
import type { Book } from '../types/book';
import {
  Card,
  Tag,
  Button,
  Space,
  Spin,
  Result,
  Row,
  Col,
  Typography,
  Skeleton,
  Empty,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { PageShell } from '../components/PageShell';
import { conditionColorMap, palette, statusColorMap } from '../theme/design';

const { Title, Text } = Typography;

export default function Books() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBooks();
      setBooks(data);
    } catch (e: unknown) {
      let msg = '加载失败';
      if (e && typeof e === 'object') {
        if ('message' in e && typeof (e as { message?: unknown }).message === 'string') {
          msg = (e as { message: string }).message;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    const interval = setInterval(load, 15000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, []);

  return (
    <PageShell>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Text style={{ color: palette.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Library</Text>
            <Title level={3} style={{ margin: 0, color: palette.text }}>
              书籍列表
            </Title>
          </div>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            刷新
          </Button>
        </Space>

        {error && (
          <Result
            status="error"
            title="加载失败"
            subTitle={error}
            extra={
              <Button type="primary" onClick={load}>
                重试
              </Button>
            }
          />
        )}

        {loading && books.length === 0 ? (
          <Row gutter={[16, 16]}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Col key={i} xs={24} sm={12} md={8} lg={6} xl={4}>
                <Card hoverable style={{ borderRadius: 16 }}>
                  <Skeleton active avatar paragraph={{ rows: 3 }} />
                </Card>
              </Col>
            ))}
          </Row>
        ) : books.length === 0 ? (
          <Empty description="暂无书籍" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Row gutter={[20, 20]}>
            {books.map((b) => {
              const cond = b.condition || b.condition_level;
              const price = b.price ?? b.selling_price ?? b.original_price;
              return (
                <Col key={b.id} xs={24} sm={12} md={8} lg={6} xl={6}>
                  <Link to={`/books/${b.id}`} style={{ textDecoration: 'none' }}>
                    <Card
                      hoverable
                      style={{ borderRadius: 18, height: '100%' }}
                      bodyStyle={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}
                    >
                      <div style={{ display: 'flex', gap: 16 }}>
                        {b.cover_image ? (
                          <img
                            src={b.cover_image}
                            alt="cover"
                            style={{
                              width: 88,
                              height: 120,
                              objectFit: 'cover',
                              borderRadius: 12,
                              boxShadow: '0 12px 20px rgba(15,23,42,0.15)',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 88,
                              height: 120,
                              borderRadius: 12,
                              background: '#0f172a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#94a3b8',
                              fontSize: 12,
                            }}
                          >
                            无封面
                          </div>
                        )}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <Title level={5} style={{ margin: 0, color: palette.text }}>
                            {b.title}
                          </Title>
                          <Text type="secondary">作者：{b.author || '未知'}</Text>
                          <Text>价格：¥{price ?? '--'}</Text>
                          <Space size={[8, 8]} wrap>
                            {cond && (
                              <Tag color={conditionColorMap[cond] || 'default'} style={{ margin: 0 }}>
                                {cond}
                              </Tag>
                            )}
                            {b.status && (
                              <Tag color={statusColorMap[b.status] || 'default'} style={{ margin: 0 }}>
                                {b.status}
                              </Tag>
                            )}
                          </Space>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </Col>
              );
            })}
          </Row>
        )}

        {loading && books.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <Spin tip="正在刷新列表..." />
          </div>
        )}
      </Space>
    </PageShell>
  );
}
