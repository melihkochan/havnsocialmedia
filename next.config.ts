import type { NextConfig } from "next";
import dns from "node:dns";

// Fix: System DNS unreachable from Node.js — use Google DNS
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ihdkdiowlnfplpizowdl.supabase.co",
      },
    ],
  },
};

export default nextConfig;
