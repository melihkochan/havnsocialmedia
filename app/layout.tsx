import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Suspense } from "react";
import { TopProgressBar } from "@/components/layout/TopProgressBar";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ensureHavnOfficialProfile } from "@/lib/actions/system-init";
import { GlobalStoreProvider } from "@/components/providers/GlobalStoreProvider";
import Script from "next/script";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";
import {
  detectLocaleFromAcceptLanguage,
  detectLocaleFromCountry,
  type Locale,
} from "@/lib/i18n";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HAVN — Your Safe Harbour",
  description:
    "HAVN is a community-first social platform designed to be your safe harbour. Discover communities, share ideas, and connect with people who matter.",
  keywords: ["social media", "community", "HAVN", "forum", "discussion"],
  openGraph: {
    title: "HAVN — Your Safe Harbour",
    description: "A community-first social platform. Your safe harbour.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Seed official havn profile if it doesn't exist
  await ensureHavnOfficialProfile();

  // Read pathname injected from proxy.ts (middleware)
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";

  let shouldRedirect = false;

  // Check maintenance mode status using the server client (which uses the custom DNS lookup / ipv4 preference)
  try {
    const supabase = await createClient();

    // Query system settings
    const { data: maintSetting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .maybeSingle();

    const isMaintenance = maintSetting ? (maintSetting.value === true || maintSetting.value === "true") : false;

    if (isMaintenance) {
      // Exclude paths: allowed paths are login, register, hq, callback, and the maintenance page itself
      const isAllowed = 
        pathname === "/maintenance" || 
        pathname === "/login" || 
        pathname === "/register" || 
        pathname.startsWith("/havn-hq-control") || 
        pathname === "/havn-hq-gate" ||
        pathname.startsWith("/auth");

      if (!isAllowed) {
        // Retrieve current user
        const { data: { user } } = await supabase.auth.getUser();
        let isAuthorized = false;

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

          if (profile && ["founder", "admin"].includes(profile.role ?? "")) {
            isAuthorized = true;
          }
        }

        if (!isAuthorized) {
          shouldRedirect = true;
        }
      }
    }
  } catch {
    // silent — maintenance check failed, allow page to render
  }

  if (shouldRedirect) {
    redirect("/maintenance");
  }

  // ── Locale Detection (priority: DB → profile country → Accept-Language header → default)
  let initialLocale: Locale = 'tr'
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('bio, country')
        .eq('id', user.id)
        .single()

      if (profile) {
        // 1. Check bio metadata for preferred_language
        if (profile.bio) {
          const parts = profile.bio.split('\u200B')
          if (parts.length > 1) {
            try {
              const meta = JSON.parse(parts[1])
              if (meta.preferred_language === 'tr' || meta.preferred_language === 'en') {
                initialLocale = meta.preferred_language
              }
            } catch {}
          }
        }

        // 2. Fallback: detect from profile country
        if (!profile.bio || initialLocale === 'tr') {
          const countryCode = (profile as any).country as string | null
          const countryLocale = detectLocaleFromCountry(countryCode)
          if (countryLocale && !profile.bio?.includes('preferred_language')) {
            initialLocale = countryLocale
          }
        }
      }
    } else {
      // 3. No user: detect from Accept-Language header
      const acceptLang = headerList.get('accept-language')
      initialLocale = detectLocaleFromAcceptLanguage(acceptLang)
    }
  } catch {
    // silent — use default locale
    const acceptLang = headerList.get('accept-language')
    initialLocale = detectLocaleFromAcceptLanguage(acceptLang)
  }

  return (
    <html lang={initialLocale} suppressHydrationWarning>
      <head>
        <Script
          id="accent-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const accent = localStorage.getItem("havn_accent_theme") || "purple";
                document.documentElement.setAttribute("data-accent", accent);
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <Suspense fallback={null}>
            <TopProgressBar />
          </Suspense>
          <LocaleProvider initialLocale={initialLocale}>
            <GlobalStoreProvider>
              {children}
            </GlobalStoreProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
