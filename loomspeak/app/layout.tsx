import '@/app/globals.css';
import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

export const metadata = {
  title: 'LoomSpeak - Lecture to Knowledge',
  description: 'Transform your lectures into organized knowledge with Atlassian integration',
};