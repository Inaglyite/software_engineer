import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchBook } from '../services/books';
import type { Book } from '../types/book';
import { Card, Descriptions, Tag, Spin, Alert, Button, message } from 'antd';
import { purchaseBookFromDetail } from '../services/orders';

const conditionColor: Record<string, string> = {
  excellent: 'green',
  good: 'blue',
  fair: 'orange',
  poor: 'red',
};

export default function BookDetail() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!book) return;
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
    }
  };

  if (loading) return <Spin />;
  if (error) return <Alert type="error" message={error} />;
  if (!book) return <Alert type="warning" message="未找到该书籍" />;

  const cond = book.condition || book.condition_level;

  return (
    <Card title={book.title} extra={<Button type="link" onClick={() => navigate(-1)}>/ 返回列表</Button>}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
        {book.cover_image ? (
          <img src={book.cover_image} alt="cover" style={{ width: 160, height: 220, objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <div style={{ width: 160, height: 220, background: '#f0f0f0', borderRadius: 4 }} />
        )}
        <div style={{ flex: 1 }}>
          <Button type="primary" disabled={book.status !== 'available'} onClick={handlePurchase} style={{ marginBottom: 12 }}>
            {book.status === 'available' ? '购买' : '不可购买'}
          </Button>
          {book.gallery_images && book.gallery_images.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {book.gallery_images.map((g, i) => (
                <img key={i} src={g} alt={`img-${i}`} style={{ width: 80, height: 110, objectFit: 'cover', borderRadius: 4 }} />
              ))}
            </div>
          )}
        </div>
      </div>
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="作者">{book.author}</Descriptions.Item>
        <Descriptions.Item label="ISBN">{book.isbn}</Descriptions.Item>
        <Descriptions.Item label="售价">¥{book.price ?? book.selling_price ?? book.original_price}</Descriptions.Item>
        <Descriptions.Item label="原价">¥{book.original_price ?? book.originalPrice}</Descriptions.Item>
        <Descriptions.Item label="品相">
          {cond && <Tag color={conditionColor[cond] || 'default'}>{cond}</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="描述">{book.description}</Descriptions.Item>
        <Descriptions.Item label="状态">{book.status}</Descriptions.Item>
        <Descriptions.Item label="卖家ID">{book.seller_id ?? book.sellerId}</Descriptions.Item>
      </Descriptions>
      <div style={{ marginTop: 12 }}>
        <Link to="/books">返回到书籍列表页</Link>
      </div>
    </Card>
  );
}
