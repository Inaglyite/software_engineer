import api from './api';
import type { Book } from '../types/book';
import { MOCK_BOOKS } from '../data/mockBooks';

const adapt = (b: Book): Book => {
  // unify fields for UI usage (prefer backend naming)
  return {
    ...b,
    price: b.selling_price ?? b.price ?? b.originalPrice ?? 0,
    originalPrice: b.original_price ?? b.originalPrice ?? 0,
    condition: b.condition_level ?? b.condition,
    cover_image: b.cover_image ?? b.images?.[0] ?? null,
    gallery_images: b.gallery_images ?? b.images ?? [],
    sellerId: b.seller_id ?? b.sellerId,
  };
};

export async function fetchBooks(q?: string) {
  try {
    const params = q ? { q } : undefined;
    const { data } = await api.get<Book[]>('/books', { params });
    return data.map(adapt);
  } catch (err: any) {
    // Only fallback on network errors (backend not reachable), not on 4xx/5xx
    const isNetwork = !err?.response && !!err?.request;
    if (import.meta.env.DEV && isNetwork) {
      const query = (q ?? '').toLowerCase();
      return MOCK_BOOKS.filter(
        (b) =>
          !query ||
          b.title.toLowerCase().includes(query) ||
          b.author.toLowerCase().includes(query) ||
          b.isbn.includes(query),
      ).map(adapt);
    }
    throw err;
  }
}

export async function fetchBook(bookId: string) {
  try {
    const { data } = await api.get<Book>(`/books/${bookId}`);
    return adapt(data);
  } catch (err: any) {
    const isNetwork = !err?.response && !!err?.request;
    if (import.meta.env.DEV && isNetwork) {
      const found = MOCK_BOOKS.find((b) => b.id === bookId);
      if (found) return adapt(found);
    }
    throw err;
  }
}

export interface CreateBookPayload {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  publish_year?: number;
  edition?: string;
  original_price: number;
  selling_price: number;
  condition_level: 'excellent' | 'good' | 'fair' | 'poor';
  description?: string;
  cover_image: string;
  gallery_images: string[];
  seller_id: string;
}

export async function createBook(payload: CreateBookPayload) {
  const { data } = await api.post<Book>('/books', payload);
  return adapt(data);
}
