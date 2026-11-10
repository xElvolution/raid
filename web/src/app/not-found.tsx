import Link from 'next/link';
import { Mark } from '@/components/Brand';

export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 text-center px-6">
      <Mark size={64} />
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-mute">404</p>
      <h1 className="text-[28px] font-semibold tracking-tight">Nobody called this page</h1>
      <p className="text-[15px] text-mute">It doesn&apos;t exist, or it moved.</p>
      <Link href="/" className="mt-2 inline-flex items-center h-12 px-6 rounded-2xl bg-grape text-white text-[15px] font-semibold shadow-[0_4px_0_0_rgba(0,0,0,0.35)]">Back home</Link>
    </main>
  );
}
