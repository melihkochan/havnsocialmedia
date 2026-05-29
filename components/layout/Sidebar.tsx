"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Users, User, Settings, Bell, ChevronRight, LogOut, Bookmark, MessageSquare, HelpCircle, Search, Loader2, Info, Sparkles, Lightbulb, X, Sun, Moon, Monitor, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { HavnLogo } from "@/components/havn/HavnLogo";
import { createClient } from "@/lib/supabase/client";
import { cn, getSafeTimestamp } from "@/lib/utils";
import { getDisplayName, getFullName } from "@/lib/profile-display";
import type { ProfileNameFields } from "@/lib/profile-display";
import { ProfileName } from "@/components/havn/ProfileName";
import { isFounder } from "@/lib/founder";
import { cleanBio } from "@/lib/profile-enrich";
import { switchSession } from "@/lib/actions/auth";
import { useGlobalStore } from "@/lib/store/useGlobalStore";

const navItems = [
  { href: "/feed", label: "Anasayfa", icon: Compass },
  { href: "/communities", label: "Topluluklar", icon: Users },
  { href: "/messages", label: "Mesajlar", icon: MessageSquare },
  { href: "/notifications", label: "Bildirimler", icon: Bell },
  { href: "/bookmarks", label: "Kaydedilenler", icon: Bookmark },
  { href: "/profile", label: "Profil", icon: User },
];

function Avatar({ username, avatarUrl, updatedAt }: { username: string; avatarUrl: string | null; updatedAt?: string | null }) {
  if (avatarUrl) {
    const src = updatedAt ? `${avatarUrl}?t=${getSafeTimestamp(updatedAt)}` : avatarUrl;
    return (
      <img
        src={src}
        alt={username}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-border"
      />
    );
  }
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
      style={{
        background: "linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))",
        color: "var(--primary-foreground)",
      }}
    >
      {username.slice(0, 2).toUpperCase()}
    </div>
  );
}

interface SavedAccount {
  session: {
    access_token: string;
    refresh_token: string;
  };
  profile: {
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    updated_at?: string | null;
  };
}

interface SidebarProps {
  currentUser?: (ProfileNameFields & { 
    avatar_url: string | null; 
    banner_url?: string | null; 
    updated_at?: string | null; 
    bio?: string | null;
    is_gold?: boolean;
    is_verified?: boolean;
  }) | null;
  unreadCount?: number;
  unreadMessagesCount?: number;
  openSupportTickets?: number;
  isCollapsed?: boolean;
  onExpand?: () => void;
}

export function Sidebar({
  currentUser: currentUserProp,
  unreadCount = 0,
  unreadMessagesCount = 0,
  openSupportTickets: openSupportTicketsProp = 0,
  isCollapsed = false,
  onExpand,
}: SidebarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const storeCurrentUser = useGlobalStore((state) => state.currentUser);
  const unreadNotifications = useGlobalStore((state) => state.unreadNotificationsCount);
  const unreadDMs = useGlobalStore((state) => state.unreadDMsCount);
  const openSupportTicketsStore = useGlobalStore((state) => state.openSupportTicketsCount);

  const currentUser = storeCurrentUser || currentUserProp;

  // Hydration & SSR-safe layout metrics:
  const activeUnreadNotifications = mounted ? unreadNotifications : unreadCount;
  const activeUnreadDMs = mounted ? unreadDMs : unreadMessagesCount;
  const openSupportTickets = mounted ? openSupportTicketsStore : openSupportTicketsProp;

  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [accounts, setAccounts] = useState<SavedAccount[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("havn_accounts");
      if (stored) {
        try {
          const list = JSON.parse(stored) as SavedAccount[];
          if (Array.isArray(list)) {
            const uniqueMap = new Map<string, SavedAccount>();
            list.forEach((acc: SavedAccount) => {
              if (acc?.profile?.id && acc.session?.access_token) {
                uniqueMap.set(acc.profile.id, acc);
              }
            });
            return Array.from(uniqueMap.values());
          }
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  const [showAccountsMenu, setShowAccountsMenu] = useState(false);
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // true = showing switch loader, false = showing sign-out loader
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const isTokenExpired = (token: string): boolean => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      
      // Check expiration
      const expired = payload.exp ? payload.exp * 1000 < Date.now() : true;
      if (expired) return true;

      // Check issuer mismatch (e.g. localhost vs Vercel production)
      const currentSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (currentSupabaseUrl && payload.iss) {
        const expectedIssuer = `${currentSupabaseUrl.replace(/\/$/, '')}/auth/v1`;
        const actualIssuer = payload.iss.replace(/\/$/, '');
        if (actualIssuer !== expectedIssuer) {
          return true; // Treat issuer mismatch as expired/invalid
        }
      }

      return false;
    } catch {
      return true;
    }
  };

  // Search modal states
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!showSearchModal) {
      setSearchQuery("");
      setSearchResults([]);
      return;
    }
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setSearchLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, first_name, last_name, avatar_url, bio, is_verified, is_gold")
        .or(`username.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
        .limit(6);
      if (!error && data) {
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, showSearchModal]);

  // Load account list on mount and self-heal any polluted/duplicate tokens
  useEffect(() => {
    function getUserIdFromToken(token: string): string | null {
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const raw = window.atob(base64);
        const payload = JSON.parse(raw);
        return payload.sub || null;
      } catch {
        return null;
      }
    }

    const stored = localStorage.getItem("havn_accounts");
    if (stored) {
      try {
        const list = JSON.parse(stored) as SavedAccount[];
        if (Array.isArray(list)) {
          // Deduplicate strictly by profile id. Discard legacy entries with no id.
          const uniqueMap = new Map<string, SavedAccount>()
          list.forEach((acc: SavedAccount) => {
            if (acc?.profile && acc.profile.id && acc.session?.access_token) {
              uniqueMap.set(acc.profile.id, acc)
            }
          })
          
          let cleaned = Array.from(uniqueMap.values())
          
          // Only discard accounts where the token's user ID does NOT match the stored profile ID.
          // DO NOT discard based on access_token expiry — the refresh_token remains valid for weeks
          // and Supabase's setSession() will auto-refresh when we actually switch accounts.
          let hasPollution = false;
          const verified = cleaned.filter((acc: SavedAccount) => {
            const tokenUserId = getUserIdFromToken(acc.session.access_token);
            if (tokenUserId && tokenUserId !== acc.profile.id) {
              hasPollution = true;
              return false; // Discard token that belongs to a different user
            }
            return true;
          });
          
          if (hasPollution) {
            cleaned = verified;
          }

          setAccounts(cleaned);
          localStorage.setItem("havn_accounts", JSON.stringify(cleaned));
        }
      } catch {
        setAccounts([]);
      }
    }
  }, [currentUser]);

  // Sync active account and listen to token rotation / refreshes
  useEffect(() => {
    if (!currentUser) return;

    // 1. Initial sync
    const syncAccount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // AUTO-HEAL CLIENT SESSION: If client session doesn't match server currentUser, align them using saved tokens!
        const sessionUser = session?.user;
        const mismatch = !sessionUser || sessionUser.id !== currentUser.id;
        if (mismatch) {
          const reloadCountKey = `havn_heal_reload_${currentUser.id}`;
          const reloadCount = parseInt(sessionStorage.getItem(reloadCountKey) || '0', 10);
          if (reloadCount < 3) {
            const stored = localStorage.getItem("havn_accounts");
            if (stored) {
              try {
                const list = JSON.parse(stored) as SavedAccount[];
                const savedAcc = list.find((acc: SavedAccount) => acc.profile.id === currentUser.id);
                if (savedAcc && savedAcc.session?.access_token) {
                  sessionStorage.setItem(reloadCountKey, (reloadCount + 1).toString());
                  const { error } = await supabase.auth.setSession({
                    access_token: savedAcc.session.access_token,
                    refresh_token: savedAcc.session.refresh_token,
                  });
                  if (!error) {
                    window.location.reload();
                    return;
                  }
                }
              } catch {
                // silent
              }
            }
          } else {
            console.warn("Auto-heal failed after 3 attempts. Clearing saved account to prevent infinite loop.");
            const stored = localStorage.getItem("havn_accounts");
            if (stored) {
              try {
                const list = JSON.parse(stored) as SavedAccount[];
                const filtered = list.filter(acc => acc.profile.id !== currentUser.id);
                localStorage.setItem("havn_accounts", JSON.stringify(filtered));
                setAccounts(filtered);
              } catch {}
            }
            sessionStorage.removeItem(reloadCountKey);
          }
          return;
        } else {
          sessionStorage.removeItem(`havn_heal_reload_${currentUser.id}`);
        }

        if (!session || !session.user) return;

        const stored = localStorage.getItem("havn_accounts");
        let list: SavedAccount[] = [];
        if (stored) {
          try {
            list = JSON.parse(stored) as SavedAccount[];
          } catch {
            list = [];
          }
        }

        const existingIdx = list.findIndex(acc => acc.profile.id === currentUser.id);
        const currentAccount: SavedAccount = {
          session: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          },
          profile: {
            id: currentUser.id!,
            username: currentUser.username,
            first_name: currentUser.first_name ?? null,
            last_name: currentUser.last_name ?? null,
            avatar_url: currentUser.avatar_url,
            updated_at: currentUser.updated_at,
          }
        };

        let updated = false;
        if (existingIdx > -1) {
          // Compare and update if tokens changed
          const prev = list[existingIdx];
          if (prev.session.access_token !== session.access_token || prev.session.refresh_token !== session.refresh_token) {
            list[existingIdx] = currentAccount;
            updated = true;
          }
        } else {
          if (list.length >= 4) {
            list = list.slice(list.length - 3);
          }
          list.push(currentAccount);
          updated = true;
        }

        if (updated) {
          localStorage.setItem("havn_accounts", JSON.stringify(list));
          setAccounts(list);
        }
      } catch {
        // silent
      }
    };

    syncAccount();

    // 2. Listen to token refreshes / rotations in the background
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && session.user) {
        const stored = localStorage.getItem("havn_accounts");
        let list: SavedAccount[] = [];
        if (stored) {
          try {
            list = JSON.parse(stored) as SavedAccount[];
          } catch {
            list = [];
          }
        }

        const existingIdx = list.findIndex(acc => acc.profile.id === session.user.id);
        const currentAccount: SavedAccount = {
          session: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          },
          profile: {
            id: session.user.id,
            username: (session.user.user_metadata?.username as string) || (session.user.id === currentUser.id ? currentUser.username : ''),
            first_name: (session.user.user_metadata?.first_name as string) || (session.user.id === currentUser.id ? (currentUser.first_name ?? null) : null),
            last_name: (session.user.user_metadata?.last_name as string) || (session.user.id === currentUser.id ? (currentUser.last_name ?? null) : null),
            avatar_url: (session.user.user_metadata?.avatar_url as string) || (session.user.id === currentUser.id ? currentUser.avatar_url : null),
            updated_at: session.user.updated_at || null,
          }
        };

        let updated = false;
        if (existingIdx > -1) {
          const prev = list[existingIdx];
          if (prev.session.access_token !== session.access_token || prev.session.refresh_token !== session.refresh_token) {
            list[existingIdx] = {
              ...prev,
              session: currentAccount.session,
              profile: {
                ...prev.profile,
                username: currentAccount.profile.username || prev.profile.username,
                first_name: currentAccount.profile.first_name || prev.profile.first_name,
                last_name: currentAccount.profile.last_name || prev.profile.last_name,
                avatar_url: currentAccount.profile.avatar_url || prev.profile.avatar_url,
                updated_at: currentAccount.profile.updated_at || prev.profile.updated_at,
              }
            };
            updated = true;
          }
        } else if (session.user.id === currentUser.id) {
          if (list.length >= 4) {
            list = list.slice(list.length - 3);
          }
          list.push(currentAccount);
          updated = true;
        }

        if (updated) {
          localStorage.setItem("havn_accounts", JSON.stringify(list));
          setAccounts(list);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser]);

  const handleSwitchAccount = async (targetAccount: SavedAccount) => {
    // NOTE: We intentionally do NOT pre-check access_token expiry here.
    // Access tokens expire in ~1 hour, but refresh tokens last weeks.
    // supabase.auth.setSession() inside switchSession will auto-refresh
    // using the refresh_token, so we always let the server decide.

    try {
      setIsSwitchingAccount(true);
      setIsLoggingOut(true); // Show premium loader overlay during switch
      setShowAccountsMenu(false); // Close the account dropdown

      // Save current active session in memory in case we need to restore it
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      // First, set the session server-side to guarantee browser cookies are fully updated
      const res = await switchSession(
        targetAccount.session.access_token,
        targetAccount.session.refresh_token
      )

      if (res.error || !res.session) {
        // Token expired/invalid — remove it from the saved list
        const stored = localStorage.getItem('havn_accounts')
        let list: SavedAccount[] = []
        try { list = stored ? JSON.parse(stored) as SavedAccount[] : [] } catch { list = [] }
        const cleaned = list.filter(acc => acc.profile.id !== targetAccount.profile.id)
        localStorage.setItem('havn_accounts', JSON.stringify(cleaned))
        setAccounts(cleaned)

        // Restore client-side state in case supabase client cleared it locally:
        if (currentSession) {
          await supabase.auth.setSession({
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token,
          }).catch(() => { /* ignore */ });
        }

        setIsLoggingOut(false);
        setIsSwitchingAccount(false);
        setToastMessage(`@${targetAccount.profile.username} oturumu geçersiz. Lütfen tekrar giriş yapın.`);
        return
      }

      // UPDATE havn_accounts IMMEDIATELY with the fresh tokens returned by switchSession!
      // This is crucial because if setSession client-side fails or triggers events, we already have the fresh tokens saved.
      const stored = localStorage.getItem('havn_accounts')
      let list: SavedAccount[] = []
      try { list = stored ? JSON.parse(stored) as SavedAccount[] : [] } catch { list = [] }
      const updatedList = list.map(acc => {
        if (acc.profile.id === targetAccount.profile.id) {
          return {
            ...acc,
            session: {
              access_token: res.session!.access_token,
              refresh_token: res.session!.refresh_token,
            }
          }
        }
        return acc
      })
      localStorage.setItem('havn_accounts', JSON.stringify(updatedList))
      setAccounts(updatedList)

      // Sync the client-side browser client state immediately with fresh tokens returned by the server
      const { data, error } = await supabase.auth.setSession({
        access_token: res.session.access_token,
        refresh_token: res.session.refresh_token,
      })

      // Double check client-side update of localStorage if setSession succeeded
      if (!error && data.session) {
        const stored2 = localStorage.getItem('havn_accounts')
        let list2: SavedAccount[] = []
        try { list2 = stored2 ? JSON.parse(stored2) as SavedAccount[] : [] } catch { list2 = [] }
        const finalList = list2.map(acc => {
          if (acc.profile.id === targetAccount.profile.id) {
            return {
              ...acc,
              session: {
                access_token: data.session!.access_token,
                refresh_token: data.session!.refresh_token,
              }
            }
          }
          return acc
        })
        localStorage.setItem('havn_accounts', JSON.stringify(finalList))
      }

      // Navigate to feed after successful switch.
      window.location.assign('/feed');
    } catch (err) {
      setIsLoggingOut(false);
      setIsSwitchingAccount(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      setToastMessage('Hesap geçişi başarısız: ' + errMsg);
    }
  };

  const handleAddNewAccount = async () => {
    try {
      // Simply log out current session locally to clear session cookies without revoking the token on the server
      await supabase.auth.signOut({ scope: 'local' });
      window.location.assign('/login');
    } catch {
      window.location.assign('/login');
    }
  };

  const handleSignOut = async () => {
    try {
      if (!currentUser) return;
      setIsLoggingOut(true);

      const stored = localStorage.getItem("havn_accounts");
      let list: SavedAccount[] = [];
      if (stored) {
        try {
          list = JSON.parse(stored) as SavedAccount[];
        } catch {
          list = [];
        }
      }

      // Remove current active account from list
      const updatedList = list.filter(acc => acc.profile.id !== currentUser.id);
      localStorage.setItem("havn_accounts", JSON.stringify(updatedList));

      // Try switching to each of the other saved accounts one by one
      let switchSuccess = false;
      let remainingAccounts = [...updatedList] as SavedAccount[];

      while (remainingAccounts.length > 0) {
        const nextAccount = remainingAccounts[0];
        
        try {
          // Sync server-side session first
          const res = await switchSession(
            nextAccount.session.access_token,
            nextAccount.session.refresh_token
          );
          
          if (!res.error) {
            // Set the session client-side
            const { data, error } = await supabase.auth.setSession({
              access_token: nextAccount.session.access_token,
              refresh_token: nextAccount.session.refresh_token,
            });
            
            if (!error && data.session) {
              // Successfully switched! Save the updated session tokens to localStorage
              const updatedAccount = {
                ...nextAccount,
                session: {
                  access_token: data.session.access_token,
                  refresh_token: data.session.refresh_token,
                }
              };
              const newList = remainingAccounts.map(acc => 
                acc.profile.id === nextAccount.profile.id ? updatedAccount : acc
              );
              localStorage.setItem("havn_accounts", JSON.stringify(newList));
              switchSuccess = true;
              break;
            }
          }
        } catch (err) {
          console.error("Failed to switch session to account:", nextAccount.profile.username, err);
        }
        
        // Switch failed — remove this account from the saved list and try the next one
        remainingAccounts = remainingAccounts.filter(acc => acc.profile.id !== nextAccount.profile.id);
        localStorage.setItem("havn_accounts", JSON.stringify(remainingAccounts));
      }

      if (switchSuccess) {
        await new Promise(resolve => setTimeout(resolve, 800));
        window.location.assign('/feed');
        window.location.reload();
        return;
      }

      // If no other accounts succeeded, perform full signOut and redirect to login
      // Use 'local' scope so we only clear this browser session.
      // 'global' would revoke ALL refresh_tokens for this user on Supabase's server,
      // breaking multi-account switching for any other saved account.
      await supabase.auth.signOut({ scope: 'local' });
      await new Promise(resolve => setTimeout(resolve, 800));
      window.location.assign('/login');
    } catch {
      window.location.assign('/login');
    }
  };

  const handleRemoveSavedAccount = async (targetAccount: SavedAccount, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const isCurrentActive = targetAccount.profile.id === currentUser?.id;
      if (isCurrentActive) {
        await handleSignOut();
      } else {
        const stored = localStorage.getItem("havn_accounts");
        let list: SavedAccount[] = [];
        if (stored) {
          try {
            list = JSON.parse(stored) as SavedAccount[];
          } catch {
            list = [];
          }
        }
        const updatedList = list.filter(acc => acc.profile.id !== targetAccount.profile.id);
        localStorage.setItem("havn_accounts", JSON.stringify(updatedList));
        setAccounts(updatedList);
      }
    } catch {
      // silent
    }
  };

  return (
    <aside className={cn(
      "h-full flex flex-col gap-4 py-6 relative transition-all duration-300",
      isCollapsed ? "px-2 items-center overflow-visible" : "px-4 overflow-y-auto"
    )}>
      {/* Logo */}
      <div className="px-1 mb-2 flex items-center justify-between w-full">
        <HavnLogo collapsed={isCollapsed} />
        {!isCollapsed && (
          <Link
            href="/help"
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer shadow-sm border border-transparent hover:border-border/40 select-none flex items-center justify-center"
            title="Havn Rehberi"
          >
            <Info size={16} />
          </Link>
        )}
      </div>

      {/* Arama Input Butonu */}
      <div className="px-1 flex justify-center w-full">
        <button
          onClick={() => {
            if (isCollapsed && onExpand) {
              onExpand();
            }
            setShowSearchModal(true);
          }}
          title={isCollapsed ? "Kullanıcı Ara" : undefined}
          className={cn(
            "flex items-center transition-all border border-border bg-accent/30 hover:bg-accent/60 text-muted-foreground hover:text-foreground cursor-pointer",
            isCollapsed
              ? "w-10 h-10 justify-center rounded-xl p-0 mx-auto"
              : "w-full gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-left"
          )}
        >
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          {!isCollapsed && <span>Kullanıcı Ara...</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className={cn("flex flex-col gap-1 w-full", isCollapsed ? "items-center" : "items-center lg:items-stretch")}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href === "/feed" && pathname === "/") ||
            (href !== "/feed" && pathname.startsWith(href));

          let count = 0;
          if (href === "/notifications") count = activeUnreadNotifications;
          if (href === "/messages") count = activeUnreadDMs;

          return (
            <Link key={href} href={href} title={isCollapsed ? label : undefined}>
              <motion.div
                whileHover={isCollapsed ? { scale: 1.05 } : { x: 3 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "flex items-center transition-all duration-200 group relative",
                  isCollapsed
                    ? "w-10 h-10 justify-center p-0 rounded-xl mx-auto"
                    : "gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                  isActive
                    ? "text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                style={
                  isActive
                    ? {
                        background:
                          "linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))",
                      }
                    : {}
                }
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      "flex-shrink-0 transition-colors",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                    size={18}
                  />
                  {isCollapsed && count > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-background">
                      {count}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <>
                    <span className="truncate">{label}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "px-1.5 py-0.5 text-[10px] font-black rounded-full flex items-center justify-center min-w-[18px] h-[18px] leading-none transition-all",
                          isActive
                            ? "bg-background text-foreground ml-auto mr-2"
                            : "bg-red-500 text-white ml-auto"
                        )}
                      >
                        {count}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight
                        className={cn(
                          "w-4 h-4 opacity-60",
                          count > 0 ? "ml-0" : "ml-auto"
                        )}
                      />
                    )}
                  </>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Öneriler Link */}
      <Link href="/suggestions" title={isCollapsed ? "Öneriler" : undefined}>
        <motion.div
          whileHover={isCollapsed ? { scale: 1.05 } : { x: 3 }}
          whileTap={{ scale: 0.97 }}
          className={cn(
            "flex items-center transition-all duration-200 group border border-dashed border-sky-500/20 hover:border-sky-500/50 bg-sky-500/5 hover:bg-sky-500/10 cursor-pointer relative mb-1.5",
            isCollapsed
              ? "w-10 h-10 justify-center p-0 rounded-xl mx-auto"
              : "gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold",
            pathname.startsWith("/suggestions")
              ? "text-sky-500 border-sky-500/50 bg-sky-500/10"
              : "text-foreground hover:text-sky-500"
          )}
        >
          <div className="relative">
            <Lightbulb
              className={cn(
                "flex-shrink-0 transition-colors",
                pathname.startsWith("/suggestions")
                  ? "text-sky-500"
                  : "text-muted-foreground group-hover:text-sky-500"
              )}
              size={18}
            />
          </div>
          {!isCollapsed && (
            <>
              <span className="truncate">Öneriler</span>
              {pathname.startsWith("/suggestions") && (
                <ChevronRight className="w-4 h-4 ml-auto opacity-60 text-sky-500" />
              )}
            </>
          )}
        </motion.div>
      </Link>

      {/* Destek Link */}
      <Link href="/support" title={isCollapsed ? "Destek Talepleri" : undefined}>
        <motion.div
          whileHover={isCollapsed ? { scale: 1.05 } : { x: 3 }}
          whileTap={{ scale: 0.97 }}
          className={cn(
            "flex items-center transition-all duration-200 group border border-dashed border-amber-500/20 hover:border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer relative",
            isCollapsed
              ? "w-10 h-10 justify-center p-0 rounded-xl mx-auto"
              : "gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold",
            pathname.startsWith("/support")
              ? "text-amber-500 border-amber-500/50 bg-amber-500/10"
              : "text-foreground hover:text-amber-500"
          )}
        >
          <div className="relative">
            <HelpCircle
              className={cn(
                "flex-shrink-0 transition-colors",
                pathname.startsWith("/support")
                  ? "text-amber-500"
                  : "text-muted-foreground group-hover:text-amber-500"
              )}
              size={18}
            />
            {isCollapsed && openSupportTickets > 0 && (
              <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-background">
                {openSupportTickets}
              </span>
            )}
          </div>
          {!isCollapsed && (
            <>
              <span className="truncate">Destek Talepleri</span>
              {openSupportTickets > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full flex items-center justify-center min-w-[18px] h-[18px] leading-none bg-amber-500 text-white ml-auto">
                  {openSupportTickets}
                </span>
              )}
              {pathname.startsWith("/support") && (
                <ChevronRight className="w-4 h-4 ml-auto opacity-60 text-amber-500" />
              )}
            </>
          )}
        </motion.div>
      </Link>

      {/* Bottom Profile Area (Kokonut UI Profile Dropdown) */}
      {currentUser ? (
        <div className="relative w-full flex justify-center mt-auto">
          {/* Dropdown Popover */}
          <AnimatePresence>
            {showAccountsMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => {
                    setShowAccountsMenu(false);
                    setConfirmRemoveId(null);
                  }}
                />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "absolute z-30 bg-card border border-border rounded-2xl shadow-2xl p-2.5 flex flex-col gap-1.5 w-64",
                    isCollapsed
                      ? "bottom-0 left-full ml-3"
                      : "bottom-full left-0 mb-3"
                  )}
                  style={{
                    boxShadow: "0 10px 30px -10px color-mix(in oklch, var(--primary) 15%, transparent), 0 20px 40px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  {/* Header: Active Profile Info */}
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-accent/40 border border-border/30">
                    <div className="p-[1.5px] rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex-shrink-0">
                      <Avatar username={currentUser.username} avatarUrl={currentUser.avatar_url} updatedAt={currentUser.updated_at} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <ProfileName profile={currentUser} layout="stacked" nameClassName="text-xs font-black" showHandle={true} />
                    </div>
                  </div>

                  {/* Actions List */}
                  <div className="flex flex-col gap-0.5">
                    {/* Profil Link */}
                    <Link
                      href="/profile"
                      onClick={() => setShowAccountsMenu(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-foreground hover:bg-accent/70 transition-all text-left cursor-pointer w-full"
                    >
                      <User size={14} className="text-muted-foreground" />
                      Profil
                    </Link>

                    {/* Ayarlar Link */}
                    <Link
                      href="/settings"
                      onClick={() => setShowAccountsMenu(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-foreground hover:bg-accent/70 transition-all text-left cursor-pointer w-full"
                    >
                      <Settings size={14} className="text-muted-foreground" />
                      Ayarlar
                    </Link>

                    {/* Tema Değiştirici (Inline Segmented) */}
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-accent/40 transition-colors">
                      <span className="flex items-center gap-2.5 text-xs font-bold text-foreground select-none">
                        <Sun size={14} className="text-muted-foreground" />
                        Renk Modu
                      </span>
                      {mounted && (
                        <div className="flex bg-accent rounded-lg p-0.5 border border-border/40">
                          {[
                            { value: "light", icon: Sun, label: "Açık" },
                            { value: "dark", icon: Moon, label: "Koyu" },
                            { value: "system", icon: Monitor, label: "Sistem" }
                          ].map((t) => (
                            <button
                              key={t.value}
                              onClick={() => setTheme(t.value)}
                              title={t.label}
                              className={cn(
                                "p-1 rounded-md transition-all text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center",
                                theme === t.value && "bg-card text-primary shadow-sm border border-border/10"
                              )}
                            >
                              <t.icon size={11} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Rol Badge Row */}
                    {(() => {
                      const isUserFounder = isFounder(currentUser);
                      const isUserGold = currentUser.is_gold;
                      const badgeText = isUserFounder ? "FOUNDER" : isUserGold ? "GOLD" : "ÜYE";
                      const badgeClass = isUserFounder 
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                        : isUserGold 
                        ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        : "bg-primary/10 text-primary border-primary/20";
                      
                      return (
                        <div className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-accent/40 transition-colors">
                          <span className="flex items-center gap-2.5 text-xs font-bold text-foreground select-none">
                            <Shield size={14} className="text-muted-foreground" />
                            Rol
                          </span>
                          <span className={cn("px-1.5 py-0.5 text-[8px] font-black rounded border tracking-wider", badgeClass)}>
                            {badgeText}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Accounts & Session Management */}
                  {(() => {
                    const otherAccounts = accounts.filter(acc => acc.profile.id !== currentUser.id);
                    if (otherAccounts.length === 0 && accounts.length >= 4) return null;

                    return (
                      <>
                        <div className="border-t border-border/50 my-1" />
                        
                        {otherAccounts.length > 0 && (
                          <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-0.5">
                            <div className="text-[9px] font-black text-muted-foreground/80 uppercase px-2 py-0.5 tracking-wider select-none">
                              Hesap Değiştir
                            </div>
                            {otherAccounts.map((acc) => {
                              const isConfirming = confirmRemoveId === acc.profile.id;
                              return (
                                <div key={acc.profile.id} className="flex flex-col">
                                  {isConfirming ? (
                                    <div className="flex items-center justify-between gap-1 px-1.5 py-1 rounded-xl bg-destructive/15 border border-destructive/20 text-xs font-bold text-destructive animate-in fade-in slide-in-from-right-1 duration-200 w-full min-h-[36px]">
                                      <span className="truncate flex-1 text-[9px] leading-tight font-black select-none text-destructive">Oturum kapatılsın mı?</span>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmRemoveId(null);
                                          }}
                                          className="px-1.5 py-0.5 rounded-lg bg-card border border-border hover:bg-accent text-foreground transition-all text-[8px] cursor-pointer font-black"
                                        >
                                          İptal
                                        </button>
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            setConfirmRemoveId(null);
                                            await handleRemoveSavedAccount(acc, e);
                                          }}
                                          className="px-1.5 py-0.5 rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-all text-[8px] cursor-pointer font-black"
                                        >
                                          Evet
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 w-full group/acc">
                                      <button
                                        onClick={() => handleSwitchAccount(acc)}
                                        className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-left transition-all flex-1 border border-transparent hover:bg-accent/60 cursor-pointer min-w-0"
                                      >
                                        <Avatar username={acc.profile.username} avatarUrl={acc.profile.avatar_url} updatedAt={acc.profile.updated_at} />
                                        <div className="flex-1 min-w-0">
                                          <ProfileName profile={acc.profile} layout="stacked" nameClassName="text-xs font-bold" showHandle={true} />
                                        </div>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmRemoveId(acc.profile.id);
                                        }}
                                        title="Hesabı Kaldır"
                                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer flex-shrink-0 opacity-0 group-hover/acc:opacity-100 focus/acc:opacity-100"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {accounts.length < 4 && (
                          <button
                            onClick={handleAddNewAccount}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold text-primary hover:bg-primary/5 transition-all text-left cursor-pointer w-full mt-0.5"
                          >
                            <span className="w-4 h-4 rounded-md bg-primary/10 flex items-center justify-center font-bold text-xs">+</span>
                            Yeni Hesap Ekle
                          </button>
                        )}
                      </>
                    );
                  })()}

                  <div className="border-t border-border/50 my-1" />

                  {/* Sign Out Button */}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-all text-left cursor-pointer w-full"
                  >
                    <LogOut size={13} className="text-destructive flex-shrink-0" />
                    Çıkış Yap
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Hover Profile Card (for collapsed mode) */}
          <AnimatePresence>
            {isCollapsed && showHoverCard && !showAccountsMenu && (
              <motion.div
                initial={{ opacity: 0, x: 10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute left-full ml-3 bottom-0 w-64 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-40 p-0 pointer-events-none select-none"
                style={{
                  boxShadow: "0 0 25px -5px color-mix(in oklch, var(--primary) 30%, transparent), 0 8px 30px rgba(0, 0, 0, 0.3)",
                }}
              >
                {/* Micro banner */}
                {currentUser.banner_url ? (
                  <img
                    src={currentUser.updated_at ? `${currentUser.banner_url}?t=${getSafeTimestamp(currentUser.updated_at)}` : currentUser.banner_url}
                    alt="Kapak Görseli"
                    className="h-14 w-full object-cover"
                  />
                ) : (
                  <div
                    className="h-14 w-full"
                    style={{
                      background: "linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))",
                    }}
                  />
                )}
                
                {/* Content */}
                <div className="p-4 pt-0 relative flex flex-col items-center text-center">
                  {/* Overlapping Avatar */}
                  <div className="-mt-7 mb-2 border-2 border-card rounded-full bg-card relative">
                    <div className="w-12 h-12 rounded-full overflow-hidden">
                      {currentUser.avatar_url ? (
                        <img
                          src={currentUser.updated_at ? `${currentUser.avatar_url}?t=${getSafeTimestamp(currentUser.updated_at)}` : currentUser.avatar_url}
                          alt={currentUser.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center font-bold text-sm"
                          style={{
                            background: "linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))",
                            color: "var(--primary-foreground)",
                          }}
                        >
                          {currentUser.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    {/* Pulsing online status indicator */}
                    <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border border-card flex items-center justify-center">
                      <span className="absolute w-2 h-2 bg-green-400 rounded-full animate-ping" />
                    </span>
                  </div>
                  
                  {/* Name & Handle */}
                  <ProfileName profile={currentUser} layout="stacked" nameClassName="text-sm font-black" showHandle={true} align="center" />
                  
                  {/* Çevrimiçi Badge */}
                  <div className="flex items-center gap-1.5 text-[9px] text-green-500 font-black mt-1 uppercase tracking-wider select-none bg-green-500/5 px-2 py-0.5 rounded-full border border-green-500/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Çevrimiçi
                  </div>

                  {/* Bio */}
                  {currentUser.bio && (
                    <p className="text-[10px] text-muted-foreground mt-2.5 line-clamp-2 max-w-full px-2">
                      {cleanBio(currentUser.bio)}
                    </p>
                  )}
                  
                  {/* Hint */}
                  <div className="border-t border-border/40 w-full mt-3 pt-2 text-[9px] font-bold text-primary">
                    Profil menüsü için tıklayın
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trigger button */}
          <button
            onMouseEnter={() => isCollapsed && setShowHoverCard(true)}
            onMouseLeave={() => isCollapsed && setShowHoverCard(false)}
            onClick={() => {
              if (isCollapsed && onExpand) {
                onExpand();
                setShowAccountsMenu(true);
              } else {
                setShowAccountsMenu((s) => !s);
              }
            }}
            className={cn(
              "flex items-center transition-all duration-300 cursor-pointer text-left border border-border/30 bg-accent/15 hover:bg-accent/40 shadow-sm hover:shadow active:scale-[0.98]",
              isCollapsed
                ? "justify-center p-0.5 w-11 h-11 rounded-full mx-auto"
                : "gap-3 px-3 py-2.5 rounded-2xl w-full"
            )}
          >
            {isCollapsed ? (
              <div className="p-[1.5px] rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex-shrink-0">
                <Avatar username={currentUser.username} avatarUrl={currentUser.avatar_url} updatedAt={currentUser.updated_at} />
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0 pl-1">
                  <ProfileName profile={currentUser} layout="stacked" nameClassName="text-sm font-bold" showHandle={true} />
                </div>
                <div className="p-[1.5px] rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex-shrink-0">
                  <Avatar username={currentUser.username} avatarUrl={currentUser.avatar_url} updatedAt={currentUser.updated_at} />
                </div>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 items-center w-full mt-auto">
          <Link href="/login" title={isCollapsed ? "Giriş Yap" : undefined} className="w-full flex justify-center">
            <motion.div
              whileTap={{ scale: 0.97 }}
              className={cn(
                "flex items-center justify-center font-bold transition-all",
                isCollapsed
                  ? "w-10 h-10 rounded-xl p-0 mx-auto"
                  : "w-full py-2.5 rounded-xl text-sm gap-2"
              )}
              style={{
                background: "linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))",
                color: "var(--primary-foreground)",
              }}
            >
              {isCollapsed ? <User size={16} /> : "Giriş Yap"}
            </motion.div>
          </Link>
          {!isCollapsed && (
            <Link href="/register" className="w-full">
              <div className="w-full flex items-center justify-center py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                Kayıt Ol
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Arama Çekmecesi (Search Drawer) */}
      <AnimatePresence>
        {showSearchModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSearchModal(false)}
              className="fixed inset-0 z-[90] bg-transparent"
            />
            
            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="fixed left-0 top-0 bottom-0 z-[100] w-80 sm:w-96 bg-card border-r border-border shadow-2xl flex flex-col p-5 gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Input Header */}
              <div className="flex items-center gap-3 border-b border-border/60 pb-4 pt-2">
                <Search size={16} className="text-primary flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Kullanıcı adı veya ad soyad..."
                  className="flex-1 bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground focus:ring-0"
                  autoFocus
                />
                {searchLoading ? (
                  <Loader2 size={14} className="animate-spin text-muted-foreground flex-shrink-0" />
                ) : (
                  searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Temizle
                    </button>
                  )
                )}
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="px-2.5 py-1 rounded-lg border border-border bg-accent/40 text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Kapat
                </button>
              </div>

              {/* Results List */}
              <div className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1">
                {searchResults.length === 0 ? (
                  <div className="text-center py-12 text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <Search size={24} className="opacity-30 text-muted-foreground" />
                    <span>
                      {searchQuery.trim().length < 2
                        ? "Arama yapmak için en az 2 karakter yazın."
                        : "Eşleşen kullanıcı bulunamadı."}
                    </span>
                  </div>
                ) : (
                  searchResults.map((user) => (
                    <Link
                      key={user.id}
                      href={`/profile/${user.username}`}
                      onClick={() => setShowSearchModal(false)}
                      className="flex items-center gap-3 p-3 rounded-2xl hover:bg-accent/60 transition-all border border-transparent hover:border-border/50 text-left group"
                    >
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-border group-hover:ring-primary/40 transition-all"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs group-hover:ring-1 group-hover:ring-primary/40 transition-all"
                          style={{
                            background: "linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))",
                            filter: `hue-rotate(${(user.username.charCodeAt(0) * 17) % 360}deg)`,
                            color: "var(--primary-foreground)",
                          }}
                        >
                          {user.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <ProfileName profile={user} layout="stacked" nameClassName="text-xs font-bold" showHandle={true} />
                        {user.bio && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{cleanBio(user.bio)}</p>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Oturum Kapatılıyor Loader */}
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-3 w-80 text-center"
            >
              {/* Concentric Loader inspired by Kokonut UI (Orbital SVG design) */}
              <div className="relative w-24 h-24 my-3 flex items-center justify-center flex-shrink-0">
                {/* Ambient Glow */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary to-sky-500 opacity-25 blur-md animate-pulse" />
                
                {/* Ring 1: Outer track */}
                <motion.svg
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute w-full h-full text-primary"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray="90 180"
                    fill="transparent"
                    className="opacity-90"
                  />
                </motion.svg>

                {/* Ring 2: Reverse track */}
                <motion.svg
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute w-[82%] h-[82%] text-sky-500"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="70 160"
                    fill="transparent"
                    className="opacity-75"
                  />
                </motion.svg>

                {/* Ring 3: Fast inner tracker */}
                <motion.svg
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="absolute w-[64%] h-[64%] text-indigo-500"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="30 200"
                    fill="transparent"
                    className="opacity-90"
                  />
                </motion.svg>

                {/* Pulsing gradient core */}
                <motion.div
                  animate={{ scale: [0.9, 1.1, 0.9] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-indigo-500 shadow-md shadow-primary/30"
                />
              </div>
              <div className="text-sm font-bold text-foreground">
                {isSwitchingAccount ? 'Hesap Değiştiriliyor...' : 'Oturum Kapatılıyor...'}
              </div>
              <div className="text-xs text-muted-foreground leading-normal">
                {isSwitchingAccount
                  ? 'Diğer hesabınıza güvenli geçiş yapılıyor. Lütfen bekleyin.'
                  : 'Oturumunuz güvenli şekilde kapatılıyor. Lütfen bekleyin.'}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 right-5 z-[99999] bg-card border border-border/80 shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3 w-80 max-w-full"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
            <div className="flex-1 text-xs font-black text-foreground">
              {toastMessage}
            </div>
            <button 
              onClick={() => setToastMessage(null)}
              className="text-[10px] text-muted-foreground hover:text-foreground font-black cursor-pointer px-1.5 py-0.5 rounded-lg hover:bg-accent flex-shrink-0"
            >
              Kapat
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
