import { themeFor } from '@called/sdk';

/** Theme-specific call-to-action for the trade button: [Yes, No]. */
const CTA: Record<string, [string, string]> = {
  crypto: ['Ride with the bulls', 'Back the bears'],
  football: ['Back the Yes XI', 'Back the No XI'],
  f1: ['Floor it for Yes', 'Floor it for No'],
  boxing: ['Into the Yes corner', 'Into the No corner'],
  gta: ['Roll with the Yes crew', 'Roll with the No crew'],
  music: ['Join the Yes fans', 'Join the No fans'],
  movies: ['Roll camera on Yes', 'Side with the critics'],
  space: ['Launch the rockets', 'Send the saucers'],
  tech: ['Deploy the Yes bots', 'Deploy the No bots'],
  weather: ['Call the sun', 'Call the storm'],
};
export function ctaFor(category: string | null | undefined, question: string | undefined, outcome: 0 | 1): string {
  const t = themeFor(category ?? null, question ?? '');
  return CTA[t]?.[outcome ? 0 : 1] ?? `Buy ${outcome ? 'Yes' : 'No'}`;
}
