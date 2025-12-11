import type { ReactNode } from 'react';
import { Card } from 'antd';
import { palette, cardShadow } from '../theme/design';

interface PageShellProps {
  children: ReactNode;
  title?: ReactNode;
  extra?: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div
      style={{
        background: palette.background,
        minHeight: '100vh',
        padding: '32px 16px 48px',
      }}
    >
      <Card
        bordered={false}
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          borderRadius: 20,
          boxShadow: cardShadow,
          background: palette.surface,
        }}
        bodyStyle={{ padding: 32 }}
      >
        {children}
      </Card>
    </div>
  );
}

