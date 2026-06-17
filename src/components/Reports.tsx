import React from 'react';
import { BookingHeatmap } from './BookingHeatmap';
import { DemandPredictor } from './DemandPredictor';
import { jsPDF } from 'jspdf';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Download,
  Filter,
  BarChart3,
  Search,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Booking, Customer } from '../types';

interface ReportsProps {
  bookings: Booking[];
  customers: Customer[];
  setActiveView?: (view: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export function Reports({ bookings, customers, setActiveView, showToast }: ReportsProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSearchVisible, setIsSearchVisible] = React.useState(false);

  // Generate dynamic monthly data from bookings
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const monthLabel = d.toLocaleString('en-US', { month: 'short' });
    const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
    
    const monthBookings = bookings.filter(b => b.date.startsWith(monthKey));
    const revenue = monthBookings.reduce((sum, b) => sum + (b.status !== 'Cancelled' ? b.price : 0), 0);
    
    return {
      month: monthLabel,
      revenue,
      bookings: monthBookings.length
    };
  });

  const [showDetailedIncome, setShowDetailedIncome] = React.useState(false);
  const [incomeViewType, setIncomeViewType] = React.useState<'daily' | 'monthly'>('daily');

  // All-time Daily Income
  const allDailyIncome = Array.from(new Set(bookings.map(b => b.date)))
    .sort((a, b) => b.localeCompare(a))
    .map(date => {
      const dayBookings = bookings.filter(b => b.date === date);
      const income = dayBookings.reduce((sum, b) => sum + (b.status !== 'Cancelled' ? b.price : 0), 0);
      const advance = dayBookings.reduce((sum, b) => sum + b.advance, 0);
      return { date, income, advance, bookings: dayBookings.length };
    });

  // All-time Monthly Income
  const allMonthlyIncome = Array.from(new Set(bookings.map(b => b.date.slice(0, 7))))
    .sort((a, b) => b.localeCompare(a))
    .map(month => {
      const monthBookings = bookings.filter(b => b.date.startsWith(month));
      const income = monthBookings.reduce((sum, b) => sum + (b.status !== 'Cancelled' ? b.price : 0), 0);
      const advance = monthBookings.reduce((sum, b) => sum + b.advance, 0);
      return { month, income, advance, bookings: monthBookings.length };
    });

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Color scheme
      const primaryColor = [15, 118, 110]; // Teal / Emerald Dark (#0f766e)
      const secondaryColor = [59, 130, 246]; // Blue (#3b82f6)
      const darkColor = [15, 23, 42]; // Slate-900 (#0f172a)
      const greyColor = [100, 116, 139]; // Slate-500
      const lightBg = [248, 250, 252]; // Slate-50
      const borderLine = [226, 232, 240]; // Slate-200

      // Title & Header Background Decor
      doc.setFillColor(15, 23, 42); // slate dark header banner
      doc.rect(0, 0, 210, 38, 'F');

      // Brand / Header
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('GALAXY TURF ARENA', 15, 16);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(16, 185, 129); // Brand Accent Green
      doc.text('OPERATIONS CONTROL CENTER  |  P2P SYNCED', 15, 22);

      doc.setTextColor(203, 213, 225);
      doc.setFontSize(9);
      doc.text(`Report Period: Last 6 Months  |  Generated on: ${new Date().toLocaleString()}`, 15, 29);

      // Page Margins Info
      let y = 50;

      // CORE KPIS PANEL (Section 1)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('I. KEY BUSINESS INDICATORS (REAL-TIME STATUS)', 15, y);
      y += 5;

      // Draw horizontal separator
      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.5);
      doc.line(15, y, 195, y);
      y += 6;

      // 4 Metrics Grid Boxes
      const colWidth = 42;
      const colSpacing = 3;
      const boxHeight = 22;

      const kpis = [
        { label: 'TOTAL REVENUE', value: `BDT ${totalRevenue.toLocaleString()}` },
        { label: 'AVG BOOKING VAL', value: `BDT ${avgValue.toLocaleString()}` },
        { label: 'RETURN CUSTOMERS', value: `${returningCount} clients` },
        { label: 'CANCEL RATE', value: `${cancelRate}%` }
      ];

      kpis.forEach((kpi, index) => {
        const x = 15 + index * (colWidth + colSpacing);
        // Draw light grey background box
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.rect(x, y, colWidth, boxHeight, 'FD');

        // Draw top accent line
        doc.setFillColor(15, 118, 110);
        doc.rect(x, y, colWidth, 1.5, 'F');

        // Text
        doc.setTextColor(100, 116, 139);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(kpi.label, x + 3, y + 6);

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(10);
        doc.text(kpi.value, x + 3, y + 14);
      });

      y += boxHeight + 12;

      // SECTION II: MONTHLY DEVELOPMENT (Last 6 Months)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('II. MONTHLY REVENUE & BOOKING VOLUME HISTORY', 15, y);
      y += 5;

      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.5);
      doc.line(15, y, 195, y);
      y += 5;

      // Monthly Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(15, y, 180, 7, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text('Month Name', 20, y + 5);
      doc.text('Bookings Registered', 80, y + 5);
      doc.text('Monthly Revenue (BDT)', 140, y + 5);
      y += 7;

      monthlyData.forEach((row, i) => {
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 6, 'F');
        }
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(row.month, 20, y + 4.5);
        
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(15, 118, 110);
        doc.text(String(row.bookings), 80, y + 4.5);
        
        doc.setTextColor(15, 23, 42);
        doc.text(`BDT ${row.revenue.toLocaleString()}`, 140, y + 4.5);
        y += 6;
      });

      y += 10;

      // SECTION III: PEAK BOOKING HOURS
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('III. HOURLY SLOTS DEMAND PROFILES (ALL-TIME)', 15, y);
      y += 5;

      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.5);
      doc.line(15, y, 195, y);
      y += 5;

      // Grid for peak times (show top times in 2 columns for page-fitting)
      const sortedHours = [...peakTimeData].sort((a, b) => b.bookings - a.bookings).slice(0, 6);
      
      doc.setFillColor(241, 245, 249);
      doc.rect(15, y, 180, 7, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text('Time Slot Highlight', 20, y + 5);
      doc.text('Total Bookings Made', 90, y + 5);
      doc.text('Demand Level', 150, y + 5);
      y += 7;

      sortedHours.forEach((row, i) => {
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 6, 'F');
        }
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(`${row.time} Slot`, 20, y + 4.5);
        
        doc.setFont('Helvetica', 'normal');
        doc.text(String(row.bookings), 90, y + 4.5);
        
        const tier = row.bookings >= 7 ? 'CRITICAL HIGH' : row.bookings >= 3 ? 'MEDIUM OCCUPANCY' : 'LOW DEMAND';
        doc.setFont('Helvetica', 'bold');
        if (row.bookings >= 7) {
          doc.setTextColor(220, 38, 38); // red
        } else if (row.bookings >= 3) {
          doc.setTextColor(217, 119, 6); // amber
        } else {
          doc.setTextColor(16, 185, 129); // green
        }
        doc.text(tier, 150, y + 4.5);
        y += 6;
      });

      y += 10;

      // SECTION IV: DAILY PERFORMANCE (LAST 5 RECORDED DAYS)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('IV. RECENT DAYS PERFORMANCE (STATEMENT DETAILED)', 15, y);
      y += 5;

      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.5);
      doc.line(15, y, 195, y);
      y += 5;

      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(15, y, 180, 7, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('Statement Date', 18, y + 5);
      doc.text('Count', 60, y + 5);
      doc.text('Day Revenue', 85, y + 5);
      doc.text('Advance Recv', 120, y + 5);
      doc.text('Remaining Due', 155, y + 5);
      y += 7;

      dailyReportData.forEach((row, i) => {
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 6.5, 'F');
        } else {
          // Subtle border bottom
          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.3);
          doc.line(15, y + 6.5, 195, y + 6.5);
        }
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(row.date, 18, y + 4.5);
        
        doc.setFont('Helvetica', 'normal');
        doc.text(String(row.totalBookings), 60, y + 4.5);
        
        doc.text(`BDT ${row.income.toLocaleString()}`, 85, y + 4.5);
        doc.text(`BDT ${row.advance.toLocaleString()}`, 120, y + 4.5);
        
        if (row.due > 0) {
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(220, 38, 38); // bold red for dues
        } else {
          doc.setTextColor(15, 23, 42);
        }
        doc.text(`BDT ${row.due.toLocaleString()}`, 155, y + 4.5);
        
        y += 6.5;
      });

      // Footer
      const pageHeight = doc.internal.pageSize.height || 297;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, pageHeight - 16, 195, pageHeight - 16);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('CONFIDENTIAL  |  GALAXY TURF OPERATIONS SYSTEM PORTAL', 15, pageHeight - 11);
      
      doc.setFont('Helvetica', 'normal');
      doc.text('Page 1 of 1', 180, pageHeight - 11);

      // Save PDF
      doc.save(`Galaxy_Turf_Financial_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('Successfully generated and downloaded PDF operations report!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to compile or download PDF summary report.', 'error');
    }
  };

  const handlePrintDailyPDF = (targetDate: string) => {
    try {
      const dayBookings = bookings.filter(b => b.date === targetDate);
      if (dayBookings.length === 0) {
        showToast(`No bookings recorded for ${targetDate} to build PDF. Today's date may not have sessions yet!`, 'warning');
        return;
      }

      const totalRevenue = dayBookings.reduce((sum, b) => sum + (b.status !== 'Cancelled' ? b.price : 0), 0);
      const totalAdvance = dayBookings.reduce((sum, b) => sum + b.advance, 0);
      const totalOutstanding = totalRevenue - totalAdvance;
      const totalActiveBookings = dayBookings.filter(b => b.status !== 'Cancelled').length;

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Slate dark header banner
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 38, 'F');

      // Brand / Header
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('GALAXY TURF ARENA', 15, 14);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(16, 185, 129); // Brand Accent Green
      doc.text('DAILY OPERATIONS CLOSING STATEMENT', 15, 20);

      doc.setTextColor(203, 213, 225);
      doc.setFontSize(9);
      doc.text(`Statement Date: ${targetDate}  |  Generated on: ${new Date().toLocaleString()}`, 15, 28);

      let y = 48;

      // Section 1: Financial & Volume Highlights
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('I. METRICS HIGHLIGHTS (FOR THE DAY)', 15, y);
      y += 4;

      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.4);
      doc.line(15, y, 195, y);
      y += 5;

      // 4 Metrics Grid Boxes
      const colWidth = 42;
      const colSpacing = 3;
      const boxHeight = 18;

      const metrics = [
        { label: 'TOTAL INVENTORY', value: `${totalActiveBookings} Booked` },
        { label: 'TOTAL DAY INCOME', value: `BDT ${totalRevenue.toLocaleString()}` },
        { label: 'ADVANCE RECEIVED', value: `BDT ${totalAdvance.toLocaleString()}` },
        { label: 'OUTSTANDING DUE', value: `BDT ${totalOutstanding.toLocaleString()}` }
      ];

      metrics.forEach((metric, index) => {
        const x = 15 + index * (colWidth + colSpacing);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.rect(x, y, colWidth, boxHeight, 'FD');

        doc.setFillColor(15, 118, 110);
        doc.rect(x, y, colWidth, 1.2, 'F');

        doc.setTextColor(100, 116, 139);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text(metric.label, x + 3, y + 5);

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(9);
        doc.text(metric.value, x + 3, y + 12);
      });

      y += boxHeight + 10;

      // Section 2: Detailed Bookings Schedule list
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('II. SCHEDULED TURF MATCHES & RESERVATIONS STATEMENT', 15, y);
      y += 4;

      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.4);
      doc.line(15, y, 195, y);
      y += 5;

      // Table Header
      doc.setFillColor(15, 23, 42);
      doc.rect(15, y, 180, 7, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('Match / Team Name', 18, y + 5);
      doc.text('Registered Slot Time', 70, y + 5);
      doc.text('Pitch / Facility', 110, y + 5);
      doc.text('Total Cost', 150, y + 5);
      doc.text('Advance Recv', 172, y + 5);
      y += 7;

      dayBookings.forEach((b, i) => {
        // Stripe rows
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 7.5, 'F');
        } else {
          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.3);
          doc.line(15, y + 7.5, 195, y + 7.5);
        }

        doc.setFont('Helvetica', b.status === 'Cancelled' ? 'normal' : 'bold');
        doc.setFontSize(7.5);
        
        if (b.status === 'Cancelled') {
          doc.setTextColor(148, 163, 184); // Cancelled match strike text
        } else {
          doc.setTextColor(15, 23, 42);
        }

        // Team Name & Customer Name
        const teamStr = b.teamName.substring(0, 25) + (b.teamName.length > 25 ? '..' : '');
        doc.text(teamStr, 18, y + 4.8);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(`${b.customerName} (${b.customerPhone})`, 18, y + 7.0);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7);
        if (b.status === 'Cancelled') {
          doc.setTextColor(148, 163, 184);
        } else {
          doc.setTextColor(15, 23, 42);
        }
        
        doc.text(b.time, 70, y + 4.8);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text(b.status === 'Cancelled' ? 'CANCELLED MATCH' : 'ACTIVE SCHEDULE', 70, y + 7.0);

        // Facility
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(6.5);
        if (b.status === 'Cancelled') {
          doc.setTextColor(148, 163, 184);
        } else {
          doc.setTextColor(15, 118, 110);
        }
        const facilityStr = (b.facility || 'Pitch 1').replace('Premium Turf Arena (Pitch 1)', 'Arena Pitch 1').replace('Galaxy Futsal Court (Pitch 2)', 'Futsal Pitch 2').replace('VIP Turf Pitch (Pitch 3)', 'VIP Pitch 3');
        doc.text(facilityStr, 110, y + 4.8);

        // Pricing column values
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        if (b.status === 'Cancelled') {
          doc.setTextColor(148, 163, 184);
          doc.text(`BDT 0 (Cancelled)`, 150, y + 4.8);
          doc.text(`BDT 0`, 172, y + 4.8);
        } else {
          doc.setTextColor(15, 23, 42);
          doc.text(`BDT ${b.price.toLocaleString()}`, 150, y + 4.8);
          
          doc.setTextColor(15, 118, 110);
          doc.text(`BDT ${b.advance.toLocaleString()}`, 172, y + 4.8);

          // Render Due text on second line if there's any
          const remainingDue = b.price - b.advance;
          if (remainingDue > 0) {
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(5.5);
            doc.setTextColor(220, 38, 38); // red for due
            doc.text(`Due: BDT ${remainingDue.toLocaleString()}`, 150, y + 7.0);
          } else {
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(5.5);
            doc.setTextColor(16, 185, 129); // green for paid
            doc.text(`Fully Paid`, 150, y + 7.0);
          }
        }
        y += 8.2;
      });

      y += 10;

      // Section 3: Closing Reconciliation Checklists
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('III. DISPATCH & CASH AUDIT VERIFICATION', 15, y);
      y += 4;

      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.4);
      doc.line(15, y, 195, y);
      y += 5;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('1. Verify all active advance deposits against the merchant account log or cash drawer receipts.', 18, y + 4);
      doc.text('2. Match pitch rental activity against stadium light sensor triggers & supervisor manual rosters.', 18, y + 8);
      doc.text('3. Any match cancellation must be authorized with official signature and recorded in administrative vault.', 18, y + 12);
      y += 18;

      const pageHeight = doc.internal.pageSize.height || 297;
      
      // Signatures
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);
      
      // Left Sign
      doc.line(20, pageHeight - 34, 75, pageHeight - 34);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('PREPARED BY (DESK AGENT)', 20, pageHeight - 29);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text('Galaxy Turf Operations Desk', 20, pageHeight - 25);

      // Right Sign
      doc.line(135, pageHeight - 34, 190, pageHeight - 34);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('APPROVED BY (STADIUM ADMIN)', 135, pageHeight - 29);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text('Galaxy Sports Executive Management', 135, pageHeight - 25);

      // Foot Note
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, pageHeight - 16, 195, pageHeight - 16);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('DAILY OPERATIONS AUDIT STATEMENT  |  CONFIDENTIAL EXPORT', 15, pageHeight - 11);
      
      doc.setFont('Helvetica', 'normal');
      doc.text('Page 1 of 1', 180, pageHeight - 11);

      doc.save(`Galaxy_Turf_Daily_Statement_${targetDate}.pdf`);
      showToast(`Successfully generated and downloaded Daily operations PDF for ${targetDate}!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to compile or download Daily operations PDF.', 'error');
    }
  };

  const handleExport = () => {
    try {
      const headers = ['Date', 'Total Bookings', 'Income', 'Advance', 'Due', 'Status'];
      const rows = dailyReportData.map(r => [
        r.date,
        r.totalBookings,
        r.income,
        r.advance,
        r.due,
        r.status
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `daily_reports_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed', error);
    }
  };

  const handleExportBookingsCSV = () => {
    try {
      const headers = [
        'Booking ID',
        'Customer Name',
        'Customer Phone',
        'Team Name',
        'Date',
        'Time Slot',
        'Duration',
        'Pitch/Facility',
        'Total Price',
        'Advance Paid',
        'Due Amount',
        'Payment Deadline',
        'Status'
      ];

      const rows = bookings.map(b => {
        const dueAmount = b.price - b.advance;
        return [
          b.id,
          b.customerName,
          b.customerPhone,
          b.teamName || '',
          b.date,
          b.time,
          b.duration || '90 Min',
          b.facility || 'Pitch 1',
          b.price,
          b.advance,
          dueAmount,
          b.paymentDeadline || '',
          b.status
        ].map(val => {
          const stringVal = String(val ?? '');
          if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
          }
          return stringVal;
        });
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `bookings_database_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export Bookings CSV failed', error);
    }
  };

  const handleExportCustomersCSV = () => {
    try {
      const headers = [
        'Customer ID',
        'Name',
        'Phone',
        'Email',
        'Address',
        'Total Bookings',
        'Total Spent',
        'Last Booking Date',
        'Preferred Contact',
        'Notes',
        'Status'
      ];

      const rows = customers.map(c => {
        return [
          c.id,
          c.name,
          c.phone,
          c.email,
          c.address || '',
          c.totalBookings,
          c.totalSpent,
          c.lastBooking || '',
          c.preferredContactMethod || '',
          c.notes || '',
          c.status
        ].map(val => {
          const stringVal = String(val ?? '');
          if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
          }
          return stringVal;
        });
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `customers_directory_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export Customers CSV failed', error);
    }
  };

  // Generate peak time data from bookings
  const times = ['6am', '7am', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm', '12am', '1am'];
  const peakTimeData = times.map(t => {
    const timeBookings = bookings.filter(b => b.time.toLowerCase().includes(t));
    return {
      time: t,
      bookings: timeBookings.length
    };
  });

  // Generate dynamic report data from bookings
  const dailyReportData = Array.from(new Set(bookings.map(b => b.date)))
    .sort((a, b) => b.localeCompare(a))
    .map(date => {
      const dayBookings = bookings.filter(b => b.date === date);
      const income = dayBookings.reduce((sum, b) => sum + (b.status !== 'Cancelled' ? b.price : 0), 0);
      const advance = dayBookings.reduce((sum, b) => sum + b.advance, 0);
      return {
        date,
        totalBookings: dayBookings.length,
        income,
        advance,
        due: income - advance,
        status: "Completed",
        teams: dayBookings.map(b => b.teamName.toLowerCase())
      };
    })
    .filter(row => 
      searchTerm === '' || 
      row.date.includes(searchTerm) || 
      row.teams.some(t => t.includes(searchTerm.toLowerCase()))
    )
    .slice(0, 5);

  // Calculate advanced stats
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.status !== 'Cancelled' ? b.price : 0), 0);
  const avgValue = bookings.length > 0 ? Math.round(totalRevenue / bookings.length) : 0;
  const returningCount = customers.filter(c => c.totalBookings > 1).length;
  const cancelRate = bookings.length > 0 
    ? ((bookings.filter(b => b.status === 'Cancelled').length / bookings.length) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white uppercase tracking-tight">Advanced <span className="text-brand">Analytics</span></h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Deep insights into business performance</p>
        </div>
        <div className="flex gap-3">
             <div className={cn(
               "flex items-center bg-slate-800 rounded-xl px-3 transition-all",
               isSearchVisible ? "w-64" : "w-12"
             )}>
                <button 
                  onClick={() => setIsSearchVisible(!isSearchVisible)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                >
                   <Search className="w-5 h-5" />
                </button>
                <AnimatePresence>
                  {isSearchVisible && (
                    <motion.input
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 'auto', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      type="text"
                      placeholder="Search reports..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-transparent border-none text-xs text-white focus:outline-none ml-2 w-full"
                      autoFocus
                    />
                  )}
                </AnimatePresence>
             </div>
             <button 
               onClick={handleExportPDF}
               className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase text-xs hover:scale-105 transition-transform shadow-lg shadow-emerald-700/20"
             >
                <Download className="w-4 h-4" />
                <span>Download PDF Summary</span>
             </button>
             <button 
               onClick={handleExport}
               className="flex items-center gap-2 px-5 py-2.5 bg-brand text-black rounded-xl font-black uppercase text-xs hover:scale-105 transition-transform shadow-lg shadow-brand/20"
             >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
             </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
            { label: 'Total Revenue', value: `৳ ${totalRevenue.toLocaleString()}`, change: 'Live', icon: BarChart3, color: 'text-brand' },
            { label: 'Avg Booking Value', value: `৳ ${avgValue.toLocaleString()}`, change: 'Live', icon: TrendingUp, color: 'text-blue-400' },
            { label: 'Returning Customers', value: returningCount.toString(), change: 'Live', icon: Users, color: 'text-purple-400' },
            { label: 'Cancellation Rate', value: `${cancelRate}%`, change: 'Live', icon: Filter, color: 'text-red-400' },
        ].map((stat, idx) => (
            <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-all group"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-2 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition-colors", stat.color)}>
                        <stat.icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                        {stat.label === 'Total Revenue' && (
                            <button 
                                onClick={() => setShowDetailedIncome(true)}
                                className="text-[9px] font-black bg-brand/10 text-brand px-2 py-1 rounded-lg border border-brand/20 hover:bg-brand/20 transition-all uppercase tracking-widest"
                            >
                                View Detailed
                            </button>
                        )}
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {stat.change}
                        </span>
                    </div>
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-white">{stat.value}</p>
            </motion.div>
        ))}
      </div>

      {/* AI Demand & Optimal Pricing Predictor */}
      <DemandPredictor bookings={bookings} showToast={showToast} />

      {/* Data Export & Archiving Center */}
      <div className="bg-[#0f172a] border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-[50px] -mr-8 -mt-8 pointer-events-none group-hover:bg-brand/10 transition-all duration-300" />
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Download className="w-4 h-4 text-brand" />
              Unified Data Export & Archiving Console
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
              Export current turf spreadsheets and professional financial summary PDF reports
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full xl:w-auto mt-4 xl:mt-0 pb-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-3 px-6 py-4 bg-slate-900 border border-slate-850 hover:border-emerald-500/40 hover:bg-slate-800/45 rounded-2xl group transition-all text-left cursor-pointer"
            >
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider font-display">Printable PDF Review</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase font-sans">6-Month financial summary</p>
              </div>
            </button>
            <button
              onClick={() => handlePrintDailyPDF(new Date().toISOString().split('T')[0])}
              className="flex items-center gap-3 px-6 py-4 bg-slate-900 border border-slate-850 hover:border-brand/40 hover:bg-slate-800/45 rounded-2xl group transition-all text-left cursor-pointer"
              title="Print operations and matching report for today"
            >
              <div className="p-2.5 bg-brand/10 text-brand rounded-xl border border-brand/20 group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider font-display">Today's Daily PDF</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase font-sans">Active closing report</p>
              </div>
            </button>
            <button
              onClick={handleExportBookingsCSV}
              className="flex items-center gap-3 px-6 py-4 bg-slate-900 border border-slate-850 hover:border-brand/40 hover:bg-slate-800/45 rounded-2xl group transition-all text-left cursor-pointer"
            >
              <div className="p-2.5 bg-brand/10 text-brand rounded-xl border border-brand/20 group-hover:scale-110 transition-transform">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider font-display">Bookings CSV</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase font-sans">{bookings.length} database entries</p>
              </div>
            </button>
            <button
              onClick={handleExportCustomersCSV}
              className="flex items-center gap-3 px-6 py-4 bg-slate-900 border border-slate-850 hover:border-purple-400/40 hover:bg-slate-800/45 rounded-2xl group transition-all text-left cursor-pointer"
            >
              <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider font-display">Customers CSV</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase font-sans">{customers.length} ledger logs</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Daily Booking Report Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-800/10">
            <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand" />
                    Daily Booking Report
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Detailed breakdown of daily performance</p>
            </div>
            <button 
              onClick={() => setActiveView?.('bookings')}
              className="text-[10px] text-slate-400 font-black uppercase tracking-widest hover:text-brand transition-colors"
            >
                View All History
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-900">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Date</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total Bookings</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Income</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Advance</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Due</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {dailyReportData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                            <td className="px-8 py-5">
                                <span className="text-sm font-bold text-white">{row.date}</span>
                            </td>
                            <td className="px-8 py-5">
                                <span className="text-sm font-black text-brand flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                                    {row.totalBookings}
                                </span>
                            </td>
                            <td className="px-8 py-5 text-sm font-black text-white">৳ {row.income.toLocaleString()}</td>
                            <td className="px-8 py-5 text-sm font-bold text-blue-400">৳ {row.advance.toLocaleString()}</td>
                            <td className="px-8 py-5 text-sm font-bold text-red-400">৳ {row.due.toLocaleString()}</td>
                            <td className="px-8 py-5">
                                <span className="px-3 py-1 bg-brand/10 border border-brand/20 text-brand text-[9px] font-black uppercase tracking-widest rounded-full">
                                    {row.status}
                                </span>
                            </td>
                            <td className="px-8 py-5 text-right">
                                <button
                                  onClick={() => handlePrintDailyPDF(row.date)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 text-brand hover:border-brand/40 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all hover:scale-105"
                                  title="Download Daily Operations PDF Statement"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Daily PDF</span>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Slot Occupancy Heatmap Section */}
      <BookingHeatmap bookings={bookings} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Growth */}
        <div className="bg-[#0f172a] border border-slate-800 p-8 rounded-3xl">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                 <TrendingUp className="w-4 h-4 text-brand" />
                 Revenue Growth
               </h3>
               <select className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-[10px] text-slate-500 font-bold uppercase tracking-widest outline-none">
                  <option>Last 6 Months</option>
                  <option>Last Year</option>
               </select>
            </div>
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                        <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k`} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                        <Area type="monotone" dataKey="revenue" stroke="#4ade80" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Peak Booking Times */}
        <div className="bg-[#0f172a] border border-slate-800 p-8 rounded-3xl">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-blue-400" />
                 Peak Booking Times
               </h3>
            </div>
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakTimeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                        <Bar dataKey="bookings" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      <AnimatePresence>
        {showDetailedIncome && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailedIncome(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0f172a] border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-800/10">
                <div>
                  <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">Income <span className="text-brand">Breakdown</span></h3>
                  <div className="flex items-center gap-2 mt-2">
                    <button 
                      onClick={() => setIncomeViewType('daily')}
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all",
                        incomeViewType === 'daily' ? "bg-brand text-black" : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      Daily
                    </button>
                    <button 
                      onClick={() => setIncomeViewType('monthly')}
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all",
                        incomeViewType === 'monthly' ? "bg-brand text-black" : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      Monthly
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => setShowDetailedIncome(false)}
                  className="p-3 bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-0 max-h-[60vh] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-950 z-10">
                    <tr className="bg-slate-900 border-b border-slate-800">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{incomeViewType === 'daily' ? 'Date' : 'Month'}</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Bookings</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Income</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Advance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(incomeViewType === 'daily' ? allDailyIncome : allMonthlyIncome).map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-8 py-5">
                          <span className="text-sm font-bold text-white">{incomeViewType === 'daily' ? row.date : row.month}</span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm font-black text-brand">{row.bookings}</span>
                        </td>
                        <td className="px-8 py-5 text-sm font-black text-white italic">৳ {row.income.toLocaleString()}</td>
                        <td className="px-8 py-5 text-sm font-bold text-blue-400">৳ {row.advance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-8 border-t border-slate-800 bg-slate-800/10 flex justify-between items-center font-black text-xs uppercase tracking-widest">
                 <span className="text-slate-500">End of Records</span>
                 <button 
                  onClick={() => setShowDetailedIncome(false)}
                  className="px-6 py-3 bg-brand text-black rounded-xl hover:scale-105 transition-transform"
                 >
                   Close View
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
