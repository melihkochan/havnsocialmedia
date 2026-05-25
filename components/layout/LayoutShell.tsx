"use client";

import React, { useState, useEffect, cloneElement, isValidElement, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, ChevronLeft, ChevronRight, ArrowUp } from "lucide-react";
import { QuickChat } from "@/components/havn/QuickChat";
import { cn } from "@/lib/utils";

interface LayoutShellProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  rightBar?: React.ReactNode | null;
  username?: string;
  currentUser?: any;
  fullWidth?: boolean;
  accentColor?: string | null;
}

export function LayoutShell({ children, sidebar, rightBar, username, currentUser, fullWidth, accentColor }: LayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const collapsed = localStorage.getItem("sidebar_collapsed") === "true";
    setSidebarCollapsed(collapsed);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY || document.documentElement.scrollTop || scrollContainerRef.current?.scrollTop || 0;
      setShowScrollTop(scrollPos > 400);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
    }

    // Run initial check
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
    };
  }, [pathname]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle using Ctrl + B or Ctrl + \ (standard sidebar toggle combos)
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B" || e.key === "\\")) {
        e.preventDefault();
        handleToggleCollapse();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const update = async () => {
      try {
        const { updateLastSeen } = await import("@/lib/actions/profile");
        await updateLastSeen();
      } catch (e) {}
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const clonedSidebar = isValidElement(sidebar)
    ? cloneElement(sidebar as React.ReactElement<any>, {
        isCollapsed: sidebarCollapsed,
        onExpand: () => setSidebarCollapsed(false),
      })
    : sidebar;

  return (
    <div className="min-h-screen bg-background flex relative">
      {accentColor && accentColor !== 'default' && (
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --primary: ${accentColor} !important;
              --ring: ${accentColor} !important;
              --havn-gradient-start: ${accentColor} !important;
              --havn-gradient-end: color-mix(in srgb, ${accentColor} 65%, #000) !important;
            }
            .dark {
              --primary: color-mix(in srgb, ${accentColor} 85%, #fff) !important;
              --ring: color-mix(in srgb, ${accentColor} 85%, #fff) !important;
              --havn-gradient-start: color-mix(in srgb, ${accentColor} 85%, #fff) !important;
              --havn-gradient-end: ${accentColor} !important;
            }
          `
        }} />
      )}
      {/* ── Desktop Left Sidebar ── */}
      <div
        className={cn(
          "hidden lg:flex flex-col border-r border-border flex-shrink-0 sticky top-0 h-screen overflow-visible transition-all duration-300 ease-in-out z-30",
          sidebarCollapsed ? "w-20" : "w-64 xl:w-72"
        )}
      >
        {clonedSidebar}
        
        {/* Toggle Button */}
        <button
          onClick={handleToggleCollapse}
          className="absolute top-1/2 -translate-y-1/2 -right-3 z-50 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent text-foreground transition-all shadow-md active:scale-95 cursor-pointer"
          title={sidebarCollapsed ? "Genişlet" : "Daralt"}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ── Mobile Sidebar Overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 border-r border-border bg-background lg:hidden shadow-2xl"
            >
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <main className={`flex-1 min-w-0 flex flex-col ${fullWidth ? "h-[100dvh] overflow-hidden" : ""}`}>
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border glass sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-accent text-foreground transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="font-black tracking-widest gradient-text text-lg">HAVN</span>
          {username && (
            <div className="ml-auto">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background:
                    "linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))",
                  color: "var(--primary-foreground)",
                }}
              >
                {username.slice(0, 2).toUpperCase()}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div ref={scrollContainerRef} className={`flex-1 flex flex-col min-h-0 ${fullWidth ? "overflow-hidden" : "overflow-y-auto"}`}>
          {fullWidth ? (
            <div className="flex-1 flex flex-col h-full w-full">
              {children}
            </div>
          ) : (
            <div className="w-full max-w-3xl mx-auto px-4 lg:px-6 py-6 relative">
              {children}
            </div>
          )}
        </div>
      </main>

      {/* ── Desktop Right Sidebar ── */}
      {rightBar && (
        <div className="hidden xl:flex flex-col w-80 2xl:w-96 border-l border-border flex-shrink-0 sticky top-0 h-screen overflow-hidden">
          {rightBar}
        </div>
      )}

      {/* Floating Back to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            onClick={scrollToTop}
            className={cn(
              "fixed bottom-24 z-40 p-3.5 rounded-full glass border border-border text-foreground hover:text-primary hover:border-primary/30 transition-all shadow-lg active:scale-95 cursor-pointer flex items-center justify-center group",
              rightBar 
                ? "right-6 xl:right-[340px] 2xl:right-[404px]" 
                : "right-6"
            )}
            style={{
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
            }}
            title="Yukarı Dön"
          >
            <ArrowUp size={16} className="group-hover:-translate-y-0.5 transition-transform duration-200" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating Quick Chat Widget */}
      {currentUser && pathname !== "/messages" && <QuickChat currentUser={currentUser} />}
    </div>
  );
}

