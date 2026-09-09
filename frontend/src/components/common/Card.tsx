import React from "react";
import { clsx } from "clsx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  glow?: "cyan" | "emerald" | "amber" | "crimson" | "none";
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  badge,
  action,
  glow = "none",
  children,
  className,
  ...props
}) => {
  const glowClasses = {
    cyan: "border-cyan/30 shadow-[0_0_20px_-5px_rgba(0,229,255,0.2)]",
    emerald: "border-emerald/30 shadow-[0_0_20px_-5px_rgba(0,255,136,0.2)]",
    amber: "border-amber/30 shadow-[0_0_20px_-5px_rgba(255,183,0,0.2)]",
    crimson: "border-crimson/30 shadow-[0_0_20px_-5px_rgba(255,0,85,0.25)]",
    none: "border-panel-border hover:border-slate-700",
  };

  return (
    <div
      className={clsx(
        "rounded-xl bg-panel-bg/85 backdrop-blur-md border transition-all duration-300 p-4",
        glowClasses[glow],
        className
      )}
      {...props}
    >
      {(title || subtitle || badge || action) && (
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-panel-border/80 gap-2">
          <div className="flex items-center gap-2.5">
            <div>
              {title && <h3 className="text-sm font-semibold text-text-primary tracking-wide uppercase font-mono">{title}</h3>}
              {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
            </div>
            {badge && <div>{badge}</div>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
