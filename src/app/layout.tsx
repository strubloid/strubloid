import type { Metadata } from 'next';
import './globals.scss';
import { LayoutShell } from '@/components/LayoutShell/LayoutShell';

export const metadata: Metadata = {
  title: 'Strubloid - AI Chat Workspace',
  description: 'Personal AI chat application with projects and memory',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
