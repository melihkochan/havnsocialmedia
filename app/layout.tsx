import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Suspense } from "react";
import { TopProgressBar } from "@/components/layout/TopProgressBar";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
