import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchBooks } from '../services/books';
import type { Book } from '../types/book';
import { Card, List, Tag } from 'antd';

const conditionColor: Record<string, string> = {
  excellent: 'green',
  good: 'blue',
  fair: 'orange',
  poor: 'red',
};

export default function Books() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const data = await fetchBooks();
        setBooks(data);
      } catch (e: any) {
        setError(e?.message ?? '加载失败');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div>
      <Card title="书籍列表" bordered={false} style={{ background: '#fff' }}>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
          loading={loading}
          dataSource={books}
          renderItem={(b: Book) => {
            const cond = b.condition || b.condition_level;
            return (
              <List.Item>
                <Card hoverable size="small">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Link to={`/books/${b.id}`} style={{ fontWeight: 600 }}>{b.title}</Link>
                    <div style={{ fontSize: 12, color: '#555' }}>作者：{b.author}</div>
                    <div style={{ fontSize: 12 }}>价格：￥{b.price ?? b.selling_price ?? b.original_price}</div>
                    {cond && <Tag color={conditionColor[cond] || 'default'} style={{ width: 'fit-content' }}>{cond}</Tag>}
                  </div>
                </Card>
              </List.Item>
            );
          }}
        />
      </Card>
    </div>
  );
}
