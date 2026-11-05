import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Recipient proof uploads are capped at 3 MB in the action; allow multipart overhead.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
