import { useEffect, useState } from 'react';
import { fetchBooks, fetchCategories } from '../services/books';
import type { Book } from '../types/book';
import type { BookCategory } from '../types/book';
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
  Tag,
  Image,
  Select,
} from 'antd';
import { Link } from 'react-router-dom';
import { SearchOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { PageShell } from '../components/PageShell';
import { palette } from '../theme/design';

const { Title, Text } = Typography;

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [q, setQ] = useState('');
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (categoryId = activeCategory) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBooks({ q, categoryId: categoryId ?? undefined });
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
    const initCategories = async () => {
      try {
        const list = await fetchCategories();
        setCategories(list);
      } catch (e) {
        console.warn('加载分类失败', e);
      }
    };
    initCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSearching = !!q.trim();

  return (
    <PageShell>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Card
          bordered={false}
          style={{ borderRadius: 18, background: palette.surface }}
          bodyStyle={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}
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
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Space style={{ width: '100%', flexWrap: 'wrap', gap: 12 }}>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="按书名/作者/ISBN搜索"
                prefix={<SearchOutlined style={{ color: palette.muted }} />}
                style={{ flex: '1 1 280px', minWidth: 240 }}
                allowClear
              />
              <Select
                allowClear
                placeholder="选择分类"
                value={activeCategory ?? undefined}
                style={{ width: 200, minWidth: 180 }}
                onChange={(val) => {
                  const catId = typeof val === 'number' ? val : null;
                  setActiveCategory(catId);
                  load(catId);
                }}
                options={[
                  { label: '全部', value: undefined },
                  ...categories.map((c) => ({ label: c.name, value: c.id })),
                ]}
              />
              <Button type="primary" icon={<SearchOutlined />} onClick={() => load(activeCategory)} loading={loading}>
                搜索
              </Button>
              <Link to="/books">
                <Button type="default" icon={<ArrowRightOutlined />}>更多书籍</Button>
              </Link>
            </Space>
          </Space>
          {error && (
            <Result
              status="warning"
              title={error}
              extra={
                <Button type="primary" onClick={() => load(activeCategory)}>
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
                <Col key={idx} xs={12} sm={8} md={6} lg={4} xl={3}>
                  <Card size="small" style={{ borderRadius: 16, overflow: 'hidden' }}>
                    <Skeleton.Image style={{ width: '100%', height: 180 }} active />
                    <Skeleton active paragraph={{ rows: 1 }} title={false} style={{ marginTop: 12 }} />
                  </Card>
                </Col>
              ))}
            </Row>
          ) : books.length === 0 ? (
            <Empty description="暂无推荐书籍" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Row gutter={[16, 20]}>
              {books.map((b) => {
                const cover = b.cover_image || b.images?.find((img) => (img as any).is_primary)?.image_url || b.gallery_images?.[0];
                return (
                  <Col key={b.id} xs={12} sm={8} md={6} lg={4} xl={3}>
                    <Link to={`/books/${b.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {isSearching ? (
                        <Card
                          hoverable
                          size="small"
                          style={{ borderRadius: 16, overflow: 'hidden', height: '100%' }}
                          bodyStyle={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}
                          cover={
                            cover ? (
                              <div style={{ background: '#f7f8fa', display: 'flex', justifyContent: 'center', padding: 8 }}>
                                <Image
                                  src={cover}
                                  alt={b.title}
                                  style={{ maxHeight: 200, objectFit: 'contain' }}
                                  preview={false}
                                  fallback="https://via.placeholder.com/240x320?text=No+Cover"
                                />
                              </div>
                            ) : (
                              <div style={{ height: 200, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                无封面
                              </div>
                            )
                          }
                        >
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <Title level={5} style={{ margin: 0, color: palette.text }} ellipsis>
                              {b.title}
                            </Title>
                            <Text type="secondary" ellipsis>
                              {b.author || '未知作者'}
                            </Text>
                            <Text strong style={{ color: palette.primary }}>
                              ¥{b.price ?? b.selling_price ?? b.original_price ?? '--'}
                            </Text>
                            {b.category_name && (
                              <Tag color="blue" style={{ alignSelf: 'flex-start' }}>
                                {b.category_name}
                              </Tag>
                            )}
                          </Space>
                        </Card>
                      ) : (
                        <Card
                          hoverable
                          size="small"
                          style={{ borderRadius: 16, overflow: 'hidden', height: '100%', padding: 0 }}
                          bodyStyle={{ display: 'none' }}
                          cover={
                            cover ? (
                              <div style={{ background: '#f7f8fa', display: 'flex', justifyContent: 'center', padding: 8 }}>
                                <Image
                                  src={cover}
                                  alt={b.title}
                                  style={{ maxHeight: 220, objectFit: 'contain' }}
                                  preview={false}
                                  fallback="https://via.placeholder.com/240x320?text=No+Cover"
                                />
                              </div>
                            ) : (
                              <div style={{ height: 220, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                无封面
                              </div>
                            )
                          }
                        />
                      )}
                    </Link>
                  </Col>
                );
              })}
            </Row>
          )}
        </Card>
      </Space>
    </PageShell>
  );
}
