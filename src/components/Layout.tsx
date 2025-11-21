import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button } from 'antd';
import type { MenuProps } from 'antd';
import { BookOutlined, HomeOutlined, PlusCircleOutlined, LoginOutlined, CarOutlined, UserOutlined } from '@ant-design/icons';

const { Header, Content, Footer } = AntLayout;

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const loggedIn = !!localStorage.getItem('token');
  const userName = localStorage.getItem('user_name');
  const selected = location.pathname === '/' ? ['home'] : location.pathname.startsWith('/books') ? ['books'] : location.pathname.startsWith('/publish') ? ['publish'] : [];

  const menuItems: MenuProps['items'] = [
    { key: 'home', icon: <HomeOutlined />, label: <Link to="/">首页</Link> },
    { key: 'books', icon: <BookOutlined />, label: <Link to="/books">书籍</Link> },
    { key: 'publish', icon: <PlusCircleOutlined />, label: <Link to="/publish">发布</Link> },
    { key: 'delivery', icon: <CarOutlined />, label: <Link to="/delivery">配送订单</Link> },
    loggedIn ? { key: 'personal', icon: <UserOutlined />, label: <Link to="/personal">个人中心</Link> } : null,
    !loggedIn ? { key: 'login', icon: <LoginOutlined />, label: <Link to="/login">登录</Link> } : null,
  ].filter(Boolean);

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ color: '#fff', fontWeight: 600, marginRight: 32 }}>东华二手书平台</div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={selected}
          items={menuItems}
          style={{ flex: 1 }}
        />
        {loggedIn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#fff' }}>{userName}</span>
            <Button size="small" onClick={() => { localStorage.clear(); navigate('/login'); }}>退出</Button>
          </div>
        )}
      </Header>
      <Content style={{ padding: '32px 24px', background: '#f5f7fa' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <Outlet />
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>© {new Date().getFullYear()} DHU Secondhand</Footer>
    </AntLayout>
  );
}
