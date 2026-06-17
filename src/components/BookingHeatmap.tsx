import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Clock, 
  Calendar, 
  Filter, 
  Sparkles, 
  Info,
  Layers,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { Booking, FACILITIES } from '../types';
import { cn } from '../lib/utils';

interface BookingHeatmapProps {
  bookings: Booking[];
}

const HEATMAP_TIME_SLOTS = [
  '06:00 - 07:30 AM',
  '07:30 - 09:00 AM',
  '03:00 - 04:30 PM',
  '04:30 - 06:00 PM',
  '06:00 - 07:30 PM',
  '07:30 - 09:00 PM',
  '09:00 - 10:30 PM',
  '10:30 - 12:00 AM',
  '12:00 - 01:30 AM'
];

const WEEKDAYS = [
  { name: 'Sunday', index: 0, short: 'SUN' },
  { name: 'Monday', index: 1, short: 'MON' },
  { name: 'Tuesday', index: 2, short: 'TUE' },
  { name: 'Wednesday', index: 3, short: 'WED' },
  { name: 'Thursday', index: 4, short: 'THU' },
  { name: 'Friday', index: 5, short: 'FRI' },
  { name: 'Saturday', index: 6, short: 'SAT' }
];

export function BookingHeatmap({ bookings }: BookingHeatmapProps) {
  const [selectedFacility, setSelectedFacility] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('AllActive'); // AllActive = Confirmed & Completed
  const [hoveredCell, setHoveredCell] = useState<{
    dayName: string;
    slot: string;
    count: number;
    revenue: number;
    percentage: number;
  } | null>(null);

  // Helper: determine weekday index from booking date (YYYY-MM-DD)
  const getDayIndex = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.getDay();
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.getDay();
      }
    } catch {
      // ignore
    }
    return -1;
  };

  // 1. Process grid data based on filters
  const { grid, maxCount, totalFilteredBookings, totalFilteredRevenue } = useMemo(() => {
    let filtered = bookings;
    
    // Filter by Status
    if (selectedStatus === 'AllActive') {
      filtered = bookings.filter(b => b.status === 'Confirmed' || b.status === 'Completed');
    } else if (selectedStatus !== 'All') {
      filtered = bookings.filter(b => b.status === selectedStatus);
    }

    // Filter by Facility
    if (selectedFacility !== 'All') {
      filtered = filtered.filter(b => b.facility === selectedFacility);
    }

    // Initialize counts matrix
    // Key format: `${dayIndex}-${timeSlot}`
    const matrix: Record<string, { count: number; revenue: number }> = {};
    
    WEEKDAYS.forEach(day => {
      HEATMAP_TIME_SLOTS.forEach(slot => {
        matrix[`${day.index}-${slot}`] = { count: 0, revenue: 0 };
      });
    });

    // Populate matrix
    filtered.forEach(b => {
      const dayIdx = getDayIndex(b.date);
      if (dayIdx >= 0 && dayIdx <= 6) {
        const matchingSlot = HEATMAP_TIME_SLOTS.find(slot => b.time === slot);
        if (matchingSlot) {
          const key = `${dayIdx}-${matchingSlot}`;
          if (matrix[key]) {
            matrix[key].count += 1;
            matrix[key].revenue += b.price;
          }
        }
      }
    });

    // Find max bookings in any slot
    let max = 0;
    Object.values(matrix).forEach(val => {
      if (val.count > max) {
        max = val.count;
      }
    });

    const sumRevenue = filtered.reduce((acc, b) => acc + b.price, 0);

    return {
      grid: matrix,
      maxCount: Math.max(max, 1),
      totalFilteredBookings: filtered.length,
      totalFilteredRevenue: sumRevenue
    };
  }, [bookings, selectedFacility, selectedStatus]);

  // 2. Synthesize peak insights
  const insights = useMemo(() => {
    let peakDay = 'N/A';
    let peakDayCount = -1;
    let peakSlot = 'N/A';
    let peakSlotCount = -1;

    // Calculate busiest day
    WEEKDAYS.forEach(day => {
      let daySum = 0;
      HEATMAP_TIME_SLOTS.forEach(slot => {
        daySum += grid[`${day.index}-${slot}`]?.count || 0;
      });
      if (daySum > peakDayCount) {
        peakDayCount = daySum;
        peakDay = day.name;
      }
    });

    // Calculate busiest slot
    HEATMAP_TIME_SLOTS.forEach(slot => {
      let slotSum = 0;
      WEEKDAYS.forEach(day => {
        slotSum += grid[`${day.index}-${slot}`]?.count || 0;
      });
      if (slotSum > peakSlotCount) {
        peakSlotCount = slotSum;
        peakSlot = slot;
      }
    });

    return {
      peakDay,
      peakDayCount,
      peakSlot,
      peakSlotCount,
    };
  }, [grid]);

  return (
    <div className="bg-[#0f172a] border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group w-full">
      {/* Decorative Gradient Background */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-brand/5 blur-[80px] -mr-16 -mt-16 pointer-events-none group-hover:bg-brand/10 transition-all duration-500" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 blur-[80px] -ml-16 -mb-16 pointer-events-none group-hover:bg-blue-500/10 transition-all duration-500" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-xl font-display font-black text-white uppercase tracking-tight flex items-center gap-2">
            SLOT OCCUPANCY <span className="text-brand flex items-center gap-1">HEATMAP <Flame className="w-5 h-5 text-brand fill-brand animate-pulse" /></span>
          </h3>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">
            Analyzing 90-minute slot booking frequency throughout the week
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Facility Filter */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 gap-2">
            <Layers className="w-3.5 h-3.5 text-brand" />
            <select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="bg-transparent text-slate-300 text-xs font-bold uppercase tracking-wider focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900">All Pitches</option>
              {FACILITIES.map((fac, idx) => (
                <option key={idx} value={fac} className="bg-slate-900">
                  {fac.includes('Pitch 1') ? 'Pitch 1' : fac.includes('Pitch 2') ? 'Pitch 2' : fac.includes('Pitch 3') ? 'Pitch 3' : fac}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 gap-2">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-slate-300 text-xs font-bold uppercase tracking-wider focus:outline-none cursor-pointer"
            >
              <option value="AllActive" className="bg-slate-900">Active Bookings</option>
              <option value="Confirmed" className="bg-slate-900">Confirmed</option>
              <option value="Completed" className="bg-slate-900">Completed</option>
              <option value="All" className="bg-slate-900">Include Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Heatmap Area */}
      <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <div className="min-w-[850px] relative">
          <div className="grid grid-cols-[100px_1fr] gap-3">
            {/* Header: Left Side Spacer & Time Labels */}
            <div />
            <div className="grid grid-cols-9 gap-2 text-center text-[9px] font-black tracking-wider uppercase text-slate-500 pb-2">
              {HEATMAP_TIME_SLOTS.map((slot, sIdx) => {
                // Shorten time slot for labels
                const label = slot.replace(/ AM| PM/g, '').replace(':00', '');
                return (
                  <div key={sIdx} className="bg-slate-900/40 py-2 rounded-xl border border-slate-800/40 text-slate-400 font-display">
                    {label}
                  </div>
                );
              })}
            </div>

            {/* Heatmap Body */}
            {WEEKDAYS.map((day, dIdx) => (
              <React.Fragment key={dIdx}>
                {/* Weekday Row Label */}
                <div className="flex items-center justify-start py-3">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400 font-display">
                    {day.name}
                  </span>
                </div>

                {/* Weekday Cells */}
                <div className="grid grid-cols-9 gap-2">
                  {HEATMAP_TIME_SLOTS.map((slot, sIdx) => {
                    const key = `${day.index}-${slot}`;
                    const item = grid[key] || { count: 0, revenue: 0 };
                    const relativePct = Math.round((item.count / maxCount) * 100);

                    // Map cell styling berdasarkan occupancy count
                    let cellStyle = "bg-slate-900/50 text-slate-600 border border-slate-800/30 opacity-40 hover:opacity-100 hover:bg-slate-800/60";
                    if (item.count > 0) {
                      if (item.count / maxCount <= 0.25) {
                        cellStyle = "bg-brand/10 text-brand-dark border border-brand/20 hover:bg-brand/25";
                      } else if (item.count / maxCount <= 0.5) {
                        cellStyle = "bg-brand/35 text-brand border border-brand/40 hover:bg-brand/50";
                      } else if (item.count / maxCount <= 0.75) {
                        cellStyle = "bg-brand/65 text-slate-950 font-bold border border-brand/50 hover:bg-brand/80";
                      } else {
                        cellStyle = "bg-brand text-slate-950 font-black shadow-lg shadow-brand/25 border border-brand hover:scale-[1.04]";
                      }
                    }

                    return (
                      <motion.div
                        key={sIdx}
                        className={cn(
                          "h-14 rounded-2xl flex flex-col items-center justify-center relative cursor-pointer font-display transition-all duration-200",
                          cellStyle
                        )}
                        whileHover={{ scale: 1.05 }}
                        onMouseEnter={() => setHoveredCell({
                          dayName: day.name,
                          slot: slot,
                          count: item.count,
                          revenue: item.revenue,
                          percentage: Math.round((item.count / (totalFilteredBookings || 1)) * 100)
                        })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <span className="text-base font-black leading-none">
                          {item.count > 0 ? item.count : '•'}
                        </span>
                        {item.count > 0 && (
                          <span className="text-[7px] font-black opacity-80 mt-1">
                            ৳{(item.revenue / 1000).toFixed(1)}k
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap Footer Legend */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800/80 pt-6 mt-4 gap-4">
        {/* Colour Intensity Scale */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> Bookings Density
          </span>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-2 rounded-xl">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mr-1">Less</span>
            <div className="w-3.5 h-3.5 rounded bg-slate-800/40 border border-slate-700/30" title="0 bookings" />
            <div className="w-3.5 h-3.5 rounded bg-brand/15 border border-brand/20" title="Low booking density" />
            <div className="w-3.5 h-3.5 rounded bg-brand/40 border border-brand/35" title="Medium booking density" />
            <div className="w-3.5 h-3.5 rounded bg-brand/70 border border-brand/50" title="High booking density" />
            <div className="w-3.5 h-3.5 rounded bg-brand" title="Max peak density" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Peak</span>
          </div>
        </div>

        {/* Dynamic Tooltip Detail or Live helper */}
        <div className="h-10 flex items-center justify-end">
          <AnimatePresence mode="wait">
            {hoveredCell ? (
              <motion.div
                key="cell-details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-slate-905 border border-brand/20 px-4 py-2 rounded-xl flex items-center gap-3 text-xs shadow-xl shadow-brand/5 max-w-sm"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-brand animate-ping" />
                <div className="leading-tight">
                  <p className="text-white font-bold">
                    {hoveredCell.dayName} at <span className="text-brand">{hoveredCell.slot}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold mt-0.5">
                    {hoveredCell.count} Bookings / ৳{hoveredCell.revenue.toLocaleString()} Rev ({hoveredCell.percentage}% of overall active)
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="default-cta"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand animate-pulse" /> Hover any slot to examine booking details
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Grid of Peak Usage Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 border-t border-slate-800/80 pt-8">
        {/* Peak Slot Card */}
        <div className="bg-[#020617]/50 border border-slate-800/60 p-4 rounded-3xl flex items-center gap-4 hover:border-slate-700 transition-colors">
          <div className="p-3 bg-brand/10 text-brand rounded-2xl border border-brand/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PEAK TIME SLOT</p>
            <p className="text-sm font-black text-white mt-0.5">{insights.peakSlot}</p>
            <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
              {insights.peakSlotCount} combined bookings
            </p>
          </div>
        </div>

        {/* Peak Day Card */}
        <div className="bg-[#020617]/50 border border-slate-800/60 p-4 rounded-3xl flex items-center gap-4 hover:border-slate-700 transition-colors">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">BUSIEST WEEKDAY</p>
            <p className="text-sm font-black text-white mt-0.5">{insights.peakDay}</p>
            <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
              {insights.peakDayCount} weekly bookings
            </p>
          </div>
        </div>

        {/* Overall Health Card */}
        <div className="bg-[#020617]/50 border border-slate-800/60 p-4 rounded-3xl flex items-center gap-4 hover:border-slate-700 transition-colors">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AVG WORKLOAD CAPACITY</p>
            <p className="text-sm font-black text-white mt-0.5">
              {Math.round((totalFilteredBookings / (7 * 9)) * 100)}% Occupied
            </p>
            <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
              On {totalFilteredBookings} active slots
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
