import { render, screen } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import Landing from '@/app/page';

beforeAll(() => {
  class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  vi.stubGlobal('IntersectionObserver', IO);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ items: [], next: null }))));
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  window.scrollTo = () => undefined;
});

describe('landing', () => {
  it('renders hero, every section and CTAs into the app', () => {
    render(<Landing />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Prove it.');
    for (const id of ['how', 'leagues', 'trust', 'download', 'faq']) expect(document.getElementById(id)).toBeTruthy();
    const ctas = screen.getAllByRole('link', { name: /open the app|open app|open called/i });
    expect(ctas.length).toBeGreaterThanOrEqual(3);
    expect(ctas.every((a) => a.getAttribute('href') === '/app')).toBe(true);
    expect(screen.getAllByText(/never (turn|convert) into money|no monetary value/i).length).toBeGreaterThan(0);
  });
  it('never mentions the banned comparison word', () => {
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
    for (const f of walk('src')) expect(readFileSync(f, 'utf8').toLowerCase().includes(['f', 'o', 'm', 'o'].join(''))).toBe(false);
  });
});
