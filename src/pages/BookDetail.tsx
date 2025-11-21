import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchBook } from '../services/books';
import type { Book } from '../types/book';
import { Card, Descriptions, Tag, Spin, Alert, Button, message } from 'antd';
import { createOrderFromDetail } from '../services/orders';

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
      await createOrderFromDetail(book.id);
      message.success('下单成功');
      const updated = await fetchBook(book.id);
      setBook(updated);
    } catch (e) {
      const detail = (e && typeof e === 'object' && 'response' in e) ? (e as any).response?.data?.detail : undefined;
      message.error(detail || '购买失败');
    }
  };

  if (loading) return <Spin />;
  if (error) return <Alert type="error" message={error} />;
  if (!book) return <Alert type="warning" message="未找到该书籍" />;

  const cond = book.condition || book.condition_level;

  return (
    <Card title={book.title} extra={<Button type="link" onClick={() => navigate(-1)}>/ 返回列表</Button>}>
      <Button type="primary" disabled={book.status !== 'available'} onClick={handlePurchase} style={{ marginBottom: 12 }}>
        {book.status === 'available' ? '购买' : '不可购买'}
      </Button>
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
