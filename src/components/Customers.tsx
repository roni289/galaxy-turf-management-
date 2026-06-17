import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  X, 
  Phone, 
  Mail, 
  MapPin,
  History,
  AlertCircle,
  MessageCircle,
  ChevronRight,
  Import,
  Loader2,
  Check,
  CheckSquare,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Customer, Booking } from '../types';
import { ToastType } from './ui/Toast';

// Initial customers defined in mockData.ts
interface CustomersProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  showToast: (message: string, type: ToastType) => void;
  bookings: Booking[];
  isDriveConnected?: boolean;
  onLoginClick?: () => void;
}

export function Customers({ 
  customers, 
  setCustomers, 
  showToast, 
  bookings,
  isDriveConnected = false,
  onLoginClick
}: CustomersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({});

  // Google Contacts State
  const [googleContacts, setGoogleContacts] = useState<{name: string, phone: string, email: string, photo?: string}[]>([]);
  const [isContactsLoading, setIsContactsLoading] = useState(false);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [importSearchTerm, setImportSearchTerm] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]); // list of phones/emails unique keys

  const fetchGoogleContacts = async () => {
    setIsContactsLoading(true);
    try {
      const res = await fetch('/api/contacts');
      if (res.ok) {
        const data = await res.json();
        setGoogleContacts(data.contacts || []);
        setIsContactsModalOpen(true);
        showToast('Google Contacts fetched!', 'success');
      } else {
        showToast('Could not fetch Google Contacts. Connecting Google account with proper permissions...', 'info');
        if (onLoginClick) onLoginClick();
      }
    } catch (error) {
      showToast('Error connecting to Google Contacts API', 'error');
    } finally {
      setIsContactsLoading(false);
    }
  };

  const handleImportSingle = (contact: {name: string, phone: string, email: string}) => {
    const cleanPhone = contact.phone ? contact.phone.replace(/[^0-9+]/g, '') : '';
    const exists = customers.some(c => 
      (cleanPhone && c.phone.replace(/[^0-9+]/g, '') === cleanPhone) || 
      (contact.email && c.email.toLowerCase() === contact.email.toLowerCase())
    );

    if (exists) {
      showToast(`${contact.name} is already in your Customer Directory`, 'info');
      return;
    }

    const newCustomer: Customer = {
      id: Math.random().toString(36).substr(2, 9),
      name: contact.name,
      phone: contact.phone || '01000-000000',
      email: contact.email || '',
      totalBookings: 0,
      totalSpent: 0,
      lastBooking: 'Never',
      status: 'Active',
      preferredContactMethod: 'WhatsApp',
      notes: 'Imported from Google Contacts'
    } as any;

    setCustomers(prev => [newCustomer, ...prev]);
    showToast(`Imported ${contact.name}!`, 'success');
  };

  const handleBulkImport = () => {
    const toImport = googleContacts.filter(c => {
      const key = c.phone || c.email || c.name;
      return selectedContacts.includes(key);
    });

    if (toImport.length === 0) {
      showToast('No contacts selected', 'info');
      return;
    }

    let addedCount = 0;
    const updatedCustomers = [...customers];

    toImport.forEach(contact => {
      const cleanPhone = contact.phone ? contact.phone.replace(/[^0-9+]/g, '') : '';
      const exists = updatedCustomers.some(c => 
        (cleanPhone && c.phone.replace(/[^0-9+]/g, '') === cleanPhone) || 
        (contact.email && c.email.toLowerCase() === contact.email.toLowerCase())
      );

      if (!exists) {
        const newCustomer: Customer = {
          id: Math.random().toString(36).substr(2, 9),
          name: contact.name,
          phone: contact.phone || '01000-000000',
          email: contact.email || '',
          totalBookings: 0,
          totalSpent: 0,
          lastBooking: 'Never',
          status: 'Active',
          preferredContactMethod: 'WhatsApp',
          notes: 'Imported in bulk from Google Contacts'
        } as any;
        updatedCustomers.unshift(newCustomer);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      setCustomers(updatedCustomers);
      showToast(`Successfully imported ${addedCount} customers!`, 'success');
    } else {
      showToast('All selected contacts are already in your directory', 'info');
    }

    setSelectedContacts([]);
    setIsContactsModalOpen(false);
  };

  const toggleSelectContact = (key: string) => {
    setSelectedContacts(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSelectAllFiltered = (filteredList: any[]) => {
    const keys = filteredList.map(c => c.phone || c.email || c.name);
    const allSelected = keys.every(k => selectedContacts.includes(k));
    if (allSelected) {
      setSelectedContacts(prev => prev.filter(k => !keys.includes(k)));
    } else {
      setSelectedContacts(prev => Array.from(new Set([...prev, ...keys])));
    }
  };

  const handleWhatsApp = (customer: Customer) => {
    try {
      const message = `Hello ${customer.name}, we are Galaxy Turf! We wanted to check in and see if you'd like to book a session this week.`;
      const url = `https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      showToast('WhatsApp chat opened', 'info');
    } catch (error) {
      showToast('Failed to open WhatsApp', 'error');
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddEdit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        setCustomers(customers.map(c => c.id === editingCustomer.id ? { ...c, ...formData } as Customer : c));
        showToast('Customer updated successfully', 'success');
      } else {
        const newCustomer: Customer = {
          id: Math.random().toString(36).substr(2, 9),
          name: formData.name || '',
          phone: formData.phone || '',
          email: formData.email || '',
          totalBookings: 0,
          totalSpent: 0,
          lastBooking: 'Never',
          status: 'Active',
          ...formData
        } as Customer;
        setCustomers([newCustomer, ...customers]);
        showToast('New customer added', 'success');
      }
      closeModal();
    } catch (error) {
      showToast('Error saving customer data', 'error');
    }
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setCustomerToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    try {
      if (customerToDelete) {
        setCustomers(customers.filter(c => c.id !== customerToDelete));
        setCustomerToDelete(null);
        setIsDeleteModalOpen(false);
        showToast('Customer deleted successfully', 'success');
      }
    } catch (error) {
      showToast('Failed to delete customer', 'error');
    }
  };

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      setFormData({ 
        name: '', 
        phone: '', 
        email: '', 
        status: 'Active',
        preferredContactMethod: 'WhatsApp',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormData({});
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight">Customer <span className="text-brand">Management</span></h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Manage player database and booking history</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            type="button"
            onClick={fetchGoogleContacts}
            disabled={isContactsLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 hover:border-brand/40 text-slate-300 hover:text-white font-bold rounded-xl hover:scale-105 active:scale-95 transition-all text-xs cursor-pointer"
          >
            {isContactsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-brand" />
            ) : (
              <Import className="w-4 h-4 text-brand" />
            )}
            <span>Import Google Contacts</span>
          </button>
          <button 
            onClick={() => openModal()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-brand text-black font-bold rounded-xl hover:scale-105 transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Status Filter Row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 bg-[#0f172a] p-1.5 border border-slate-800 rounded-2xl overflow-x-auto no-scrollbar">
          {['All', 'Active', 'Inactive'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                statusFilter === status 
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

      {/* Filters */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-brand transition-colors" />
        <input 
          type="text"
          placeholder="Search by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/40 transition-all"
        />
      </div>

      {/* Customer List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => (
          <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={customer.id}
            className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl group hover:border-brand/30 transition-all relative"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <Users className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <h4 className="font-bold text-white group-hover:text-brand transition-colors flex items-center gap-2">
                    {customer.name}
                    {customer.preferredContactMethod === 'WhatsApp' && (
                      <span className="text-[7px] bg-[#25D366]/10 text-[#25D366] px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest border border-[#25D366]/20">WhatsApp Pref</span>
                    )}
                  </h4>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                    customer.status === 'Active' ? "bg-brand/10 text-brand" : "bg-red-400/10 text-red-500"
                  )}>
                    {customer.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => handleWhatsApp(customer)}
                  className="p-2 text-slate-500 hover:text-[#25D366] hover:bg-[#25D366]/5 rounded-lg transition-all"
                  title="Contact via WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => openModal(customer)}
                  className="p-2 text-slate-500 hover:text-brand hover:bg-brand/5 rounded-lg transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(customer.id)}
                  className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <Phone className={cn("w-4 h-4 opacity-50", customer.preferredContactMethod === 'Phone' && "text-brand opacity-100")} />
                <span className={cn(customer.preferredContactMethod === 'Phone' && "text-white font-medium italic")}>{customer.phone}</span>
                {customer.preferredContactMethod === 'Phone' && (
                  <span className="text-[7px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest border border-brand/20">Pref</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <Mail className={cn("w-4 h-4 opacity-50", customer.preferredContactMethod === 'Email' && "text-brand opacity-100")} />
                <span className={cn("truncate", customer.preferredContactMethod === 'Email' && "text-white font-medium italic")}>{customer.email}</span>
                {customer.preferredContactMethod === 'Email' && (
                  <span className="text-[7px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest border border-brand/20">Pref</span>
                )}
              </div>
              {customer.address && (
                <div className="flex items-start gap-3 text-sm text-slate-400">
                  <MapPin className="w-4 h-4 opacity-50 mt-0.5" />
                  <span className="line-clamp-2">{customer.address}</span>
                </div>
              )}
              {customer.notes && (
                <div className="mt-2 bg-slate-800/30 p-3 rounded-xl border border-slate-800/50">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 italic">Internal Note:</p>
                  <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">{customer.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Total Bookings</p>
                <p className="text-white font-bold">{bookings.filter(b => b.customerId === customer.id || b.customerPhone === customer.phone).length}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Total Spent</p>
                <p className="text-brand font-bold">৳ {bookings.filter(b => b.customerId === customer.id || b.customerPhone === customer.phone).reduce((acc, b) => acc + b.price, 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                <History className="w-3 h-3" />
                <span>LAST BOOKING: {bookings.filter(b => b.customerId === customer.id || b.customerPhone === customer.phone).sort((a,b) => b.date.localeCompare(a.date))[0]?.date || 'NEVER'}</span>
              </div>
              
              <button 
                onClick={() => setHistoryCustomer(customer)}
                className="w-full py-2 bg-slate-800/40 border border-slate-800 hover:border-brand/40 hover:bg-brand/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-brand flex items-center justify-center gap-2 transition-all group/btn"
              >
                <span>View Full History</span>
                <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-[#0f172a] border border-dashed border-slate-800 rounded-3xl">
          <AlertCircle className="w-12 h-12 text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-white">No customers found</h3>
          <p className="text-slate-500">Try adjusting your search term</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/10">
                <h3 className="text-xl font-display font-bold text-white">
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h3>
                <button onClick={closeModal} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddEdit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Full Name</label>
                    <input 
                      required
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-800/20 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-brand/40 outline-none transition-all"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Preferred Contact</label>
                    <select 
                      value={formData.preferredContactMethod || 'WhatsApp'}
                      onChange={(e) => setFormData({ ...formData, preferredContactMethod: e.target.value as any })}
                      className="w-full bg-slate-800/20 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-brand/40 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Phone">Direct Call</option>
                      <option value="Email">Email</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Phone Number</label>
                    <input 
                      required
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-800/20 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-brand/40 outline-none transition-all"
                      placeholder="01XXX-XXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Email Address</label>
                    <input 
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-800/20 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-brand/40 outline-none transition-all"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Internal Notes</label>
                  <textarea 
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-800/20 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-brand/40 outline-none transition-all resize-none h-20"
                    placeholder="Add special requests, player skill, or behavioral notes..."
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Full Address</label>
                  <textarea 
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-800/20 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-brand/40 outline-none transition-all resize-none h-20"
                    placeholder="Enter full address..."
                  />
                </div>
                <div className="space-y-4">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 block">Customer Status</label>
                   <div className="flex gap-4">
                      {['Active', 'Inactive'].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setFormData({ ...formData, status: status as any })}
                          className={cn(
                            "flex-1 py-3 rounded-xl border text-xs font-bold transition-all",
                            formData.status === status 
                              ? "bg-brand/10 border-brand text-brand ring-1 ring-brand/30" 
                              : "bg-slate-800/20 border-slate-700 text-slate-500 hover:border-slate-600"
                          )}
                        >
                          {status}
                        </button>
                      ))}
                   </div>
                </div>
                <div className="pt-4 flex gap-4">
                  <button 
                    type="button" 
                    onClick={closeModal}
                    className="flex-1 py-3 text-slate-400 font-bold hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-brand text-black py-4 rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg shadow-brand/20"
                  >
                    {editingCustomer ? 'Save Changes' : 'Create Customer'}
                  </button>
                </div>
              </form>
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
              className="relative w-full max-w-sm bg-[#0f172a] border border-slate-800 rounded-3xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-display font-bold text-white mb-2">Delete Customer?</h3>
              <p className="text-slate-500 text-xs font-semibold mb-8">Are you sure you want to delete this customer? This action is permanent.</p>
              
              <div className="flex gap-4">
                <button 
                   onClick={() => setIsDeleteModalOpen(false)}
                   className="flex-1 py-3 text-slate-400 font-bold hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking History Modal */}
      <AnimatePresence>
        {historyCustomer && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHistoryCustomer(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0f172a] border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-800/10 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center">
                    <History className="w-7 h-7 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight">Booking <span className="text-brand">History</span></h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{historyCustomer.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setHistoryCustomer(null)}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                {bookings.filter(b => b.customerId === historyCustomer.id || b.customerPhone === historyCustomer.phone).length > 0 ? (
                  <div className="space-y-4">
                    {bookings
                      .filter(b => b.customerId === historyCustomer.id || b.customerPhone === historyCustomer.phone)
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((booking) => (
                        <div key={booking.id} className="group bg-slate-800/20 border border-slate-800 rounded-3xl p-6 hover:border-brand/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-black text-brand uppercase tracking-widest px-2 py-0.5 bg-brand/10 rounded-md border border-brand/20">
                                {booking.type || 'Field Booking'}
                              </span>
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                                booking.status === 'Confirmed' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                                booking.status === 'Completed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                "bg-red-500/10 border-red-500/20 text-red-500"
                              )}>
                                {booking.status}
                              </span>
                            </div>
                            <h4 className="text-lg font-display font-bold text-white group-hover:text-brand transition-colors uppercase tracking-tight">{booking.teamName}</h4>
                            <div className="flex items-center gap-4 text-xs text-slate-500 font-bold">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                {booking.date}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                {booking.time}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                             <div className="text-right">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 leading-none">Total Fee</p>
                                <p className="text-white font-black text-xl leading-none italic">৳{booking.price.toLocaleString()}</p>
                             </div>
                             <div className={cn(
                               "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em]",
                               booking.advance >= booking.price ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                             )}>
                               {booking.advance >= booking.price ? 'Paid' : 'Partial/Due'}
                             </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <History className="w-16 h-16 text-slate-600 mb-4" />
                    <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">No booking history</p>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-slate-800 bg-slate-800/10 shrink-0">
                 <div className="flex items-center justify-between bg-[#0f172a] p-6 rounded-3xl border border-slate-800">
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Lifetime Value</p>
                      <p className="text-3xl font-display font-black text-white italic tracking-tight">৳{bookings.filter(b => b.customerId === historyCustomer.id || b.customerPhone === historyCustomer.phone).reduce((acc, b) => acc + b.price, 0).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Total Games</p>
                      <p className="text-3xl font-display font-black text-brand italic tracking-tight">{bookings.filter(b => b.customerId === historyCustomer.id || b.customerPhone === historyCustomer.phone).length}</p>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Google Contacts Import Modal */}
      <AnimatePresence>
        {isContactsModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsContactsModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0f172a] border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-800/10 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center">
                    <Import className="w-7 h-7 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight">Google <span className="text-brand">Contacts</span></h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Select and import players directly into your directory</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsContactsModalOpen(false)}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-700 cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Search & Actions Bar */}
              <div className="p-6 border-b border-slate-800 bg-slate-900/50 space-y-4 shrink-0">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search Google Contacts by name, phone or email..."
                    value={importSearchTerm}
                    onChange={(e) => setImportSearchTerm(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-xs text-white focus:outline-none focus:border-brand/40"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Showing {googleContacts.filter(c => 
                      c.name.toLowerCase().includes(importSearchTerm.toLowerCase()) ||
                      c.phone.includes(importSearchTerm) ||
                      c.email.toLowerCase().includes(importSearchTerm.toLowerCase())
                    ).length} Contacts
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const filteredList = googleContacts.filter(c => 
                        c.name.toLowerCase().includes(importSearchTerm.toLowerCase()) ||
                        c.phone.includes(importSearchTerm) ||
                        c.email.toLowerCase().includes(importSearchTerm.toLowerCase())
                      );
                      handleSelectAllFiltered(filteredList);
                    }}
                    className="text-brand font-black uppercase tracking-widest text-[9px] hover:underline cursor-pointer"
                  >
                    Select/Deselect All Filtered
                  </button>
                </div>
              </div>

              {/* Contacts List */}
              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                {googleContacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <Users className="w-16 h-16 text-slate-600 mb-4" />
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">No Google Contacts Found</p>
                    <p className="text-[10px] text-slate-600 mt-1 uppercase font-bold">Add some contacts to your Google account or try sync again</p>
                  </div>
                ) : (
                  googleContacts
                    .filter(c => 
                      c.name.toLowerCase().includes(importSearchTerm.toLowerCase()) ||
                      c.phone.includes(importSearchTerm) ||
                      c.email.toLowerCase().includes(importSearchTerm.toLowerCase())
                    )
                    .map((contact) => {
                      const key = contact.phone || contact.email || contact.name;
                      const isSelected = selectedContacts.includes(key);
                      
                      // Check if already in system
                      const cleanPhone = contact.phone ? contact.phone.replace(/[^0-9+]/g, '') : '';
                      const isAlreadyCustomer = customers.some(cust => 
                        (cleanPhone && cust.phone.replace(/[^0-9+]/g, '') === cleanPhone) || 
                        (contact.email && cust.email.toLowerCase() === contact.email.toLowerCase())
                      );

                      return (
                        <div 
                          key={key} 
                          className={cn(
                            "group bg-slate-800/10 border p-5 rounded-2xl flex items-center justify-between gap-4 transition-all",
                            isAlreadyCustomer ? "border-slate-800/40 opacity-75" : 
                            isSelected ? "border-brand/40 bg-brand/5" : "border-slate-800 hover:border-slate-700"
                          )}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            {/* Selection Checkbox */}
                            {!isAlreadyCustomer && (
                              <button
                                type="button"
                                onClick={() => toggleSelectContact(key)}
                                className="text-slate-500 hover:text-brand transition-colors cursor-pointer"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-5 h-5 text-brand" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-700" />
                                )}
                              </button>
                            )}

                            {/* Photo / Initial Avatar */}
                            {contact.photo ? (
                              <img 
                                src={contact.photo} 
                                alt={contact.name} 
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-full object-cover border border-slate-800 shrink-0" 
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-300 font-bold shrink-0 text-sm">
                                {contact.name.charAt(0).toUpperCase()}
                              </div>
                            )}

                            {/* Contact Details */}
                            <div className="min-w-0">
                              <h4 className="font-bold text-white truncate text-sm">{contact.name}</h4>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-[10px] text-slate-500 font-bold">
                                {contact.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-brand/60" /> {contact.phone}</span>}
                                {contact.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-brand/60" /> {contact.email}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div>
                            {isAlreadyCustomer ? (
                              <span className="text-[8px] bg-slate-800 text-slate-500 px-2 py-1 rounded-md font-black uppercase tracking-widest border border-slate-700">
                                In System
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleImportSingle(contact)}
                                className="px-3 py-1.5 bg-brand text-black hover:bg-brand-light font-black text-[9px] uppercase tracking-wider rounded-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                              >
                                Quick Import
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Footer */}
              <div className="p-8 border-t border-slate-800 bg-slate-800/10 shrink-0 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsContactsModalOpen(false)}
                  className="px-6 py-3 text-slate-400 font-bold hover:text-white transition-colors text-xs uppercase tracking-widest cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  disabled={selectedContacts.length === 0}
                  onClick={handleBulkImport}
                  className="px-6 py-4 bg-brand disabled:bg-slate-800 text-black disabled:text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 disabled:scale-100 transition-all shadow-lg shadow-brand/10 flex items-center gap-2 cursor-pointer"
                >
                  <Import className="w-4 h-4" />
                  <span>Import Selected ({selectedContacts.length})</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
