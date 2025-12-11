import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '../components/PageShell';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <PageShell>
      <Result
        status="404"
        title="页面不存在"
        subTitle="抱歉，您访问的页面不存在或已被移除。"
        extra={
          <Button type="primary" onClick={() => navigate('/') }>
            返回首页
          </Button>
        }
      />
    </PageShell>
  );
}
