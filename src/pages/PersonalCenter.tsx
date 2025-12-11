import { useEffect, useState } from 'react';
import { Card, Tabs, Descriptions, Form, Input, Button, message, Table, Tag, Popconfirm, Space, Typography, Empty } from 'antd';
import type { TabsProps } from 'antd';
import type { UserProfile } from '../types/user';
import type { Order } from '../types/order';
import type { Book } from '../types/book';
import { fetchProfile, updateProfile, changePassword, fetchMyOrders, fetchMySales, fetchMyBooks, deleteMyOrder, deleteMySale, deleteMyBook } from '../services/user';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { palette, statusColorMap } from '../theme/design';

const { Title, Text } = Typography;

export default function PersonalCenter() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Order[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState({ profile: false, orders: false, sales: false, books: false });
  const [pwdLoading, setPwdLoading] = useState(false);

  const loadProfile = async () => {
    setLoading((s) => ({ ...s, profile: true }));
    try {
      const data = await fetchProfile();
      setProfile(data);
    } catch (e: unknown) {
      const detail =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      message.error(detail || '加载用户信息失败');
    } finally {
      setLoading((s) => ({ ...s, profile: false }));
    }
  };

  const loadOrders = async () => {
    setLoading((s) => ({ ...s, orders: true }));
    try {
      setOrders(await fetchMyOrders());
    } catch (e) {
      message.error('加载订单失败');
    } finally {
      setLoading((s) => ({ ...s, orders: false }));
    }
  };

  const loadSales = async () => {
    setLoading((s) => ({ ...s, sales: true }));
    try {
      setSales(await fetchMySales());
    } catch (e) {
      message.error('加载售出记录失败');
    } finally {
      setLoading((s) => ({ ...s, sales: false }));
    }
  };

  const loadBooks = async () => {
    setLoading((s) => ({ ...s, books: true }));
    try {
      setBooks(await fetchMyBooks());
    } catch (e) {
      message.error('加载在售书籍失败');
    } finally {
      setLoading((s) => ({ ...s, books: false }));
    }
  };

  useEffect(() => {
    loadProfile();
    loadOrders();
    loadSales();
    loadBooks();
  }, []);

  const onProfileSubmit = async (values: { name: string; phone: string }) => {
    try {
      const data = await updateProfile(values);
      setProfile(data);
      message.success('资料已更新');
    } catch (e: unknown) {
      const detail =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      message.error(detail || '更新失败');
    }
  };

  const onPasswordSubmit = async (values: { old_password: string; new_password: string; confirm_password: string }) => {
    if (values.new_password !== values.confirm_password) {
      message.error('两次输入的新密码不一致');
      return;
    }
    setPwdLoading(true);
    try {
      await changePassword({ old_password: values.old_password, new_password: values.new_password });
      message.success('密码已更新，请重新登录');
      localStorage.clear();
      window.location.href = '/login';
    } catch (e: unknown) {
      const detail =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      message.error(detail || '修改密码失败');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteMyOrder(orderId);
      message.success('订单已删除');
      loadOrders();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '删除订单失败');
    }
  };

  const handleDeleteSale = async (orderId: string) => {
    try {
      await deleteMySale(orderId);
      message.success('售出记录已删除');
      loadSales();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '删除售出记录失败');
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
      await deleteMyBook(bookId);
      message.success('书籍已删除');
      loadBooks();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '删除书籍失败');
    }
  };

  const orderColumns: ColumnsType<Order> = [
    { title: '订单号', dataIndex: 'order_number', key: 'order_number' },
    { title: '书籍ID', dataIndex: 'book_id', key: 'book_id', render: (id: string) => <Link to={`/books/${id}`}>{id}</Link> },
    { title: '金额', dataIndex: 'total_amount', key: 'total_amount', render: (v: number) => `¥${v}` },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={statusColorMap[v] || 'default'}>{v}</Tag> },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm title="确定删除该订单吗？" onConfirm={() => handleDeleteOrder(record.id)}>
          <Button danger size="small">删除</Button>
        </Popconfirm>
      ),
    },
  ];

  const saleColumns: ColumnsType<Order> = [
    { title: '订单号', dataIndex: 'order_number', key: 'order_number' },
    { title: '书籍ID', dataIndex: 'book_id', key: 'book_id', render: (id: string) => <Link to={`/books/${id}`}>{id}</Link> },
    { title: '金额', dataIndex: 'total_amount', key: 'total_amount', render: (v: number) => `¥${v}` },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={statusColorMap[v] || 'default'}>{v}</Tag> },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm title="确定删除该售出记录吗？" onConfirm={() => handleDeleteSale(record.id)}>
          <Button danger size="small">删除</Button>
        </Popconfirm>
      ),
    },
  ];

  const bookColumns: ColumnsType<Book> = [
    { title: '书名', dataIndex: 'title', key: 'title' },
    { title: '售价', dataIndex: 'selling_price', key: 'selling_price', render: (v: number) => `¥${v}` },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={statusColorMap[v] || 'default'}>{v}</Tag> },
    { title: 'ISBN', dataIndex: 'isbn', key: 'isbn' },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm title="确定删除该在售书籍吗？" onConfirm={() => handleDeleteBook(record.id)}>
          <Button danger size="small">删除</Button>
        </Popconfirm>
      ),
    },
  ];

  const renderTable = (data: Order[] | Book[], columns: ColumnsType<any>, loadingState: boolean, emptyText: string) => (
    <Table
      rowKey="id"
      dataSource={data}
      columns={columns}
      pagination={{ pageSize: 5 }}
      loading={loadingState}
      locale={{ emptyText: <Empty description={emptyText} /> }}
    />
  );

  const items: TabsProps['items'] = [
    {
      key: 'orders',
      label: '我的订单',
      children: (
        <Card title="我购买的订单" extra={<Button onClick={loadOrders} loading={loading.orders}>刷新</Button>} style={{ borderRadius: 18 }}>
          {renderTable(orders, orderColumns, loading.orders, '暂无订单')}
        </Card>
      ),
    },
    {
      key: 'sales',
      label: '我的售出',
      children: (
        <Card title="我卖出的订单" extra={<Button onClick={loadSales} loading={loading.sales}>刷新</Button>} style={{ borderRadius: 18 }}>
          {renderTable(sales, saleColumns, loading.sales, '暂无售出记录')}
        </Card>
      ),
    },
    {
      key: 'books',
      label: '我的在售',
      children: (
        <Card title="当前在售书籍" extra={<Button onClick={loadBooks} loading={loading.books}>刷新</Button>} style={{ borderRadius: 18 }}>
          {renderTable(books, bookColumns, loading.books, '暂无在售书籍')}
        </Card>
      ),
    },
    {
      key: 'profile',
      label: '个人信息',
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card title="账号信息" style={{ borderRadius: 18 }} loading={loading.profile}>
              {profile && (
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="用户ID">{profile.id}</Descriptions.Item>
                  <Descriptions.Item label="学号">{profile.student_id}</Descriptions.Item>
                  <Descriptions.Item label="姓名">{profile.name}</Descriptions.Item>
                  <Descriptions.Item label="电话">{profile.phone}</Descriptions.Item>
                  <Descriptions.Item label="信用分">{profile.credit_score}</Descriptions.Item>
                </Descriptions>
              )}
            </Card>
            <Card title="修改资料" style={{ borderRadius: 18 }} loading={loading.profile}>
              <Form layout="vertical" initialValues={{ name: profile?.name, phone: profile?.phone }} onFinish={onProfileSubmit}>
                <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
                  <Input />
                </Form.Item>
                <Form.Item label="电话" name="phone" rules={[{ required: true, message: '请输入电话' }]}>
                  <Input />
                </Form.Item>
                <Button type="primary" htmlType="submit">保存</Button>
              </Form>
            </Card>
            <Card title="修改密码" style={{ borderRadius: 18 }}>
              <Form layout="vertical" onFinish={onPasswordSubmit}>
                <Form.Item label="当前密码" name="old_password" rules={[{ required: true, message: '请输入当前密码' }]}>
                  <Input.Password />
                </Form.Item>
                <Form.Item label="新密码" name="new_password" rules={[{ required: true, min: 6, message: '至少6位' }]}>
                  <Input.Password />
                </Form.Item>
                <Form.Item label="确认新密码" name="confirm_password" rules={[{ required: true, message: '请确认新密码' }]}>
                  <Input.Password />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={pwdLoading}>修改密码</Button>
              </Form>
            </Card>
          </Space>
        </Space>
      ),
    },
  ];

  return (
    <PageShell>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Text style={{ color: palette.muted, textTransform: 'uppercase' }}>Profile</Text>
          <Title level={3} style={{ margin: 0 }}>个人中心</Title>
        </div>
        <Tabs defaultActiveKey="orders" items={items} destroyInactiveTabPane />
      </Space>
    </PageShell>
  );
}
