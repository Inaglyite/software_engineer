import api from './api';
import type { UserProfile } from '../types/user';
import type { Order } from '../types/order';
import type { Book } from '../types/book';

export async function fetchProfile() {
  const { data } = await api.get<UserProfile>('/me');
  return data;
}

export async function updateProfile(payload: Partial<Pick<UserProfile, 'name' | 'phone'>>) {
  const { data } = await api.patch<UserProfile>('/me', payload);
  localStorage.setItem('user_name', data.name);
  return data;
}

export interface ChangePasswordPayload { old_password: string; new_password: string; }
export async function changePassword(payload: ChangePasswordPayload) {
  const { data } = await api.patch('/me/password', payload);
  return data;
}

export async function fetchMyBooks() {
  const { data } = await api.get<Book[]>('/me/books');
  return data;
}

export async function fetchMyOrders() {
  const { data } = await api.get<Order[]>('/me/orders');
  return data;
}

export async function fetchMySales() {
  const { data } = await api.get<Order[]>('/me/sales');
  return data;
}

