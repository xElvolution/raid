// Preview-only Cloudflare adapter. Uses in-memory cache so we can deploy
// to a temporary wrangler account without R2.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
