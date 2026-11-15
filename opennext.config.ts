import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
  // OpenNext configuration for Next.js 16 on Cloudflare Pages
  incrementalCache: r2IncrementalCache,
});
