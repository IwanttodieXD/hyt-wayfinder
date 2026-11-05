import type { Metadata } from 'next';
import './globals.css';
import AuthGate from '@/components/AuthGate';
import AnimatedBackground from '@/components/AnimatedBackground';
import ThemeInit from '@/components/ThemeInit';

export const metadata: Metadata = {
  title: 'HYT Global',
  description: 'Visitor management system for HYT Global Institute',
  icons: {
    icon: '/hyt_logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <ThemeInit />
        <link
          rel='stylesheet'
          href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
          crossOrigin='anonymous'
          referrerPolicy='no-referrer'
        />
      </head>
      <body>
        <AnimatedBackground />
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
