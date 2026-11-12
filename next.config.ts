import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable cacheComponents to avoid issues with Cloudflare Pages builds
  cacheComponents: false,
  partialPrefetching: false,
};

export default nextConfig;
