import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Search, 
  Plus, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  X, 
  Users, 
  BookOpen,
  Printer,
  Share2,
  Banknote,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageCircle,
  Settings,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Booking, Customer, FACILITIES } from '../types';
import { areSlotsOverlapping } from '../lib/timeUtils';
import { ToastType } from './ui/Toast';
import { jsPDF } from 'jspdf';

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

// Constants and Types moved to props
interface BookingsProps {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  showToast: (message: string, type: ToastType) => void;
  setActiveView?: (view: string) => void;
}

const HOLIDAYS = [
  '2026-02-12', // Language Day (corrected date usually Feb 21 but following what I did in CalendarView)
  '2026-02-21', // Language Day
  '2026-03-26', // Independence Day
  '2026-12-16', // Victory Day
  '2026-05-01', // May Day
];

// Function to check if a date is a holiday (BD weekends: Friday)
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

export function Bookings({ bookings, setBookings, customers, setCustomers, showToast, setActiveView }: BookingsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState(new Date().toISOString().split('T')[0]);
  const [availabilityFacility, setAvailabilityFacility] = useState<string>(FACILITIES[0]);
  const [isHoliday, setIsHoliday] = useState(checkIfHoliday(availabilityDate));
  const [isFormHoliday, setIsFormHoliday] = useState(false);
  const [showAvailability, setShowAvailability] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Booking | null>(null);
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isConfirmingSave, setIsConfirmingSave] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [isCustomSlot, setIsCustomSlot] = useState(false);
  const [formData, setFormData] = useState<Partial<Booking>>({
    time: '03:00 - 04:30 PM',
    advance: 0,
    price: 0,
    customerName: '',
    customerPhone: '',
    paymentDeadline: '',
    facility: FACILITIES[0],
  });

  const getPriceForSlot = (time: string, holiday: boolean) => {
    const slot = timeSlots.find(s => s.time === time);
    return holiday ? (slot?.holidayPrice || 0) : (slot?.regularPrice || 0);
  };

  // Update holiday status when availability date changes
  useEffect(() => {
    setIsHoliday(checkIfHoliday(availabilityDate));
  }, [availabilityDate]);

  // Update holiday status when form date changes (and update price)
  useEffect(() => {
    if (formData.date) {
      setIsFormHoliday(checkIfHoliday(formData.date));
    }
  }, [formData.date]);

  // Update price when time/holiday changes in real-time
  useEffect(() => {
    if (!isCustomSlot) {
      const calculatedPrice = getPriceForSlot(formData.time || '03:00 - 04:30 PM', isFormHoliday);
      setFormData(prev => ({ ...prev, price: calculatedPrice }));
    }
  }, [formData.time, isFormHoliday, isCustomSlot]);

  const isSlotBooked = (date: string, time: string, facility?: string, currentBookingId?: string) => {
    const targetFacility = facility || availabilityFacility || FACILITIES[0];
    return bookings.some(b => 
      b.date === date && 
      (b.facility || FACILITIES[0]) === targetFacility && 
      b.status !== 'Cancelled' && 
      b.id !== currentBookingId && 
      areSlotsOverlapping(b.time, time)
    );
  };

  const handleWhatsApp = (booking: Booking) => {
    try {
      const phone = booking.customerPhone || '-';
      
      if (!phone || phone === '-') {
        showToast('Valid phone number not found for remainder', 'error');
        return;
      }

      // Safe Extraction of Weekday name
      let weekdayName = '';
      if (booking.date) {
        try {
          const parts = booking.date.split('-');
          if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const date = new Date(year, month, day);
            weekdayName = date.toLocaleDateString('en-US', { weekday: 'long' });
          } else {
            const date = new Date(booking.date);
            if (!isNaN(date.getTime())) {
              weekdayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            }
          }
        } catch {
          // ignore
        }
      }
      
      const dateDisplay = weekdayName ? `${booking.date} (${weekdayName})` : booking.date;

      const message = `*GALAXY SPORTS REMINDER* 🏟️\n\nHello *${booking.customerName}*,\n\nThis is a friendly reminder for your upcoming booking:\n\n⚽ *Team:* ${booking.teamName}\n📅 *Date:* ${dateDisplay}\n⏰ *Time:* ${booking.time}\n💰 *Total Price:* ৳${booking.price.toLocaleString()}\n💳 *Advance Paid:* ৳${booking.advance.toLocaleString()}\n🔴 *Due Amount:* ৳${(booking.price - booking.advance).toLocaleString()}\n\n🏟️ *Venue:* Galaxy Sports Narayanganj\n📍 *Location:* Bowbazar Shantinagar 22polot\n📞 *Turf Contact:* 01531-557184\n⏳ *Duration:* 90 Minutes\n\nPlease arrive 10 minutes before your slot. See you on the field!\n\n_Thank you for choosing Galaxy Sports!_`;
      
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      // Ensure BD country code if not present (assuming BD numbers as per user's locale/context)
      const finalPhone = cleanPhone.length === 11 && cleanPhone.startsWith('01') ? `88${cleanPhone}` : cleanPhone;
      
      const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      showToast('WhatsApp reminder generated!', 'info');
    } catch (error) {
      showToast('Failed to open WhatsApp', 'error');
    }
  };

  const filteredBookings = bookings.filter(b => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = b.teamName.toLowerCase().includes(searchLower) || 
                         b.customerName.toLowerCase().includes(searchLower) ||
                         b.customerPhone.toLowerCase().includes(searchLower);
    const matchesStatus = filterStatus === 'All' || b.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedDate = formData.date || new Date().toISOString().split('T')[0];
    const selectedTime = formData.time || '03:00 - 04:30 PM';
    const selectedFacility = formData.facility || FACILITIES[0];
    
    const targetFacility = selectedFacility || availabilityFacility || FACILITIES[0];
    const conflictingBooking = bookings.find(b => 
      b.date === selectedDate && 
      (b.facility || FACILITIES[0]) === targetFacility && 
      b.status !== 'Cancelled' && 
      b.id !== editingBooking?.id && 
      areSlotsOverlapping(b.time, selectedTime)
    );

    if (conflictingBooking) {
      showToast(`Conflict Detected: Time slot overlaps with "${conflictingBooking.teamName}" (${conflictingBooking.time}) on the same pitch (${selectedFacility})!`, 'error');
      return;
    }

    const price = Number(formData.price) || 0;
    const advance = Number(formData.advance) || 0;
    
    if (advance > price) {
      showToast('Advance payment cannot exceed total price', 'error');
      return;
    }

    setIsConfirmingSave(true);
  };

  const handleAddEdit = () => {
    try {
      const selectedDate = formData.date || new Date().toISOString().split('T')[0];
      const selectedTime = formData.time || '03:00 - 04:30 PM';
      const selectedFacility = formData.facility || FACILITIES[0];

      const targetFacility = selectedFacility || availabilityFacility || FACILITIES[0];
      const conflictingBooking = bookings.find(b => 
        b.date === selectedDate && 
        (b.facility || FACILITIES[0]) === targetFacility && 
        b.status !== 'Cancelled' && 
        b.id !== editingBooking?.id && 
        areSlotsOverlapping(b.time, selectedTime)
      );

      if (conflictingBooking) {
        showToast(`Conflict Detected: Time slot overlaps with "${conflictingBooking.teamName}" (${conflictingBooking.time}) on the same pitch (${selectedFacility})!`, 'error');
        setIsConfirmingSave(false);
        return;
      }

      const price = Number(formData.price) || 0;
      const advance = Number(formData.advance) || 0;

      let customerName = formData.customerName || '';
      let customerPhone = formData.customerPhone || '';
      let customerId = formData.customerId || '';

      if (!isManualEntry && formData.customerId) {
        const customer = customers.find(c => c.id === formData.customerId);
        customerName = customer?.name || 'Unknown';
        customerPhone = customer?.phone || '-';
      } else if (isManualEntry && formData.customerName && formData.customerPhone) {
        // Check if this manual customer already exists by phone
        const existingCustomer = customers.find(c => c.phone === formData.customerPhone);
        if (!existingCustomer) {
          const newCustomerId = Math.random().toString(36).substr(2, 9);
          const newCustomer: Customer = {
            id: newCustomerId,
            name: formData.customerName,
            phone: formData.customerPhone,
            email: '',
            totalBookings: 1,
            totalSpent: price,
            lastBooking: selectedDate,
            status: 'Active'
          };
          setCustomers(prev => [...prev, newCustomer]);
          customerId = newCustomerId;
          showToast('New customer record created from booking', 'success');
        } else {
          customerId = existingCustomer.id;
        }
      }

      if (editingBooking) {
        setBookings(bookings.map(b => b.id === editingBooking.id ? { 
          ...b, 
          ...formData, 
          customerId,
          customerName,
          customerPhone,
          price,
          advance,
          paymentDeadline: formData.paymentDeadline,
          facility: selectedFacility
        } as Booking : b));
        showToast('Booking updated successfully', 'success');
      } else {
        const newBooking: Booking = {
          id: Math.random().toString(36).substr(2, 9),
          customerId,
          customerName,
          customerPhone,
          teamName: formData.teamName || '',
          date: selectedDate,
          time: selectedTime,
          duration: '90 Mins',
          price,
          advance,
          paymentDeadline: formData.paymentDeadline || '',
          status: (formData.status as any) || 'Confirmed',
          facility: selectedFacility,
        };
        setBookings([newBooking, ...bookings]);
        showToast('New booking created', 'success');
        
        // Automated prompt to send WhatsApp
        setTimeout(() => {
          if (window.confirm(`Booking confirmed for ${newBooking.teamName}. Send WhatsApp reminder now?`)) {
            handleWhatsApp(newBooking);
          }
        }, 500);
      }
      closeModal();
    } catch (error) {
      showToast('An unexpected error occurred while saving booking', 'error');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsConfirmingSave(false);
    setEditingBooking(null);
    setIsManualEntry(false);
    setIsCustomSlot(false);
    setFormData({ 
      time: '03:00 - 04:30 PM', 
      advance: 0,
      customerName: '',
      customerPhone: '',
      paymentDeadline: '',
    });
  };

  const openModal = (booking?: Booking) => {
    if (booking) {
      setEditingBooking(booking);
      setFormData(booking);
      setIsManualEntry(!booking.customerId);
      const isStandardSlot = timeSlots.some(s => s.time === booking.time);
      setIsCustomSlot(!isStandardSlot);
      setIsFormHoliday(checkIfHoliday(booking.date || ''));
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      const isTodayHoliday = checkIfHoliday(todayStr);
      setIsFormHoliday(isTodayHoliday);
      setEditingBooking(null);
      setIsManualEntry(false);
      setIsCustomSlot(false);
      setFormData({ 
        date: todayStr,
        time: '03:00 - 04:30 PM',
        duration: '90 Mins',
        status: 'Confirmed',
        advance: 0,
        price: getPriceForSlot('03:00 - 04:30 PM', isTodayHoliday),
        customerName: '',
        customerPhone: '',
        paymentDeadline: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleStatusChange = (id: string, newStatus: 'Confirmed' | 'Completed' | 'Cancelled') => {
    try {
      setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b));
      showToast(`Booking marked as ${newStatus}`, 'success');
    } catch (error) {
      showToast('Failed to update booking status', 'error');
    }
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setBookingToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    try {
      if (bookingToDelete) {
        setBookings(bookings.filter(b => b.id !== bookingToDelete));
        setBookingToDelete(null);
        setIsDeleteModalOpen(false);
        showToast('Booking deleted successfully', 'success');
      }
    } catch (error) {
      showToast('Failed to delete booking', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintAllReceipts = () => {
    try {
      const activeBookings = filteredBookings.filter(b => b.status !== 'Cancelled');
      if (activeBookings.length === 0) {
        showToast('No active bookings in the current list to generate receipts.', 'warning');
        return;
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      activeBookings.forEach((b, index) => {
        if (index > 0) {
          doc.addPage();
        }

        // Color scheme
        const primaryColor = [15, 23, 42]; // Slate-900 (#0f172a)
        const accentColor = [16, 185, 129]; // Brand Green (#10b981)
        const darkColor = [30, 41, 59]; // Slate-800
        const greyColor = [100, 116, 139]; // Slate-500
        const lightBg = [248, 250, 252]; // Slate-50
        const borderLine = [226, 232, 240]; // Slate-200

        // Decorative background elements
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 210, 297, 'F');

        // Main receipt card border
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.rect(12, 12, 186, 273);

        // Header Background
        doc.setFillColor(15, 23, 42); // slate-900 background banner
        doc.rect(12.25, 12.25, 185.5, 34, 'F');

        // Brand Typography
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(22);
        doc.text('GALAXY SPORTS', 20, 26);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(16, 185, 129); // Brand Accent Green
        doc.text('Narayanganj  •  Premium Football & Futsal Turf Arena', 20, 32);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(30, 41, 59);
        doc.rect(130, 22, 58, 10, 'F');
        doc.setTextColor(16, 185, 129);
        doc.text('OFFICIAL RECEIPT', 134, 28);

        // Main table separator
        let y = 60;

        // Details Grid (Two columns)
        doc.setTextColor(100, 116, 139);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('RECEIPT ID', 20, y);
        doc.text('BOOKING DATE', 115, y);
        y += 4.5;

        doc.setTextColor(15, 23, 42);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text(`#GS-${b.id.toUpperCase()}`, 20, y);
        doc.setFont('Helvetica', 'normal');
        doc.text(b.date, 115, y);
        y += 12;

        doc.setTextColor(100, 116, 139);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('CUSTOMER / PLAYER', 20, y);
        doc.text('TEAM NAME', 115, y);
        y += 4.5;

        doc.setTextColor(15, 23, 42);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(b.customerName, 20, y);
        doc.text(b.teamName.toUpperCase(), 115, y);
        y += 4.5;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Phone: ${b.customerPhone}`, 20, y);
        y += 15;

        // Slot Box
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.rect(20, y, 170, 18, 'FD');

        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(1.2);
        doc.line(20, y, 20, y + 18);

        doc.setTextColor(100, 116, 139);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7);
        doc.text('SELECTED DETAILS (90 MINS PLAYTIME)', 24, y + 5);

        doc.setTextColor(15, 23, 42);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text(`${b.time}   •   ${b.facility || 'Premium Turf Arena (Pitch 1)'}`, 24, y + 12);
        y += 28;

        // Financials Grid
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.5);
        doc.line(20, y, 190, y);
        y += 7;

        doc.setTextColor(100, 116, 139);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('BASE BOOKING FEE', 20, y);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(10);
        doc.text(`BDT ${b.price.toLocaleString()}`, 145, y);
        y += 8;

        doc.setTextColor(100, 116, 139);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('ADVANCE PRE-PAYMENT', 20, y);
        doc.setTextColor(59, 130, 246); // bold blue
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`- BDT ${b.advance.toLocaleString()}`, 140, y);
        y += 5;

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(20, y, 190, y);
        y += 8;

        doc.setTextColor(15, 23, 42);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('GRAND TOTAL VENUE DUE', 20, y);
        
        doc.setFontSize(16);
        doc.text(`BDT ${(b.price - b.advance).toLocaleString()}`, 140, y);
        y += 4;
        doc.setFontSize(6.5);
        doc.setTextColor(220, 38, 38);
        doc.text('* Payable at slot entry counter', 140, y);
        y += 20;

        // Terms and guidelines
        doc.setFillColor(248, 250, 252);
        doc.rect(20, y, 170, 24, 'F');
        
        doc.setTextColor(100, 116, 139);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text('RULES & POLICY:', 24, y + 5);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.text('1. Metal cleats/studded boots are strictly prohibited on artificial turf.', 24, y + 9);
        doc.text('2. Match slots are strictly restricted to 90 minutes. Teams must clear the sideline before the next slot starts.', 24, y + 13);
        doc.text('3. Respect arena managers and other players. Misconduct results in severe blacklists across partner leagues.', 24, y + 17);
        y += 38;

        // Signatures block
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.3);
        doc.line(24, y + 10, 80, y + 10);
        doc.line(130, y + 10, 186, y + 10);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text('RECEIVER SIGNATURE', 24, y + 14);
        doc.text('TEAM REPRESENTATIVE', 130, y + 14);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(5);
        doc.text('Galaxy Sports Arena Desk Agent', 24, y + 17);
        doc.text('Player/Captain signature', 130, y + 17);

        // Footer block
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text('THANK YOU FOR PLAYING AT GALAXY SPORTS ARENA! | WhatsApp: 01531-557184', 20, 273);
        
        doc.setFont('Helvetica', 'normal');
        doc.text(`Receipt page ${index + 1} of ${activeBookings.length}`, 160, 273);
      });

      doc.save(`Galaxy_Sports_Batch_Receipts_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast(`Successfully exported ${activeBookings.length} booking receipts to PDF!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to compile or download bookings receipts PDF.', 'error');
    }
  };

  const openReceipt = (booking: Booking) => {
    setSelectedReceipt(booking);
    setIsReceiptModalOpen(true);
  };

  const handlePayDue = (booking: Booking) => {
    setPayingBooking(booking);
    setPaymentAmount((booking.price - booking.advance).toString());
    setIsPaymentModalOpen(true);
  };

  const confirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBooking) return;

    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    const maxAllowed = payingBooking.price - payingBooking.advance;
    if (amount > maxAllowed) {
      showToast(`Payment cannot exceed the remaining due (৳${maxAllowed.toLocaleString()})`, 'error');
      return;
    }

    const updatedBookings = bookings.map(b => 
      b.id === payingBooking.id ? { ...b, advance: b.advance + amount } : b
    );
    setBookings(updatedBookings);
    showToast(`Payment of ৳${amount.toLocaleString()} recorded for ${payingBooking.teamName}`, 'success');
    setIsPaymentModalOpen(false);
    setPayingBooking(null);
    setPaymentAmount('');
  };

  const handleBookAgain = (booking: Booking) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isTodayHoliday = checkIfHoliday(todayStr);
    setIsFormHoliday(isTodayHoliday);
    setFormData({
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      teamName: booking.teamName,
      date: todayStr,
      time: '03:00 - 04:30 PM',
      price: getPriceForSlot('03:00 - 04:30 PM', isTodayHoliday),
      advance: 0,
      status: 'Waitlist'
    });
    setEditingBooking(null);
    setIsModalOpen(true);
    setIsReceiptModalOpen(false);
  };

  const handleShareLink = (booking: Booking) => {
    try {
      const shareData = {
        team: booking.teamName,
        date: booking.date,
        time: booking.time,
        price: booking.price,
        paid: booking.advance,
        due: booking.price - booking.advance,
        status: booking.status
      };
      
      const summary = `⚽ *Galaxy Sports Booking*\n\nTeam: ${shareData.team}\nDate: ${shareData.date}\nTime: ${shareData.time}\nStatus: ${shareData.status}\nTotal: ৳${shareData.price}\nPaid: ৳${shareData.paid}\nDue: ৳${shareData.due}\n\nVenue: Narayanganj. See you on the field!`;
      
      navigator.clipboard.writeText(summary);
      showToast('Booking summary copied to clipboard!', 'success');
    } catch (error) {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white uppercase tracking-tight">Galaxy <span className="text-brand">Booking</span></h2>
          <p className="text-xs text-slate-500 font-medium mt-1">90 Minutes per slot • Dynamic Day/Holiday pricing</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => {
              const element = document.getElementById('bookings-list');
              element?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-700 transition-all border border-slate-700"
          >
            <Filter className="w-5 h-5 text-brand" />
            <span>Booking List</span>
          </button>
          <button 
            onClick={handlePrintAllReceipts}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 transition-all border border-emerald-500 hover:scale-105 shadow-md"
            title="Generate & print physical-style receipts for current filtered bookings"
          >
            <Printer className="w-5 h-5" />
            <span>All Receipts PDF</span>
          </button>
          <button 
            onClick={() => openModal()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-brand text-black font-bold rounded-2xl hover:scale-105 transition-transform shadow-lg shadow-brand/20"
          >
            <Plus className="w-5 h-5" />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* Status Filter Row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 bg-[#0f172a] p-1.5 border border-slate-800 rounded-2xl overflow-x-auto no-scrollbar">
          {['All', 'Confirmed', 'Completed', 'Cancelled', 'Waitlist'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                filterStatus === status 
                  ? "bg-brand text-black shadow-lg shadow-brand/10" 
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
              )}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="hidden sm:block h-6 w-px bg-slate-800 mx-2" />
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          Filter by Status
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-brand transition-colors" />
          <input 
            type="text"
            placeholder="Search team, name, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand/40 transition-all"
          />
        </div>
        <div className="flex gap-2 bg-[#0f172a] p-1.5 border border-slate-800 rounded-2xl">
          <button
            onClick={() => setIsHoliday(false)}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              !isHoliday ? "bg-brand text-black" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Regular Day
          </button>
          <button
            onClick={() => setIsHoliday(true)}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              isHoliday ? "bg-red-500 text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Holiday/Weekend
          </button>
        </div>
      </div>

      {/* Availability Checker Section */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-[2.5rem] overflow-hidden">
        <button 
          onClick={() => setShowAvailability(!showAvailability)}
          className="w-full px-8 py-5 flex items-center justify-between hover:bg-slate-800/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand/10 border border-brand/20 text-brand">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-black uppercase tracking-tight text-sm">Check Slot Availability</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Real-time status for {availabilityDate}</p>
            </div>
          </div>
          <div className={cn(
            "p-2 rounded-xl bg-slate-800/50 text-slate-400 transition-transform duration-300",
            showAvailability && "rotate-180"
          )}>
            <ChevronLeft className="rotate-[-90deg] w-4 h-4" />
          </div>
        </button>

        <AnimatePresence>
          {showAvailability && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-8 pb-8"
            >
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-8 pt-4">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <select
                    value={availabilityFacility}
                    onChange={(e) => setAvailabilityFacility(e.target.value)}
                    className="bg-slate-800/40 border border-slate-700/50 rounded-xl py-3 px-4 text-white text-xs font-bold focus:border-brand/40 outline-none cursor-pointer appearance-none"
                  >
                    {FACILITIES.map(f => (
                      <option key={f} value={f} className="bg-slate-900">{f}</option>
                    ))}
                  </select>
                  <div className="relative flex-1 sm:flex-none">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="date"
                      value={availabilityDate}
                      onChange={(e) => setAvailabilityDate(e.target.value)}
                      className="w-full sm:w-auto bg-slate-800/40 border border-slate-700/50 rounded-xl py-3 pl-11 pr-4 text-white text-xs font-bold focus:border-brand/40 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => setAvailabilityDate(new Date().toISOString().split('T')[0])}
                    className="px-4 py-3 bg-slate-800 text-brand text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-700 hover:bg-slate-700/50 transition-colors"
                  >
                    Today
                  </button>
                </div>
                
                <div className="flex bg-slate-800/40 p-1 rounded-xl border border-slate-700/50 w-full sm:w-auto">
                  <button
                    onClick={() => setIsHoliday(false)}
                    className={cn(
                      "flex-1 sm:flex-none px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      !isHoliday ? "bg-brand text-black" : "text-slate-500"
                    )}
                  >
                    Reg Price
                  </button>
                  <button
                    onClick={() => setIsHoliday(true)}
                    className={cn(
                      "flex-1 sm:flex-none px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      isHoliday ? "bg-red-500 text-white" : "text-slate-500"
                    )}
                  >
                    Hol Price
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {timeSlots.map((slot) => {
                  const isBooked = isSlotBooked(availabilityDate, slot.time);
                  const price = isHoliday ? slot.holidayPrice : slot.regularPrice;
                  
                  return (
                    <div 
                      key={slot.time}
                      className={cn(
                        "p-4 rounded-2xl border transition-all flex flex-col gap-2 relative overflow-hidden group",
                        isBooked 
                          ? "bg-red-500/[0.02] border-red-500/20 opacity-60" 
                          : "bg-emerald-500/[0.02] border-emerald-500/20 hover:border-brand hover:shadow-[0_0_20px_rgba(74,222,128,0.1)] hover:bg-brand/[0.04] cursor-default"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                          isBooked ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                        )}>
                          {isBooked ? 'Booked' : 'Available'}
                        </span>
                        {!isBooked && (
                           <div className="flex flex-col items-end gap-0.5">
                             <div className="flex items-center gap-1.5">
                               <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">Reg:</span>
                               <span className="text-white text-[10px] font-black">৳{slot.regularPrice}</span>
                             </div>
                             <div className="flex items-center gap-1.5">
                               <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">Hol:</span>
                               <span className="text-red-400 text-[10px] font-black">৳{slot.holidayPrice}</span>
                             </div>
                             <button 
                               onClick={() => {
                                 setFormData(prev => ({ 
                                   ...prev, 
                                   date: availabilityDate, 
                                   time: slot.time,
                                   price: isHoliday ? slot.holidayPrice : slot.regularPrice 
                                 }));
                                 setIsModalOpen(true);
                               }}
                               className="text-brand hover:text-white bg-brand/10 hover:bg-brand p-1 rounded-lg transition-all mt-1"
                             >
                                <Plus className="w-3 h-3" />
                             </button>
                           </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className={cn("w-3.5 h-3.5", isBooked ? "text-slate-600" : "text-brand")} />
                        <span className={cn(
                          "text-xs font-black tracking-tight",
                          isBooked ? "text-slate-500 line-through" : "text-white"
                        )}>
                          {slot.time}
                        </span>
                      </div>

                      {isBooked && (
                        <div className="absolute top-1 right-1">
                          <XCircle className="w-4 h-4 text-red-500/30" />
                        </div>
                      )}
                      {!isBooked && (
                         <div className="absolute -right-4 -bottom-4 opacity-0 group-hover:opacity-10 transition-opacity">
                            <CheckCircle2 className="w-12 h-12 text-brand" />
                         </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bookings List Section Header */}
      <div className="flex items-center justify-between pt-4 pb-2 border-b border-slate-800/50">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-brand" />
          Recent Booking Records
        </h3>
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
          Showing {filteredBookings.length} Bookings
        </p>
      </div>

      {/* Bookings List */}
      <div id="bookings-list" className="grid grid-cols-1 gap-4">
        {filteredBookings.map((booking) => (
          <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={booking.id}
            className="bg-[#0f172a] border border-slate-800 p-5 rounded-3xl flex flex-col md:flex-row md:items-center gap-6 group hover:border-brand/30 transition-all"
          >
            {/* Time Slot */}
            <div className="flex flex-col items-center justify-center bg-slate-800/40 rounded-2xl px-4 py-4 border border-slate-700/50 min-w-[180px]">
              <span className="text-brand font-black text-sm tracking-tight text-center">{booking.time}</span>
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">90 MIN SLOT</span>
            </div>

            {/* Main Info */}
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 rounded bg-brand/10">
                    <Users className="w-3.5 h-3.5 text-brand" />
                  </div>
                  <h4 className="font-black text-white group-hover:text-brand transition-colors uppercase tracking-tight text-lg">{booking.teamName}</h4>
                </div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Player: <span className="text-slate-300">{booking.customerName}</span> <span className="text-slate-600 mx-2">|</span> <span className="text-brand/80">{booking.customerPhone}</span></p>
              </div>

              <div className="hidden sm:block h-10 w-px bg-slate-800" />

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <CalendarIcon className="w-3.5 h-3.5 opacity-50" />
                  <span>{booking.date}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <Clock className="w-3.5 h-3.5 opacity-50" />
                  <span className="uppercase tracking-widest text-[10px] text-brand/95 font-black">{booking.facility || 'Premium Turf Arena (Pitch 1)'}</span>
                </div>
              </div>

              <div className="hidden sm:block h-10 w-px bg-slate-800" />

                <div className="flex flex-col sm:flex-row gap-6">
                  <div>
                    <p className="text-[10px] text-brand uppercase font-black tracking-[0.3em] mb-1 leading-none">Total Fee</p>
                    <p className="text-white font-black text-2xl leading-none">৳ {booking.price.toLocaleString()}</p>
                  </div>
                  <div className="hidden sm:block h-10 w-px bg-slate-800" />
                  <div>
                    <p className="text-[10px] text-blue-400 uppercase font-black tracking-[0.3em] mb-1 leading-none">Advance</p>
                    <p className="text-white/80 font-black text-lg leading-none">৳ {booking.advance.toLocaleString()}</p>
                  </div>
                  <div className="hidden sm:block h-10 w-px bg-slate-800" />
                  <div>
                    <p className="text-[10px] text-red-400 uppercase font-black tracking-[0.3em] mb-1 leading-none">Due</p>
                    <p className="text-white/80 font-black text-lg leading-none">৳ {(booking.price - booking.advance).toLocaleString()}</p>
                  </div>
                  <div className="hidden sm:block h-10 w-px bg-slate-800" />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mb-1 leading-none">Payment</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        booking.advance >= booking.price ? "bg-emerald-500" :
                        booking.advance > 0 ? "bg-amber-500" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                      )} />
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        booking.advance >= booking.price ? "text-emerald-400" :
                        booking.advance > 0 ? "text-amber-400" : "text-red-400"
                      )}>
                        {booking.advance >= booking.price ? 'Paid' : booking.advance > 0 ? 'Partial' : 'Due'}
                      </span>
                    </div>
                  </div>
                  {booking.paymentDeadline && (
                    <>
                      <div className="hidden sm:block h-10 w-px bg-slate-800" />
                      <div>
                        <p className="text-[10px] text-purple-400 uppercase font-black tracking-[0.3em] mb-1 leading-none">Deadline</p>
                        <p className="text-white/80 font-black text-xs leading-none mt-1">{booking.paymentDeadline}</p>
                      </div>
                    </>
                  )}
                </div>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-none pt-4 md:pt-0">
              <span className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                booking.status === 'Confirmed' ? "bg-brand/10 border-brand/20 text-brand" :
                booking.status === 'Completed' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                "bg-red-500/10 border-red-500/20 text-red-400"
              )}>
                {booking.status}
              </span>
              <div className="flex items-center gap-1">
                {booking.status === 'Confirmed' && (
                  <>
                    <button 
                      onClick={() => handleStatusChange(booking.id, 'Completed')}
                      className="p-2.5 text-emerald-400 hover:bg-emerald-400/10 rounded-xl transition-all"
                      title="Mark as Completed"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleStatusChange(booking.id, 'Cancelled')}
                      className="p-2.5 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                      title="Cancel Booking"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-slate-800 mx-1" />
                  </>
                )}
                {booking.price - booking.advance > 0 && booking.status !== 'Cancelled' && (
                  <button 
                    onClick={() => handlePayDue(booking)}
                    className="p-2.5 text-brand hover:bg-brand/10 rounded-xl transition-all"
                    title="Clear Due Amount"
                  >
                    <Banknote className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => handleBookAgain(booking)}
                  className="p-2.5 text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all"
                  title="Book Again for this Customer"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleShareLink(booking)}
                  className="p-2.5 text-slate-500 hover:text-brand hover:bg-brand/5 rounded-xl transition-all"
                  title="Copy Shareable Summary"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => openReceipt(booking)}
                  className="p-2.5 text-slate-500 hover:text-brand hover:bg-brand/5 rounded-xl transition-all"
                  title="View Receipt"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleWhatsApp(booking)}
                  className="p-2.5 text-slate-500 hover:text-[#25D366] hover:bg-[#25D366]/5 rounded-xl transition-all"
                  title="Send WhatsApp Reminder"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => openModal(booking)}
                  className="p-2.5 text-slate-500 hover:text-brand hover:bg-brand/5 rounded-xl transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(booking.id)}
                  className="p-2.5 text-slate-500 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredBookings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-[#0f172a] border border-dashed border-slate-800 rounded-3xl">
          <AlertCircle className="w-12 h-12 text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-white">No bookings found</h3>
          <p className="text-slate-500">Try adjusting your filters</p>
        </div>
      )}

      {/* Booking Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-[#0f172a] border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-800/60 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                    {editingBooking ? 'Modify' : 'New'} <span className="text-brand">Booking</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">Select slot and confirm details</p>
                </div>
                <button onClick={closeModal} className="p-3 text-slate-500 hover:text-white bg-slate-800/50 rounded-2xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleFormSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                
                {/* Manual vs Existing Toggle */}
                {!editingBooking && (
                  <div className="flex bg-slate-800/40 p-1 rounded-2xl border border-slate-700/50">
                    <button
                      type="button"
                      onClick={() => setIsManualEntry(false)}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                        !isManualEntry ? "bg-brand text-black" : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      Select Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsManualEntry(true)}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                        isManualEntry ? "bg-brand text-black" : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      Manual Entry
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {isManualEntry ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Customer Name</label>
                        <input 
                          required
                          type="text"
                          placeholder="Player name"
                          value={formData.customerName || ''}
                          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                          className="w-full bg-slate-800/20 border border-slate-700/50 rounded-2xl px-4 py-4 text-white focus:border-brand/60 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Customer Phone</label>
                        <input 
                          required
                          type="tel"
                          placeholder="Phone number"
                          value={formData.customerPhone || ''}
                          onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                          className="w-full bg-slate-800/20 border border-slate-700/50 rounded-2xl px-4 py-4 text-white focus:border-brand/60 outline-none"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Select Customer</label>
                      <select
                        required
                        value={formData.customerId || ''}
                        onChange={(e) => {
                          const customerId = e.target.value;
                          const selectedCustomer = customers.find(c => c.id === customerId);
                          setFormData({ 
                            ...formData, 
                            customerId,
                            customerName: selectedCustomer ? selectedCustomer.name : '',
                            customerPhone: selectedCustomer ? selectedCustomer.phone : ''
                          });
                        }}
                        className="w-full bg-slate-800/20 border border-slate-700/50 rounded-2xl px-4 py-4 text-white focus:border-brand/60 outline-none appearance-none"
                      >
                        <option value="" className="bg-slate-900">Choose a customer...</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id} className="bg-slate-900">{c.name} ({c.phone})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Team Name</label>
                    <input 
                      required
                      type="text"
                      placeholder="e.g. Thunder FC"
                      value={formData.teamName || ''}
                      onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                      className="w-full bg-slate-800/20 border border-slate-700/50 rounded-2xl px-4 py-4 text-white focus:border-brand/60 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Select Facility</label>
                    <select
                      value={formData.facility || FACILITIES[0]}
                      onChange={(e) => setFormData({ ...formData, facility: e.target.value })}
                      className="w-full bg-slate-800/20 border border-slate-700/50 rounded-2xl px-4 py-4 text-white focus:border-brand/60 outline-none appearance-none cursor-pointer"
                    >
                      {FACILITIES.map(f => (
                        <option key={f} value={f} className="bg-slate-900">{f}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Date</label>
                    <input 
                      required
                      type="date"
                      value={formData.date || ''}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-slate-800/20 border border-slate-700/50 rounded-2xl px-4 py-4 text-white focus:border-brand/60 outline-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center justify-between pl-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>{isCustomSlot ? 'Custom Time Entry' : 'Select 90-Min Slot'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const nextCustom = !isCustomSlot;
                            setIsCustomSlot(nextCustom);
                            if (nextCustom) {
                              setFormData(prev => ({ ...prev, time: '' }));
                            } else {
                              const defaultSlot = '03:00 - 04:30 PM';
                              const currentPrice = getPriceForSlot(defaultSlot, isFormHoliday);
                              setFormData(prev => ({ 
                                ...prev, 
                                time: defaultSlot,
                                price: currentPrice
                              }));
                            }
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1.5",
                            isCustomSlot ? "bg-slate-700 text-white" : "bg-slate-800/40 text-slate-500 hover:text-slate-300"
                          )}
                        >
                          <Settings className="w-3 h-3" />
                          {isCustomSlot ? 'Back to Slots' : 'Manual Entry'}
                        </button>
                        <div className="w-px h-3 bg-slate-800" />
                        <div className="flex items-center gap-2 bg-slate-800/40 p-1.5 rounded-xl border border-slate-700/50">
                          <button
                            type="button"
                            onClick={() => setIsFormHoliday(false)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all",
                              !isFormHoliday ? "bg-brand text-black shadow-lg shadow-brand/20" : "text-slate-500 hover:text-slate-300"
                            )}
                          >
                            Regular Day
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsFormHoliday(true)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all",
                              isFormHoliday ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-slate-500 hover:text-slate-300"
                            )}
                          >
                            Holiday/Weekend
                          </button>
                        </div>
                      </div>
                    </label>
                    
                    {isCustomSlot ? (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                         <div className="flex items-center gap-3">
                            <div className="flex-1 space-y-1.5">
                              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Custom Slot Time</p>
                              <input 
                                type="text"
                                placeholder="e.g. 03:00 - 05:00 PM"
                                value={formData.time || ''}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-brand/60 outline-none font-bold placeholder:text-slate-600"
                                autoFocus
                              />
                            </div>
                         </div>
                         <div className="p-3 bg-brand/5 border border-brand/20 rounded-xl flex items-center gap-3">
                            <Info className="w-4 h-4 text-brand" />
                            <p className="text-[10px] text-slate-400 font-medium">Manual entry disables auto-pricing. Please set the <span className="text-white font-bold">Total Fee</span> manually below.</p>
                         </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {timeSlots.map(s => {
                          const isBooked = isSlotBooked(formData.date || '', s.time, editingBooking?.id);
                          const currentPrice = isFormHoliday ? s.holidayPrice : s.regularPrice;
                          const isSelected = formData.time === s.time;
                          
                          return (
                            <button
                              key={s.time}
                              type="button"
                              disabled={isBooked}
                              onClick={() => setFormData({ ...formData, time: s.time, price: currentPrice })}
                              className={cn(
                                "p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden group",
                                isSelected 
                                  ? "bg-brand border-brand text-black shadow-lg shadow-brand/20" 
                                  : isFormHoliday 
                                    ? "bg-red-500/5 border-red-500/20 text-slate-400 hover:border-red-500/40" 
                                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700",
                                isBooked && "opacity-25 cursor-not-allowed grayscale"
                              )}
                            >
                              {isFormHoliday && !isSelected && (
                                <div className="absolute top-0 right-0 px-1.5 py-0.5 bg-red-500/20 text-red-500 text-[6px] font-black uppercase tracking-tighter rounded-bl-lg">
                                  Holiday Rate
                                </div>
                              )}
                              <div className="flex flex-col gap-0.5">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-tight",
                                  isSelected ? "text-black" : "text-slate-200"
                                )}>
                                  {s.time.split(' - ')[0]}
                                </span>
                                <span className={cn(
                                  "text-[9px] font-bold",
                                  isSelected ? "text-black/60" : "text-slate-500"
                                )}>
                                  to {s.time.split(' - ')[1]}
                                </span>
                              </div>
                              <div className={cn(
                                "mt-2 text-[10px] font-black",
                                !isSelected ? "text-brand" : "text-black"
                              )}>
                                {isBooked ? 'SOLD OUT' : `৳${currentPrice.toLocaleString()}`}
                              </div>
                              
                              {isSelected && (
                                <div className="absolute -right-1 -bottom-1 opacity-20">
                                  <CheckCircle2 className="w-8 h-8" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {isSlotBooked(formData.date || '', formData.time || '', editingBooking?.id) && (
                      <p className="text-[10px] text-red-400 font-black uppercase tracking-widest pl-1 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> This slot is unavailable
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Total Fee Booking (৳)</label>
                    <input 
                      required
                      type="number"
                      placeholder="0.00"
                      value={formData.price || ''}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full bg-slate-800/20 border border-slate-700/50 rounded-2xl px-4 py-4 text-white focus:border-brand/60 outline-none"
                    />
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">
                      Auto-slot price: ৳{getPriceForSlot(formData.time || '', isFormHoliday)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Advance Payment (৳)</label>
                    <input 
                      type="number"
                      placeholder="0.00"
                      value={formData.advance || ''}
                      onChange={(e) => setFormData({ ...formData, advance: Number(e.target.value) })}
                      className="w-full bg-slate-800/20 border border-slate-700/50 rounded-2xl px-4 py-4 text-white focus:border-brand/60 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Booking Status</label>
                    <select
                      value={formData.status || 'Confirmed'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-slate-800/20 border border-slate-700/50 rounded-2xl px-4 py-4 text-white focus:border-brand/60 outline-none appearance-none"
                    >
                      <option value="Confirmed" className="bg-slate-900">Confirmed</option>
                      <option value="Completed" className="bg-slate-900">Completed</option>
                      <option value="Cancelled" className="bg-slate-900 text-red-400">Cancelled</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Payment Deadline</label>
                    <input 
                      type="date"
                      value={formData.paymentDeadline || ''}
                      onChange={(e) => setFormData({ ...formData, paymentDeadline: e.target.value })}
                      className="w-full bg-slate-800/20 border border-slate-700/50 rounded-2xl px-4 py-4 text-white focus:border-brand/60 outline-none"
                    />
                  </div>
                </div>

                <div className="p-6 bg-slate-800/30 rounded-[2rem] border border-slate-700/50 border-dashed">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Base Price</span>
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tighter",
                        isFormHoliday ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-brand/10 border-brand/20 text-brand"
                      )}>
                        {isFormHoliday ? 'Holiday Price' : 'Regular Price'}
                      </span>
                    </div>
                    <span className="text-white font-bold">৳ {(formData.price || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Advance Paid</span>
                    <span className="text-blue-400 font-bold">৳ {(formData.advance || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest text-red-400/80">Remaining Due</span>
                    <span className="text-red-400 font-bold font-display">৳ {((formData.price || 0) - (formData.advance || 0)).toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-slate-700/50 mb-4" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white uppercase tracking-widest">Total Amount</span>
                    <span className="text-2xl font-black text-brand">৳ {(formData.price || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={closeModal}
                    className="flex-1 py-4 text-slate-500 font-black uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] bg-brand text-black py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-brand/20"
                  >
                    {editingBooking ? 'Confirm Changes' : 'Reserve Now'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Receipt Modal */}
      <AnimatePresence>
        {isReceiptModalOpen && selectedReceipt && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReceiptModalOpen(false)}
              className="fixed inset-0 bg-black/95 backdrop-blur-xl no-print"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white text-slate-900 rounded-[2.5rem] shadow-2xl p-8 sm:p-12 receipt-container"
            >
              <style>{`
                @media print {
                  body * { visibility: hidden; }
                  .receipt-container, .receipt-container * { visibility: visible; }
                  .receipt-container { 
                    position: absolute; 
                    left: 0; 
                    top: 0; 
                    width: 100%; 
                    margin: 0; 
                    padding: 40px;
                    box-shadow: none;
                    border: none;
                    background: white !important;
                    color: black !important;
                  }
                  .no-print { display: none !important; }
                }
              `}</style>

              {/* Close Button (No Print) */}
              <button 
                onClick={() => setIsReceiptModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 transition-colors no-print bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="flex flex-col items-center text-center mb-10 border-b border-slate-100 pb-10">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-brand text-2xl font-black">G</span>
                </div>
                <h2 className="text-3xl font-display font-black uppercase tracking-tight">Galaxy <span className="text-slate-500">Sports</span></h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Narayanganj • {selectedReceipt?.facility || 'Premium Turf Arena (Pitch 1)'}</p>
                <div className="mt-4 px-4 py-1.5 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest">
                  Official Booking Receipt
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-y-10 mb-12">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receipt ID</p>
                  <p className="font-bold text-slate-900">#GS-{selectedReceipt.id.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Booking Date</p>
                  <p className="font-bold text-slate-900 italic">{selectedReceipt.date}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer / Player</p>
                  <p className="font-bold text-slate-900 text-xl">{selectedReceipt.customerName}</p>
                  <p className="text-xs text-slate-500 font-medium">{selectedReceipt.customerPhone}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Team Name</p>
                  <p className="font-bold text-slate-900 text-xl uppercase italic">{selectedReceipt.teamName}</p>
                </div>
              </div>

              {/* Slot Table */}
              <div className="bg-slate-50 rounded-3xl p-8 mb-10 border border-slate-100">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Slot Info</span>
                  <span className="text-xs font-bold text-slate-900 italic">90 Minutes Duration</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl border border-slate-200">
                    <Clock className="w-6 h-6 text-slate-900" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">{selectedReceipt.time}</p>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">Verified Arena Slot</p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-4 mb-12 px-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Base Booking Fee</span>
                  <span className="font-black text-slate-900">৳ {selectedReceipt.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Advance Payment</span>
                  <span className="font-black text-slate-900 text-blue-600">- ৳ {selectedReceipt.advance.toLocaleString()}</span>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-black text-slate-900 uppercase tracking-widest text-lg">Total Due</p>
                    <p className="text-[10px] font-bold text-red-500 uppercase italic">Payable at the counter</p>
                  </div>
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">৳ {(selectedReceipt.price - selectedReceipt.advance).toLocaleString()}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-8 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed mb-4">
                  Thank you for playing at Galaxy Sports!<br />
                  Please present this receipt at the gate or counter.<br />
                  For help, contact us on WhatsApp: 01531-557184
                </p>
                <div className="flex flex-wrap gap-4 no-print">
                   <button 
                    onClick={() => setIsReceiptModalOpen(false)}
                    className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest hover:text-slate-900 transition-colors"
                  >
                    Close
                  </button>
                  <button 
                    onClick={() => handleBookAgain(selectedReceipt)}
                    className="flex-1 bg-blue-500/10 text-blue-600 py-4 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Book Again
                  </button>
                  <button 
                    onClick={() => handleShareLink(selectedReceipt)}
                    className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button 
                    onClick={() => handleWhatsApp(selectedReceipt)}
                    className="flex-1 bg-emerald-500 text-white py-4 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </button>
                  <button 
                    onClick={handlePrint}
                    className="flex-[2] bg-slate-900 text-brand py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl"
                  >
                    <Printer className="w-5 h-5" />
                    Print Receipt
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Partial Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && payingBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
              onClick={() => setIsPaymentModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-[2.5rem] p-8 overflow-hidden shadow-2xl"
            >
              <div className="relative z-10">
                <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mb-6">
                  <Banknote className="w-8 h-8 text-brand" />
                </div>
                
                <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-2">Record Payment</h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Update collection for {payingBooking.teamName}</p>

                <div className="space-y-4 mb-8">
                  <div className="bg-slate-900/50 rounded-3xl border border-slate-800/50 p-6">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800/50">
                       <div>
                         <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Fee</p>
                         <p className="text-white font-black text-xl italic">৳{payingBooking.price.toLocaleString()}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Already Paid</p>
                         <p className="text-brand font-black text-xl italic">৳{payingBooking.advance.toLocaleString()}</p>
                       </div>
                    </div>
                    <div className="flex items-center justify-between bg-red-500/5 p-4 rounded-2xl border border-red-500/10">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                         </div>
                         <p className="text-[10px] text-red-400 font-black uppercase tracking-widest leading-none">Net Outstanding</p>
                       </div>
                       <p className="text-white font-black text-2xl italic">৳{(payingBooking.price - payingBooking.advance).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={confirmPayment} className="space-y-6">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 px-1">Payment Amount (৳)</label>
                    <div className="relative">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-brand font-black text-xl italic">৳</div>
                      <input 
                        required
                        type="number"
                        autoFocus
                        max={payingBooking.price - payingBooking.advance}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full bg-slate-900 border-2 border-slate-800 rounded-[1.5rem] py-5 pl-12 pr-6 text-white font-black text-2xl focus:border-brand/40 outline-none transition-all placeholder:text-slate-800"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <button 
                      type="submit"
                      className="w-full bg-brand text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-brand/20 flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-5 h-5" />
                      Process Payment
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsPaymentModalOpen(false)}
                      className="w-full py-4 text-slate-500 font-black uppercase tracking-widest hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking Confirmation Modal */}
      <AnimatePresence>
        {isConfirmingSave && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
              onClick={() => setIsConfirmingSave(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-[2.5rem] p-8 overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <CheckCircle2 className="w-40 h-40 text-brand" />
              </div>

              <div className="relative z-10">
                <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mb-6">
                  <CalendarIcon className="w-8 h-8 text-brand" />
                </div>
                
                <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-2">Verify Booking</h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Please confirm the details below</p>

                <div className="space-y-4 mb-8">
                  <div className="bg-slate-800/20 p-4 rounded-2xl border border-slate-800">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Team & Player</p>
                    <p className="text-white font-black uppercase tracking-tight">{formData.teamName || 'N/A'}</p>
                    <p className="text-slate-400 text-xs font-bold">{formData.customerName || 'N/A'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/20 p-4 rounded-2xl border border-slate-800">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Slot & Time</p>
                      <p className="text-white font-bold text-xs">{formData.date}</p>
                      <p className="text-brand font-black text-[10px] uppercase tracking-tighter mt-1">{formData.time}</p>
                    </div>
                    <div className="bg-slate-800/20 p-4 rounded-2xl border border-slate-800 text-right">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1 text-right">Payment Info</p>
                      <p className="text-white font-bold text-xs">Total: ৳{(formData.price || 0).toLocaleString()}</p>
                      <p className="text-blue-400 font-bold text-[11px] mt-1">Paid: ৳{(formData.advance || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-brand/5 border border-brand/20 p-5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-brand font-black uppercase tracking-widest mb-0.5">Remaining Due</p>
                      <p className="text-white font-black text-xs italic">To be paid at counter</p>
                    </div>
                    <p className="text-2xl font-black text-white">৳ {((formData.price || 0) - (formData.advance || 0)).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleAddEdit}
                    className="w-full bg-brand text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-brand/20 flex items-center justify-center gap-2"
                  >
                    Confirm & Save Booking
                  </button>
                  <button 
                    onClick={() => setIsConfirmingSave(false)}
                    className="w-full py-4 text-slate-500 font-black uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Back to edit
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-[#0f172a] border border-slate-800 rounded-[2rem] p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-display font-black text-white uppercase tracking-tight mb-2">Delete Booking?</h3>
              <p className="text-slate-500 text-xs font-bold mb-8">This action cannot be undone. Are you sure you want to remove this record?</p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-4 text-slate-500 font-black uppercase tracking-widest hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
