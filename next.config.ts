import type { NextConfig } from "next";

// Touch next.config.ts to trigger dev server reload of Prisma Client
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
