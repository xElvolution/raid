import { ImageResponse } from 'next/og';
import { raidApi, target, usdcOf, xLabel } from '@/lib/raid';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'RAID raid card';
export const revalidate = 60;

export default async function OG({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await raidApi.get(Number(id)).catch(() => null);
  const sym = r ? target(r).symbol : '';
  const status = !r ? '' : r.status === 'Closed' ? (r.hit ? `Hit ${xLabel(r.target_x_bps)}` : 'Sold early') : r.status === 'Held' ? 'Bought, riding to the goal' : Date.now() < r.opens_until_ms ? 'Open now. Join before the timer ends' : 'About to buy';
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: 'linear-gradient(135deg,#0b0b0d 0%,#1a0d07 60%,#3a1406 100%)', color: 'white', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#ff7a1a,#ff3d0a)', display: 'flex' }} />
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>RAID</div>
        <div style={{ marginLeft: 'auto', fontSize: 28, color: 'rgba(255,255,255,.6)' }}>{`Raid #${id}`}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>{r ? `$${sym}` : 'Raid not found'}</div>
        {r && <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 24 }}>
          <div style={{ fontSize: 56, fontWeight: 800, color: '#ff5a1f' }}>{`Goal ${xLabel(r.target_x_bps)}`}</div>
          <div style={{ fontSize: 40, color: 'rgba(255,255,255,.75)' }}>{`${usdcOf(r.pot).toFixed(0)} tUSDC pooled`}</div>
        </div>}
      </div>
      <div style={{ display: 'flex', fontSize: 34, color: 'rgba(255,255,255,.85)' }}>{status}</div>
    </div>,
    size,
  );
}
