import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Allow HMR websocket connections from local IP addresses */
  allowedDevOrigins: ['127.0.0.1', 'localhost', '26.242.205.38'],
};

export default nextConfig;
