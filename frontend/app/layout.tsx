import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import QueryProvider from '@/components/providers/QueryProvider';

export const metadata: Metadata = {
  title: 'QuantStock AI | Retail Operating System',
  description: 'Production AI Retail Management Platform backed by PostgreSQL, XGBoost forecasting, and Groq Copilot.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070707] text-white antialiased min-h-screen font-sans selection:bg-[#C6FF00] selection:text-black">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
