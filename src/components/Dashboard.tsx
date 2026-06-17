import React from 'react';
import { 
  DollarSign, 
  Briefcase, 
  Wallet, 
  Users, 
  Trophy,
  MoreHorizontal, 
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  CreditCard,
  UserPlus,
  X,
  Phone,
  Mail,
  MapPin,
  ClipboardList,
  Activity,
  Wifi
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StatCard } from './StatCard';
import { IncomeChart, PaymentSummaryChart, DailyRatioChart } from './DashboardCharts';
import { cn } from '../lib/utils';

import { Booking, Customer, FACILITIES } from '../types';
import { areSlotsOverlapping } from '../lib/timeUtils';

const timeSlots = [
  { time: '06:00 - 07:30 AM', regularPrice: 1500, holidayPrice: 1500 },
  { time: '07:30 - 09:00 AM', regularPrice: 1500, holidayPrice: 1500 },
  { time: '03:00 - 04:30 PM', regularPrice: 2000, holidayPrice: 2300 },
  { time: '04:30 - 06:00 PM', regularPrice: 2200, holidayPrice: 2400 },
  { time: '06:00 - 07:30 PM', regularPrice: 2400, holidayPrice: 2600 },
  { time: '07:30 - 09:00 PM', regularPrice: 2400, holidayPrice: 2600 },
  { time: '09:00 - 10:30 PM', regularPrice: 2400, holidayPrice: 2600 },
  { time: '10:30 - 12:00 AM', regularPrice: 2000, holidayPrice: 2100 },
  { time: '12:00 - 01:30 AM', regularPrice: 1700, holidayPrice: 2000 },
];

const HOLIDAYS = [
  '2026-02-12', // Language Day
  '2026-02-21', // Language Day
  '2026-03-26', // Independence Day
  '2026-12-16', // Victory Day
  '2026-05-01', // May Day
];

const checkIfHoliday = (dateString: string) => {
  if (!dateString) return false;
  const parts = dateString.split('-');
  if (parts.length !== 3) return false;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-based index
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return false;
  const dayOfWeek = date.getDay();
  return HOLIDAYS.includes(dateString) || dayOfWeek === 5; // Friday = 5
};

interface DashboardProps {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  setActiveView: (view: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  operators?: any[];
  activeOperator?: any;
  recentActivities?: any[];
  isSimulationActive?: boolean;
  toggleSimulationOnServer?: () => void;
}

export function Dashboard({ 
  bookings, 
  setBookings, 
  customers, 
  setCustomers, 
  setActiveView, 
  showToast,
  operators = [],
  activeOperator,
  recentActivities = [],
  isSimulationActive = true,
  toggleSimulationOnServer
}: DashboardProps) {
  // Calculate dynamic stats based on data
  const totalIncome = bookings.reduce((sum, b) => sum + (b.status !== 'Cancelled' ? b.price : 0), 0);
  const totalBookingsCount = bookings.length;
  const totalDue = bookings.reduce((sum, b) => sum + (b.status === 'Confirmed' ? (b.price - b.advance) : 0), 0);
  const activeCustomersCount = customers.filter(c => c.status === 'Active').length;

  const stats = [
    { title: "Active Customers", value: activeCustomersCount.toString(), trend: "+12.5%", isUp: true, icon: Users, iconBg: "bg-green-500", comparison: "vs yesterday" },
    { title: "Total Income", value: `৳ ${totalIncome.toLocaleString()}`, trend: "+8.2%", isUp: true, icon: Briefcase, iconBg: "bg-blue-500", comparison: "vs last month" },
    { title: "Total Due", value: `৳ ${totalDue.toLocaleString()}`, trend: "-2.4%", isUp: false, icon: Wallet, iconBg: "bg-red-500", comparison: "vs last week" },
    { title: "Total Bookings", value: totalBookingsCount.toString(), trend: "+15.0%", isUp: true, icon: Trophy, iconBg: "bg-brand", comparison: "vs last month" }
  ];

  const paymentDeadlines = bookings
    .filter(b => b.paymentDeadline && b.status === 'Confirmed' && (b.price - b.advance) > 0)
    .sort((a, b) => (a.paymentDeadline || '').localeCompare(b.paymentDeadline || ''))
    .slice(0, 5);

  const upcomingBookings = bookings
    .filter(b => b.status === 'Confirmed')
    .slice(0, 5)
    .map(b => ({
      time: b.time.split(' - ')[0],
      team: b.teamName,
      phone: b.customerPhone,
      duration: b.duration,
      price: `৳ ${b.price.toLocaleString()}`,
      status: b.status
    }));

  // Generate daily reports from actual bookings
  const dailyReports = Array.from(new Set(bookings.map(b => b.date)))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 5)
    .map(date => {
      const dayBookings = bookings.filter(b => b.date === date);
      const income = dayBookings.reduce((sum, b) => sum + (b.status !== 'Cancelled' ? b.price : 0), 0);
      const advance = dayBookings.reduce((sum, b) => sum + b.advance, 0);
      return {
        date: new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' }),
        bookings: dayBookings.length,
        income: `৳ ${income.toLocaleString()}`,
        advance: `৳ ${advance.toLocaleString()}`,
        due: `৳ ${(income - advance).toLocaleString()}`,
        status: "Completed"
      };
    });

  // Operational States for Quick Actions
  const [activeModal, setActiveModal] = React.useState<'book' | 'customer' | 'payment' | null>(null);

  // Booking Form State
  const [bookDate, setBookDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [bookTime, setBookTime] = React.useState<string>('03:00 - 04:30 PM');
  const [bookFacility, setBookFacility] = React.useState<string>(FACILITIES[0]);
  const [bookCustomerId, setBookCustomerId] = React.useState<string>('');
  const [isManualBooking, setIsManualBooking] = React.useState<boolean>(false);
  const [bookTeamName, setBookTeamName] = React.useState<string>('');
  const [bookCustomerName, setBookCustomerName] = React.useState<string>('');
  const [bookCustomerPhone, setBookCustomerPhone] = React.useState<string>('');
  const [bookAdvance, setBookAdvance] = React.useState<number>(0);

  // Customer Form State
  const [custName, setCustName] = React.useState<string>('');
  const [custPhone, setCustPhone] = React.useState<string>('');
  const [custEmail, setCustEmail] = React.useState<string>('');
  const [custContact, setCustContact] = React.useState<'WhatsApp' | 'Phone' | 'Email'>('WhatsApp');
  const [custNotes, setCustNotes] = React.useState<string>('');
  const [custAddress, setCustAddress] = React.useState<string>('');

  // Payment Form State
  const [payBookingId, setPayBookingId] = React.useState<string>('');
  const [payAmount, setPayAmount] = React.useState<number>(0);
  const [payMethod, setPayMethod] = React.useState<'Cash' | 'Mobile Banking' | 'Card'>('Cash');

  // Load default due balance upon selecting a booking to pay
  React.useEffect(() => {
    if (payBookingId) {
      const selectedB = bookings.find(b => b.id === payBookingId);
      if (selectedB) {
        setPayAmount(selectedB.price - selectedB.advance);
      }
    } else {
      setPayAmount(0);
    }
  }, [payBookingId, bookings]);

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isHoliday = checkIfHoliday(bookDate);
    const calculatedPrice = getPriceForSlot(bookTime, isHoliday);

    // Double-check slot schedule conflict for the same facility
    const conflictingBooking = bookings.find(b => 
      b.date === bookDate && 
      (b.facility || FACILITIES[0]) === bookFacility && 
      b.status !== 'Cancelled' && 
      areSlotsOverlapping(b.time, bookTime)
    );
    if (conflictingBooking) {
      showToast(`Conflict Detected: Time slot overlaps with "${conflictingBooking.teamName}" (${conflictingBooking.time}) on the same pitch (${bookFacility})!`, 'error');
      return;
    }

    if (bookAdvance > calculatedPrice) {
      showToast('Advance payment cannot exceed total slot fee!', 'error');
      return;
    }

    // Determine final customer details
    let finalCustomerId = bookCustomerId;
    let finalCustomerName = '';
    let finalCustomerPhone = '';

    if (!isManualBooking && bookCustomerId) {
      const cust = customers.find(c => c.id === bookCustomerId);
      if (cust) {
        finalCustomerName = cust.name;
        finalCustomerPhone = cust.phone;
      }
    } else {
      if (!bookCustomerName || !bookCustomerPhone) {
        showToast('Please fill in customer name and mobile phone number', 'error');
        return;
      }
      finalCustomerName = bookCustomerName;
      finalCustomerPhone = bookCustomerPhone;

      const existing = customers.find(c => c.phone === bookCustomerPhone);
      if (existing) {
        finalCustomerId = existing.id;
      } else {
        const newCustId = Math.random().toString(36).substr(2, 9);
        const newCust: Customer = {
          id: newCustId,
          name: bookCustomerName,
          phone: bookCustomerPhone,
          email: '',
          totalBookings: 1,
          totalSpent: calculatedPrice,
          lastBooking: bookDate,
          status: 'Active'
        };
        setCustomers(prev => [...prev, newCust]);
        finalCustomerId = newCustId;
        showToast('New player profile registered in database!', 'success');
      }
    }

    const newBooking: Booking = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: finalCustomerId,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      teamName: bookTeamName || `${finalCustomerName}'s Team`,
      date: bookDate,
      time: bookTime,
      duration: '90 Mins',
      price: calculatedPrice,
      advance: Number(bookAdvance) || 0,
      paymentDeadline: new Date(new Date(bookDate).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Confirmed',
      facility: bookFacility,
    };

    setBookings(prev => [newBooking, ...prev]);
    showToast(`Successfully booked ${bookTime} slot for ${newBooking.teamName}!`, 'success');

    // Reset forms & close
    setActiveModal(null);
    setBookTeamName('');
    setBookCustomerName('');
    setBookCustomerPhone('');
    setBookAdvance(0);
    setBookCustomerId('');
    setIsManualBooking(false);
    setBookFacility(FACILITIES[0]);
  };

  const handleCustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone) {
      showToast('Name and phone number are required fields!', 'error');
      return;
    }

    const exists = customers.some(c => c.phone === custPhone);
    if (exists) {
      showToast('A customer profile with this phone number already exists!', 'error');
      return;
    }

    const newCust: Customer = {
      id: Math.random().toString(36).substr(2, 9),
      name: custName,
      phone: custPhone,
      email: custEmail,
      preferredContactMethod: custContact,
      notes: custNotes,
      address: custAddress,
      totalBookings: 0,
      totalSpent: 0,
      lastBooking: 'Never',
      status: 'Active'
    };

    setCustomers(prev => [newCust, ...prev]);
    showToast(`Profile for ${custName} registered successfully!`, 'success');

    // Reset fields & close
    setActiveModal(null);
    setCustName('');
    setCustPhone('');
    setCustEmail('');
    setCustNotes('');
    setCustAddress('');
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payBookingId) {
      showToast('Select a booking to record the payment', 'error');
      return;
    }

    const booking = bookings.find(b => b.id === payBookingId);
    if (!booking) return;

    const remainingDue = booking.price - booking.advance;
    if (payAmount <= 0) {
      showToast('Payment sum must be greater than zero!', 'error');
      return;
    }

    if (payAmount > remainingDue) {
      showToast(`Payment exceeds outstanding team balance of ৳ ${remainingDue}`, 'error');
      return;
    }

    const updatedAdvance = booking.advance + Number(payAmount);

    setBookings(prev => prev.map(b => b.id === payBookingId ? {
      ...b,
      advance: updatedAdvance
    } : b));

    showToast(`Recorded payment of ৳ ${Number(payAmount).toLocaleString()} for ${booking.teamName}!`, 'success');

    setActiveModal(null);
    setPayBookingId('');
    setPayAmount(0);
  };

  const bookingsWithDue = bookings.filter(b => b.status === 'Confirmed' && (b.price - b.advance) > 0);
  const isBookDateHoliday = checkIfHoliday(bookDate);
  const currentSlotPrice = getPriceForSlot(bookTime, isBookDateHoliday);

  function getPriceForSlot(time: string, holiday: boolean) {
    const slot = timeSlots.find(s => s.time === time);
    return holiday ? (slot?.holidayPrice || 0) : (slot?.regularPrice || 0);
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} delay={idx * 0.1} />
        ))}
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Instant Operational Actions</h3>
            <p className="text-[10px] text-slate-500 font-bold mt-1 leading-none">Automated slot validation, live holiday calculations, and profile synchronization</p>
          </div>
          <div className="h-px bg-slate-800 flex-1 mx-4 hidden sm:block" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <button 
            type="button"
            onClick={() => setActiveModal('book')}
            className="flex items-center gap-4 p-4 rounded-2xl bg-[#10b981]/5 border border-[#10b981]/10 hover:border-[#10b981]/35 hover:bg-[#10b981]/10 transition-all text-left group"
          >
            <div className="w-12 h-12 bg-[#10b981]/15 rounded-xl flex items-center justify-center text-[#10b981] group-hover:scale-105 transition-transform shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white group-hover:text-[#10b981] transition-colors uppercase tracking-tight">Quick Book Slot</h4>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-semibold">Book a dynamic priced 90-minute slot</p>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => setActiveModal('customer')}
            className="flex items-center gap-4 p-4 rounded-2xl bg-[#3b82f6]/5 border border-[#3b82f6]/10 hover:border-[#3b82f6]/35 hover:bg-[#3b82f6]/10 transition-all text-left group"
          >
            <div className="w-12 h-12 bg-[#3b82f6]/15 rounded-xl flex items-center justify-center text-[#3b82f6] group-hover:scale-105 transition-transform shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white group-hover:text-[#3b82f6] transition-colors uppercase tracking-tight">Add Player Profile</h4>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-semibold">Register a new player into database</p>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => setActiveModal('payment')}
            className="flex items-center gap-4 p-4 rounded-2xl bg-[#f59e0b]/5 border border-[#f59e0b]/10 hover:border-[#f59e0b]/35 hover:bg-[#f59e0b]/10 transition-all text-left group"
          >
            <div className="w-12 h-12 bg-[#f59e0b]/15 rounded-xl flex items-center justify-center text-[#f59e0b] group-hover:scale-105 transition-transform shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white group-hover:text-[#f59e0b] transition-colors uppercase tracking-tight">Record Payment</h4>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-semibold">Instantly add advances or clear dues</p>
            </div>
          </button>
        </div>
      </div>

      {/* --- LIVE MULTI-USER SYNC DESK --- */}
      <div className="bg-[#0b1329] border-2 border-brand/20 bg-gradient-to-r from-slate-950 to-slate-900 rounded-3xl p-6 relative overflow-hidden text-left">
        <div className="absolute top-0 right-0 p-[2px] bg-brand/10 border-l border-b border-brand/20 text-[9px] font-black text-brand uppercase tracking-widest px-3 py-1 rounded-bl-xl flex items-center gap-1.5 animate-pulse">
          <Wifi className="w-3.5 h-3.5 text-brand" />
          Live Connection: Syncing Active
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          {/* Left Block: Connection details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Multi-User Live Desk & Operations Feed</h2>
            </div>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              This panel demonstrates multiplayer state matching. <strong className="text-brand">10 active managers</strong> are concurrently registering player profiles, adjusting prices, and checking in teams. The simulated live crew actions rollout in real-time.
            </p>
            <div className="flex items-center gap-4 pt-1">
              <div className="text-xs font-semibold text-slate-400">
                Simulation Engine: <span className={isSimulationActive ? 'text-green-450 font-bold' : 'text-slate-500 font-bold'}>{isSimulationActive ? "● ONLINE & ACTIVE" : "○ PAUSED"}</span>
              </div>
              <button
                type="button"
                onClick={toggleSimulationOnServer}
                className={cn(
                  "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all",
                  isSimulationActive 
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/25" 
                    : "bg-brand/15 text-brand border-brand/30 hover:bg-brand/25"
                )}
              >
                {isSimulationActive ? "Pause Sim Engine" : "Resume Sim Engine"}
              </button>
            </div>
          </div>

          {/* Right Block: Crew profile grid */}
          <div className="shrink-0 bg-slate-900/60 p-4 border border-slate-850 rounded-2xl">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">CONCURRENT WORKSPACE ADMINS</p>
            <div className="grid grid-cols-5 sm:grid-cols-10 xl:grid-cols-5 gap-3">
              {operators.map((op: any) => (
                <div 
                  key={op.id}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-center min-w-[64px]",
                    activeOperator?.id === op.id 
                      ? "bg-brand/10 border-brand" 
                      : op.active 
                        ? "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800" 
                        : "bg-slate-950/20 border-slate-900/50 opacity-40"
                  )}
                >
                  <span className="text-lg">{op.avatar}</span>
                  <p className="text-[8px] font-bold text-white mt-1 truncate max-w-[50px]">{op.name.split(' ')[0]}</p>
                  
                  {/* Absolute active indicators */}
                  {activeOperator?.id === op.id ? (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand"></span>
                    </span>
                  ) : op.active ? (
                    <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5 rounded-full bg-blue-500" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Scrolling Activity Feed */}
        <div className="mt-6 border-t border-slate-800/80 pt-4">
          <p className="text-[10px] font-black text-brand uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-brand animate-pulse" />
            Consolidated Live Operations Feed (P2P State Verified)
          </p>
          <div className="max-h-36 overflow-y-auto space-y-2 pr-2 font-mono text-left">
            {recentActivities.length > 0 ? (
              recentActivities.map((act: any) => (
                <div key={act.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] py-1.5 border-b border-slate-900 last:border-0 hover:bg-slate-900/40 px-2 rounded transition-colors duration-150">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">[{new Date(act.timestamp).toLocaleTimeString()}]</span>
                    <span className="text-brand font-black uppercase tracking-tight">{act.operator}</span>
                    <span className="px-1.5 py-0.5 bg-slate-800 text-[9px] rounded text-slate-400 font-bold uppercase">{act.action}</span>
                    <span className="text-slate-300 ml-1">{act.details}</span>
                  </div>
                  <span className="text-[10px] text-slate-600 mt-1 sm:mt-0 font-sans">State Matched</span>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-slate-500 text-xs">Waiting for incoming operator live transactions...</div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-8">
        <div className="md:col-span-2 xl:col-span-6">
          <IncomeChart bookings={bookings} />
        </div>
        <div className="md:col-span-1 xl:col-span-3">
          <PaymentSummaryChart bookings={bookings} />
        </div>
        <div className="md:col-span-1 xl:col-span-3">
          <DailyRatioChart bookings={bookings} />
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Daily Booking Report */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-display font-semibold text-white">DAILY BOOKING REPORT</h3>
            <button className="text-slate-500 hover:text-white transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/20">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Income</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {dailyReports.map((report, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/20 transition-colors group">
                    <td className="px-6 py-4 text-xs text-slate-300 font-medium">{report.date}</td>
                    <td className="px-6 py-4 text-xs text-white font-bold text-right">{report.income}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-800/20 flex justify-center">
             <button 
               onClick={() => setActiveView('reports')}
               className="text-brand text-xs font-bold hover:underline flex items-center gap-1"
             >
                View All <ChevronRight className="w-3 h-3" />
             </button>
          </div>
        </motion.div>

        {/* Upcoming Bookings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-display font-semibold text-white uppercase text-sm">Upcoming Slots</h3>
          </div>
          <div className="p-6 space-y-4">
            {upcomingBookings.map((booking, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-brand/40 transition-colors group">
                <div className="w-16 flex flex-col items-center justify-center border-r border-slate-700 pr-3">
                  <p className="text-brand font-black text-xs tracking-tight">{booking.time}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white truncate uppercase tracking-tight">{booking.team}</p>
                  <p className="text-[9px] text-slate-500 font-bold">{booking.status}</p>
                </div>
                <p className="text-xs font-black text-white">{booking.price}</p>
              </div>
            ))}
          </div>
          <div className="p-4 bg-slate-800/20 flex justify-center">
             <button 
               onClick={() => setActiveView('bookings')}
               className="text-brand text-xs font-bold hover:underline flex items-center gap-1"
             >
                View All Bookings <ChevronRight className="w-3 h-3" />
             </button>
          </div>
        </motion.div>

        {/* Payment Deadlines */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-display font-semibold text-white uppercase text-sm">Payment Deadlines</h3>
            <div className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-[9px] font-black text-red-400 uppercase tracking-widest">
              Action Required
            </div>
          </div>
          <div className="p-6 space-y-4">
            {paymentDeadlines.map((deadline, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl bg-red-500/5 border border-red-500/10 hover:border-red-500/30 transition-colors group">
                <div className="w-16 flex flex-col items-center justify-center border-r border-slate-700 pr-3 text-red-400">
                  <p className="font-black text-xs tracking-tight">{deadline.paymentDeadline?.split('-').slice(1).join('/') || 'N/A'}</p>
                  <p className="text-[8px] uppercase font-black">DUE DATE</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white truncate uppercase tracking-tight">{deadline.teamName}</p>
                  <p className="text-[9px] text-red-500/70 font-bold uppercase tracking-widest">৳ {(deadline.price - deadline.advance).toLocaleString()} Due</p>
                </div>
              </div>
            ))}
            {paymentDeadlines.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">All caught up! 🎉</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Action Modals Overlay */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="fixed inset-0 bg-black backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-[#0e1324] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 my-8 flex flex-col"
            >

              {/* Headings */}
              {activeModal === 'book' && (
                <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#10b981]/5">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-[#10b981]" />
                    <h3 className="text-sm font-display font-black text-white uppercase tracking-wider">Quick Booking Panel</h3>
                  </div>
                  <button type="button" onClick={() => setActiveModal(null)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {activeModal === 'customer' && (
                <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#3b82f6]/5">
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-5 h-5 text-[#3b82f6]" />
                    <h3 className="text-sm font-display font-black text-white uppercase tracking-wider">Add Player Record</h3>
                  </div>
                  <button type="button" onClick={() => setActiveModal(null)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {activeModal === 'payment' && (
                <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#f59e0b]/5">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-[#f59e0b]" />
                    <h3 className="text-sm font-display font-black text-white uppercase tracking-wider">Record Income Payment</h3>
                  </div>
                  <button type="button" onClick={() => setActiveModal(null)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* BOOK SLOT FORM */}
              {activeModal === 'book' && (
                <form onSubmit={handleBookSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar">
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Selected Facility</label>
                    <select
                      value={bookFacility}
                      onChange={(e) => setBookFacility(e.target.value)}
                      className="w-full bg-[#070b13] border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:border-brand/50 outline-none transition-all text-xs font-semibold"
                    >
                      {FACILITIES.map(f => (
                        <option key={f} value={f} className="bg-[#0e1324]">{f}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Play Date</label>
                    <input 
                      required
                      type="date"
                      value={bookDate}
                      onChange={(e) => setBookDate(e.target.value)}
                      className="w-full bg-[#070b13] border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:border-brand/40 outline-none transition-all text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Available 90-Min Slot</label>
                    <select
                      value={bookTime}
                      onChange={(e) => setBookTime(e.target.value)}
                      className="w-full bg-[#070b13] border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:border-brand/50 outline-none transition-all text-xs font-semibold"
                    >
                      {timeSlots.map((slot) => {
                        const isBooked = bookings.some(b => 
                          b.date === bookDate && 
                          (b.facility || FACILITIES[0]) === bookFacility && 
                          b.status !== 'Cancelled' && 
                          areSlotsOverlapping(b.time, slot.time)
                        );
                        return (
                          <option key={slot.time} value={slot.time} disabled={isBooked}>
                            {slot.time} {isBooked ? '— (SOLD OUT)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Player Association Choice</label>
                    <div className="grid grid-cols-2 gap-2 bg-[#070b13] p-1 border border-slate-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setIsManualBooking(false)}
                        className={cn(
                          "py-2 px-3 text-[10px] font-black rounded-lg transition-all capitalize",
                          !isManualBooking 
                            ? "bg-slate-800 text-white shadow-sm" 
                            : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        Registered Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsManualBooking(true)}
                        className={cn(
                          "py-2 px-3 text-[10px] font-black rounded-lg transition-all capitalize",
                          isManualBooking 
                            ? "bg-slate-800 text-white shadow-sm" 
                            : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        One-Time Guest
                      </button>
                    </div>
                  </div>

                  {!isManualBooking ? (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Select Registered Player</label>
                      <select
                        required={!isManualBooking}
                        value={bookCustomerId}
                        onChange={(e) => setBookCustomerId(e.target.value)}
                        className="w-full bg-[#070b13] border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:border-brand/50 outline-none transition-all text-xs font-semibold"
                      >
                        <option value="">-- Choose Registered Customer --</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.phone})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-3 p-3 bg-slate-900/40 border border-slate-800 rounded-2xl">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Full Name</label>
                        <input
                          required={isManualBooking}
                          type="text"
                          value={bookCustomerName}
                          onChange={(e) => setBookCustomerName(e.target.value)}
                          className="w-full bg-[#070b13] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:border-brand/40 outline-none transition-all text-xs font-semibold"
                          placeholder="Zayed Khan"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Phone Number</label>
                        <input
                          required={isManualBooking}
                          type="tel"
                          value={bookCustomerPhone}
                          onChange={(e) => setBookCustomerPhone(e.target.value)}
                          className="w-full bg-[#070b13] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:border-brand/40 outline-none transition-all text-xs font-semibold"
                          placeholder="01XXX-XXXXXX"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Team / Club Name</label>
                    <input 
                      required
                      type="text"
                      value={bookTeamName}
                      onChange={(e) => setBookTeamName(e.target.value)}
                      className="w-full bg-[#070b13] border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:border-brand/40 outline-none transition-all text-xs font-semibold uppercase tracking-tight"
                      placeholder="e.g. DHAKA SPARKS"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dynamic Base Price:</span>
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest",
                          isBookDateHoliday ? "bg-red-500/10 text-red-400 border border-red-500/10" : "bg-brand/10 text-brand border border-brand/10"
                        )}>
                          {isBookDateHoliday ? 'Holiday / Weekend' : 'Weekday Rate'}
                        </span>
                        <span className="text-xs font-black text-white">৳ {currentSlotPrice.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1 pt-2 border-t border-slate-800/80">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Advance Amount Details</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">৳</span>
                        <input 
                          type="number"
                          min="0"
                          max={currentSlotPrice}
                          value={bookAdvance || ''}
                          onChange={(e) => setBookAdvance(Number(e.target.value))}
                          className="w-full bg-[#070b13] border border-slate-700/50 rounded-xl py-2.5 pl-7 pr-4 text-white focus:border-brand/40 outline-none transition-all text-xs font-semibold"
                          placeholder="e.g. 1000"
                        />
                      </div>
                      <p className="text-[8px] text-slate-550 font-bold pl-1 uppercase tracking-widest">
                        Outright due left: ৳ {(currentSlotPrice - (bookAdvance || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setActiveModal(null)}
                      className="flex-1 py-2.5 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-brand text-black py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-lg shadow-brand/10"
                    >
                      Confirm Booking
                    </button>
                  </div>

                </form>
              )}

              {/* ADD PLAYER REGISTER FORM */}
              {activeModal === 'customer' && (
                <form onSubmit={handleCustSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Full Name</label>
                    <input 
                      required
                      type="text"
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      className="w-full bg-[#070b13] border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:border-brand/40 outline-none transition-all text-xs font-semibold"
                      placeholder="e.g. Sazzad Hossain"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Phone Number</label>
                    <input 
                      required
                      type="tel"
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      className="w-full bg-[#070b13] border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:border-brand/40 outline-none transition-all text-xs font-semibold"
                      placeholder="01XXX-XXXXXX"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Email Address</label>
                    <input 
                      type="email"
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
                      className="w-full bg-[#070b13] border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:border-brand/40 outline-none transition-all text-xs font-semibold"
                      placeholder="player@example.com"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Preferred Contact Channel</label>
                    <select
                      value={custContact}
                      onChange={(e) => setCustContact(e.target.value as any)}
                      className="w-full bg-[#070b13] border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:border-brand/50 outline-none transition-all text-xs font-semibold"
                    >
                      <option value="WhatsApp">WhatsApp Messaging</option>
                      <option value="Phone">Direct Mobile Call</option>
                      <option value="Email">Email Correspondence</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Internal Notes</label>
                    <textarea 
                      value={custNotes}
                      onChange={(e) => setCustNotes(e.target.value)}
                      className="w-full bg-[#070b13] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:border-brand/40 outline-none transition-all text-xs font-semibold resize-none h-14"
                      placeholder="e.g. Regular organizer, striker..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Billing / Home Address</label>
                    <textarea 
                      value={custAddress}
                      onChange={(e) => setCustAddress(e.target.value)}
                      className="w-full bg-[#070b13] border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:border-brand/40 outline-none transition-all text-xs font-semibold resize-none h-14"
                      placeholder="Narayanganj Chamber area, etc."
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setActiveModal(null)}
                      className="flex-1 py-2.5 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-brand text-black py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-lg shadow-brand/10"
                    >
                      Register Player
                    </button>
                  </div>
                </form>
              )}

              {/* RECORD DUE PAYMENT FORM */}
              {activeModal === 'payment' && (
                <form onSubmit={handlePaySubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar">
                  
                  {bookingsWithDue.length === 0 ? (
                    <div className="py-6 text-center text-slate-500 space-y-2">
                      <ClipboardList className="w-10 h-10 text-slate-700 mx-auto" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No outstanding dues left!</p>
                      <p className="text-[9px] text-[#4ade1e] font-black uppercase">Outstanding status: 100% Cleared</p>
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        className="mt-4 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
                      >
                        Dismiss Modal Layout
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Select Pending Booking Account</label>
                        <select
                          required
                          value={payBookingId}
                          onChange={(e) => setPayBookingId(e.target.value)}
                          className="w-full bg-[#070b13] border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:border-brand/50 outline-none transition-all text-xs font-semibold"
                        >
                          <option value="">-- Choose Account --</option>
                          {bookingsWithDue.map((b) => {
                            const due = b.price - b.advance;
                            return (
                              <option key={b.id} value={b.id}>
                                {b.teamName} ({b.date} • {b.time}) — Due: ৳{due.toLocaleString()}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {payBookingId && (
                        <>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Payment Method</label>
                            <select
                              value={payMethod}
                              onChange={(e) => setPayMethod(e.target.value as any)}
                              className="w-full bg-[#070b13] border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:border-brand/50 outline-none transition-all text-xs font-semibold"
                            >
                              <option value="Cash">Cash Handover</option>
                              <option value="Mobile Banking">bKash / Nagad / Rocket</option>
                              <option value="Card">Visa / Mastercard</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Inflow Payment Amount (BDT)</label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-semibold">৳</span>
                              <input 
                                required
                                type="number"
                                min="1"
                                value={payAmount || ''}
                                onChange={(e) => setPayAmount(Number(e.target.value))}
                                className="w-full bg-[#070b13] border border-slate-700/50 rounded-xl py-2.5 pl-6.5 pr-4 text-white focus:border-brand/40 outline-none transition-all text-xs font-semibold"
                                placeholder="e.g. 500"
                              />
                            </div>
                            <p className="text-[8px] text-slate-500 font-bold pl-1 uppercase tracking-widest">
                              Entering ৳ {payAmount.toLocaleString()} to apply on selected booking.
                            </p>
                          </div>

                          <div className="pt-2 flex gap-3">
                            <button 
                              type="button" 
                              onClick={() => setActiveModal(null)}
                              className="flex-1 py-2.5 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                            <button 
                              type="submit"
                              className="flex-1 bg-brand text-black py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-lg shadow-brand/10"
                            >
                              Clear / Record Payment
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}

                </form>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
