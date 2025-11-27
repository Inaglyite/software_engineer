export type OrderStatus = 'pending' | 'confirmed' | 'paid' | 'shipping' | 'completed' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type DeliveryMethod = 'meetup' | 'delivery';
export type PaymentMethod = 'wechat' | 'alipay' | 'cash' | null;

export interface Order {
  id: string;
  order_number: string;
  book_id: string;
  buyer_id: string;
  seller_id: string;
  book_price: number;
  delivery_fee: number;
  total_amount: number;
  status: OrderStatus;
  delivery_method: DeliveryMethod;
  meetup_location?: string | null;
  meetup_time?: string | null;
  pickup_location?: string | null;
  delivery_location?: string | null;
  payment_method?: PaymentMethod;
  payment_status: PaymentStatus;
  payment_due_at?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
}
