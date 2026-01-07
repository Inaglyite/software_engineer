import api from './api';

export interface DeliveryTask {
  id: string;
  order_id: string;
  courier_id: string | null;
  pickup_location: string;
  delivery_location: string;
  delivery_fee: number;
  status: string;
  pickup_image?: string | null;
  delivery_image?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export async function fetchMyDeliveryTasks() {
  const { data } = await api.get<DeliveryTask[]>('/me/delivery-tasks');
  return data;
}

export async function fetchDeliveryTask(taskId: string) {
  const { data } = await api.get<DeliveryTask>(`/delivery_tasks/${taskId}`);
  return data;
}

export async function cancelDeliveryTask(taskId: string) {
  const { data } = await api.post<DeliveryTask>(`/delivery_tasks/${taskId}/cancel`);
  return data;
}

export async function completeDeliveryTask(taskId: string) {
  const { data } = await api.post<DeliveryTask>(`/delivery_tasks/${taskId}/complete`);
  return data;
}

export async function deleteDeliveryTask(taskId: string) {
  const { data } = await api.delete(`/me/delivery-tasks/${taskId}`);
  return data;
}

export async function uploadDeliveryImage(taskId: string, file: File, imageType: 'pickup' | 'delivery') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('image_type', imageType);
  
  const { data } = await api.post(`/delivery_tasks/${taskId}/upload-image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}

