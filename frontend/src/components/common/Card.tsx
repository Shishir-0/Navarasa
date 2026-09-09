import React from "react";
import { clsx } from "clsx";
import { motion } from "framer-motion";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  glow?: "cyan" | "emerald" | "amber" | "crimson" | "accent" | "none";
  elevated?: boolean;
  animateHover?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  badge,
  action,
  glow = "none",
  elevated = false,
  animateHover = false,
  children,
  className,
  ...props
}) => {
  const glowClasses = {
    cyan: "border-[#4DA3FF]/40 shadow-[0_8px_32px_rgba(77,163,255,0.15),inset_0_1px_1px_rgba(255,255,255,0.12)]",
    accent: "border-[#4DA3FF]/40 shadow-[0_8px_32px_rgba(77,163,255,0.15),inset_0_1px_1px_rgba(255,255,255,0.12)]",
    emerald: "border-[#34D399]/40 shadow-[0_8px_32px_rgba(52,211,153,0.15),inset_0_1px_1px_rgba(255,255,255,0.12)]",
    amber: "border-[#FBBF24]/40 shadow-[0_8px_32px_rgba(251,191,36,0.15),inset_0_1px_1px_rgba(255,255,255,0.12)]",
    crimson: "border-[#FF5C7A]/50 shadow-[0_8px_32px_rgba(255,92,122,0.2),inset_0_1px_1px_rgba(255,255,255,0.15)]",
    none: "border-white/[0.08] hover:border-white/[0.15] shadow-[0_8px_32px_rgba(0,0,0,0.36),inset_0_1px_1px_rgba(255,255,255,0.06)]",
  };

  const baseClasses = clsx(
    "rounded-2xl backdrop-blur-2xl transition-all duration-300 p-4 relative overflow-hidden",
    elevated
      ? "bg-[#1C222E]/85 text-[#F5F7FA]"
      : "bg-[#12161E]/75 text-[#F5F7FA]",
    glowClasses[glow],
    className
  );

  return (
    <div
      className={baseClasses}
      {...props}
    >
      {/* Subtle VisionOS specular top edge highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

      {(title || subtitle || badge || action) && (
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08] gap-2 relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="min-w-0">
              {title && (
                <h3 className="text-[14px] font-semibold text-[#F5F7FA] tracking-tight truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[12px] text-[#9BA6B2] mt-0.5 truncate font-normal">
                  {subtitle}
                </p>
              )}
            </div>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
