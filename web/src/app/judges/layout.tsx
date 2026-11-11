import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'For judges · RAID', description: 'Try a raid in 2 minutes on NEAR testnet. No wallet install, no money.' };
export default function Layout({ children }: LayoutProps<'/judges'>) { return children; }
