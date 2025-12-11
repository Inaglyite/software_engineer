import type { ReactNode } from 'react';

export const palette = {
  background: '#f5f7fb',
  surface: '#ffffff',
  accent: '#1677ff',
  positive: '#52c41a',
  warning: '#fa8c16',
  danger: '#ff4d4f',
  text: '#1f2937',
  muted: '#64748b',
  border: '#e2e8f0',
};

export const cardShadow = '0 25px 60px rgba(15,23,42,0.08)';
export const hoverShadow = '0 18px 30px rgba(15,23,42,0.12)';

export const conditionColorMap: Record<string, string> = {
  excellent: 'green',
  good: 'blue',
  fair: 'orange',
  poor: 'red',
};

export const statusColorMap: Record<string, string> = {
  available: '#52c41a',
  reserved: '#fa8c16',
  sold: '#ff4d4f',
  pending: '#fa8c16',
  confirmed: '#1677ff',
  completed: '#52c41a',
  cancelled: '#ff4d4f',
};

export interface PageSectionConfig {
  title: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
}

