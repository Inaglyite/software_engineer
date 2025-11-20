import { useEffect, useState } from 'react';
import { fetchBooks } from '../services/books';
import type { Book } from '../types/book';
import { Card, Input, Button, Row, Col } from 'antd';
import { Link } from 'react-router-dom';

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
      setBooks(data.slice(0, 8)); // 只展示前8本作为“最新”
    } catch (e: unknown) {
      const msg = typeof e === 'object' && e && 'message' in e ? String((e as any).message) : 'Load failed';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card bordered={false} style={{ background: '#fff' }}>
        <h2 style={{ marginTop: 0 }}>首页</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="按书名/作者/ISBN搜索"
            style={{ flex: '1 1 240px', minWidth: 240 }}
          />
          <Button type="primary" onClick={load} loading={loading}>搜索</Button>
          <Link to="/books"><Button>更多书籍</Button></Link>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </Card>
      <Card title="最新书籍" bordered={false} style={{ background: '#fff' }}>
        <Row gutter={[16, 16]}>
          {books.map(b => (
            <Col key={b.id} xs={12} sm={8} md={6} lg={6} xl={4}>
              <Link to={`/books/${b.id}`} style={{ color: 'inherit' }}>
                <Card size="small" hoverable>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>{b.author}</div>
                  <div style={{ fontSize: 12 }}>¥{b.price ?? b.selling_price ?? b.original_price}</div>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}
