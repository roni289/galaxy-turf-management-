import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Search, 
  Calendar as CalendarIcon, 
  Clock, 
  Menu, 
  Trophy,
  DollarSign,
  ChevronRight,
  ChevronDown,
  Activity,
  Wifi
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Customers } from './components/Customers';
import { Bookings } from './components/Bookings';
import { Payments } from './components/Payments';
import { Reports } from './components/Reports';
import { CalendarView } from './components/CalendarView';
import { Settings } from './components/Settings';
import { Toast, ToastMessage, ToastType } from './components/ui/Toast';
import { motion, AnimatePresence } from 'motion/react';
import { AppNotification, Booking, Customer } from './types';
import { initialBookings, initialCustomers } from './data/mockData';
import { cn } from './lib/utils';

const DEFAULT_OPERATORS = [
  { id: 'op1', name: "Zayed Khan", role: "Senior Pitch Manager", color: "#10b981", avatar: "👨‍💼", active: true },
  { id: 'op2', name: "Maksudur Rahman", role: "Operations Lead", color: "#3b82f6", avatar: "⛹️", active: true },
  { id: 'op3', name: "Arif Ahmed", role: "Desk Coordinator", color: "#f59e0b", avatar: "👨‍💻", active: true },
  { id: 'op4', name: "Tasnim Kabir", role: "Scheduler", color: "#ec4899", avatar: "👩‍💻", active: false },
  { id: 'op5', name: "Sayed Hasan", role: "Evening Host", color: "#a855f7", avatar: "🕴️", active: true },
  { id: 'op6', name: "Rony Chowdhury", role: "Facility Operator", color: "#14b8a6", avatar: "⚽", active: false },
  { id: 'op7', name: "Tahmina Sultana", role: "Reservations Agent", color: "#f43f5e", avatar: "👩‍💼", active: false },
  { id: 'op8', name: "Farhan Islam", role: "Duty Officer", color: "#06b6d4", avatar: "👮", active: false },
  { id: 'op9', name: "Jannatul Nayeem", role: "Events Coordinator", color: "#e11d48", avatar: "👩‍🎨", active: false },
  { id: 'op10', name: "Sajid Kamal", role: "Weekend Supervisor", color: "#84cc16", avatar: "🏟️", active: false }
];

const mockNotifications: AppNotification[] = [
  { id: '1', title: 'Live Server Connected', message: 'You are now synced with 10 real-time operators.', time: 'Just now', type: 'system', read: false },
];

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);

  // Server synced lists
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [operators, setOperators] = useState<any[]>(DEFAULT_OPERATORS);
  const [activeOperator, setActiveOperator] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('galaxy_active_operator');
      return saved ? JSON.parse(saved) : DEFAULT_OPERATORS[0];
    } catch {
      return DEFAULT_OPERATORS[0];
    }
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isSimulationActive, setIsSimulationActive] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isServerOnline, setIsServerOnline] = useState(true);

  // Avoid stale closures in syncing callbacks
  const bookingsRef = React.useRef<Booking[]>([]);
  bookingsRef.current = bookings;
  const customersRef = React.useRef<Customer[]>([]);
  customersRef.current = customers;
  const isFirstLoadRef = React.useRef(true);

  // Google OAuth and User State
  const [user, setUser] = useState<{ email?: string; name?: string; picture?: string } | null>(null);
  const [isDriveConnected, setIsDriveConnected] = useState(false);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      if (data.connected && data.user) {
        setIsDriveConnected(true);
        setUser(data.user);
      } else {
        setIsDriveConnected(data.connected);
        setUser(null);
      }
    } catch {
      setIsDriveConnected(false);
      setUser(null);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      if (!res.ok) {
        const error = await res.json();
        showToast(error.error || 'Failed to initialize Google Auth', 'error');
        return;
      }
      const { url } = await res.json();
      window.open(url, 'google_auth', 'width=600,height=700');
    } catch {
      showToast('Config error. Google credentials might be missing in environment variables.', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsDriveConnected(false);
      setUser(null);
      showToast('Signed out of Google account.', 'info');
    } catch {
      showToast('Failed to sign out', 'error');
    }
  };

  useEffect(() => {
    checkAuthStatus();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        checkAuthStatus();
        showToast('Google account connected successfully!', 'success');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Fetch operators list & status on mount
  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const res = await fetch('/api/operators');
        if (res.ok) {
          const data = await res.json();
          setOperators(data);
        }
      } catch (err) {
        console.error("Failed to load operators list", err);
      }
    };
    fetchOperators();
  }, []);

  // Save selected active operator profile
  useEffect(() => {
    localStorage.setItem('galaxy_active_operator', JSON.stringify(activeOperator));
  }, [activeOperator]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Main Polling Engine for Multi-User Live Sync
  useEffect(() => {
    const syncData = async () => {
      try {
        const [bnRes, custRes, simStatusRes, actRes] = await Promise.all([
          fetch('/api/bookings'),
          fetch('/api/customers'),
          fetch('/api/simulation/status'),
          fetch('/api/activities')
        ]);

        if (bnRes.ok && custRes.ok && simStatusRes.ok && actRes.ok) {
          const serverBookings: Booking[] = await bnRes.json();
          const serverCustomers: Customer[] = await custRes.json();
          const { isSimulationActive: simOn }: { isSimulationActive: boolean } = await simStatusRes.json();
          const serverActivities = await actRes.json();

          setIsServerOnline(true);
          setIsSimulationActive(simOn);
          setRecentActivities(serverActivities);

          const localBookings = bookingsRef.current;
          const localCustomers = customersRef.current;

          if (isFirstLoadRef.current) {
            setBookings(serverBookings);
            setCustomers(serverCustomers);
            isFirstLoadRef.current = false;
          } else {
            // Check for new server addition or edits since last local state
            if (JSON.stringify(localBookings) !== JSON.stringify(serverBookings)) {
              const newlyAdded = serverBookings.filter(sb => !localBookings.some(lb => lb.id === sb.id));
              if (newlyAdded.length > 0) {
                newlyAdded.forEach(nb => {
                  showToast(`Live Update (Sim Sync): New slot booked for ${nb.teamName || nb.customerName} on ${nb.facility || 'Pitch'} (${nb.time})!`, 'success');
                  
                  // Push real notification to list
                  setNotifications(prev => [
                    {
                      id: 'notif_' + Math.random().toString(36).substring(2, 9),
                      title: 'Live Entry Synchronized',
                      message: `${nb.customerName} reserved ${nb.facility || 'Pitch'} at ${nb.time}.`,
                      time: 'Just now',
                      type: 'booking',
                      read: false
                    },
                    ...prev
                  ]);
                });
              } else {
                // If status or details changed
                serverBookings.forEach(sb => {
                  const match = localBookings.find(lb => lb.id === sb.id);
                  if (match && match.status !== sb.status) {
                    showToast(`Live Update (Status): ${sb.teamName}'s reservation upgraded to ${sb.status}!`, 'info');
                    
                    setNotifications(prev => [
                      {
                        id: 'notif_' + Math.random().toString(36).substring(2, 9),
                        title: 'Live Status Edited',
                        message: `${sb.teamName}'s reservation status updated to ${sb.status}.`,
                        time: 'Just now',
                        type: 'system',
                        read: false
                      },
                      ...prev
                    ]);
                  }
                });
              }
              setBookings(serverBookings);
            }

            if (JSON.stringify(localCustomers) !== JSON.stringify(serverCustomers)) {
              setCustomers(serverCustomers);
            }
          }
        }
      } catch (err) {
        console.error("Sync error in loop", err);
        setIsServerOnline(false);
      }
    };

    // run initial load immediately
    syncData();

    const interval = setInterval(syncData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Sync interceptor triggers for Front-End State Setters
  const handleBookingChange = async (valueOrUpdater: React.SetStateAction<Booking[]>) => {
    let nextValue: Booking[];
    if (typeof valueOrUpdater === 'function') {
      nextValue = (valueOrUpdater as (prev: Booking[]) => Booking[])(bookingsRef.current);
    } else {
      nextValue = valueOrUpdater;
    }

    const currentLocal = bookingsRef.current;

    if (nextValue.length > currentLocal.length) {
      // Find new booking
      const added = nextValue.find(nb => !currentLocal.some(ob => ob.id === nb.id));
      if (added) {
        try {
          const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking: added, operatorName: activeOperator?.name })
          });
          if (res.ok) {
            const result = await res.json();
            if (result.customers) {
              setCustomers(result.customers);
            }
          }
        } catch (err) {
          console.error("Failed to sync new booking", err);
        }
      }
    } else if (nextValue.length < currentLocal.length) {
      // Find deleted booking
      const deleted = currentLocal.find(ob => !nextValue.some(nb => nb.id === ob.id));
      if (deleted) {
        try {
          await fetch(`/api/bookings/${deleted.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operatorName: activeOperator?.name })
          });
        } catch (err) {
          console.error("Failed to sync deleted booking", err);
        }
      }
    } else {
      // Find updated booking
      const updated = nextValue.find(nb => {
        const old = currentLocal.find(ob => ob.id === nb.id);
        return old && JSON.stringify(old) !== JSON.stringify(nb);
      });
      if (updated) {
        try {
          await fetch(`/api/bookings/${updated.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking: updated, operatorName: activeOperator?.name })
          });
        } catch (err) {
          console.error("Failed to sync updated booking", err);
        }
      }
    }

    setBookings(nextValue);
  };

  const handleCustomerChange = async (valueOrUpdater: React.SetStateAction<Customer[]>) => {
    let nextValue: Customer[];
    if (typeof valueOrUpdater === 'function') {
      nextValue = (valueOrUpdater as (prev: Customer[]) => Customer[])(customersRef.current);
    } else {
      nextValue = valueOrUpdater;
    }

    const currentLocal = customersRef.current;

    if (nextValue.length > currentLocal.length) {
      const added = nextValue.find(nc => !currentLocal.some(oc => oc.id === nc.id));
      if (added) {
        try {
          await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer: added })
          });
        } catch (err) {
          console.error("Failed to sync customer", err);
        }
      }
    } else if (nextValue.length < currentLocal.length) {
      const deleted = currentLocal.find(oc => !nextValue.some(nc => nc.id === oc.id));
      if (deleted) {
        try {
          await fetch(`/api/customers/${deleted.id}`, {
            method: 'DELETE'
          });
        } catch (err) {
          console.error("Failed to sync deleted customer", err);
        }
      }
    } else {
      const updated = nextValue.find(nc => {
        const old = currentLocal.find(oc => oc.id === nc.id);
        return old && JSON.stringify(old) !== JSON.stringify(nc);
      });
      if (updated) {
        try {
          await fetch(`/api/customers/${updated.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer: updated })
          });
        } catch (err) {
          console.error("Failed to sync updated customer", err);
        }
      }
    }

    setCustomers(nextValue);
  };

  const toggleSimulationOnServer = async () => {
    try {
      const res = await fetch('/api/simulation/toggle', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setIsSimulationActive(data.isSimulationActive);
        showToast(`Simulation ${data.isSimulationActive ? 'Activated' : 'Paused'} successfully!`, 'info');
      }
    } catch {
      showToast('Failed to toggle multi-user simulation', 'error');
    }
  };

  const handleSelectOperator = (op: any) => {
    setActiveOperator(op);
    showToast(`Swapped view to Operator profile: ${op.name}!`, 'success');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard 
            bookings={bookings} 
            setBookings={handleBookingChange} 
            customers={customers} 
            setCustomers={handleCustomerChange} 
            setActiveView={setActiveView} 
            showToast={showToast}
            operators={operators}
            activeOperator={activeOperator}
            recentActivities={recentActivities}
            isSimulationActive={isSimulationActive}
            toggleSimulationOnServer={toggleSimulationOnServer}
          />
        );
      case 'customers':
        return (
          <Customers 
            customers={customers} 
            setCustomers={handleCustomerChange} 
            showToast={showToast} 
            bookings={bookings} 
            isDriveConnected={isDriveConnected}
            onLoginClick={handleLogin}
          />
        );
      case 'bookings':
        return (
          <Bookings 
            bookings={bookings} 
            setBookings={handleBookingChange} 
            customers={customers} 
            setCustomers={handleCustomerChange} 
            showToast={showToast} 
            setActiveView={setActiveView} 
          />
        );
      case 'calendar':
        return <CalendarView bookings={bookings} />;
      case 'settings':
        return (
          <Settings 
            showToast={showToast} 
            bookings={bookings} 
            customers={customers} 
            isDriveConnected={isDriveConnected}
            user={user}
            onLoginClick={handleLogin}
            onLogoutClick={handleLogout}
            onDataLoaded={(data) => {
              handleBookingChange(data.bookings);
              handleCustomerChange(data.customers);
            }}
          />
        );
      case 'payments':
        return <Payments bookings={bookings} setActiveView={setActiveView} />;
      case 'reports':
        return <Reports bookings={bookings} customers={customers} setActiveView={setActiveView} showToast={showToast} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center py-40">
            <h2 className="text-2xl font-bold text-white">Coming Soon</h2>
            <p className="text-slate-500">The {activeView} module is under development.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        activeView={activeView}
        onViewChange={setActiveView}
        user={user}
        onLoginClick={handleLogin}
        onLogoutClick={handleLogout}
      />
      
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-[280px]' : 'lg:ml-20'}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[#020617]/80 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg bg-slate-800/50 text-slate-400 lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl lg:text-2xl font-display font-bold text-white tracking-tight uppercase">
                  Galaxy Sports <span className="text-brand">{activeView}</span>
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-1">Narayanganj • Official Management Portal</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                <div className="flex items-center gap-3 pr-4 border-r border-slate-700/50">
                  <CalendarIcon className="w-5 h-5 text-brand" />
                  <div className="text-[10px] font-black uppercase tracking-widest leading-tight">
                    <p className="text-white">{currentTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                    <p className="text-slate-500">{currentTime.toLocaleDateString('en-GB', { weekday: 'short' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-brand" />
                  <p className="text-lg font-display font-black text-white">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 relative">
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-3 rounded-2xl bg-slate-800/40 text-slate-400 border border-slate-700/50 relative hover:text-brand transition-all hover:scale-105"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-brand rounded-full border-2 border-[#020617]" />
                  )}
                </button>
                
                {/* Notifications Drawer */}
                <AnimatePresence>
                  {isNotificationsOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsNotificationsOpen(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-3 w-80 bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="p-4 border-b border-slate-800 bg-slate-800/20 flex items-center justify-between">
                          <h3 className="text-xs font-black text-white uppercase tracking-widest">Notifications</h3>
                          {unreadCount > 0 && (
                            <button 
                              onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
                              className="text-[10px] text-brand font-bold hover:underline"
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length > 0 ? (
                            notifications.map((n) => (
                              <div 
                                key={n.id} 
                                className={cn(
                                  "p-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer",
                                  !n.read && "bg-brand/5"
                                )}
                                onClick={() => {
                                  setNotifications(notifications.map(notif => notif.id === n.id ? { ...notif, read: true } : notif));
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={cn(
                                    "p-1.5 rounded-lg mt-0.5",
                                    n.type === 'booking' ? "bg-blue-500/10 text-blue-400" : "bg-brand/10 text-brand"
                                  )}>
                                    {n.type === 'booking' ? <Clock className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-white">{n.title}</p>
                                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                                    <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase">{n.time}</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center">
                              <p className="text-xs text-slate-500">No notifications</p>
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => {
                            setActiveView('bookings');
                            setIsNotificationsOpen(false);
                          }}
                          className="w-full p-3 text-[10px] text-brand font-black uppercase tracking-widest hover:bg-brand/5 transition-colors border-t border-slate-800"
                        >
                          View All Bookings
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-8 w-px bg-slate-800 mx-2 hidden sm:block" />

              {/* Swappable Operator Profile Selection */}
              <div className="relative flex items-center gap-2 pl-2">
                <div className="relative group">
                  <button className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-800/40 border border-slate-700/50 rounded-xl hover:border-brand/40 transition-all text-left">
                    <span className="text-lg">{activeOperator?.avatar || "👨‍💼"}</span>
                    <div className="hidden sm:block">
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider leading-none">Desk Agent</p>
                      <p className="text-xs font-bold text-white mt-1 leading-none">{activeOperator?.name || "Zayed Khan"}</p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
                  </button>
                  
                  {/* Hover Dropdown */}
                  <div className="absolute right-0 top-full mt-2 w-56 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl opacity-0 scale-95 pointer-events-none group-focus-within:opacity-100 group-focus-within:scale-100 group-focus-within:pointer-events-auto group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200 z-50 p-2">
                    <div className="px-2 py-1.5 border-b border-slate-900 mb-1 text-left">
                      <p className="text-[8px] font-black uppercase tracking-widest text-[#10b981]">Multi-User Desk</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Change Active Session (10 Users)</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-0.5 scrollbar-thin">
                      {operators.map((op: any) => (
                        <button
                          key={op.id}
                          onClick={() => handleSelectOperator(op)}
                          className={cn(
                            "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-all",
                            activeOperator?.id === op.id 
                              ? "bg-brand/10 border-l-2 border-brand font-bold text-white" 
                              : "text-slate-400 hover:bg-slate-900 hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{op.avatar}</span>
                            <div>
                              <p className="text-xs font-bold leading-tight">{op.name}</p>
                              <p className="text-[8px] text-slate-500 leading-none">{op.role}</p>
                            </div>
                          </div>
                          {op.active && (
                            <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
          
          {/* Footer Quote */}
          <footer className="mt-12 pt-8 pb-12 border-t border-slate-800">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-8">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(74,222,128,0.2)]">
                    <Trophy className="text-black w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-black text-white tracking-tight uppercase">GALAXY <span className="text-brand">SPORTS</span></h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Narayanganj, Futulla</p>
                  </div>
               </div>
               
               <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center lg:text-right">Booking & Location</p>
                  <p className="text-sm font-bold text-brand">01531-557184</p>
               </div>
               
               <div className="flex items-center gap-8 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <button className="hover:text-brand transition-colors">Sitemap</button>
                  <button className="hover:text-brand transition-colors">Privacy</button>
                  <button className="hover:text-brand transition-colors">Support</button>
               </div>

               <div className="flex items-center gap-4">
                  {['Facebook', 'Instagram', 'Twitter'].map(social => (
                    <button key={social} className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:bg-brand hover:text-black hover:border-brand transition-all">
                      <div className="sr-only">{social}</div>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ))}
               </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-6 px-8 rounded-2xl bg-slate-800/20 border border-slate-800">
              <div className="flex items-center gap-3">
                 <Trophy className="w-5 h-5 text-brand" />
                 <p className="text-slate-500 text-sm italic">"The harder you work, the luckier you get."</p>
              </div>
              <p className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-600">
                © 2025 Galaxy Sports Manager — Designed for Excellence
              </p>
            </div>
          </footer>
        </div>
      </main>

      {/* Global Toast Notifications */}
      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  );
}
