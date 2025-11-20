import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchBook } from '../services/books';
import type { Book } from '../types/book';
import { Card, Descriptions, Tag, Spin, Alert } from 'antd';

const conditionColor: Record<string, string> = {
  excellent: 'green',
  good: 'blue',
  fair: 'orange',
  poor: 'red',
};

export default function BookDetail() {
  const { bookId } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!bookId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchBook(bookId);
        setBook(data);
      } catch (e: any) {
        setError(e?.response?.data?.detail ?? e?.message ?? '加载失败');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [bookId]);

  if (loading) return <Spin />;
  if (error) return <Alert type="error" message={error} />;
  if (!book) return <Alert type="warning" message="未找到该书籍" />;

  const cond = book.condition || book.condition_level;

  return (
    <Card title={book.title} extra={<Link to="/books">返回列表</Link>}>
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="作者">{book.author}</Descriptions.Item>
        <Descriptions.Item label="ISBN">{book.isbn}</Descriptions.Item>
        <Descriptions.Item label="售价">￥{book.price ?? book.selling_price ?? book.original_price}</Descriptions.Item>
        <Descriptions.Item label="原价">￥{book.original_price ?? book.originalPrice}</Descriptions.Item>
        <Descriptions.Item label="品相">
          {cond && <Tag color={conditionColor[cond] || 'default'}>{cond}</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="描述">{book.description}</Descriptions.Item>
        <Descriptions.Item label="状态">{book.status}</Descriptions.Item>
        <Descriptions.Item label="卖家ID">{book.seller_id ?? book.sellerId}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
