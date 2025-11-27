import api from './api';
import type { Order } from '../types/order';

export interface CreateOrderPayload {
  book_id: string;
  delivery_method: 'meetup' | 'delivery';
  meetup_location?: string;
  meetup_time?: string;
  payment_method?: 'wechat' | 'alipay' | 'cash';
}

export async function createOrder(payload: CreateOrderPayload) {
  const userId = localStorage.getItem('user_id');
  if (!userId) throw new Error('未登录');
  const { data } = await api.post<Order>('/orders', {
    ...payload,
    buyer_id: userId,
  });
  return data;
}

export async function createOrderFromDetail(bookId: string) {
  return createOrder({ book_id: bookId, delivery_method: 'meetup' });
}

export async function payOrder(orderId: string, payment_method?: CreateOrderPayload['payment_method']) {
  const { data } = await api.post<Order>(`/orders/${orderId}/pay`, { payment_method });
  return data;
}

export async function cancelOrder(orderId: string) {
  const { data } = await api.post<Order>(`/orders/${orderId}/cancel`);
  return data;
}

export async function fetchOrder(orderId: string) {
  const { data } = await api.get<Order>(`/orders/${orderId}`);
  return data;
}
