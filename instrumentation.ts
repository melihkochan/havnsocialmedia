export async function register() {
  // Only run DNS fix on local Windows machine under Node.js runtime (not Edge or Vercel)
  const isLocalWindows = process.platform === 'win32' && !process.env.VERCEL;
  if (isLocalWindows && (process.env.NEXT_RUNTIME === "nodejs" || !process.env.NEXT_RUNTIME)) {
    try {
      const dns = await import("node:dns");
      dns.default.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
      dns.default.setDefaultResultOrder("ipv4first");
    } catch (e) {
      console.warn("DNS override failed in instrumentation:", e);
    }
  }
}
