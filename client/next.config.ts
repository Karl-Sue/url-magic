import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  typedRoutes: true,
  poweredByHeader: false,
};

export default nextConfig;
