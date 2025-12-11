import { useState } from 'react';
import { Card, Form, Input, Button, message, Typography, Space, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { login, register } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { palette } from '../theme/design';

interface LoginFormValues { student_id: string; password: string; }
interface RegisterFormValues { student_id: string; name: string; phone: string; password: string; }

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [registerMode, setRegisterMode] = useState(false);
  const [form] = Form.useForm<LoginFormValues>();
  const [registerForm] = Form.useForm<RegisterFormValues>();
  const navigate = useNavigate();

  const onLogin = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await login({ student_id: values.student_id.trim(), password: values.password });
      message.success('登录成功');
      navigate('/');
    } catch (e: unknown) {
      const detail =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      message.error(detail || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      await register({
        student_id: values.student_id.trim(),
        name: values.name.trim(),
        phone: values.phone.trim(),
        password: values.password,
      });
      message.success('注册成功，请登录');
      setRegisterMode(false);
    } catch (e: unknown) {
      const detail =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      message.error(detail || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const tabItems: TabsProps['items'] = [
    {
      key: 'login',
      label: '登录',
      children: (
        <Form<LoginFormValues> form={form} layout="vertical" onFinish={onLogin} requiredMark={false}>
          <Form.Item name="student_id" label="学号" rules={[{ required: true, message: '请输入学号' }]}>
            <Input placeholder="请输入学号" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            登录
          </Button>
        </Form>
      ),
    },
    {
      key: 'register',
      label: '注册',
      children: (
        <Form<RegisterFormValues> form={registerForm} layout="vertical" onFinish={onRegister} requiredMark={false}>
          <Form.Item name="student_id" label="学号" rules={[{ required: true, message: '请输入学号' }]}>
            <Input placeholder="请输入学号" />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="phone" label="电话" rules={[{ required: true, message: '请输入电话' }]}>
            <Input placeholder="请输入电话" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            注册
          </Button>
        </Form>
      ),
    },
  ];

  return (
    <PageShell>
      <Card
        bordered={false}
        style={{ maxWidth: 480, margin: '0 auto', borderRadius: 20 }}
        bodyStyle={{ padding: 32 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text style={{ color: palette.muted, textTransform: 'uppercase' }}>Account</Text>
            <Title level={3} style={{ margin: 0 }}>欢迎登录</Title>
            <Text type="secondary">登录或注册以管理书籍和订单</Text>
          </div>
          <Tabs
            activeKey={registerMode ? 'register' : 'login'}
            onChange={(key) => {
              setRegisterMode(key === 'register');
              form.resetFields();
              registerForm.resetFields();
            }}
            items={tabItems}
            centered
            destroyInactiveTabPane
          />
        </Space>
      </Card>
    </PageShell>
  );
}
