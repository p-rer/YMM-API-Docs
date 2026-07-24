import type { NextConfig } from "next"
import { buildApiDocRedirects } from "./lib/api-docs/build-redirects"

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  async redirects() {
    try {
      return buildApiDocRedirects()
    } catch (error) {
      console.error("Failed to build API doc redirects:", error)
      return []
    }
  },
  allowedDevOrigins: ["local-origin.dev", "*.local-origin.dev"],
}

export default nextConfig
