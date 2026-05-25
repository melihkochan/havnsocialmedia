export async function register() {
  // Only run DNS fix in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === "nodejs" || !process.env.NEXT_RUNTIME) {
    const dns = await import("node:dns");
    dns.default.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
    dns.default.setDefaultResultOrder("ipv4first");
  }
}
