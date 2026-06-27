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
    ],
  },
};

export default nextConfig;
