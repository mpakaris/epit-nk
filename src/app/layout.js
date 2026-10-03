import './globals.css';
import { AppProvider } from '@/context/AppContext';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Epitünk – Közösségi Koordináció',
  description: 'Közösségi projektek koordinációja, közös számla- és költségkezelése, költségmegosztás kalkulációval.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="hu">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body>
        <AppProvider>
          <Navbar />
          <main style={{ minHeight: 'calc(100vh - 68px)', paddingBottom: '3rem' }}>
            {children}
          </main>
        </AppProvider>
      </body>
    </html>
  );
}
