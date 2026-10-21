import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { themeBootScript } from '@/lib/theme/theme';
import './globals.css';

// Self-hosted (SIL Open Font License) so builds never depend on reaching Google Fonts.
const geist = localFont({
  src: './fonts/Geist-Variable.woff2',
  weight: '100 900',
  variable: '--font-geist',
  display: 'swap',
});
const geistMono = localFont({
  src: './fonts/GeistMono-Variable.woff2',
  weight: '100 900',
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: "Captain Jack's Bridge", template: "%s · Captain Jack's Bridge" },
  description: 'One AI workspace for chat, documents, images, research and your AI Crews.',
  appleWebApp: { title: "Captain Jack's Bridge", statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#141415' },
    { media: '(prefers-color-scheme: light)', color: '#f7f7f8' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set before paint by the boot script; suppress the expected attribute mismatch.
    <html
      lang="en"
      data-theme="dark"
      className={`${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="as-root">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
