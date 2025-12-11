import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchBook } from '../services/books';
import type { Book } from '../types/book';
import {
  Card,
  Descriptions,
  Tag,
  Spin,
  Alert,
  Button,
  message,
  Typography,
  Space,
  Row,
  Col,
  Divider,
  Image,
  Grid,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { purchaseBookFromDetail } from '../services/orders';
import { palette, conditionColorMap, statusColorMap } from '../theme/design';

const { Title, Text } = Typography;

export default function BookDetail() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [hoveredThumb, setHoveredThumb] = useState<number | null>(null);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    const run = async () => {
      if (!bookId) return;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setLoading(true);
      setError(null);
      try {
        const data = await fetchBook(bookId);
        setBook(data);
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
    run();
  }, [bookId]);

  const handlePurchase = async () => {
    if (!book || book.status !== 'available') return;
    setPurchaseLoading(true);
    try {
      const order = await purchaseBookFromDetail(book.id);
      message.success('订单已创建，进入支付流程');
      navigate(`/payment/${order.id}`);
    } catch (e) {
      const getErrorDetail = (err: unknown): string | undefined => {
        if (!err || typeof err !== 'object') return undefined;
        const obj = err as Record<string, unknown>;
        if (!('response' in obj)) return undefined;
        const resp = obj['response'];
        if (!resp || typeof resp !== 'object') return undefined;
        const respObj = resp as Record<string, unknown>;
        const data = respObj['data'];
        if (!data || typeof data !== 'object') return undefined;
        const dataObj = data as Record<string, unknown>;
        const detailVal = dataObj['detail'];
        return typeof detailVal === 'string' ? detailVal : undefined;
      };
      const detail = getErrorDetail(e);
      message.error(detail || '购买失败');
    } finally {
      setPurchaseLoading(false);
    }
  };

  const renderContainer = (content: React.ReactNode) => (
    <div
      style={{
        background: palette.background,
        minHeight: '100vh',
        padding: isMobile ? '16px 12px 40px' : '40px 32px 64px',
        transition: 'padding 0.3s ease',
      }}
    >
      <Card
        hoverable
        bordered={false}
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          borderRadius: 20,
          boxShadow: '0 25px 60px rgba(15,23,42,0.08)',
          background: palette.surface,
        }}
        bodyStyle={{ padding: isMobile ? 20 : 32 }}
      >
        {content}
      </Card>
    </div>
  );

  if (loading) {
    return renderContainer(
      <div style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="正在加载书籍详情..." />
      </div>,
    );
  }

  if (error) {
    return renderContainer(
      <Alert
        style={{ minHeight: 180 }}
        type="error"
        message={error}
        action={
          <Space>
            <Button onClick={() => navigate(-1)}>返回</Button>
            <Button type="primary" onClick={() => window.location.reload()}>
              重试
            </Button>
          </Space>
        }
      />,
    );
  }

  if (!book) {
    return renderContainer(<Alert type="warning" message="未找到该书籍" />);
  }

  const cond = book.condition || book.condition_level;
  const galleryImages = book.gallery_images ?? [];
  const displayPrice = book.price ?? book.selling_price ?? book.original_price;
  const originalPrice = book.original_price ?? book.originalPrice;
  const isAvailable = book.status === 'available';

  return renderContainer(
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row align="middle" justify="space-between" wrap>
        <div>
          <Text style={{ color: palette.muted, textTransform: 'uppercase', letterSpacing: 1.2 }}>Book Detail</Text>
          <Title level={3} style={{ margin: 0, color: palette.text }}>
            {book.title}
          </Title>
        </div>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回上一页
        </Button>
      </Row>

      <Row gutter={[24, 24]} align="stretch">
        <Col xs={24} md={10}>
          <div
            style={{
              position: 'relative',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 15px 35px rgba(15,23,42,0.2)',
              minHeight: isMobile ? 280 : 360,
              background: '#111827',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {book.cover_image ? (
              <Image
                src={book.cover_image}
                alt={`${book.title}-cover`}
                width="100%"
                height={isMobile ? 280 : 360}
                style={{ objectFit: 'cover' }}
                preview={{ mask: '查看大图' }}
              />
            ) : (
              <Text style={{ color: palette.muted }}>暂无封面</Text>
            )}
          </div>
        </Col>
        <Col xs={24} md={14}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">售价</Text>
              <Title level={2} style={{ margin: '8px 0 0', color: palette.text }}>
                ¥{displayPrice ?? '--'}
              </Title>
              {originalPrice && (
                <Text delete style={{ color: palette.muted }}>
                  ¥{originalPrice}
                </Text>
              )}
            </div>
            <Space size={[8, 8]} wrap>
              <Tag color={statusColorMap[book.status] || 'default'}>{book.status}</Tag>
              {cond && <Tag color={conditionColorMap[cond] || 'default'}>品相：{cond}</Tag>}
            </Space>
            <Text style={{ color: palette.muted, lineHeight: 1.7 }}>
              {book.description || '暂无描述'}
            </Text>
            <Button
              type="primary"
              size="large"
              block
              onClick={handlePurchase}
              disabled={!isAvailable}
              loading={purchaseLoading}
              style={{
                height: 48,
                fontSize: 16,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                boxShadow: '0 12px 20px rgba(22,119,255,0.25)',
              }}
            >
              {isAvailable ? '立即购买' : '暂不可购买'}
            </Button>
            {!isAvailable && (
              <Text type="secondary">该书籍当前状态为 {book.status}，暂无法购买。</Text>
            )}
          </Space>
        </Col>
      </Row>

      <Divider style={{ margin: isMobile ? '8px 0' : '16px 0' }} />

      <Descriptions
        bordered
        column={{ xs: 1, sm: 1, md: 2 }}
        size="small"
        labelStyle={{
          fontWeight: 600,
          color: palette.muted,
          width: isMobile ? 90 : 120,
        }}
        contentStyle={{ color: palette.text }}
      >
        <Descriptions.Item label="作者">{book.author || '未知'}</Descriptions.Item>
        <Descriptions.Item label="ISBN">{book.isbn || 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="售价">¥{displayPrice ?? '--'}</Descriptions.Item>
        <Descriptions.Item label="原价">¥{originalPrice ?? '--'}</Descriptions.Item>
        <Descriptions.Item label="品相">
          {cond ? <Tag color={conditionColorMap[cond] || 'default'}>{cond}</Tag> : '未标记'}
        </Descriptions.Item>
        <Descriptions.Item label="描述">{book.description || '暂无描述'}</Descriptions.Item>
        <Descriptions.Item label="状态">{book.status}</Descriptions.Item>
        <Descriptions.Item label="卖家ID">{book.seller_id ?? book.sellerId ?? '未知'}</Descriptions.Item>
      </Descriptions>

      {galleryImages.length > 0 && (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Title level={4} style={{ marginBottom: 8 }}>更多图片</Title>
          <Image.PreviewGroup>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(3, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))',
                gap: 12,
              }}
            >
              {galleryImages.map((g, i) => (
                <div
                  key={g + i}
                  onMouseEnter={() => setHoveredThumb(i)}
                  onMouseLeave={() => setHoveredThumb(null)}
                  style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow:
                      hoveredThumb === i ? '0 18px 30px rgba(15,23,42,0.25)' : '0 8px 15px rgba(15,23,42,0.12)',
                    transform: hoveredThumb === i ? 'translateY(-6px) scale(1.03)' : 'translateY(0)',
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                  }}
                >
                  <Image
                    src={g}
                    alt={`gallery-${i}`}
                    width="100%"
                    height={isMobile ? 90 : 120}
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          </Image.PreviewGroup>
        </Space>
      )}

      <Divider />

      <Space direction="horizontal" size="middle" wrap>
        <Button type="link" onClick={() => navigate(-1)}>
          返回上一页
        </Button>
        <Link to="/books">返回到书籍列表页</Link>
      </Space>
    </Space>,
  );
}
