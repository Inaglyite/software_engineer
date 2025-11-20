import { Link, Outlet, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu } from 'antd';
import { BookOutlined, HomeOutlined, PlusCircleOutlined } from '@ant-design/icons';

const { Header, Content, Footer } = AntLayout;

export default function Layout() {
  const location = useLocation();
  const selected = location.pathname === '/' ? ['home'] : location.pathname.startsWith('/books') ? ['books'] : location.pathname.startsWith('/publish') ? ['publish'] : [];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ color: '#fff', fontWeight: 600, marginRight: 32 }}>东华二手书平台</div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={selected}
          items={[
            { key: 'home', icon: <HomeOutlined />, label: <Link to="/">首页</Link> },
            { key: 'books', icon: <BookOutlined />, label: <Link to="/books">书籍</Link> },
            { key: 'publish', icon: <PlusCircleOutlined />, label: <Link to="/publish">发布</Link> },
          ]}
          style={{ flex: 1 }}
        />
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
