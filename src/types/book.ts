export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher?: string;
  publish_year?: number;
  edition?: string;
  original_price: number; // backend snake_case
  selling_price: number; // backend snake_case
  condition_level: 'excellent' | 'good' | 'fair' | 'poor';
  description?: string;
  cover_image?: string | null;
  gallery_images?: string[];
  seller_id: string;
  status: 'available' | 'reserved' | 'sold' | 'off_shelf';
  images?: string[]; // optional for mock compatibility
  // legacy fields from mock for compatibility
  price?: number; // front older code
  originalPrice?: number;
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  sellerId?: string;
  createdAt?: string;
}
