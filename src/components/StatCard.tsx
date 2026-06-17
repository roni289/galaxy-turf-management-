import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  isUp: boolean;
  icon: LucideIcon;
  iconBg: string;
  comparison?: string;
  delay?: number;
  key?: React.Key;
}

export function StatCard({ title, value, trend, isUp, icon: Icon, iconBg, comparison = "from last month", delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-colors"
    >
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-slate-400 text-xs font-black uppercase tracking-[0.1em] mb-2">{title}</p>
          <h3 className="text-3xl font-display font-black text-white mb-2">{value}</h3>
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold",
            isUp ? "text-brand" : "text-red-400"
          )}>
            {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{trend}</span>
            <span className="text-slate-500 ml-1 font-bold lowercase opacity-60">{comparison}</span>
          </div>
        </div>
        <div className={cn("p-4 rounded-2xl shadow-xl", iconBg)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      
      {/* Background Glow */}
      <div className={cn(
        "absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-5 transition-opacity group-hover:opacity-10",
        iconBg.replace('bg-', 'bg-')
      )} />
    </motion.div>
  );
}
