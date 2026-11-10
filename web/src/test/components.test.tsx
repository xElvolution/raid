import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FeedItem, Market } from '@called/sdk';
import { LeagueBadge } from '@/components/LeagueBadge';
import { OutcomeBar } from '@/components/MarketCard';
import { Sparkline } from '@/components/market-bits';
import { Button, Empty, Progress, Segmented } from '@/components/ui';
import { DIVISIONS } from '@/lib/gamification';
import { mixFeed } from '@/lib/feed';

describe('design system', () => {
  it('renders an empty state with title and action', () => {
    render(<Empty title="Nothing here" body="Yet." action={<button>Go</button>} />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go' })).toBeTruthy();
  });
  it('3D button fires once and vibrates when supported', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Call it</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Call it' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(vibrate).toHaveBeenCalledWith(8);
  });
  it('outcome bars show labels and odds', () => {
    render(<><OutcomeBar label="Thunder" p={0.64} tone="mint" flash={null} /><OutcomeBar label="Spurs" p={0.36} tone="coral" flash={null} /></>);
    expect(screen.getByText('Thunder')).toBeTruthy();
    expect(screen.getByText('64%')).toBeTruthy();
    expect(screen.getByText('36%')).toBeTruthy();
  });
  it('progress, segmented and league badge expose state', () => {
    const onChange = vi.fn();
    render(<><Progress value={0.3} /><Segmented value="a" onChange={onChange} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} /><LeagueBadge d={DIVISIONS[2]!} /></>);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('30');
    fireEvent.click(screen.getByRole('tab', { name: 'B' }));
    expect(onChange).toHaveBeenCalledWith('b');
    expect(screen.getByRole('img', { name: 'Gold league' })).toBeTruthy();
  });
  it('sparkline handles a single point', () => {
    const { container } = render(<Sparkline data={[0.5]} />);
    expect(container.querySelectorAll('path')).toHaveLength(2);
  });
});

describe('feed mixing', () => {
  const post = (id: string, market_id: string | null = null) => ({ id, market_id }) as FeedItem;
  const mk = (id: string) => ({ id }) as Market;
  it('inserts a market card after every two posts, skipping markets already embedded', () => {
    const rows = mixFeed([post('1'), post('2', 'm1'), post('3'), post('4')], [mk('m1'), mk('m2'), mk('m3')]);
    expect(rows.map((r) => `${r.k}:${r.v.id}`)).toEqual(['post:1', 'post:2', 'market:m2', 'post:3', 'post:4', 'market:m3']);
  });
  it('fills an empty feed with markets', () => {
    expect(mixFeed([], [mk('a'), mk('b')]).map((r) => r.k)).toEqual(['market', 'market']);
  });
});

describe('Avatar', () => {
  it('re-anchors stored base-path URLs and falls back to branded initials on load error', async () => {
    const { assetUrl, Avatar } = await import('@/components/ui');
    expect(assetUrl('/app/avatars/leo.jpg')).toBe('/avatars/leo.jpg');
    expect(assetUrl('https://x.test/a.png')).toBe('https://x.test/a.png');
    const { render, fireEvent } = await import('@testing-library/react');
    const r = render(<Avatar handle="leo" name="Leo Park" url="/avatars/missing.jpg" />);
    fireEvent.error(r.container.querySelector('img')!);
    expect(r.container.querySelector('[data-avatar-fallback]')?.textContent).toBe('LP');
  });
});
