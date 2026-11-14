import Link from 'next/link';
import { Mark } from '@/components/Brand';

export default function NotFound() {
  return (
    <div className="cobalt-field grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <div className="mx-auto w-fit"><Mark size={44} /></div>
        <h1 className="wide-black mt-6 text-[1.5rem] leading-[.84] md:text-[64px]">Lost at sea.</h1>
        <p className="mt-4 text-white/75">That page doesn’t exist. The raids are this way.</p>
        <Link href="/feed" className="press mt-8 inline-flex h-12 items-center rounded-[16px] bg-lime px-6 font-bold text-[#1c0900]">Back to the feed</Link>
      </div>
    </div>
  );
}
