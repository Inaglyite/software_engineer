import api from './api';
import type { Book, BookCategory } from '../types/book';
export type { BookCategory };
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
    category_id: b.category_id ?? (b as any).categoryId ?? b.category_id,
  };
};

export interface FetchBooksParams {
  q?: string;
  categoryId?: number | null;
}

export async function fetchBooks(params?: FetchBooksParams) {
  try {
    const query: Record<string, unknown> = {};
    if (params?.q) query.q = params.q;
    if (params?.categoryId) query.category_id = params.categoryId;
    const { data } = await api.get<Book[]>('/books', { params: query });
    return data.map(adapt);
  } catch (err: any) {
    // Only fallback on network errors (backend not reachable), not on 4xx/5xx
    const isNetwork = !err?.response && !!err?.request;
    if (import.meta.env.DEV && isNetwork) {
      const query = (params?.q ?? '').toLowerCase();
      const categoryId = params?.categoryId;
      return MOCK_BOOKS.filter((b) => {
        const matchesQuery =
          !query ||
          b.title.toLowerCase().includes(query) ||
          b.author.toLowerCase().includes(query) ||
          b.isbn.includes(query);
        const matchesCategory = !categoryId || b.category_id === categoryId || (b as any).categoryId === categoryId;
        return matchesQuery && matchesCategory;
      }).map(adapt);
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
  category_id: number;
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

export async function fetchCategories(activeOnly = true) {
  const { data } = await api.get<BookCategory[]>('/book_categories', {
    params: activeOnly ? { active_only: true } : undefined,
  });
  return data;
}
