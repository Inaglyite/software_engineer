import api from './api';
import type { Order } from '../types/order';

export interface PurchasePayload {
  delivery_method?: 'meetup' | 'delivery';
  meetup_location?: string;
  pickup_location?: string;
  delivery_location?: string;
}

export async function purchaseBook(bookId: string, payload: PurchasePayload = {}) {
  const { data } = await api.post<Order>(`/books/${bookId}/purchase`, payload);
  return data;
}

export async function purchaseBookFromDetail(bookId: string) {
  return purchaseBook(bookId, { delivery_method: 'meetup' });
}

export async function payOrder(orderId: string, payment_method?: 'wechat' | 'alipay' | 'cash') {
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

export interface DeliveryRequestPayload {
  pickup_location: string;
  delivery_location: string;
  delivery_fee: number;
  preferred_time?: string;
}

export async function requestDelivery(orderId: string, payload: DeliveryRequestPayload) {
  const { data } = await api.post<Order>(`/orders/${orderId}/delivery_request`, payload);
  return data;
}
