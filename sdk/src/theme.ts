/** Battle theme for a market, keyed to its subject first and its category second. Shared by web, mobile and API. */
export type BattleTheme = 'football' | 'crypto' | 'gta' | 'f1' | 'boxing' | 'movies' | 'space' | 'music' | 'tech' | 'weather' | 'arena';
type Theme = BattleTheme;

/** Subject rules, most specific first. The market's own subject beats its broad category. */
const RULES: [Theme, RegExp][] = [
  ['crypto', /\b(bitcoin|btc|ethereum|eth|solana|sol|crypto|xrp|doge|dogecoin|near|token|memecoin|stablecoin)\b/],
  ['gta', /\bgta\b|grand theft|rockstar|call of duty|fortnite|minecraft|playstation|xbox|nintendo|esports|video game|gaming/],
  ['f1', /\bf1\b|formula 1|formula one|grand prix|verstappen|hamilton|norris|motogp|nascar|indycar/],
  ['boxing', /boxing|\bufc\b|\bmma\b|knockout|\bbout\b|joshua|usman|usyk|tyson|fury|heavyweight/],
  ['space', /spacex|starship|\bnasa\b|rocket|artemis|\bmars\b|\borbit|asteroid|moon landing/],
  ['movies', /\bfilm|movie|box office|\bgross|netflix|nollywood|oscars?\b|avengers|marvel|cinema|disney/],
  ['football', /goal|league|\bcup\b|\bfc\b|united|madrid|arsenal|chelsea|bayern|psg|ballon|afcon|uefa|super eagles|derby|premier/],
  ['weather', /rain|snow|harmattan|temperature|heatwave|storm|hurricane|weather/],
  ['music', /grammy|album|single|tour|spotify|afrobeats|song|concert|billboard/],
];

export function themeFor(category?: string | null, question = ''): Theme {
  const q = question.toLowerCase();
  for (const [t, re] of RULES) if (re.test(q)) return t;
  if (category === 'crypto') return 'crypto';
  if (category === 'sports') return 'arena';
  if (category === 'music') return 'music';
  if (category === 'culture') return 'movies';
  if (category === 'tech') return 'tech';
  if (category === 'weather') return 'weather';
  return 'arena';
}
