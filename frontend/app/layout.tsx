import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import QueryProvider from '@/components/providers/QueryProvider';

export const metadata: Metadata = {
  title: 'Quadstock AI - Retail Operations Management & Copilot',
  description: 'Production AI Retail Management Platform backed by PostgreSQL, XGBoost forecasting, and Groq Copilot.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B0F17] text-slate-100 antialiased min-h-screen">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
