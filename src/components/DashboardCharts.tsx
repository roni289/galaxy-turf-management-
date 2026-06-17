import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Calendar, CheckCircle2, AlertCircle, Ban } from 'lucide-react';

import { Booking } from '../types';

interface IncomeChartProps {
  bookings: Booking[];
}

export function IncomeChart({ bookings }: IncomeChartProps) {
  // Generate daily income data from last 7 days of bookings
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const dynamicIncomeData = last7Days.map(date => {
    const dayBookings = bookings.filter(b => b.date === date);
    const income = dayBookings.reduce((sum, b) => sum + (b.status !== 'Cancelled' ? b.price : 0), 0);
    const advance = dayBookings.reduce((sum, b) => sum + b.advance, 0);
    const due = income - advance;
    return {
      name: new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      income,
      due
    };
  });

  return (
    <div className="bg-[#0f172a] border border-slate-800 p-8 rounded-[2.5rem] h-[450px] shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-brand/10 transition-all" />
      
      <div className="flex flex-col mb-8">
        <h3 className="text-xl font-display font-black text-white uppercase tracking-tight flex items-center gap-2">
           INCOME <span className="text-brand">OVERVIEW</span>
        </h3>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Daily Collection vs Pending Dues</p>
      </div>

      <ResponsiveContainer width="100%" height="75%">
        <BarChart data={dynamicIncomeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={8}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.5} />
          <XAxis 
            dataKey="name" 
            stroke="#475569" 
            fontSize={10}
            fontWeight="900"
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            stroke="#475569" 
            fontSize={10}
            fontWeight="900"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => value >= 1000 ? `৳${value / 1000}K` : `৳${value}`}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            contentStyle={{ 
              backgroundColor: '#020617', 
              border: '1px solid #1e293b', 
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              padding: '12px'
            }}
            itemStyle={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}
            labelStyle={{ color: '#64748b', fontSize: '10px', fontWeight: '900', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
          />
          <Bar dataKey="income" fill="#4ade80" radius={[6, 6, 0, 0]} name="Income" barSize={32} />
          <Bar dataKey="due" fill="#ef4444" radius={[6, 6, 0, 0]} name="Due" barSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PaymentSummaryChartProps {
  bookings: Booking[];
}

export function PaymentSummaryChart({ bookings }: PaymentSummaryChartProps) {
  const totalPaid = bookings.reduce((sum, b) => sum + b.advance, 0);
  const totalDue = bookings.reduce((sum, b) => sum + (b.status === 'Confirmed' ? (b.price - b.advance) : 0), 0);
  const totalPotential = totalPaid + totalDue;

  const dynamicPaymentData = [
    { name: 'Paid', value: totalPaid, color: '#4ade80' },
    { name: 'Due', value: totalDue, color: '#ef4444' },
  ];

  const total = dynamicPaymentData.reduce((acc, curr) => acc + curr.value, 0) || 1; // Avoid divide by zero
  
  return (
    <div className="bg-[#0f172a] border border-slate-800 p-8 rounded-[2.5rem] h-[450px] flex flex-col shadow-2xl relative overflow-hidden group">
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 blur-3xl -ml-16 -mb-16 pointer-events-none group-hover:bg-blue-500/10 transition-all" />
      
      <div className="mb-6">
        <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">
          PAYMENT <span className="text-brand">SUMMARY</span>
        </h3>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Overall Revenue Distribution</p>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-[180px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dynamicPaymentData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={8}
                dataKey="value"
                stroke="none"
              >
                {dynamicPaymentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#020617', 
                  border: '1px solid #1e293b', 
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Revenue</span>
            <span className="text-lg font-black text-white">৳{total >= 1000 ? `${(total/1000).toFixed(1)}K` : total}</span>
          </div>
        </div>
        
        <div className="space-y-3 mt-8">
          {dynamicPaymentData.map((item, idx) => {
            const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/20 border border-slate-700/30 rounded-2xl group/item hover:border-slate-600 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}40` }} />
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">{item.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-black text-white">৳{item.value.toLocaleString()}</span>
                  <span className="text-[10px] text-brand font-black bg-brand/10 px-2 py-0.5 rounded-md">{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface DailyRatioChartProps {
  bookings: Booking[];
}

export function DailyRatioChart({ bookings }: DailyRatioChartProps) {
  const todayStr = React.useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const todayBookings = React.useMemo(() => {
    return bookings.filter(b => b.date === todayStr);
  }, [bookings, todayStr]);

  const stats = React.useMemo(() => {
    const confirmedCount = todayBookings.filter(b => b.status === 'Confirmed').length;
    const pendingCount = todayBookings.filter(b => b.status === 'Pending').length;
    const cancelledCount = todayBookings.filter(b => b.status === 'Cancelled').length;
    return {
      confirmed: confirmedCount,
      pending: pendingCount,
      cancelled: cancelledCount,
      total: todayBookings.length
    };
  }, [todayBookings]);

  const chartData = React.useMemo(() => {
    return [
      { name: 'Confirmed', value: stats.confirmed, color: '#10b981', icon: CheckCircle2 },
      { name: 'Pending', value: stats.pending, color: '#f59e0b', icon: AlertCircle },
      { name: 'Cancelled', value: stats.cancelled, color: '#ef4444', icon: Ban },
    ];
  }, [stats]);

  const hasData = stats.total > 0;
  
  const displayData = React.useMemo(() => {
    return hasData 
      ? chartData.filter(d => d.value > 0) 
      : [{ name: 'No Bookings', value: 1, color: '#1e293b' }];
  }, [hasData, chartData]);

  const formattedToday = React.useMemo(() => {
    return new Date(todayStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, [todayStr]);

  return (
    <div className="bg-[#0f172a] border border-slate-800 p-8 rounded-[2.5rem] h-[450px] flex flex-col shadow-2xl relative overflow-hidden group">
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-brand/5 blur-3xl -mr-16 -mb-16 pointer-events-none group-hover:bg-brand/10 transition-all" />
      
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">
            TODAY'S <span className="text-brand">STATUS</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Confirmed, Pending & Cancelled</p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
          <Calendar className="w-3.5 h-3.5 text-brand" />
          <span className="text-[9px] font-mono font-black text-slate-300 uppercase tracking-widest">{formattedToday}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-[180px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={displayData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={hasData ? 6 : 0}
                dataKey="value"
                stroke="none"
              >
                {displayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              {hasData && (
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#020617', 
                    border: '1px solid #1e293b', 
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                  }}
                  itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#fff' }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Today's Total</span>
            <span className="text-lg font-black text-white">
              {stats.total} {stats.total === 1 ? 'Slot' : 'Slots'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mt-8">
          {chartData.map((item, idx) => {
            const count = item.value;
            const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            const Icon = item.icon;
            
            return (
              <div 
                key={idx} 
                className="flex flex-col items-center justify-between p-3 bg-slate-800/10 border border-slate-800 rounded-2xl text-center group/item hover:border-slate-700 transition-all h-24"
              >
                <div className="flex flex-col items-center gap-1 mt-1">
                  <div className="w-5 h-5 rounded-lg flex items-center justify-center bg-slate-900 border border-slate-800 shrink-0">
                    <Icon className="w-3 h-3" style={{ color: item.color }} />
                  </div>
                  <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest leading-none mt-1">{item.name}</span>
                </div>
                <div className="mb-1">
                  <span className="text-sm font-black text-white block">{count}</span>
                  <span className="text-[8px] text-slate-400 font-bold block mt-0.5">{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
