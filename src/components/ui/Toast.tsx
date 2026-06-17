import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export function Toast({ toasts, onClose }: ToastProps) {
  return (
    <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={cn(
              "pointer-events-auto p-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px] border",
              toast.type === 'success' && "bg-[#064e3b] border-emerald-500/30 text-emerald-100",
              toast.type === 'error' && "bg-[#450a0a] border-red-500/30 text-red-100",
              toast.type === 'info' && "bg-[#1e293b] border-slate-700 text-slate-100"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl flex-shrink-0",
              toast.type === 'success' && "bg-emerald-500/20 text-emerald-400",
              toast.type === 'error' && "bg-red-500/20 text-red-400",
              toast.type === 'info' && "bg-blue-500/20 text-blue-400"
            )}>
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {toast.type === 'info' && <Info className="w-5 h-5" />}
            </div>
            
            <p className="flex-1 text-sm font-bold uppercase tracking-tight">{toast.message}</p>
            
            <button 
              onClick={() => onClose(toast.id)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 opacity-50" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
