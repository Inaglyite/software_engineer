import api from './api';

export interface LoginPayload { student_id: string; password: string; }
export interface LoginResult { access_token: string; user_id: string; student_id: string; name: string; }
export interface RegisterPayload { student_id: string; name: string; phone: string; password: string; }

export async function login(payload: LoginPayload) {
  const { data } = await api.post<LoginResult>('/login', payload);
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('user_id', data.user_id);
  localStorage.setItem('student_id', data.student_id);
  localStorage.setItem('user_name', data.name);
  return data;
}

export async function register(payload: RegisterPayload) {
  const { data } = await api.post('/users', payload);
  return data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('student_id');
  localStorage.removeItem('user_name');
}

export function isLoggedIn() {
  return !!localStorage.getItem('token');
}

