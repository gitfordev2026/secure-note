import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // OpenNext configuration for Next.js 16 on Cloudflare Pages
  cloudflare: {
    useWorkerdCondition: true,
  },
});
