import type { MarketCategory } from '@called/sdk';
export const PROMPTS: { cat: MarketCategory; tag: string; take: string }[] = [
  { cat: 'crypto', tag: 'Crypto', take: 'BTC closes above $120k by Dec 31' },
  { cat: 'sports', tag: 'Football', take: 'Arsenal beat Chelsea at the Emirates this weekend' },
  { cat: 'sports', tag: 'F1', take: 'Norris wins the Abu Dhabi Grand Prix' },
  { cat: 'music', tag: 'Music', take: 'Burna Boy’s new album debuts top 10 on Billboard 200 by December' },
  { cat: 'culture', tag: 'Movies', take: 'The next Marvel movie grosses $150M opening weekend' },
  { cat: 'tech', tag: 'Tech', take: 'Apple announces a foldable iPhone by end of the year' },
  { cat: 'weather', tag: 'Weather', take: 'It rains in Lagos on Saturday' },
  { cat: 'sports', tag: 'Boxing', take: 'Joshua wins by knockout in his next bout' },
];
export const TOPICS = ['#BTC120K', '#NorthLondonDerby', '#AbuDhabiGP', '#Afrobeats', '#BoxOffice', '#Harmattan', '#Starship', '#GTA6'];
export const EXAMPLES: { q: string; cat: MarketCategory; p: number; vol: string; by: string; close: string }[] = [
  { q: 'Will ETH flip $5,000 before Jan 31?', cat: 'crypto', p: 0.38, vol: '$48.2K', by: 'tunde', close: '31 Jan' },
  { q: 'Will Super Eagles qualify for the World Cup?', cat: 'sports', p: 0.61, vol: '$112K', by: 'ada', close: '18 Nov' },
  { q: 'Will GTA VI release on its announced date?', cat: 'culture', p: 0.72, vol: '$86.9K', by: 'leo', close: '26 May' },
  { q: 'Will Verstappen win the Las Vegas GP?', cat: 'sports', p: 0.44, vol: '$31.4K', by: 'kemi', close: '22 Nov' },
  { q: 'Will Starship complete a full orbit this year?', cat: 'tech', p: 0.57, vol: '$22.7K', by: 'nia', close: '31 Dec' },
];
