import type { NextConfig } from "next";
import dns from "node:dns";

// Fix: System DNS unreachable from Node.js on local Windows machines
try {
  const isLocalWindows = process.platform === "win32" && !process.env.VERCEL;
  if (isLocalWindows) {
    dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
    dns.setDefaultResultOrder("ipv4first");
  }
} catch (e) {
  console.warn("DNS override failed:", e);
}

const nextConfig: NextConfig = {
  serverExternalPackages: ['@xenova/transformers', 'onnxruntime-node'],
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
