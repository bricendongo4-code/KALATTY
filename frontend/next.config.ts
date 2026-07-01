import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "njoucnnjlrwbbhnktaho.supabase.co",
      },
      {
        protocol: "https",
        hostname: "kalatty-frontend.vercel.app",
      },
    ],
  },
};

export default nextConfig;
