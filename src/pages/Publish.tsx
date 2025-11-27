import { useState } from 'react';
import { Card, Form, Input, InputNumber, Select, Button, message, Alert, Upload, Image } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
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
  // images state: { uid, name, base64 }
  const [images, setImages] = useState<{ uid: string; name: string; url: string }[]>([]);
  // index of selected cover image in images[], default 0
  const [coverIndex, setCoverIndex] = useState<number>(0);

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
      // ensure images/cover
      if (images.length === 0) {
        message.error('请上传至少一张书籍图片，并设置封面');
        setLoading(false);
        return;
      }
      const cover = images[coverIndex]?.url || images[0].url;
      // 这里的必填已经由 Form rules 保证，通过后 values 不会为空
      const payload = {
        isbn: values.isbn.trim(),
        title: values.title.trim(),
        author: values.author.trim(),
        publisher: (values as any).publisher?.trim(),
        publish_year: (values as any).publish_year ? Number((values as any).publish_year) : undefined,
        edition: (values as any).edition?.trim(),
        original_price: Number(values.original_price),
        selling_price: Number(values.selling_price),
        condition_level: values.condition_level,
        description: values.description?.trim(),
        cover_image: cover,
        gallery_images: images.map(i => i.url),
        seller_id: sellerId!,
      };
      console.debug('Publishing payload', payload);
      await createBook(payload);
      message.success('发布成功');
      form.resetFields();
      setImages([]);
      setCoverIndex(0);
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
            name="publisher"
            label="出版社"
            rules={[{ required: true, message: '请输入出版社' }]}
          >
            <Input allowClear placeholder="例如: 清华大学出版社" />
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
          <Form.Item name="publish_year" label="出版年份">
            <InputNumber min={1000} max={9999} style={{ width: '100%' }} placeholder="例如: 2010" />
          </Form.Item>
          <Form.Item name="edition" label="版本">
            <Input allowClear placeholder="例如: 第2版" />
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
          <Form.Item label="书籍图片 (至少一张，第一张为封面，可上传多张)">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Upload
                multiple
                accept="image/*"
                listType="picture-card"
                showUploadList={false}
                customRequest={async ({ file, onError, onSuccess }) => {
                  const formData = new FormData();
                  formData.append('file', file as File);
                  try {
                    const resp = await fetch('/api/uploads/images', {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
                      },
                      body: formData,
                    });
                    if (!resp.ok) {
                      const detail = (await resp.json().catch(() => ({}))).detail;
                      throw new Error(detail || '上传失败');
                    }
                    const data = await resp.json();
                    setImages((prev) => [...prev, { uid: String(Date.now()) + file.name, name: file.name, url: data.url }]);
                    onSuccess?.(data, file as any);
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : '上传失败';
                    message.error(msg);
                    onError?.(err as any);
                  }
                }}
              >
                <div style={{ width: 104, height: 104, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #d9d9d9', borderRadius: 4 }}>
                  <PlusOutlined />
                </div>
              </Upload>
              {images.map((img, idx) => (
                <div key={img.uid} style={{ width: 104, textAlign: 'center' }}>
                  <Image src={img.url} width={104} height={104} style={{ objectFit: 'cover' }} />
                  <div style={{ marginTop: 4, display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <Button size="small" onClick={() => setCoverIndex(idx)} type={coverIndex === idx ? 'primary' : 'default'}>
                      {coverIndex === idx ? '封面' : '设为封面'}
                    </Button>
                    <Button size="small" danger onClick={() => {
                      setImages((prev) => prev.filter((_, i) => i !== idx));
                      setCoverIndex((prevIndex) => {
                        if (idx === prevIndex) return 0;
                        if (idx < prevIndex) return prevIndex - 1;
                        return prevIndex;
                      });
                    }}>
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
