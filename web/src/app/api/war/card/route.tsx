import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { raidApi } from '@/lib/raid';
import { CREWS, WAR, inWar, warLeader, warScore } from '@/lib/crews';

export const revalidate = 30;

/** Raid War share card (1200x630 PNG), scored live from the chest's raid records on NEAR testnet. */
export async function GET() {
  const [font, raids] = await Promise.all([readFile(join(process.cwd(), 'assets/fonts/ArchivoBlack-Regular.ttf')), raidApi.list(0, 200).catch(() => [])]);
  const [a, b] = CREWS.map((c) => warScore(c, raids, inWar));
  const total = Math.max(1, a!.firepower + b!.firepower);
  const pa = Math.round((a!.firepower / total) * 100);
  const lead = warLeader(a!, b!);
  const over = Date.now() > WAR.end;
  const side = (s: typeof a, right = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: right ? 'flex-end' : 'flex-start', width: 440 }}>
      <div style={{ display: 'flex', background: s!.crew.color, color: s!.crew.ink, fontSize: 28, padding: '8px 18px', borderRadius: 12 }}>{s!.crew.tag}</div>
      <div style={{ display: 'flex', fontSize: 52, marginTop: 18, textTransform: 'uppercase' }}>{s!.crew.name}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 4 }}><span style={{ fontSize: 84, color: s!.crew.color === '#3a3b42' ? '#8fa4ff' : s!.crew.color }}>{s!.firepower.toFixed(0)}</span><span style={{ fontSize: 22, color: '#8c93c4', marginLeft: 10, marginBottom: 16 }}>PTS</span></div>
      <div style={{ display: 'flex', fontSize: 22, color: '#8c93c4', fontFamily: 'sans-serif' }}>{`${s!.hits} hit · ${s!.raids.length} raid${s!.raids.length === 1 ? '' : 's'} · ${s!.backed.toFixed(0)} USDC backed`}</div>
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0b0b0d', color: '#f3f5ff', fontFamily: 'Archivo', padding: 56 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ color: '#ff5a1f' }}>RAID</span><span style={{ marginLeft: 16, color: '#8c93c4' }}>{`WAR #${WAR.id} · 24H`}</span></div>
          <div style={{ display: 'flex', fontSize: 22, color: over ? '#8c93c4' : '#ff5a1f' }}>{over ? 'FINAL' : 'LIVE'}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 40 }}>
          {side(a)}
          <div style={{ display: 'flex', fontSize: 60, color: '#5a6196' }}>VS</div>
          {side(b, true)}
        </div>
        <div style={{ display: 'flex', marginTop: 36, height: 44, borderRadius: 12, overflow: 'hidden', background: '#1d1d21' }}>
          <div style={{ display: 'flex', width: `${pa}%`, background: a!.crew.color }} />
          <div style={{ display: 'flex', flex: 1, background: b!.crew.color }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', fontSize: 20, color: '#8c93c4', fontFamily: 'sans-serif' }}>
          <span>{lead ? `${lead.crew.name} ${over ? 'won' : 'leads'}` : 'Dead even'}</span>
          <span>Crews are Sputnik DAOs on NEAR testnet · scored from on-chain raids</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: [{ name: 'Archivo', data: font, weight: 900, style: 'normal' }], headers: { 'Cache-Control': 'public, max-age=30' } },
  );
}
