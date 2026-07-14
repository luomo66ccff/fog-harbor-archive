import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vinext remains the default build target for Sites. The server deployment
  // opts into Next's self-contained Node output from its Docker build.
  output: process.env.FOG_HARBOR_SERVER_BUILD === "1" ? "standalone" : undefined,
};

export default nextConfig;
