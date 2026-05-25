import { Crown, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/mock-data";

interface RoleBadgeProps {
  role: Role;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  if (role === "owner") {
    return (
      <span
        className={cn("inline-flex items-center gap-1", className)}
        title="Kurucu"
      >
        <Crown
          className="w-3.5 h-3.5 flex-shrink-0"
          style={{ color: "var(--owner-color)" }}
          fill="currentColor"
        />
      </span>
    );
  }

  if (role === "moderator") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider",
          className
        )}
        style={{
          background: "color-mix(in oklch, var(--mod-color) 15%, transparent)",
          color: "var(--mod-color)",
          border: "1px solid color-mix(in oklch, var(--mod-color) 30%, transparent)",
        }}
        title="Moderatör"
      >
        <ShieldCheck className="w-3 h-3" />
        MOD
      </span>
    );
  }

  return null;
}

interface RoleUsernameProps {
  username: string;
  role: Role;
  className?: string;
}

export function RoleUsername({ username, role, className }: RoleUsernameProps) {
  return (
    <span className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      <span
        className={cn(
          "font-semibold text-sm",
          role === "owner" && "text-foreground",
          role === "moderator" && "text-foreground",
          role === "member" && "text-foreground"
        )}
      >
        {username}
      </span>
      <RoleBadge role={role} />
    </span>
  );
}
