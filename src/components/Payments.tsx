import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Plus, 
  Filter, 
  Download, 
  DollarSign, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Payment, Booking } from '../types';

interface PaymentsProps {
  bookings: Booking[];
  setActiveView?: (view: string) => void;
}

export function Payments({ bookings, setActiveView }: PaymentsProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Generate payment history from bookings
  const payments = bookings
    .filter(b => b.advance > 0)
    .map(b => ({
      id: b.id,
      bookingId: b.id,
      customerId: b.customerId,
      customerName: b.customerName,
      amount: b.advance,
      date: b.date,
      method: 'Confirmed Payment',
      status: b.advance === b.price ? 'Paid' : 'Partial'
    }));

  const totalRevenue = bookings.reduce((sum, b) => sum + (b.status !== 'Cancelled' ? b.price : 0), 0);
  const totalPaid = bookings.reduce((sum, b) => sum + b.advance, 0);
  const totalDue = totalRevenue - totalPaid;

  const filteredPayments = payments.filter(p => 
    p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.includes(searchTerm)
  );

  const handleExport = () => {
    try {
      const headers = ['Transaction ID', 'Customer', 'Amount', 'Method', 'Date', 'Status'];
      const rows = filteredPayments.map(p => [
        `TRX-${p.id.padStart(4, '0')}`,
        p.customerName,
        p.amount,
        p.method,
        p.date,
        p.status
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payments_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Note: showToast isn't in props but I can use an alert or just rely on the download
    } catch (error) {
      console.error('Export failed', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white uppercase tracking-tight">Payment <span className="text-brand">Tracking</span></h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Monitor transactions and revenue streams</p>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
            >
                <Download className="w-4 h-4" />
                <span className="text-xs">Export</span>
            </button>
            <button 
              onClick={() => setActiveView?.('bookings')}
              className="flex items-center gap-2 px-4 py-2 bg-brand text-black rounded-xl font-bold hover:scale-105 transition-transform"
            >
                <Plus className="w-4 h-4" />
                <span className="text-xs">New Transaction</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-brand/10 rounded-xl">
                <DollarSign className="w-6 h-6 text-brand" />
            </div>
            <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Revenue</p>
                <p className="text-2xl font-black text-white">৳ {totalRevenue.toLocaleString()}</p>
            </div>
         </div>
         <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
                <Smartphone className="w-6 h-6 text-blue-400" />
            </div>
            <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Collected Amt</p>
                <p className="text-2xl font-black text-white">৳ {totalPaid.toLocaleString()}</p>
            </div>
         </div>
         <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-red-400/10 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pending Dues</p>
                <p className="text-2xl font-black text-white">৳ {totalDue.toLocaleString()}</p>
            </div>
         </div>
      </div>

      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative group flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-brand" />
                <input 
                    type="text" 
                    placeholder="Search by customer or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand/40"
                />
            </div>
            <div className="flex items-center gap-2">
                <button className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 hover:text-white">
                    <Filter className="w-4 h-4" />
                </button>
                <button className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 hover:text-white">
                    <History className="w-4 h-4" />
                </button>
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-800/20">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Transaction ID</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Customer</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Amount</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Method</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Date</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                        <th className="px-6 py-4"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {filteredPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-800/10 transition-colors">
                            <td className="px-6 py-4 text-xs font-mono text-slate-400">#TRX-{payment.id.padStart(4, '0')}</td>
                            <td className="px-6 py-4">
                                <p className="text-sm font-bold text-white">{payment.customerName}</p>
                                <p className="text-[10px] font-bold text-slate-500 mt-0.5">ID: {payment.customerId}</p>
                            </td>
                            <td className="px-6 py-4 text-sm font-black text-white">৳ {payment.amount.toLocaleString()}</td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span className="text-xs text-slate-400 font-medium">{payment.method}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500 font-bold">{payment.date}</td>
                            <td className="px-6 py-4">
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                    payment.status === 'Paid' ? "bg-brand/10 border-brand/20 text-brand" :
                                    payment.status === 'Partial' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                                    "bg-red-500/10 border-red-500/20 text-red-500"
                                )}>
                                    {payment.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button className="p-2 text-slate-500 hover:text-white">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
