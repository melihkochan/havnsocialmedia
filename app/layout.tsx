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
  } catch (err) {
    console.error("RootLayout maintenance check error:", err);
  }

  if (shouldRedirect) {
    redirect("/maintenance");
  }

  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
