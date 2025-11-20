import { useEffect, useState } from 'react'
import './App.css'
import { fetchBooks } from './services/books'
import type { Book } from './types/book'

function App() {
  const [books, setBooks] = useState<Book[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchBooks(q)
      setBooks(data)
    } catch (e: any) {
      setError(e?.message ?? 'Load failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="container">
      <h1>东华大学众包二手书交易平台 - 原型</h1>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="按书名/作者/ISBN搜索"
        />
        <button onClick={load} disabled={loading}>
          {loading ? '搜索中…' : '搜索'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <ul>
        {books.map((b) => (
          <li key={b.id}>
            <strong>{b.title}</strong> — {b.author} · ￥{b.price}（原价￥{b.originalPrice}）
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
