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
      className={`glass-card rounded-2xl p-6 relative overflow-hidden group ${span}`}
    >
      {/* Background gradient blob */}
      <div
        className={`absolute -top-8 -right-8 w-24 h-24 rounded-full ${gradient} opacity-10 
          group-hover:opacity-20 group-hover:scale-110 transition-all duration-500`}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-11 h-11 rounded-xl ${gradient} flex items-center justify-center shadow-sm`}
          >
            {icon}
          </div>
        </div>

        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-slate-800 tracking-tight">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
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
  }[];
}

export default function BentoGrid({ stats }: BentoGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
      {stats.map((stat, i) => (
        <BentoCard
          key={i}
          {...stat}
          span={i === 0 ? "sm:col-span-2 lg:col-span-1" : ""}
        />
      ))}
    </div>
  );
}
