import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next 16 only allows quality 75 unless listed: case-page photography ships at 90.
  images: { qualities: [75, 90], formats: ["image/avif", "image/webp"] },
};

export default nextConfig;
