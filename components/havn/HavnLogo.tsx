import { cn } from "@/lib/utils";

interface HavnLogoProps {
  collapsed?: boolean;
  className?: string;
}

export function HavnLogo({ collapsed = false, className }: HavnLogoProps) {
  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      {/* Geometric H-mark icon */}
      <div className="relative flex-shrink-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))",
            boxShadow: "0 0 20px color-mix(in oklch, var(--primary) 40%, transparent)",
          }}
        >
          {/* Custom H geometry */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Left vertical bar */}
            <rect x="2" y="2" width="4" height="16" rx="1.5" fill="white" fillOpacity="0.95" />
            {/* Right vertical bar */}
            <rect x="14" y="2" width="4" height="16" rx="1.5" fill="white" fillOpacity="0.95" />
            {/* Center crossbar */}
            <rect x="6" y="8" width="8" height="4" rx="1.5" fill="white" fillOpacity="0.95" />
            {/* Anchor dot — nod to "haven/harbour" concept */}
            <circle cx="10" cy="17.5" r="1.5" fill="white" fillOpacity="0.6" />
          </svg>
        </div>
        {/* Glow ring */}
        <div
          className="absolute inset-0 rounded-xl opacity-30 blur-md"
          style={{
            background:
              "linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))",
          }}
        />
      </div>

      {/* Wordmark */}
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span
            className="text-xl font-black tracking-[0.2em] gradient-text"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            HAVN
          </span>
          <span className="text-[10px] tracking-widest text-muted-foreground font-medium mt-0.5">
            your safe harbour
          </span>
        </div>
      )}
    </div>
  );
}
