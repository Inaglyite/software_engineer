import { useState } from 'react';
import { Card, Form, Input, InputNumber, Select, Button, message, Alert } from 'antd';
import { createBook } from '../services/books';

const conditionOptions = [
  { value: 'excellent', label: '优秀' },
  { value: 'good', label: '良好' },
  { value: 'fair', label: '一般' },
  { value: 'poor', label: '较差' },
];

interface PublishFormValues {
  isbn: string;
  title: string;
  author: string;
  original_price: number;
  selling_price: number;
  condition_level: 'excellent' | 'good' | 'fair' | 'poor';
  description?: string;
}

export default function Publish() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const sellerId = localStorage.getItem('user_id');
  const loggedIn = !!sellerId;
  // debug state to help diagnose why fields might appear empty
  const [debugState, setDebugState] = useState<{ values: Record<string, unknown> | PublishFormValues; fields: { name: (string|number)[]; errors: string[] }[] }>({ values: {}, fields: [] });

  const onFinish = async (values: PublishFormValues) => {
    if (!loggedIn) {
      message.error('未登录或缺少 seller_id，请先注册/登录');
      return;
    }

    // Extra safety: validateFields here to get full typed values and ensure nothing sneaks through.
    try {
      const validated = await form.validateFields();
      console.debug('Validated fields before submit:', validated);
    } catch (e) {
      // If validation fails here, it will be handled by onFinishFailed; bail out.
      console.debug('validateFields failed before submit', e);
      return;
    }

    setLoading(true);
    try {
      // 这里的必填已经由 Form rules 保证，通过后 values 不会为空
      const payload = {
        isbn: values.isbn.trim(),
        title: values.title.trim(),
        author: values.author.trim(),
        original_price: Number(values.original_price),
        selling_price: Number(values.selling_price),
        condition_level: values.condition_level,
        description: values.description?.trim(),
        seller_id: sellerId!,
      };
      console.debug('Publishing payload', payload);
      await createBook(payload);
      message.success('发布成功');
      form.resetFields();
      setDebugState({ values: {}, fields: [] });
    } catch (e: unknown) {
      interface ErrorResponse { detail?: string; [k: string]: unknown }
      const err = e as { response?: { data?: unknown }; message?: string };
      const data = err.response?.data;
      const isArrayError = Array.isArray(data);
      const detail = (typeof data === 'object' && !Array.isArray(data) && data !== null && 'detail' in data)
        ? (data as ErrorResponse).detail
        : undefined;
      if (isArrayError) {
        message.error('发布失败: 字段校验错误，请检查输入项');
        console.error('Validation errors from backend:', data);
      } else {
        message.error(detail || err?.message || '发布失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed = (info: { errorFields: { errors: string[]; name?: (string | number)[] }[] }) => {
    // AntD 自带校验失败，统一显示第一个错误
    const firstError = info.errorFields?.[0]?.errors?.[0];
    if (firstError) {
      message.error(firstError);
    } else {
      message.error('请检查必填项');
    }
    console.debug('Form submit failed:', info);
    // also update debugState so user can inspect
    const fields = info.errorFields.map(f => ({ name: (f.name as (string | number)[]), errors: f.errors }));
    setDebugState({ values: form.getFieldsValue(), fields });
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <Card title="发布书籍" bordered={false} style={{ background: '#fff' }}>
        {!loggedIn && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="当前未登录，提交按钮已禁用。请先在“登录”页面注册/登录。"
          />
        )}
        <Form
          layout="vertical"
          form={form}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          validateTrigger={["onChange", "onBlur", "onSubmit"]}
          onValuesChange={(changedValues, allValues) => {
            // helpful debug for when inputs appear empty on submit
            const fields = form.getFieldsError().map(f => ({ name: (f.name as (string|number)[]), errors: f.errors }));
            console.debug('Publish form values changed:', changedValues, allValues, fields);
            setDebugState({ values: allValues, fields });
          }}
        >
          <Form.Item
            name="isbn"
            label="ISBN"
            rules={[
              { required: true, message: '请输入ISBN' },
              { pattern: /^(?:\d{10}|\d{13})$/, message: 'ISBN建议为10或13位数字(可暂不严格)' },
            ]}
          >
            <Input allowClear placeholder="例如: 9787111122334" />
          </Form.Item>
          <Form.Item
            name="title"
            label="书名"
            rules={[{ required: true, message: '请输入书名' }]}
          >
            <Input allowClear placeholder="书籍标题" />
          </Form.Item>
          <Form.Item
            name="author"
            label="作者"
            rules={[{ required: true, message: '请输入作者' }]}
          >
            <Input allowClear placeholder="作者姓名" />
          </Form.Item>
          <Form.Item
            name="original_price"
            label="原价"
            rules={[{ required: true, message: '请输入原价' }]}
          >
            <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="例如: 50" />
          </Form.Item>
          <Form.Item
            name="selling_price"
            label="售价"
            rules={[{ required: true, message: '请输入售价' }]}
          >
            <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="例如: 10" />
          </Form.Item>
          <Form.Item
            name="condition_level"
            label="品相"
            rules={[{ required: true, message: '请选择品相' }]}
          >
            <Select options={conditionOptions} placeholder="选择品相" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={4} allowClear placeholder="补充书籍状况、是否有笔记等" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} disabled={!loggedIn}>提交</Button>
          </Form.Item>
        </Form>

        {/* Debug panel - visible to help diagnose form issues during development */}
        <div style={{ marginTop: 16, background: '#fafafa', padding: 12, borderRadius: 6, fontSize: 12 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>调试信息 (development only)</div>
          <div><strong>LoggedIn:</strong> {String(loggedIn)}</div>
          <div style={{ marginTop: 8 }}><strong>当前表单数值:</strong></div>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(debugState.values, null, 2)}</pre>
          <div style={{ marginTop: 8 }}><strong>字段错误:</strong></div>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(debugState.fields, null, 2)}</pre>
        </div>

      </Card>
    </div>
  );
}
