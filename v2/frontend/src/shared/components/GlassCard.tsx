import React from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: "cyan" | "emerald" | "purple" | "rose" | "amber" | "none";
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = "",
  glow = "none",
  ...props
}) => {
  const glowMap = {
    cyan: "glow-cyan border-sky-500/30",
    emerald: "glow-emerald border-emerald-500/30",
    purple: "glow-purple border-purple-500/30",
    rose: "border-rose-500/30",
    amber: "border-amber-500/30",
    none: "",
  };

  return (
    <div
      className={`glass-card rounded-2xl p-6 relative overflow-hidden ${glowMap[glow]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
