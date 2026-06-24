"use client";

import { ReactNode } from "react";

interface BentoCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  gradient: string;
  span?: string;
}

function BentoCard({
  title,
  value,
  subtitle,
  icon,
  gradient,
  span = "",
}: BentoCardProps) {
  return (
    <div
      className={`glass-card rounded-xl md:rounded-2xl p-3 md:p-5 relative overflow-hidden group ${span}`}
    >
      {/* Background gradient blob */}
      <div
        className={`absolute -top-8 -right-8 w-24 h-24 rounded-full ${gradient} opacity-10 
          group-hover:opacity-20 group-hover:scale-110 transition-all duration-500`}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-1.5 md:mb-2 gap-2">
          <div
            className={`shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl ${gradient} flex items-center justify-center shadow-sm`}
          >
            {icon}
          </div>
          <p className="text-lg md:text-2xl font-bold text-slate-800 tracking-tight truncate text-right">
            {value}
          </p>
        </div>

        <p className="text-sm sm:text-base md:text-lg font-semibold text-slate-600 line-clamp-1">{title}</p>
        {subtitle && (
          <p className="text-xs sm:text-sm md:text-base text-slate-400 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

interface BentoGridProps {
  children?: ReactNode;
  stats: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: ReactNode;
    gradient: string;
    span?: string;
  }[];
}

export default function BentoGrid({ stats }: BentoGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
      {stats.map((stat, i) => (
        <BentoCard
          key={i}
          {...stat}
          span={stat.span || ""}
        />
      ))}
    </div>
  );
}
