import { useEffect, useState } from 'react';
import { fetchBooks } from '../services/books';
import type { Book } from '../types/book';
import {
  Card,
  Input,
  Button,
  Row,
  Col,
  Typography,
  Space,
  Result,
  Skeleton,
  Empty,
} from 'antd';
import { Link } from 'react-router-dom';
import { SearchOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { PageShell } from '../components/PageShell';
import { palette } from '../theme/design';

const { Title, Text } = Typography;

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBooks(q);
      setBooks(data.slice(0, 8));
    } catch (e: unknown) {
      const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageShell>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card
          bordered={false}
          style={{ borderRadius: 18, background: palette.surface }}
          bodyStyle={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div>
            <Text style={{ color: palette.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Discover</Text>
            <Title level={2} style={{ margin: 0, color: palette.text }}>
              找到下一本心仪的书
            </Title>
            <Text style={{ color: palette.muted }}>
              浏览校园二手书库，支持按书名、作者或 ISBN 搜索。
            </Text>
          </div>
          <Space style={{ width: '100%', flexWrap: 'wrap', gap: 12 }}>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="按书名/作者/ISBN搜索"
              prefix={<SearchOutlined style={{ color: palette.muted }} />}
              style={{ flex: '1 1 280px', minWidth: 240 }}
              allowClear
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={load} loading={loading}>
              搜索
            </Button>
            <Link to="/books">
              <Button type="default" icon={<ArrowRightOutlined />}>更多书籍</Button>
            </Link>
          </Space>
          {error && (
            <Result
              status="warning"
              title={error}
              extra={
                <Button type="primary" onClick={load}>
                  重试
                </Button>
              }
            />
          )}
        </Card>

        <Card
          title={<Title level={4} style={{ margin: 0 }}>最新入库</Title>}
          bordered={false}
          style={{ borderRadius: 18 }}
          bodyStyle={{ padding: 24 }}
          extra={<Link to="/books">查看全部</Link>}
        >
          {loading && books.length === 0 ? (
            <Row gutter={[16, 16]}>
              {Array.from({ length: 8 }).map((_, idx) => (
                <Col key={idx} xs={12} sm={8} md={6} lg={6} xl={3}>
                  <Card size="small" style={{ borderRadius: 12 }}>
                    <Skeleton active paragraph={{ rows: 2 }} title={false} />
                  </Card>
                </Col>
              ))}
            </Row>
          ) : books.length === 0 ? (
            <Empty description="暂无推荐书籍" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Row gutter={[20, 20]}>
              {books.map((b) => (
                <Col key={b.id} xs={12} sm={8} md={6} lg={6} xl={3}>
                  <Link to={`/books/${b.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Card
                      size="small"
                      hoverable
                      style={{ borderRadius: 16 }}
                      bodyStyle={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}
                    >
                      <Title level={5} style={{ margin: 0, color: palette.text }}>
                        {b.title}
                      </Title>
                      <Text type="secondary">{b.author || '未知作者'}</Text>
                      <Text strong>¥{b.price ?? b.selling_price ?? b.original_price ?? '--'}</Text>
                    </Card>
                  </Link>
                </Col>
              ))}
            </Row>
          )}
        </Card>
      </Space>
    </PageShell>
  );
}
