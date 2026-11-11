import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Raid War · RAID',
  description: 'Crew vs crew for 24 hours. Crews are Sputnik DAOs; every raid is a DAO vote.',
  openGraph: { images: [{ url: '/api/war/card', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', images: ['/api/war/card'] },
};
export default function Layout({ children }: LayoutProps<'/war'>) { return children; }
