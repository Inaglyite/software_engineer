import { useState } from 'react';
import { Card, Form, Input, InputNumber, Select, Button, message } from 'antd';
import { createBook } from '../services/books';

const conditionOptions = [
  { value: 'excellent', label: '优秀' },
  { value: 'good', label: '良好' },
  { value: 'fair', label: '一般' },
  { value: 'poor', label: '较差' },
];

export default function Publish() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    const sellerId = localStorage.getItem('user_id');
    if (!sellerId) {
      message.error('缺少 seller_id，请先注册或在控制台设置 localStorage.setItem("user_id", "你的用户ID")');
      return;
    }
    setLoading(true);
    try {
      const requiredFields: Record<string, any> = {
        isbn: values.isbn,
        title: values.title,
        author: values.author,
        original_price: values.original_price,
        selling_price: values.selling_price,
        condition_level: values.condition_level,
      };
      for (const [k, v] of Object.entries(requiredFields)) {
        if (v === undefined || v === null || v === '') {
          message.error(`${k} is required`);
          setLoading(false);
          return;
        }
      }
      await createBook({
        isbn: values.isbn.trim(),
        title: values.title.trim(),
        author: values.author.trim(),
        original_price: Number(values.original_price),
        selling_price: Number(values.selling_price),
        condition_level: values.condition_level,
        description: values.description?.trim(),
        seller_id: sellerId,
      });
      message.success('发布成功');
      form.resetFields();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || e?.message || '发布失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <Card title="发布书籍" bordered={false} style={{ background: '#fff' }}>
        <Form layout="vertical" form={form} onFinish={onFinish}>
          <Form.Item name="isbn" label="ISBN" rules={[{ required: true, message: '请输入ISBN' }]}> <Input allowClear /> </Form.Item>
          <Form.Item name="title" label="书名" rules={[{ required: true, message: '请输入书名' }]}> <Input allowClear /> </Form.Item>
          <Form.Item name="author" label="作者" rules={[{ required: true, message: '请输入作者' }]}> <Input allowClear /> </Form.Item>
          <Form.Item name="original_price" label="原价" rules={[{ required: true, message: '请输入原价' }]}> <InputNumber min={0} step={0.5} style={{ width: '100%' }} /> </Form.Item>
          <Form.Item name="selling_price" label="售价" rules={[{ required: true, message: '请输入售价' }]}> <InputNumber min={0} step={0.5} style={{ width: '100%' }} /> </Form.Item>
          <Form.Item name="condition_level" label="品相" rules={[{ required: true, message: '请选择品相' }]}> <Select options={conditionOptions} /> </Form.Item>
          <Form.Item name="description" label="描述"> <Input.TextArea rows={4} allowClear /> </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>提交</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
