import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <body className="bg-[#0a0a0f] text-[#e0e0e0] min-h-screen">
        {children}
      </body>
    </html>
  );
}
