function Logo({ size = 28 }: { size?: number }) {
  return <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden><rect width="32" height="32" rx="9" fill="#7C5CFF" /><path d="M7.5 17.2l5 5L24.2 9.8" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M18.6 9.4h5.9v5.9" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
import { APP_URL, Cta, Download, Hero, How, Judge, Leagues, Ticker } from '@/components/sections';

const FAQ = [
  ['What is Called?', 'A social prediction market. Post takes, they become markets, and you make calls with the people you follow. Big markets from Polymarket and Kalshi sit in the same feed.'],
  ['Who decides the result?', 'An AI judge running inside secure hardware (a TEE) on NEAR AI Cloud. Every verdict is signed, and the Called contract checks the signature on-chain before paying out. Anyone can dispute a verdict with a bond.'],
  ['Do I need crypto experience?', 'No. Sign in with a NEAR account in a couple of taps. Free calls work right away.'],
  ['Is it available everywhere?', 'Free calls, streaks, XP and leagues work everywhere. Real-money trading depends on where you live, and some regions are restricted.'],
  ['Are XP and leagues worth money?', 'No. They are just for fun and bragging rights, and never convert to money.'],
];

export default function Landing() {
  return (
    <div className="overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-[#0a0a0b]/75 backdrop-blur-xl border-b border-line">
        <nav className="max-w-6xl mx-auto h-16 px-5 flex items-center justify-between" aria-label="Main">
          <a href="#top" className="flex items-center gap-2"><Logo /><span className="text-[18px] font-semibold tracking-tight">Called</span></a>
          <div className="hidden md:flex gap-8 text-mute text-[14px]">
            <a href="#how" className="hover:text-ink">How it works</a><a href="#leagues" className="hover:text-ink">Leagues</a><a href="#trust" className="hover:text-ink">Verifiable AI</a><a href="#faq" className="hover:text-ink">FAQ</a>
          </div>
          <a href={APP_URL} className="inline-flex items-center h-9 px-4 rounded-full bg-[#fff] text-black text-sm font-semibold">Open app</a>
        </nav>
      </header>
      <main id="top">
        <Hero />
        <Ticker />
        <How />
        <Leagues />
        <Judge />
        <Download />
        <section id="faq" className="max-w-3xl mx-auto px-5 pb-24">
          <h2 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-center mb-8">Questions</h2>
          <div className="space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="border-b border-line py-5 group">
                <summary className="text-[17px] font-medium cursor-pointer list-none flex justify-between items-center gap-4">{q}<span className="text-mute group-open:rotate-45 transition text-2xl leading-none font-light" aria-hidden>+</span></summary>
                <p className="text-mute mt-3 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
          <div className="flex justify-center mt-10"><Cta>Open the app</Cta></div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col md:flex-row gap-6 justify-between text-[13px] text-mute">
          <div className="flex items-center gap-2"><Logo /><span className="font-semibold text-ink text-lg">Called</span><span>· built on NEAR</span></div>
          <p className="max-w-md">Prediction markets carry risk. Real-money features are unavailable in some regions. XP, streaks and leagues have no monetary value.</p>
        </div>
      </footer>
    </div>
  );
}
