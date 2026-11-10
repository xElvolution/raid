# Called mobile (Expo · React Native · TypeScript)

Native iOS and Android app for Called, in the Broadcast (direction C) design. It uses the same API, auth and demo account as `web/`.

```bash
cp .env.example .env              # EXPO_PUBLIC_API_URL, EXPO_PUBLIC_WEB_URL, EXPO_PUBLIC_DEMO_LOGIN
npm install
npx expo start                    # requires Node >= 22.13
npm run typecheck
```

- Routes live in `app/` (expo-router): splash `index`, `onboarding`, `signin`, tabs (`home`, `feed`, `explore`, `profile`), `market/[id]`, `callit` (modal), `calledit`, `portfolio`, `notifications`, `settings` and `u/[handle]`.
- `src/battle.ts` ports `design-lab/src/battle.js` and adds themes for boxing, tech, space and movies. It renders through `react-native-svg` `SvgXml` on iOS, Android and web.
- `src/theme.tsx` has System / Night game / Matchday, with a circular-reveal switch that matches the web.
- The profile is X-style: banner, overlapping avatar, collapsing header, sticky tabs, and the Caller Card behind "View caller card".
- `scripts-shots.cjs` takes 390×844 stills of the web target into `shots/`.

Release: `eas build -p all --profile production`, then `eas submit -p ios` and `eas submit -p android`. The env for each profile is in `eas.json`.
