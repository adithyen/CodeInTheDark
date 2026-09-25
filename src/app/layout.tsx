import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import CelestialBackground from '@/components/CelestialBackground';

export const metadata: Metadata = {
  title: '11:11 Chapter 2 | Code In The Dark',
  description: 'The premier blind multi-language algorithmic battle in C, Python, and Java. 50 minutes, zero execution feedback, nautical precision.',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#050504] text-[#ebe4d5] flex flex-col font-nautical-mono antialiased selection:bg-[#d4af37]/30 selection:text-[#f3d38c]">
        <CelestialBackground />
        <Navbar />
        <main className="relative z-10 flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
