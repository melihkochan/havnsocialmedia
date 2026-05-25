import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import nodeFetch from 'node-fetch'
import http from 'node:http'
import https from 'node:https'
import dns from 'node:dns'

// Force Google DNS and IPv4 preference to prevent Windows DNS resolution issues/timeouts
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"])
  dns.setDefaultResultOrder("ipv4first")
} catch (e) {
  console.warn("Failed to set custom DNS servers:", e)
}

// DNS cache to speed up lookups and bypass Windows getaddrinfo DNS timeouts
const dnsCache = new Map<string, { address: string; family: number; expiresAt: number }>()

function customLookup(
  hostname: string,
  options: any,
  callback: (err: NodeJS.ErrnoException | null, address: any, family?: number) => void
) {
  // Local hostnames and direct IP addresses resolve instantly
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    /^[0-9.]+$/.test(hostname) ||
    /^[0-9a-fA-F:]+$/.test(hostname)
  ) {
    return dns.lookup(hostname, options, callback)
  }

  const now = Date.now()
  const cached = dnsCache.get(hostname)
  if (cached && cached.expiresAt > now) {
    if (options && options.all) {
      return callback(null, [{ address: cached.address, family: cached.family }])
    } else {
      return callback(null, cached.address, cached.family)
    }
  }

  // Force resolve4 which uses the fast Google/Cloudflare DNS servers set above
  dns.resolve4(hostname, (err, addresses) => {
    if (err || !addresses || addresses.length === 0) {
      // Fallback to default OS lookup if custom DNS fails
      return dns.lookup(hostname, options, callback)
    }

    const ip = addresses[0]
    const family = 4

    dnsCache.set(hostname, {
      address: ip,
      family,
      expiresAt: Date.now() + 300000, // 5 min TTL
    })

    if (options && options.all) {
      callback(null, [{ address: ip, family }])
    } else {
      callback(null, ip, family)
    }
  })
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Use globalThis to persist the agent across hot-reloads in dev mode
const globalAgents = globalThis as typeof globalThis & {
  __supabaseHttpsAgent?: https.Agent
  __supabaseHttpAgent?: http.Agent
  __supabaseWarmedUp?: boolean
}

if (!globalAgents.__supabaseHttpsAgent) {
  globalAgents.__supabaseHttpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 60000,
    maxSockets: 50,
    maxFreeSockets: 20,
    timeout: 30000,
    lookup: customLookup,
  })
}

if (!globalAgents.__supabaseHttpAgent) {
  globalAgents.__supabaseHttpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 60000,
    maxSockets: 50,
    maxFreeSockets: 20,
    timeout: 30000,
    lookup: customLookup,
  })
}

// Warm up connections on first load — pre-establish TLS to both endpoints
if (!globalAgents.__supabaseWarmedUp && SUPABASE_URL) {
  globalAgents.__supabaseWarmedUp = true
  const warmUp = async () => {
    try {
      const agent = globalAgents.__supabaseHttpsAgent
      if (agent) {
        // Sequential warmup — each request establishes a TLS connection
        await nodeFetch(`${SUPABASE_URL}/rest/v1/`, { agent, headers: { apikey: SUPABASE_KEY } })
        await nodeFetch(`${SUPABASE_URL}/auth/v1/settings`, { agent, headers: { apikey: SUPABASE_KEY } })
        // Third request to ensure pool is warm
        await nodeFetch(`${SUPABASE_URL}/rest/v1/`, { agent, headers: { apikey: SUPABASE_KEY } })
      }
    } catch {
      // Ignore warmup errors
    }
  }
  warmUp()
}

// Custom fetch with persistent keep-alive agent
const persistentFetch = ((url: any, opts: any = {}) => {
  const urlStr = typeof url === 'string' ? url : (url.href || '');
  const isHttps = urlStr.startsWith('https://');
  const agent = isHttps ? globalAgents.__supabaseHttpsAgent : globalAgents.__supabaseHttpAgent;
  return nodeFetch(url, { ...opts, agent })
}) as unknown as typeof globalThis.fetch

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      global: {
        fetch: persistentFetch,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component — ignore cookie set errors
          }
        },
      },
    }
  )
}

export async function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined')
  }
  return createServerClient(
    SUPABASE_URL,
    serviceKey,
    {
      global: {
        fetch: persistentFetch,
      },
      cookies: {
        getAll() { return [] },
        setAll() {}
      },
    }
  )
}
