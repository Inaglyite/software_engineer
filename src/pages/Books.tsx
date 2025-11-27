import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchBooks } from '../services/books';
import type { Book } from '../types/book';
import { Card, List, Tag, Button, Space } from 'antd';

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

  const load = async () => {
    setLoading(true);
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
    const interval = setInterval(load, 15000); // 15s 轮询一次
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      <Card title={
        <Space>
          <span>书籍列表</span>
          <Button size="small" onClick={load} loading={loading}>刷新</Button>
        </Space>
      } bordered={false} style={{ background: '#fff' }}>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
          loading={loading}
          dataSource={books}
          renderItem={(b: Book) => {
            const cond = b.condition || b.condition_level;
            return (
              <List.Item>
                <Link to={`/books/${b.id}`} style={{ display: 'block' }}>
                  <Card hoverable size="small">
                    <div style={{ display: 'flex', gap: 12 }}>
                      {b.cover_image ? (
                        <img src={b.cover_image} alt="cover" style={{ width: 96, height: 128, objectFit: 'cover', borderRadius: 4 }} />
                      ) : (
                        <div style={{ width: 96, height: 128, background: '#f0f0f0', borderRadius: 4 }} />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontWeight: 600 }}>{b.title}</div>
                        <div style={{ fontSize: 12, color: '#555' }}>作者：{b.author}</div>
                        <div style={{ fontSize: 12 }}>价格：¥{b.price ?? b.selling_price ?? b.original_price}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {cond && <Tag color={conditionColor[cond] || 'default'} style={{ width: 'fit-content' }}>{cond}</Tag>}
                          {b.status && <Tag>{b.status}</Tag>}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </List.Item>
            );
          }}
        />
      </Card>
    </div>
  );
}
