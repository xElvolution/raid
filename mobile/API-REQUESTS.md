# API requests from the mobile app

The mobile app uses the existing API unchanged. These would make it better:

1. **Redeploy the API build.** The running `dist/` on :8787 predates the source. `/v1/users/:h/profile`, `/equity`, `/posts?tab=`, `/calls`, `/history` and `/created` exist in `src/social.ts` but return 404 live. The app falls back to `/v1/users/:h` and `/v1/feed?author=` for now, so the P&L chart and the Replies/Calls/History/Created/Likes tabs stay empty until you redeploy.
2. **CORS for Expo web dev.** Allow `http://localhost:8081` (Expo web) in `CORS_ORIGINS` for development. Native builds don't need CORS.
3. **NEAR sign-in on mobile.** `/v1/auth/signin` expects a NEP-413 signed message. Mobile needs either a wallet deep-link callback (`called://auth`) or a hosted `/v1/auth/mobile/start` and `/v1/auth/mobile/complete` pair that returns a token. Until then, mobile uses `/v1/auth/demo` (DEMO_MODE=1).
4. **Push tokens.** `POST /v1/push-tokens` exists. Confirm it accepts Expo push tokens (`ExponentPushToken[...]`) with `platform: ios|android`.
5. **Absolute media URLs.** Avatars and market images are relative (`/app/avatars/...`). The app prefixes `EXPO_PUBLIC_WEB_URL`. Returning absolute URLs (or a CDN base in `/health`) would remove that coupling.
6. **Profile tabs.** A `likes` tab exists, but there's no `/v1/users/:h/posts?tab=likes` visibility rule documented. Confirm whether likes are public.
