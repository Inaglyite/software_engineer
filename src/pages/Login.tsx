import { useState } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import { login, register } from '../services/auth';
import { useNavigate } from 'react-router-dom';

interface LoginFormValues { student_id: string; password: string; }
interface RegisterFormValues { student_id: string; name: string; phone: string; password: string; }

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
      const detail = (e && typeof e === 'object' && 'response' in e) ? (e as any).response?.data?.detail : undefined;
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
      const detail = (e && typeof e === 'object' && 'response' in e) ? (e as any).response?.data?.detail : undefined;
      message.error(detail || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={registerMode ? '注册' : '登录'} style={{ maxWidth: 400, margin: '40px auto' }}>
      {!registerMode && (
        <Form<LoginFormValues> form={form} layout="vertical" onFinish={onLogin}>
          <Form.Item name="student_id" label="学号" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      )}
      {registerMode && (
        <Form<RegisterFormValues> form={registerForm} layout="vertical" onFinish={onRegister}>
          <Form.Item name="student_id" label="学号" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="电话" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              注册
            </Button>
          </Form.Item>
        </Form>
      )}
      <Button type="link" onClick={() => { setRegisterMode(!registerMode); form.resetFields(); registerForm.resetFields(); }}>
        {registerMode ? '已有账号? 去登录' : '没有账号? 去注册'}
      </Button>
    </Card>
  );
}
