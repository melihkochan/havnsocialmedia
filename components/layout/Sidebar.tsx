"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Users, User, Settings, Bell, ChevronRight, LogOut, Bookmark, MessageSquare, HelpCircle, Search, Loader2, Info, Sparkles, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { HavnLogo } from "@/components/havn/HavnLogo";
import { ThemeToggle } from "@/components/havn/ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { getDisplayName, getFullName } from "@/lib/profile-display";
import type { ProfileNameFields } from "@/lib/profile-display";
import { ProfileName } from "@/components/havn/ProfileName";
import { isFounder } from "@/lib/founder";
import { cleanBio } from "@/lib/profile-enrich";
import { switchSession } from "@/lib/actions/auth";

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
    const src = updatedAt ? `${avatarUrl}?t=${new Date(updatedAt).getTime()}` : avatarUrl;
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

interface SidebarProps {
  currentUser?: (ProfileNameFields & { avatar_url: string | null; banner_url?: string | null; updated_at?: string | null; bio?: string | null }) | null;
  unreadCount?: number;
  unreadMessagesCount?: number;
  openSupportTickets?: number;
  isCollapsed?: boolean;
  onExpand?: () => void;
}

export function Sidebar({
  currentUser,
  unreadCount = 0,
  unreadMessagesCount = 0,
  openSupportTickets: openSupportTicketsProp = 0,
  isCollapsed = false,
  onExpand,
}: SidebarProps) {
  const pathname = usePathname();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showAccountsMenu, setShowAccountsMenu] = useState(false);
  const [showHoverCard, setShowHoverCard] = useState(false);
  const supabase = createClient();

  const [unreadNotifications, setUnreadNotifications] = useState(unreadCount);
  const [unreadDMs, setUnreadDMs] = useState(unreadMessagesCount);
  const [openSupportTickets, setOpenSupportTickets] = useState(openSupportTicketsProp);

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

  useEffect(() => {
    setUnreadNotifications(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    setUnreadDMs(unreadMessagesCount);
  }, [unreadMessagesCount]);

  useEffect(() => {
    setOpenSupportTickets(openSupportTicketsProp);
  }, [openSupportTicketsProp]);

  const fetchUnreadDMs = async () => {
    if (!currentUser?.id) return;
    const { count } = await supabase
      .from('direct_messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', currentUser.id)
      .eq('is_read', false);
    if (count !== null) setUnreadDMs(count);
  };

  const fetchUnreadNotifications = async () => {
    if (!currentUser?.id) return;
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
      .eq('is_read', false);
    if (count !== null) setUnreadNotifications(count);
  };

  const fetchOpenSupportTickets = async () => {
    if (!currentUser?.id) return;
    const isUserFounder = isFounder(currentUser);
    let query = supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true });

    if (isUserFounder) {
      query = query.eq('status', 'open');
    } else {
      query = query.eq('user_id', currentUser.id).eq('status', 'replied');
    }

    const { count } = await query;
    if (count !== null) setOpenSupportTickets(count);
  };

  useEffect(() => {
    if (!currentUser?.id) return;

    fetchUnreadDMs();
    fetchUnreadNotifications();
    fetchOpenSupportTickets();

    const channelToken = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Listen to direct messages changes to sync unread DMs
    const dmChannel = supabase.channel(`sidebar_dms_${currentUser.id}_${channelToken}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const newMsg = payload.new as any;
          const oldMsg = payload.old as any;
          if (newMsg?.receiver_id === currentUser.id || oldMsg?.receiver_id === currentUser.id) {
            fetchUnreadDMs();
          }
        }
      )
      .subscribe();

    // Listen to notifications changes to sync unread notifications
    const notifChannel = supabase.channel(`sidebar_notifs_${currentUser.id}_${channelToken}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotif = payload.new as any;
          const oldNotif = payload.old as any;
          if (newNotif?.user_id === currentUser.id || oldNotif?.user_id === currentUser.id) {
            fetchUnreadNotifications();
          }
        }
      )
      .subscribe();

    const supportChannel = supabase.channel(`sidebar_support_tickets_${channelToken}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          fetchOpenSupportTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dmChannel);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(supportChannel);
    };
  }, [currentUser?.id]);

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
        const list = JSON.parse(stored);
        if (Array.isArray(list)) {
          // Deduplicate strictly by profile id. Discard legacy entries with no id.
          const uniqueMap = new Map<string, any>()
          list.forEach((acc: any) => {
            if (acc?.profile && acc.profile.id && acc.session?.access_token) {
              uniqueMap.set(acc.profile.id, acc)
            }
          })
          
          let cleaned = Array.from(uniqueMap.values())
          
          // Detect token pollution (token user ID does not match the profile ID)
          let hasPollution = false;
          const verified = cleaned.filter((acc: any) => {
            const tokenUserId = getUserIdFromToken(acc.session.access_token);
            if (tokenUserId && tokenUserId !== acc.profile.id) {
              hasPollution = true;
              return false; // Discard polluted token account
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

  // Sync active account to list
  useEffect(() => {
    if (!currentUser) return;

    const syncAccount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // AUTO-HEAL CLIENT SESSION: If client session doesn't match server currentUser, align them using saved tokens!
        const sessionUser = session?.user;
        if (sessionUser && sessionUser.id !== currentUser.id) {
          const stored = localStorage.getItem("havn_accounts");
          if (stored) {
            try {
              const list = JSON.parse(stored);
              const savedAcc = list.find((acc: any) => acc.profile.id === currentUser.id);
              if (savedAcc && savedAcc.session?.access_token) {
                await supabase.auth.setSession({
                  access_token: savedAcc.session.access_token,
                  refresh_token: savedAcc.session.refresh_token,
                });
                window.location.reload();
                return;
              }
            } catch {
              // silent
            }
          }
          return;
        }

        if (!session || !session.user) return;

        const stored = localStorage.getItem("havn_accounts");
        let list: any[] = [];
        if (stored) {
          try {
            list = JSON.parse(stored);
          } catch {
            list = [];
          }
        }

        const existingIdx = list.findIndex(acc => acc.profile.id === currentUser.id);
        const currentAccount = {
          session: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          },
          profile: {
            id: currentUser.id,
            username: currentUser.username,
            first_name: currentUser.first_name ?? null,
            last_name: currentUser.last_name ?? null,
            avatar_url: currentUser.avatar_url,
            updated_at: currentUser.updated_at,
          }
        };

        if (existingIdx > -1) {
          list[existingIdx] = currentAccount;
        } else {
          list.push(currentAccount);
        }

        localStorage.setItem("havn_accounts", JSON.stringify(list));
        setAccounts(list);
      } catch {
        // silent
      }
    };

    syncAccount();
  }, [currentUser]);

  const handleSwitchAccount = async (targetAccount: any) => {
    try {
      // First, set the session server-side to guarantee browser cookies are fully updated
      const res = await switchSession(
        targetAccount.session.access_token,
        targetAccount.session.refresh_token
      )

      if (res.error) {
        // Token expired/invalid — remove it from the saved list
        const stored = localStorage.getItem('havn_accounts')
        let list: any[] = []
        try { list = stored ? JSON.parse(stored) : [] } catch { list = [] }
        const cleaned = list.filter(acc => acc.profile.id !== targetAccount.profile.id)
        localStorage.setItem('havn_accounts', JSON.stringify(cleaned))
        setAccounts(cleaned)
        alert(`@${targetAccount.profile.username} oturumu süresi dolmuş. Lütfen tekrar giriş yapın.`)
        return
      }

      // Sync the client-side browser client state immediately
      await supabase.auth.setSession({
        access_token: targetAccount.session.access_token,
        refresh_token: targetAccount.session.refresh_token,
      })

      // Redirect to feed after account switch so server components re-render with the new session
      window.location.href = '/feed'
    } catch (err: any) {
      alert('Hesap geçişi başarısız: ' + err.message)
    }
  };

  const handleAddNewAccount = async () => {
    try {
      // Simply log out current session locally to clear session cookies
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  const handleSignOut = async () => {
    try {
      if (!currentUser) return;

      const stored = localStorage.getItem("havn_accounts");
      let list: any[] = [];
      if (stored) {
        try {
          list = JSON.parse(stored);
        } catch {
          list = [];
        }
      }

      // Remove current active account
      const updatedList = list.filter(acc => acc.profile.id !== currentUser.id);
      localStorage.setItem("havn_accounts", JSON.stringify(updatedList));

      // Sign out current session
      await supabase.auth.signOut();

      // If we have another account, switch to it immediately
      if (updatedList.length > 0) {
        const nextAccount = updatedList[0]
        const { data, error } = await supabase.auth.setSession({
          access_token: nextAccount.session.access_token,
          refresh_token: nextAccount.session.refresh_token,
        })
        if (!error && data.session) {
          window.location.href = '/feed'
          return
        }
        // Next account token also expired — clean it too
        const cleaned = updatedList.filter((acc: any) => acc.profile.id !== nextAccount.profile.id)
        localStorage.setItem('havn_accounts', JSON.stringify(cleaned))
      }

      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
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
          if (href === "/notifications") count = unreadNotifications;
          if (href === "/messages") count = unreadDMs;

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

      {/* Bottom: Theme Toggle + Settings */}
      <div className={cn(isCollapsed ? "flex flex-col gap-2 items-center w-full" : "grid grid-cols-2 gap-2 w-full")}>
        <ThemeToggle variant={isCollapsed ? "compact" : "half"} onExpand={onExpand} />
        <Link
          href="/settings"
          onClick={() => {
            if (isCollapsed && onExpand) onExpand();
          }}
          title={isCollapsed ? "Ayarlar" : undefined}
          className={cn(
            "glass flex items-center transition-all duration-200 hover:border-primary/40 hover:shadow-sm active:scale-95",
            isCollapsed
              ? "w-10 h-10 justify-center p-0 rounded-xl mx-auto"
              : "justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold w-full",
            pathname === "/settings"
              ? "text-primary-foreground"
              : "text-foreground"
          )}
          style={
            pathname === "/settings"
              ? { background: "linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))" }
              : {}
          }
        >
          <Settings
            size={15}
            className={cn(
              "flex-shrink-0",
              pathname === "/settings" ? "text-primary-foreground" : "text-muted-foreground"
            )}
          />
          {!isCollapsed && "Ayarlar"}
        </Link>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Multi-Account Profile switcher / Login buttons */}
      {currentUser ? (
        <div className="relative w-full flex justify-center">
          {/* Switcher Popover */}
          <AnimatePresence>
            {showAccountsMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowAccountsMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className={cn(
                    "absolute z-30 bg-card border border-border rounded-2xl shadow-2xl p-2.5 flex flex-col gap-1",
                    isCollapsed
                      ? "bottom-0 left-full ml-3 w-56 mb-0"
                      : "bottom-full left-0 w-full mb-3"
                  )}
                >
                  <div className="text-[9px] font-black text-muted-foreground uppercase px-2 py-1 mb-1 tracking-wider">
                    Hesap Değiştir
                  </div>
                  
                  {/* Account List */}
                  <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto pr-0.5">
                    {(() => {
                      const sorted = [...accounts].sort((a, b) => {
                        const aActive = a.profile.id === currentUser.id;
                        const bActive = b.profile.id === currentUser.id;
                        return aActive === bActive ? 0 : aActive ? -1 : 1;
                      });
                      return sorted.map((acc, index) => {
                        const isActive = acc.profile.id === currentUser.id;
                        return (
                          <div key={acc.profile.id || acc.profile.username} className="flex flex-col">
                            {index > 0 && <div className="border-t border-border/30 my-1 mx-2" />}
                            <button
                              onClick={() => !isActive && handleSwitchAccount(acc)}
                              disabled={isActive}
                              className={cn(
                                "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all w-full border text-xs font-bold",
                                isActive
                                  ? "bg-primary/10 border-primary/20 text-primary cursor-default"
                                  : "hover:bg-accent/70 border-transparent cursor-pointer"
                              )}
                            >
                              <div className={cn(
                                "flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black flex-shrink-0 transition-all shadow-sm",
                                isActive
                                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {index + 1}
                              </div>
                              <Avatar username={acc.profile.username} avatarUrl={acc.profile.avatar_url} updatedAt={acc.profile.updated_at} />
                              <div className="flex-1 min-w-0">
                                <ProfileName profile={acc.profile} layout="stacked" nameClassName="text-xs font-black" showHandle={true} />
                              </div>
                              {isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0 mr-1" />
                              )}
                            </button>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  <div className="border-t border-border my-1.5" />

                  {/* Options */}
                  <button
                    onClick={handleAddNewAccount}
                    className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-all text-left cursor-pointer w-full"
                  >
                    <span className="w-4 h-4 rounded-md bg-primary/10 flex items-center justify-center font-bold text-xs">+</span>
                    Yeni Hesap Ekle
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-all text-left cursor-pointer w-full"
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
                    src={currentUser.updated_at ? `${currentUser.banner_url}?t=${new Date(currentUser.updated_at).getTime()}` : currentUser.banner_url}
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
                          src={currentUser.updated_at ? `${currentUser.avatar_url}?t=${new Date(currentUser.updated_at).getTime()}` : currentUser.avatar_url}
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
              "flex items-center transition-all duration-200 cursor-pointer text-left border border-transparent hover:border-border/30",
              isCollapsed
                ? "justify-center p-0 w-10 h-10 rounded-xl mx-auto"
                : "gap-3 px-2 py-2.5 rounded-xl hover:bg-accent/60 w-full"
            )}
          >
            <Avatar username={currentUser.username} avatarUrl={currentUser.avatar_url} updatedAt={currentUser.updated_at} />
            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <ProfileName profile={currentUser} layout="stacked" nameClassName="text-sm font-bold" showHandle={true} />
                </div>
                <div className="flex flex-col gap-0.5 opacity-60">
                  <span className="w-1 h-1 rounded-full bg-foreground" />
                  <span className="w-1 h-1 rounded-full bg-foreground" />
                  <span className="w-1 h-1 rounded-full bg-foreground" />
                </div>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 items-center w-full">
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
    </aside>
  );
}
