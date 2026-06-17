import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  Users, 
  CreditCard, 
  BarChart3, 
  Settings,
  ChevronRight,
  LogOut,
  Trophy,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeView: string;
  onViewChange: (view: string) => void;
  user: { name?: string; email?: string; picture?: string } | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: BookOpen, label: 'Bookings', id: 'bookings' },
  { icon: Calendar, label: 'Calendar', id: 'calendar' },
  { icon: Users, label: 'Customers', id: 'customers' },
  { icon: CreditCard, label: 'Payments', id: 'payments' },
  { icon: BarChart3, label: 'Reports', id: 'reports' },
  { icon: Settings, label: 'Settings', id: 'settings' },
];

export function Sidebar({ isOpen, setIsOpen, activeView, onViewChange, user, onLoginClick, onLogoutClick }: SidebarProps) {
  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ 
          x: isOpen ? 0 : -300,
          width: 280
        }}
        className={cn(
          "fixed top-0 left-0 bottom-0 z-50 bg-[#0f172a] border-r border-slate-800 flex flex-col transition-all duration-300 lg:translate-x-0",
          !isOpen && "lg:w-20"
        )}
      >
        {/* Logo Section */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(74,222,128,0.3)]">
            <Trophy className="text-black w-6 h-6" />
          </div>
          {(isOpen || window.innerWidth >= 1024) && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="font-display font-bold text-xl tracking-tight"
             >
                GALAXY <span className="text-brand">SPORTS</span>
             </motion.div>
          )}
        </div>

        {/* Location Tag */}
        {(isOpen || window.innerWidth >= 1024) && (
          <div className="px-6 -mt-4 mb-4">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-brand" />
                Narayanganj
             </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 mt-4">
          {navItems.map((item, idx) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={idx}
                onClick={() => {
                  onViewChange(item.id);
                  if (window.innerWidth < 1024) setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                  isActive 
                    ? "bg-brand text-black font-semibold" 
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-black" : "text-slate-400 group-hover:text-brand")} />
                {(isOpen || window.innerWidth >= 1024) && (
                  <span className="text-sm">{item.label}</span>
                )}
                {isActive && (isOpen || window.innerWidth >= 1024) && (
                  <ChevronRight className="ml-auto w-4 h-4" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Promo Card */}
        {(isOpen || window.innerWidth >= 1024) && (
          <div className="px-4 py-6">
            <div className="relative overflow-hidden rounded-2xl bg-brand/10 p-4 border border-brand/20 group">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand/20 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <p className="text-xs font-bold text-brand uppercase tracking-wider mb-1">Promo</p>
                <h4 className="text-sm font-bold text-white mb-2 leading-tight">PLAY MORE<br />WIN MORE</h4>
                <button className="text-[10px] bg-brand text-black px-3 py-1 rounded-full font-bold hover:scale-105 transition-transform">
                  EXPLORE NOW
                </button>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Trophy className="w-20 h-20 text-brand rotate-12" />
              </div>
            </div>
          </div>
        )}

        {/* User Profile */}
        <div className="p-4 border-t border-slate-800">
          {user ? (
            <div className={cn(
              "flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/50 transition-colors cursor-pointer",
              !isOpen && "lg:justify-center"
            )}>
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-brand/20">
                <img 
                  src={user.picture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"} 
                  referrerPolicy="no-referrer"
                  alt={user.name || "User"} 
                  className="w-full h-full object-cover"
                />
              </div>
              {(isOpen || window.innerWidth >= 1024) && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold text-white truncate">{user.name || 'Connected Admin'}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email || 'Galaxy Partner'}</p>
                </div>
              )}
              {(isOpen || window.innerWidth >= 1024) && (
                <LogOut 
                  className="w-4 h-4 text-slate-500 hover:text-red-400 cursor-pointer" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if(confirm('Are you sure you want to sign out of Google?')) {
                      onLogoutClick();
                    }
                  }}
                />
              )}
            </div>
          ) : (
            <button 
              onClick={onLoginClick}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-brand/10 border border-brand/20 hover:bg-brand/20 text-brand font-bold text-xs uppercase tracking-wider transition-all",
                !isOpen && "lg:justify-center"
              )}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
              </div>
              {(isOpen || window.innerWidth >= 1024) && (
                <span>Sign in</span>
              )}
            </button>
          )}
        </div>
      </motion.aside>
    </>
  );
}
