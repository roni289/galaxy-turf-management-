import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday,
  startOfDay
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  Users,
  Plus,
  X,
  CreditCard,
  MapPin,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Booking } from '../types';

const HOLIDAYS = [
  '2026-02-21', // Language Day
  '2026-03-26', // Independence Day
  '2026-12-16', // Victory Day
  '2026-05-01', // May Day
];

const checkIsHoliday = (date: Date) => {
  const formatted = format(date, 'yyyy-MM-dd');
  const dayOfWeek = date.getDay();
  if (HOLIDAYS.includes(formatted)) return { type: 'Public', name: 'Public Holiday' };
  if (dayOfWeek === 5) return { type: 'Weekly', name: 'Weekend' };
  return null;
};

interface CalendarViewProps {
  bookings: Booking[];
}

export function CalendarView({ bookings }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight">
            Schedule <span className="text-brand">Calendar</span>
          </h2>
          <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Visualizing {format(currentMonth, 'MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              const today = new Date();
              setCurrentMonth(today);
              setSelectedDate(today);
            }}
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Today
          </button>
          <div className="flex items-center bg-slate-800/40 border border-slate-700/50 rounded-2xl p-1">
            <button 
              onClick={prevMonth}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-4 text-sm font-black text-white min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            <button 
              onClick={nextMonth}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button className="p-3 bg-brand text-black rounded-2xl font-bold hover:scale-105 transition-transform flex items-center gap-2">
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline text-xs">New Booking</span>
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day, idx) => (
          <div key={idx} className="text-center text-[10px] font-black text-slate-600 uppercase tracking-widest py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-px bg-slate-800/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {calendarDays.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isSelected = isSameDay(day, selectedDate);
          const formattedDate = format(day, 'yyyy-MM-dd');
          const dayBookings = bookings.filter(b => b.date === formattedDate);
          const holiday = checkIsHoliday(day);

          return (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02, zIndex: 10 }}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "min-h-[100px] lg:min-h-[140px] p-2 lg:p-4 cursor-pointer transition-all flex flex-col relative",
                isCurrentMonth ? "bg-[#0f172a]" : "bg-slate-900/50 grayscale opacity-40",
                isSelected && "ring-2 ring-inset ring-brand bg-brand/5 z-10",
                holiday && isCurrentMonth && "bg-red-500/5"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "text-xs lg:text-sm font-black",
                  isToday(day) ? "w-7 h-7 flex items-center justify-center bg-brand text-black rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]" : 
                  (holiday && isCurrentMonth ? "text-red-400" : (isCurrentMonth ? "text-slate-400" : "text-slate-600"))
                )}>
                  {format(day, 'd')}
                </span>
                {holiday && isCurrentMonth && (
                  <span className="text-[8px] font-black text-red-500/70 absolute top-2 right-2 uppercase tracking-tighter">
                    {holiday.name}
                  </span>
                )}
                {dayBookings.length > 0 && !holiday && (
                   <span className="text-[9px] font-black bg-brand/10 text-brand px-1.5 py-0.5 rounded-md border border-brand/20">
                     {dayBookings.length} EVENT
                   </span>
                )}
              </div>
              
              <div className="flex-1 space-y-1 overflow-hidden">
                {dayBookings.slice(0, 2).map((booking, bIdx) => (
                  <div 
                    key={bIdx}
                    className="text-[9px] font-bold p-1 lg:p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 text-white truncate"
                  >
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-brand shrink-0" />
                      <span className="truncate">{booking.teamName}</span>
                    </div>
                  </div>
                ))}
                {dayBookings.length > 2 && (
                  <div className="text-[9px] font-bold text-slate-500 pl-2">
                    + {dayBookings.length - 2} more
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderSelectedDayView = () => {
    const formattedSelected = format(selectedDate, 'yyyy-MM-dd');
    const dayBookings = bookings.filter(b => b.date === formattedSelected);

    return (
      <div className="bg-[#0f172a] border border-slate-800 rounded-[2.5rem] p-8 mt-12 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-brand/10 transition-all" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-800 pb-8">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-800 rounded-3xl flex flex-col items-center justify-center border border-slate-700 shadow-xl">
                 <span className="text-brand font-black text-xl leading-none">{format(selectedDate, 'd')}</span>
                 <span className="text-slate-500 text-[10px] font-black uppercase mt-1">{format(selectedDate, 'EEE')}</span>
              </div>
              <div>
                 <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                    Timeline for <span className="text-brand">{format(selectedDate, 'MMMM do, yyyy')}</span>
                 </h3>
                 <div className="flex items-center gap-2 mt-1 text-[10px] font-black uppercase tracking-widest">
                    <span className="text-brand">{format(selectedDate, 'dd / MM / yyyy')}</span>
                    <span className="text-slate-700 mx-1">•</span>
                    <span className="text-slate-500">Galaxy Sports • Narayanganj</span>
                 </div>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <div className="text-right">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Income</p>
                 <p className="text-xl font-black text-white">৳ {dayBookings.reduce((acc, b) => acc + b.price, 0).toLocaleString()}</p>
              </div>
              <div className="w-px h-10 bg-slate-800 sm:mx-2" />
              <button className="flex items-center gap-2 px-6 py-3 bg-slate-800 border border-slate-700 text-white rounded-2xl font-bold hover:bg-slate-700 transition-colors">
                 <CalendarIcon className="w-4 h-4" />
                 <span className="text-xs">Add Event</span>
              </button>
           </div>
        </div>

        {dayBookings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dayBookings.map((booking, idx) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={idx}
                onClick={() => setSelectedBooking(booking)}
                className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex items-center gap-6 group hover:border-brand/40 transition-all cursor-pointer"
              >
                <div className="bg-slate-800 rounded-2xl px-4 py-3 border border-slate-700 flex flex-col items-center min-w-[100px]">
                   <span className="text-brand font-black text-sm">{booking.time.split(' - ')[0]}</span>
                   <span className="text-slate-500 text-[9px] font-black uppercase mt-1">START</span>
                </div>
                <div className="flex-1 overflow-hidden">
                   <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-brand" />
                      <h4 className="font-black text-white uppercase tracking-tight">{booking.teamName}</h4>
                   </div>
                   <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{booking.customerName}</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-slate-700" />
                      <span>90 MINS</span>
                   </div>
                </div>
                <div className="text-right">
                   <span className={cn(
                     "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border block mb-2",
                     booking.status === 'Confirmed' ? "bg-brand/10 border-brand/20 text-brand" : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                   )}>
                     {booking.status}
                   </span>
                   <p className="text-white font-black">৳ {booking.price}</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
             <Clock className="w-12 h-12 text-slate-700 mb-4" />
             <p className="text-slate-500 font-bold uppercase tracking-widest">No slots booked for this day yet</p>
             <button className="mt-4 text-brand text-xs font-black uppercase tracking-widest hover:underline">
                View Availability
             </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderHeader()}
      <div className="bg-[#0f172a] p-4 lg:p-8 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand/20 to-transparent" />
        {renderDays()}
        {renderCells()}
      </div>
      {renderSelectedDayView()}

      {/* Booking Details Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#020617] border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6">
                <button 
                  onClick={() => setSelectedBooking(null)}
                  className="p-2 bg-slate-800/50 text-slate-400 hover:text-white rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 sm:p-12">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center border border-brand/20">
                    <CalendarIcon className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight">Booking <span className="text-brand">Details</span></h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Ref: #{selectedBooking.id.padStart(5, '0')}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-6 p-6 bg-slate-800/30 rounded-3xl border border-slate-700/50">
                    <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Customer / Team</p>
                      <h4 className="text-lg font-black text-white uppercase tracking-tight">{selectedBooking.teamName}</h4>
                      <p className="text-xs text-slate-400 font-bold opacity-70">{selectedBooking.customerName}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-800/20 border border-slate-800 rounded-3xl">
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarDays className="w-3 h-3 text-brand" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Date</span>
                      </div>
                      <p className="text-sm font-bold text-white">{selectedBooking.date}</p>
                    </div>
                    <div className="p-5 bg-slate-800/20 border border-slate-800 rounded-3xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-3 h-3 text-brand" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Time Slot</span>
                      </div>
                      <p className="text-sm font-bold text-white">{selectedBooking.time}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-800/20 border border-slate-800 rounded-3xl">
                      <div className="flex items-center gap-2 mb-2 text-blue-400">
                        <CreditCard className="w-3 h-3" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pricing</span>
                      </div>
                      <p className="text-sm font-bold text-white">৳ {selectedBooking.price.toLocaleString()}</p>
                    </div>
                    <div className="p-5 bg-slate-800/20 border border-slate-800 rounded-3xl">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          selectedBooking.status === 'Confirmed' ? "bg-brand" : "bg-blue-400"
                        )} />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Status</span>
                      </div>
                      <p className="text-sm font-bold text-white">{selectedBooking.status}</p>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-800/20 border border-slate-800 rounded-3xl flex items-center gap-4">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Location</p>
                      <p className="text-xs font-bold text-slate-300">Galaxy Sports, Futulla, Narayanganj</p>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex gap-4">
                  <button className="flex-1 py-4 bg-brand text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-transform">
                    Edit Booking
                  </button>
                  <button 
                    onClick={() => setSelectedBooking(null)}
                    className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
