import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone build for containerized deployments (Railway, Docker)
  output: "standalone",
};

export default nextConfig;
