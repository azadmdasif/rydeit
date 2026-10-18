import React, { useState, useEffect, useMemo } from 'react';
import { Lead, LeadStatus, LeadVehiclePreference, LeadSource, RentalPurpose, FollowUpComment } from '../../types';
import { 
  getStoredLeads, 
  fetchLeadsFromSupabase, 
  saveLead, 
  updateLeadStatus, 
  addFollowUpComment,
  deleteLead, 
  computeDemandAnalytics 
} from '../../leadsStorage';
import { BIKES } from '../../constants';
import { getFleetBikes } from '../../fleetStorage';
import { supabase } from '../../supabase';
import { useToast } from '../../App';

interface AdminLeadsProps {
  onNavigateToBooking?: (bookingId: string) => void;
}

export const AdminLeads: React.FC<AdminLeadsProps> = ({ onNavigateToBooking }) => {
  const { showToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>(getStoredLeads);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  // Follow-up Prompt Modal (when status is changed to 'need_follow_up')
  const [schedulePromptLead, setSchedulePromptLead] = useState<Lead | null>(null);
  const [promptFollowUpDate, setPromptFollowUpDate] = useState<string>('');
  const [promptFollowUpNote, setPromptFollowUpNote] = useState<string>('');

  // Follow-Up Comments & History Modal (when followed up later)
  const [followUpModalLead, setFollowUpModalLead] = useState<Lead | null>(null);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>('');
  const [statusAfterComment, setStatusAfterComment] = useState<LeadStatus>('need_follow_up');

  // Convert to booking form state
  const [convertForm, setConvertForm] = useState({
    bikeId: 16,
    pickupDate: '',
    pickupTime: '10:00',
    returnDate: '',
    returnTime: '20:00',
    advanceAmount: 500,
    depositAmount: 1000,
    paymentMethod: 'UPI',
    pickupMethod: 'garage' as 'garage' | 'home',
    notes: ''
  });

  // Fast Add/Edit Lead Form state
  const [leadForm, setLeadForm] = useState<{
    customer_name: string;
    customer_phone: string;
    source: LeadSource;
    vehicle_preference: LeadVehiclePreference;
    specific_vehicle_id: number | null;
    pickup_date: string;
    return_date: string;
    rental_duration_days: number;
    purpose: RentalPurpose;
    budget_expectation: string;
    status: LeadStatus;
    follow_up_date: string;
    notes: string;
  }>({
    customer_name: '',
    customer_phone: '',
    source: 'whatsapp',
    vehicle_preference: 'scooty',
    specific_vehicle_id: null,
    pickup_date: new Date().toISOString().split('T')[0],
    return_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    rental_duration_days: 1,
    purpose: 'Weekend Trip / Outing',
    budget_expectation: 'Standard Rate',
    status: 'need_follow_up',
    follow_up_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const allFleetBikes = useMemo(() => {
    try {
      const fleet = getFleetBikes();
      return fleet.length > 0 ? fleet : BIKES;
    } catch {
      return BIKES;
    }
  }, []);

  // Filter specific vehicles based on chosen preference
  const filteredVehiclesForPreference = useMemo(() => {
    if (leadForm.vehicle_preference === 'flexible') return allFleetBikes;
    const categoryMap: Record<string, string> = {
      scooty: 'Scooter',
      bike: 'Bikes',
      bullet: 'Royal Enfield',
      sports: 'Sports'
    };
    const targetCategory = categoryMap[leadForm.vehicle_preference];
    return allFleetBikes.filter(b => b.category === targetCategory);
  }, [allFleetBikes, leadForm.vehicle_preference]);

  // Load leads on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchLeadsFromSupabase();
      setLeads(data);
      setLoading(false);
    };
    load();
  }, []);

  // Compute analytics
  const analytics = useMemo(() => computeDemandAnalytics(leads), [leads]);

  // Handle open add modal
  const handleOpenAddModal = () => {
    setEditingLead(null);
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setLeadForm({
      customer_name: '',
      customer_phone: '',
      source: 'whatsapp',
      vehicle_preference: 'scooty',
      specific_vehicle_id: null,
      pickup_date: today,
      return_date: tomorrow,
      rental_duration_days: 1,
      purpose: 'Weekend Trip / Outing',
      budget_expectation: 'Standard Rate',
      status: 'need_follow_up',
      follow_up_date: tomorrow,
      notes: ''
    });
    setIsAddModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setLeadForm({
      customer_name: lead.customer_name,
      customer_phone: lead.customer_phone,
      source: lead.source,
      vehicle_preference: lead.vehicle_preference,
      specific_vehicle_id: lead.specific_vehicle_id ?? null,
      pickup_date: lead.pickup_date,
      return_date: lead.return_date,
      rental_duration_days: lead.rental_duration_days,
      purpose: lead.purpose,
      budget_expectation: lead.budget_expectation || 'Standard Rate',
      status: lead.status,
      follow_up_date: lead.follow_up_date || lead.pickup_date,
      notes: lead.notes || ''
    });
    setIsAddModalOpen(true);
  };

  // Quick date presets in form
  const applyDatePreset = (preset: 'today' | 'tomorrow' | 'weekend' | 'nextWeek') => {
    const now = new Date();
    let start = new Date();
    let days = 1;

    if (preset === 'today') {
      start = now;
      days = 1;
    } else if (preset === 'tomorrow') {
      start = new Date(now.getTime() + 86400000);
      days = 1;
    } else if (preset === 'weekend') {
      const dayOfWeek = now.getDay();
      const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
      start = new Date(now.getTime() + daysUntilSat * 86400000);
      days = 2;
    } else if (preset === 'nextWeek') {
      start = new Date(now.getTime() + 7 * 86400000);
      days = 2;
    }

    const startStr = start.toISOString().split('T')[0];
    const end = new Date(start.getTime() + days * 86400000);
    const endStr = end.toISOString().split('T')[0];

    setLeadForm(prev => ({
      ...prev,
      pickup_date: startStr,
      return_date: endStr,
      rental_duration_days: days
    }));
  };

  // Quick duration presets
  const applyDurationPreset = (days: number) => {
    const start = new Date(leadForm.pickup_date || new Date());
    const end = new Date(start.getTime() + days * 86400000);
    setLeadForm(prev => ({
      ...prev,
      rental_duration_days: days,
      return_date: end.toISOString().split('T')[0]
    }));
  };

  // Quick note preset appender
  const appendNoteChip = (chip: string) => {
    setLeadForm(prev => {
      const existing = prev.notes.trim();
      if (!existing) return { ...prev, notes: chip };
      if (existing.includes(chip)) return prev;
      return { ...prev, notes: `${existing} · ${chip}` };
    });
  };

  // Submit save lead
  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.customer_name.trim()) {
      showToast('Please enter customer name', 'warning');
      return;
    }
    if (!leadForm.customer_phone.trim() || leadForm.customer_phone.length < 10) {
      showToast('Please enter a valid 10-digit phone number', 'warning');
      return;
    }
    if (leadForm.status === 'need_follow_up' && !leadForm.follow_up_date) {
      showToast('Please select a scheduled follow-up date', 'warning');
      return;
    }

    const specificBike = allFleetBikes.find(b => b.id === Number(leadForm.specific_vehicle_id));

    const leadPayload: Lead = {
      id: editingLead ? editingLead.id : `lead_${Date.now()}`,
      created_at: editingLead ? editingLead.created_at : new Date().toISOString(),
      customer_name: leadForm.customer_name.trim(),
      customer_phone: leadForm.customer_phone.trim(),
      source: leadForm.source,
      vehicle_preference: leadForm.vehicle_preference,
      specific_vehicle_id: leadForm.specific_vehicle_id ? Number(leadForm.specific_vehicle_id) : null,
      specific_vehicle_name: specificBike ? specificBike.name : (leadForm.specific_vehicle_id ? undefined : 'Flexible / Any model'),
      pickup_date: leadForm.pickup_date,
      return_date: leadForm.return_date,
      rental_duration_days: Math.max(1, Number(leadForm.rental_duration_days) || 1),
      purpose: leadForm.purpose,
      budget_expectation: leadForm.budget_expectation,
      status: leadForm.status,
      follow_up_date: leadForm.status === 'need_follow_up' ? leadForm.follow_up_date : undefined,
      notes: leadForm.notes.trim(),
      follow_up_comments: editingLead ? editingLead.follow_up_comments : undefined,
      converted_booking_id: editingLead ? editingLead.converted_booking_id : undefined,
      converted_at: editingLead ? editingLead.converted_at : undefined
    };

    await saveLead(leadPayload);
    const updated = await fetchLeadsFromSupabase();
    setLeads(updated);
    setIsAddModalOpen(false);
    showToast(editingLead ? 'Lead updated successfully' : 'New inquiry logged successfully', 'success');
  };

  // Open Schedule Follow-Up & Details Modal
  const handleOpenScheduleFollowUpModal = (lead: Lead) => {
    setSchedulePromptLead(lead);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setPromptFollowUpDate(lead.follow_up_date || tomorrow);
    setPromptFollowUpNote(lead.notes || '');
  };

  // Quick status update inline: If set to follow up, prompt to enter follow up date!
  const handleQuickStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    const target = leads.find(l => l.id === leadId);
    if (!target) return;

    if (newStatus === 'need_follow_up') {
      // Prompt user to enter follow up date & details
      handleOpenScheduleFollowUpModal(target);
      return;
    }

    await updateLeadStatus(leadId, newStatus);
    const updated = await fetchLeadsFromSupabase();
    setLeads(updated);
    showToast(`Lead status updated to ${newStatus.replace(/_/g, ' ')}`, 'info');
  };

  // Confirm schedule follow up from prompt modal
  const handleConfirmScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulePromptLead) return;
    if (!promptFollowUpDate) {
      showToast('Please select a follow-up date', 'warning');
      return;
    }

    const note = promptFollowUpNote.trim();
    if (note) {
      await addFollowUpComment(schedulePromptLead.id, note, promptFollowUpDate, 'need_follow_up');
    }
    
    const updatedLead: Lead = {
      ...schedulePromptLead,
      status: 'need_follow_up',
      follow_up_date: promptFollowUpDate,
      notes: note || schedulePromptLead.notes
    };
    await saveLead(updatedLead);

    const updated = await fetchLeadsFromSupabase();
    setLeads(updated);
    setSchedulePromptLead(null);
    showToast(`Follow-up scheduled for ${promptFollowUpDate}`, 'success');
  };

  // Open Follow-Up Comments Modal (When followed up later)
  const handleOpenFollowUpCommentsModal = (lead: Lead) => {
    setFollowUpModalLead(lead);
    setNewCommentText('');
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setNextFollowUpDate(lead.follow_up_date || tomorrow);
    setStatusAfterComment(lead.status);
  };

  // Submit new follow up comment
  const handleSaveFollowUpComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpModalLead) return;
    if (!newCommentText.trim()) {
      showToast('Please enter comment text', 'warning');
      return;
    }

    await addFollowUpComment(
      followUpModalLead.id,
      newCommentText.trim(),
      statusAfterComment === 'need_follow_up' ? nextFollowUpDate : undefined,
      statusAfterComment
    );

    const updated = await fetchLeadsFromSupabase();
    setLeads(updated);
    
    // Update local modal view with fresh comments
    const refreshed = updated.find(l => l.id === followUpModalLead.id);
    if (refreshed) setFollowUpModalLead(refreshed);
    setNewCommentText('');
    showToast('Follow-up comment recorded', 'success');
  };

  // Delete lead
  const handleDeleteLead = async (lead: Lead) => {
    if (!window.confirm(`Delete inquiry for ${lead.customer_name}?`)) return;
    await deleteLead(lead.id);
    const updated = await fetchLeadsFromSupabase();
    setLeads(updated);
    showToast('Inquiry removed', 'info');
  };

  // WhatsApp Follow-up link
  const getWhatsAppFollowUpUrl = (lead: Lead) => {
    const phone = lead.customer_phone.replace(/\D/g, '');
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const vehicleName = lead.specific_vehicle_name || `${lead.vehicle_preference.toUpperCase()}`;

    const text = `Hi *${lead.customer_name}*, greetings from *Rydeit Rentals Kolkata*! 🏍️💨\n\n` +
      `We are following up on your inquiry for *${vehicleName}* for *${lead.pickup_date}* to *${lead.return_date}* (${lead.rental_duration_days} Day${lead.rental_duration_days > 1 ? 's' : ''}).\n\n` +
      `We have verified machine availability and would love to reserve this slot for you.\n\n` +
      `Would you like us to send the booking details and lock your ride?\n\n` +
      `Best regards,\n` +
      `Team Rydeit Kolkata\n` +
      `📞 +91 76860 22245 | 6C, Mohammadan Burial Ground Lane`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  // Open Convert to Booking modal
  const handleOpenConvertModal = (lead: Lead) => {
    setConvertingLead(lead);
    
    let defaultBikeId = lead.specific_vehicle_id || 16;
    if (!lead.specific_vehicle_id) {
      if (lead.vehicle_preference === 'scooty') defaultBikeId = 16;
      else if (lead.vehicle_preference === 'bullet') defaultBikeId = 12;
      else if (lead.vehicle_preference === 'sports') defaultBikeId = 10;
      else defaultBikeId = 1;
    }

    setConvertForm({
      bikeId: defaultBikeId,
      pickupDate: lead.pickup_date,
      pickupTime: '10:00',
      returnDate: lead.return_date,
      returnTime: '20:00',
      advanceAmount: 500,
      depositAmount: 1000,
      paymentMethod: 'UPI',
      pickupMethod: 'garage',
      notes: `Converted from ${lead.source.toUpperCase()} inquiry: ${lead.notes || lead.purpose}`
    });
  };

  // Confirm Convert to Booking
  const handleConfirmConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingLead) return;

    const chosenBike = allFleetBikes.find(b => b.id === Number(convertForm.bikeId));
    if (!chosenBike) {
      showToast('Please select a valid bike', 'warning');
      return;
    }

    setLoading(true);
    const readableId = `RD-M${Math.floor(100000 + Math.random() * 900000)}`;

    const durationDays = Math.max(1, Math.round((new Date(convertForm.returnDate).getTime() - new Date(convertForm.pickupDate).getTime()) / 86400000)) || convertingLead.rental_duration_days;
    const standardRent = (chosenBike.dailyRate || 700) * durationDays;

    try {
      const bookingPayload: any = {
        readable_id: readableId,
        bike_id: chosenBike.id,
        customer_name: convertingLead.customer_name,
        customer_phone: convertingLead.customer_phone,
        customer_email: `${convertingLead.customer_phone}@rydeit.in`,
        pickup_date: convertForm.pickupDate,
        pickup_time: convertForm.pickupTime,
        return_date: convertForm.returnDate,
        return_time: convertForm.returnTime,
        total_rent: standardRent,
        advance_amount: Number(convertForm.advanceAmount) || 500,
        security_deposit: Number(convertForm.depositAmount) || 1000,
        payment_method: convertForm.paymentMethod,
        status: 'pending_payment',
        needs_delivery: convertForm.pickupMethod === 'home',
        needs_return_pickup: false,
        address: convertForm.pickupMethod === 'home' ? 'Delivery requested by customer' : 'Garage Self-Pickup',
        admin_notes: `Converted from Lead (${convertingLead.id}): ${convertForm.notes || convertingLead.purpose}`
      };

      const { error: bookingErr } = await supabase.from('bookings').insert(bookingPayload);
      if (bookingErr) throw bookingErr;

      const updatedLead: Lead = {
        ...convertingLead,
        status: 'booked',
        converted_booking_id: readableId,
        converted_at: new Date().toISOString()
      };
      await saveLead(updatedLead);

      const updatedList = await fetchLeadsFromSupabase();
      setLeads(updatedList);
      setConvertingLead(null);
      showToast(`Success! Converted lead to booking ${readableId} (Status: Pending Payment)`, 'success');

      // WhatsApp booking confirmation
      const phone = convertingLead.customer_phone.replace(/\D/g, '');
      const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
      const msg = `*RYDEIT - BOOKING RESERVATION CREATED* 🏍️💨\n\n` +
        `Dear *${convertingLead.customer_name}*,\n\n` +
        `Your reservation has been created for *${chosenBike.name}*!\n` +
        `• *Booking Ref:* ${readableId}\n` +
        `• *Pickup:* ${convertForm.pickupDate} @ ${convertForm.pickupTime}\n` +
        `• *Return:* ${convertForm.returnDate} @ ${convertForm.returnTime}\n` +
        `• *Agreed Total Rent:* ₹${standardRent}\n` +
        `• *Advance to Lock Slot:* ₹${convertForm.advanceAmount}\n\n` +
        `Pay ₹${convertForm.advanceAmount} via UPI to 9831846183@ybl to lock your machine.\n` +
        `Team Rydeit Kolkata`;

      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');

    } catch (err: any) {
      showToast(err.message || 'Failed to convert lead to booking', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Export Leads to CSV
  const handleExportCSV = () => {
    if (leads.length === 0) {
      showToast('No leads to export', 'info');
      return;
    }
    const headers = ['ID', 'Date', 'Customer Name', 'Phone', 'Source', 'Preference', 'Vehicle', 'Pickup Date', 'Return Date', 'Days', 'Purpose', 'Status', 'Follow-up Date', 'Comments Count', 'Notes', 'Converted Booking ID'];
    const rows = leads.map(l => [
      l.id,
      l.created_at.split('T')[0],
      `"${l.customer_name.replace(/"/g, '""')}"`,
      l.customer_phone,
      l.source,
      l.vehicle_preference,
      `"${(l.specific_vehicle_name || '').replace(/"/g, '""')}"`,
      l.pickup_date,
      l.return_date,
      l.rental_duration_days,
      `"${(l.purpose || '').replace(/"/g, '""')}"`,
      l.status,
      l.follow_up_date || '',
      l.follow_up_comments?.length || 0,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
      l.converted_booking_id || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rydeit_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Leads CSV exported successfully', 'success');
  };

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'follow_up' && lead.status !== 'need_follow_up') return false;
        if (statusFilter === 'booked' && lead.status !== 'booked') return false;
        if (statusFilter === 'contacted' && lead.status !== 'contacted') return false;
        if (statusFilter === 'lost' && !['not_interested', 'lost_to_availability', 'lost_to_price', 'postponed'].includes(lead.status)) return false;
      }

      if (categoryFilter !== 'all' && lead.vehicle_preference !== categoryFilter) return false;
      if (sourceFilter !== 'all' && lead.source !== sourceFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = lead.customer_name.toLowerCase().includes(q);
        const matchesPhone = lead.customer_phone.includes(q);
        const matchesBike = (lead.specific_vehicle_name || '').toLowerCase().includes(q);
        const matchesPurpose = lead.purpose.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesBike && !matchesPurpose) return false;
      }

      return true;
    });
  }, [leads, statusFilter, categoryFilter, sourceFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4 text-slate-100">
      
      {/* Top Banner & Fast Action Bar */}
      <div className="flex items-center justify-between gap-3 bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          <h2 className="text-xl font-bold tracking-tight text-white uppercase">
            Log Lead
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download CSV"
          >
            <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Log Lead</span>
          </button>
        </div>
      </div>

      {/* Market Demand & Insights Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Total Inquiries */}
        <div className="bg-[#0a0a0a] border border-neutral-800 p-3.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Total Leads</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{analytics.totalLeads}</span>
          </div>
        </div>

        {/* Needs Follow-up */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'follow_up' ? 'all' : 'follow_up')}
          className={`border p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer transition-all ${
            statusFilter === 'follow_up'
              ? 'bg-amber-500/10 border-amber-500/40 shadow-lg' 
              : 'bg-[#0a0a0a] border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Follow-Up</span>
            {analytics.needFollowUpCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            )}
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-300">{analytics.needFollowUpCount}</span>
          </div>
        </div>

        {/* Converted Bookings */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'booked' ? 'all' : 'booked')}
          className={`border p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer transition-all ${
            statusFilter === 'booked'
              ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg' 
              : 'bg-[#0a0a0a] border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Booked</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-300">{analytics.bookedCount}</span>
            {analytics.bookedCount > 0 && (
              <span className="text-[10px] font-bold text-emerald-400">{analytics.conversionRate}%</span>
            )}
          </div>
        </div>

        {/* Lost to Availability */}
        <div className="bg-[#0a0a0a] border border-neutral-800 p-3.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Lost</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-300">{analytics.lostDemand.availability}</span>
          </div>
        </div>

        {/* Top Channel */}
        <div className="bg-[#0a0a0a] border border-neutral-800 p-3.5 rounded-2xl flex flex-col justify-between col-span-2 md:col-span-1">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Channels</span>
          <div className="mt-1.5 flex items-baseline justify-between text-xs">
            <span className="text-white font-medium">WA: <strong className="text-emerald-400">{analytics.sourceBreakdown.whatsapp}</strong></span>
            <span className="text-neutral-400">Calls: <strong className="text-white">{analytics.sourceBreakdown.call}</strong></span>
          </div>
        </div>
      </div>

      {/* Market Demand Breakdown Bar */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Demand Share
          </span>
          <div className="flex items-center gap-3 text-xs font-semibold flex-wrap">
            <span className="flex items-center gap-1.5 text-neutral-300">
              <span className="w-2 h-2 rounded-sm bg-orange-500"></span>
              Scooty: <strong className="text-white">{analytics.categoryPercentages.scooty}%</strong>
            </span>
            <span className="flex items-center gap-1.5 text-neutral-300">
              <span className="w-2 h-2 rounded-sm bg-sky-500"></span>
              Bullet: <strong className="text-white">{analytics.categoryPercentages.bullet}%</strong>
            </span>
            <span className="flex items-center gap-1.5 text-neutral-300">
              <span className="w-2 h-2 rounded-sm bg-emerald-500"></span>
              Sports: <strong className="text-white">{analytics.categoryPercentages.sports}%</strong>
            </span>
            <span className="flex items-center gap-1.5 text-neutral-300">
              <span className="w-2 h-2 rounded-sm bg-neutral-400"></span>
              Commuter: <strong className="text-white">{analytics.categoryPercentages.bike}%</strong>
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden flex">
          <div style={{ width: `${analytics.categoryPercentages.scooty}%` }} className="bg-orange-500 h-full transition-all" title={`Scooty: ${analytics.categoryPercentages.scooty}%`} />
          <div style={{ width: `${analytics.categoryPercentages.bullet}%` }} className="bg-sky-500 h-full transition-all" title={`Bullet: ${analytics.categoryPercentages.bullet}%`} />
          <div style={{ width: `${analytics.categoryPercentages.sports}%` }} className="bg-emerald-500 h-full transition-all" title={`Sports: ${analytics.categoryPercentages.sports}%`} />
          <div style={{ width: `${analytics.categoryPercentages.bike}%` }} className="bg-neutral-400 h-full transition-all" title={`Commuter: ${analytics.categoryPercentages.bike}%`} />
        </div>
      </div>

      {/* Filter & Search Segmented Controls */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All' },
            { id: 'follow_up', label: 'Follow-Up' },
            { id: 'contacted', label: 'Contacted' },
            { id: 'booked', label: 'Booked' },
            { id: 'lost', label: 'Lost' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Category & Channel Dropdowns without icons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-xl px-3 py-1.5 font-medium focus:border-orange-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="scooty">Scooty</option>
            <option value="bullet">Bullet</option>
            <option value="bike">Commuter</option>
            <option value="sports">Sports</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-xl px-3 py-1.5 font-medium focus:border-orange-500 focus:outline-none"
          >
            <option value="all">All Channels</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="call">Phone Call</option>
            <option value="walk_in">Walk-in</option>
            <option value="instagram">Instagram</option>
          </select>

          <div className="relative flex-grow min-w-[180px]">
            <input
              type="text"
              placeholder="Search name, phone, bike..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE-RESPONSIVE CARD VIEW (visible on small screens < md) */}
      <div className="md:hidden space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-8 text-center text-neutral-500">
            <p className="font-semibold text-white">No inquiries found</p>
            <p className="text-xs text-neutral-400 mt-1">Try resetting filters or click Log New Inquiry.</p>
          </div>
        ) : (
          filteredLeads.map(lead => {
            const isBooked = lead.status === 'booked';
            const commentsCount = lead.follow_up_comments?.length || 0;
            const latestComment = lead.follow_up_comments && lead.follow_up_comments.length > 0 
              ? lead.follow_up_comments[0] 
              : null;

            return (
              <div key={lead.id} className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-md">
                {/* Header: Name, Phone & Source */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-white text-sm truncate">{lead.customer_name}</h4>
                      <span className="text-[10px] text-neutral-400 uppercase px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 font-mono shrink-0">
                        {lead.source}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                      <a href={`tel:${lead.customer_phone}`} className="hover:text-sky-400 font-mono flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{lead.customer_phone}</span>
                      </a>
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={lead.status}
                    onChange={(e) => handleQuickStatusChange(lead.id, e.target.value as LeadStatus)}
                    className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border transition-all cursor-pointer focus:outline-none shrink-0 ${
                      lead.status === 'booked' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' :
                      lead.status === 'need_follow_up' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' :
                      lead.status === 'contacted' ? 'bg-sky-500/15 border-sky-500/30 text-sky-300' :
                      lead.status === 'lost_to_availability' ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' :
                      'bg-neutral-900 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <option value="need_follow_up">Need Follow-Up</option>
                    <option value="contacted">Contacted</option>
                    <option value="booked">Booked ✓</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="lost_to_availability">Lost: Unavailable</option>
                    <option value="lost_to_price">Lost: Price High</option>
                    <option value="postponed">Postponed</option>
                  </select>
                </div>

                {/* Machine Preference & Dates */}
                <div className="bg-black/60 p-3 rounded-xl border border-neutral-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Vehicle</span>
                    <span className="font-semibold text-white truncate block">
                      {lead.specific_vehicle_name || lead.vehicle_preference.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Dates</span>
                    <span className="font-semibold text-white block">
                      {lead.pickup_date} ({lead.rental_duration_days}D)
                    </span>
                  </div>
                </div>

                {/* Follow-Up Details & Date Bar (Clickable to edit details) */}
                {lead.status === 'need_follow_up' && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                        <span>Follow-Up: {lead.follow_up_date || 'Date Not Set'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenScheduleFollowUpModal(lead)}
                        className="text-[10px] font-bold text-amber-400 hover:text-white px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/30 transition-all cursor-pointer"
                        title="Edit follow-up schedule and details"
                      >
                        ✎ Edit Details
                      </button>
                    </div>
                    {lead.notes && (
                      <p className="text-[11px] text-neutral-300 italic line-clamp-1">
                        "{lead.notes}"
                      </p>
                    )}
                  </div>
                )}

                {/* Latest Follow-Up Comment Snippet (if followed up later) */}
                {latestComment && (
                  <div className="bg-neutral-900/70 p-2.5 rounded-xl border border-neutral-800 text-[11px] space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 font-semibold">
                      <span className="flex items-center gap-1 text-sky-400">
                        <span>💬</span> Latest Note
                      </span>
                      <span>{new Date(latestComment.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-neutral-200 line-clamp-2">
                      {latestComment.comment}
                    </p>
                  </div>
                )}

                {/* Mobile Action Buttons Bar */}
                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {/* Call Customer */}
                    <a
                      href={`tel:${lead.customer_phone}`}
                      className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-sky-400 border border-neutral-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Call customer"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>Call</span>
                    </a>

                    {/* WhatsApp */}
                    <a
                      href={getWhatsAppFollowUpUrl(lead)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="WhatsApp customer"
                    >
                      <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.882-4.434 9.885-9.885.002-2.641-1.026-5.124-2.893-6.992-1.867-1.868-4.35-2.896-6.992-2.897-5.451 0-9.885 4.434-9.887 9.884-.001 2.126.602 3.738 1.611 5.421l-.999 3.646 3.883-.769zm10.875-6.193c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      </svg>
                      <span>Chat</span>
                    </a>

                    {/* Edit Lead Info */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(lead)}
                      className="p-1.5 rounded-xl bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800 text-xs transition-colors"
                      title="Edit inquiry details"
                    >
                      ✎
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Add Comment / View History */}
                    <button
                      type="button"
                      onClick={() => handleOpenFollowUpCommentsModal(lead)}
                      className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 transition-colors"
                      title="Log follow-up discussion & comments"
                    >
                      <span>💬</span>
                      <span>{commentsCount > 0 ? `${commentsCount} Logged` : '+ Comment'}</span>
                    </button>

                    {/* Convert to Booking */}
                    {!isBooked ? (
                      <button
                        type="button"
                        onClick={() => handleOpenConvertModal(lead)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all active:scale-95"
                      >
                        Convert →
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                        ✓ Booked
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP LEADS TABLE (Hidden on small screens) */}
      <div className="hidden md:block bg-[#0a0a0a] border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/60 border-b border-neutral-800 text-neutral-400 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="px-5 py-4">Customer & Channel</th>
                <th className="px-5 py-4">Vehicle Preference</th>
                <th className="px-5 py-4">Dates & Duration</th>
                <th className="px-5 py-4">Purpose</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Follow-Up & Comments</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-neutral-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="font-semibold text-neutral-400">No inquiry records found</p>
                      <p className="text-[11px] text-neutral-500">
                        {searchQuery || statusFilter !== 'all' 
                          ? 'Try resetting your search filters.' 
                          : 'Click "+ Log New Inquiry" to log calls or WhatsApp inquiries.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map(lead => {
                  const isBooked = lead.status === 'booked';
                  const commentsCount = lead.follow_up_comments?.length || 0;

                  return (
                    <tr key={lead.id} className="hover:bg-neutral-900/40 transition-colors">
                      {/* Customer & Channel */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{lead.customer_name}</span>
                          <span className="text-[10px] text-neutral-500 uppercase px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 font-mono">
                            {lead.source}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-neutral-400 mt-1">
                          <a 
                            href={`tel:${lead.customer_phone}`}
                            className="hover:text-sky-400 font-mono text-xs flex items-center gap-1"
                            title="Call customer"
                          >
                            <svg className="w-3 h-3 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{lead.customer_phone}</span>
                          </a>
                        </div>
                      </td>

                      {/* Vehicle Preference */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">
                          {lead.vehicle_preference === 'scooty' && <span>Scooty</span>}
                          {lead.vehicle_preference === 'bullet' && <span className="text-sky-400">Bullet</span>}
                          {lead.vehicle_preference === 'sports' && <span className="text-emerald-400">Sports</span>}
                          {lead.vehicle_preference === 'bike' && <span>Commuter Bike</span>}
                          {lead.vehicle_preference === 'flexible' && <span className="text-neutral-400">Flexible</span>}
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          {lead.specific_vehicle_name || 'Any model in category'}
                        </div>
                      </td>

                      {/* Dates & Duration */}
                      <td className="px-5 py-4">
                        <div className="text-neutral-200 font-medium">{lead.pickup_date}</div>
                        <div className="text-neutral-400 text-[11px] mt-0.5">
                          to {lead.return_date} ({lead.rental_duration_days} Day{lead.rental_duration_days > 1 ? 's' : ''})
                        </div>
                      </td>

                      {/* Purpose */}
                      <td className="px-5 py-4">
                        <span className="text-neutral-300 font-medium block">{lead.purpose}</span>
                        {lead.budget_expectation && (
                          <span className="text-[10px] text-neutral-500 block mt-0.5">{lead.budget_expectation}</span>
                        )}
                      </td>

                      {/* Status Dropdown */}
                      <td className="px-5 py-4">
                        <select
                          value={lead.status}
                          onChange={(e) => handleQuickStatusChange(lead.id, e.target.value as LeadStatus)}
                          className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border transition-all cursor-pointer focus:outline-none ${
                            lead.status === 'booked' 
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' :
                            lead.status === 'need_follow_up' 
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' :
                            lead.status === 'contacted' 
                              ? 'bg-sky-500/15 border-sky-500/30 text-sky-300' :
                            lead.status === 'lost_to_availability'
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' :
                              'bg-neutral-900 border-neutral-800 text-neutral-400'
                          }`}
                        >
                          <option value="need_follow_up">Need Follow-Up</option>
                          <option value="contacted">Contacted</option>
                          <option value="booked">Booked ✓</option>
                          <option value="not_interested">Not Interested</option>
                          <option value="lost_to_availability">Lost: Bike Unavailable</option>
                          <option value="lost_to_price">Lost: Price High</option>
                          <option value="postponed">Postponed</option>
                        </select>
                      </td>

                      {/* Follow-up & Comments History */}
                      <td className="px-5 py-4 max-w-xs">
                        {lead.status === 'need_follow_up' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                              <span className="text-amber-400 font-bold text-xs">
                                Follow-Up: {lead.follow_up_date || 'Date not set'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenScheduleFollowUpModal(lead)}
                                className="text-[10px] text-amber-300 hover:text-white px-1.5 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 transition-all cursor-pointer"
                                title="Edit follow-up schedule and details"
                              >
                                ✎ Details
                              </button>
                            </div>
                            {lead.notes && (
                              <p className="text-neutral-300 text-xs italic truncate" title={lead.notes}>
                                "{lead.notes}"
                              </p>
                            )}
                          </div>
                        ) : lead.follow_up_date && !isBooked ? (
                          <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
                            <span>Follow-Up: {lead.follow_up_date}</span>
                          </div>
                        ) : (
                          <p className="text-neutral-400 text-xs truncate" title={lead.notes}>
                            {lead.notes || <span className="text-neutral-600 italic">No notes</span>}
                          </p>
                        )}

                        {/* Latest follow-up comment snippet if logged */}
                        {lead.follow_up_comments && lead.follow_up_comments.length > 0 && (
                          <p className="text-neutral-300 text-[11px] truncate mt-1 flex items-center gap-1">
                            <span className="text-sky-400">💬</span>
                            <span className="italic truncate">"{lead.follow_up_comments[0].comment}"</span>
                          </p>
                        )}
                        
                        {/* Comments button with counter */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenFollowUpCommentsModal(lead)}
                            className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer bg-neutral-900/80 hover:bg-neutral-800 px-2 py-0.5 rounded-lg border border-neutral-800 transition-colors"
                          >
                            <span>💬</span>
                            <span>{commentsCount > 0 ? `${commentsCount} Comment${commentsCount > 1 ? 's' : ''}` : '+ Add Comment'}</span>
                          </button>
                          {lead.converted_booking_id && (
                            <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                              · Ref: {lead.converted_booking_id}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {/* Convert to Booking Button */}
                          {!isBooked ? (
                            <button
                              type="button"
                              onClick={() => handleOpenConvertModal(lead)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                              title="Convert this lead to a confirmed booking slot"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Convert to Booking</span>
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                              ✓ Booked
                            </span>
                          )}

                          {/* Follow-Up / Comments Log Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenFollowUpCommentsModal(lead)}
                            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-all cursor-pointer"
                            title="Add follow-up notes & view comment history"
                          >
                            <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </button>

                          {/* WhatsApp Follow-up */}
                          <a
                            href={getWhatsAppFollowUpUrl(lead)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/30 transition-all cursor-pointer"
                            title="Send WhatsApp follow-up message"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.882-4.434 9.885-9.885.002-2.641-1.026-5.124-2.893-6.992-1.867-1.868-4.35-2.896-6.992-2.897-5.451 0-9.885 4.434-9.887 9.884-.001 2.126.602 3.738 1.611 5.421l-.999 3.646 3.883-.769zm10.875-6.193c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            </svg>
                          </a>

                          {/* Direct Call */}
                          <a
                            href={`tel:${lead.customer_phone}`}
                            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-all cursor-pointer"
                            title="Call customer"
                          >
                            <svg className="w-3.5 h-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </a>

                          {/* Edit Lead */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(lead)}
                            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-all cursor-pointer"
                            title="Edit details"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteLead(lead)}
                            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-rose-500/20 text-neutral-500 hover:text-rose-400 border border-neutral-800 transition-all cursor-pointer"
                            title="Delete record"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROMPT MODAL: SCHEDULE FOLLOW-UP DATE & DETAILS */}
      {schedulePromptLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-neutral-800 w-full max-w-lg rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-fade-in my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0"></span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Follow-Up Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSchedulePromptLead(null)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Customer Summary */}
            <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800/80 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-white">{schedulePromptLead.customer_name}</span>
                <div className="text-neutral-400 font-mono text-[11px] mt-0.5">{schedulePromptLead.customer_phone}</div>
              </div>
              <div className="text-right">
                <span className="text-amber-400 font-semibold">{schedulePromptLead.specific_vehicle_name || schedulePromptLead.vehicle_preference.toUpperCase()}</span>
                <div className="text-neutral-500 text-[10px] mt-0.5">
                  {schedulePromptLead.pickup_date} ({schedulePromptLead.rental_duration_days}D)
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmScheduleFollowUp} className="space-y-3.5">
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                  Follow-Up Date *
                </label>
                <input
                  type="date"
                  required
                  value={promptFollowUpDate}
                  onChange={(e) => setPromptFollowUpDate(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Date Shortcuts */}
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: 'Today', days: 0 },
                    { label: 'Tomorrow', days: 1 },
                    { label: '+2 Days', days: 2 },
                    { label: '+7 Days', days: 7 }
                  ].map(sc => (
                    <button
                      key={sc.label}
                      type="button"
                      onClick={() => {
                        const targetDate = new Date(Date.now() + sc.days * 86400000).toISOString().split('T')[0];
                        setPromptFollowUpDate(targetDate);
                      }}
                      className="px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white transition-all cursor-pointer"
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Follow-up Note */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-neutral-400 block">
                  Notes
                </label>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    'Call evening',
                    'Waiting confirmation',
                    'Advance tonight',
                    'Discount offered',
                    'Sent photos',
                    'Sent WhatsApp'
                  ].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setPromptFollowUpNote(prev => prev ? `${prev} · ${chip}` : chip)}
                      className="px-2 py-0.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white transition-all cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  placeholder="Notes..."
                  value={promptFollowUpNote}
                  onChange={(e) => setPromptFollowUpNote(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSchedulePromptLead(null)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Save Follow-Up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOLLOW-UP COMMENTS & HISTORY MODAL (When followed up later) */}
      {followUpModalLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-neutral-800 w-full max-w-xl rounded-3xl p-6 sm:p-7 space-y-6 shadow-2xl animate-fade-in my-8 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                  <h3 className="text-lg font-heading tracking-wide uppercase text-white">
                    Follow-Up Log & Comments
                  </h3>
                </div>
                <div className="text-xs text-neutral-400 mt-1 flex items-center gap-2">
                  <span className="font-semibold text-white">{followUpModalLead.customer_name}</span>
                  <span>·</span>
                  <a href={`tel:${followUpModalLead.customer_phone}`} className="text-sky-400 hover:underline">
                    {followUpModalLead.customer_phone}
                  </a>
                  <span>·</span>
                  <span className="text-neutral-500">{followUpModalLead.specific_vehicle_name || followUpModalLead.vehicle_preference}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFollowUpModalLead(null)}
                className="text-neutral-400 hover:text-white p-2 rounded-xl bg-neutral-900 border border-neutral-800"
              >
                ✕
              </button>
            </div>

            {/* Quick Contact Bar */}
            <div className="bg-black p-3.5 rounded-2xl border border-neutral-800 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Direct Actions:</span>
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${followUpModalLead.customer_phone}`}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-sky-400 border border-neutral-800 text-xs font-semibold flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>Call Now</span>
                </a>
                <a
                  href={getWhatsAppFollowUpUrl(followUpModalLead)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 hover:text-black text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.882-4.434 9.885-9.885.002-2.641-1.026-5.124-2.893-6.992-1.867-1.868-4.35-2.896-6.992-2.897-5.451 0-9.885 4.434-9.887 9.884-.001 2.126.602 3.738 1.611 5.421l-.999 3.646 3.883-.769zm10.875-6.193c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  </svg>
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Log New Comment Form */}
            <form onSubmit={handleSaveFollowUpComment} className="space-y-3 bg-black/60 p-3.5 rounded-2xl border border-neutral-800">
              <label className="text-[10px] uppercase font-bold text-white block">
                Add Comment *
              </label>

              {/* Quick Comment Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  'Spoke on call',
                  'Confirmed booking',
                  'Checking friends',
                  '₹100 discount',
                  'Sent photos',
                  'Not answered',
                  'Postponed'
                ].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setNewCommentText(prev => prev ? `${prev} · ${chip}` : chip)}
                    className="px-2 py-0.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white transition-all cursor-pointer"
                  >
                    + {chip}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                required
                placeholder="Enter details of what was discussed, customer reaction, or next steps..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:border-sky-500 focus:outline-none"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1 font-semibold uppercase">
                    Status After Follow-Up
                  </label>
                  <select
                    value={statusAfterComment}
                    onChange={(e) => setStatusAfterComment(e.target.value as LeadStatus)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                  >
                    <option value="need_follow_up">Need Follow-Up</option>
                    <option value="contacted">Contacted</option>
                    <option value="booked">Booked</option>
                    <option value="postponed">Postponed</option>
                    <option value="not_interested">Not Interested</option>
                  </select>
                </div>

                {statusAfterComment === 'need_follow_up' && (
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1 font-semibold uppercase">
                      Next Follow-Up Date
                    </label>
                    <input
                      type="date"
                      value={nextFollowUpDate}
                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                >
                  Save Comment
                </button>
              </div>
            </form>

            {/* Comment History & Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Follow-Up History & Notes ({followUpModalLead.follow_up_comments?.length || 0})
              </h4>

              {(!followUpModalLead.follow_up_comments || followUpModalLead.follow_up_comments.length === 0) ? (
                <div className="bg-black p-4 rounded-xl border border-neutral-800 text-center text-xs text-neutral-500">
                  No comments logged yet. Use the form above to record your conversation details.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {followUpModalLead.follow_up_comments.map((comm, idx) => (
                    <div key={comm.id || idx} className="bg-black p-3 rounded-xl border border-neutral-800 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-neutral-500">
                        <span>{new Date(comm.timestamp).toLocaleString()}</span>
                        {comm.status_after && (
                          <span className="uppercase font-semibold text-neutral-400">
                            Status: {comm.status_after.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-200 font-medium leading-relaxed">{comm.comment}</p>
                      {comm.next_follow_up_date && (
                        <span className="text-[10px] text-amber-400 font-semibold block">
                          Next scheduled: {comm.next_follow_up_date}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* FAST DATA ENTRY MODAL (MINIMAL TYPING, MOSTLY DROPDOWNS & CHIPS) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-neutral-800 w-full max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in my-8 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3.5">
              <h3 className="text-base font-bold uppercase tracking-wider text-white">
                {editingLead ? 'Edit Lead' : 'Log Lead'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-white p-2 rounded-xl bg-neutral-900 border border-neutral-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-4">
              
              {/* Channel & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Channel *
                  </label>
                  <select
                    value={leadForm.source}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, source: e.target.value as LeadSource }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="call">Call</option>
                    <option value="walk_in">Walk-in</option>
                    <option value="instagram">Instagram</option>
                    <option value="website">Website</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Customer Name"
                    value={leadForm.customer_name}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit number"
                    value={leadForm.customer_phone}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, customer_phone: e.target.value.replace(/\D/g, '') }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Bike Category (Clean buttons without any icons or descriptive subtext) */}
              <div className="space-y-2 bg-black p-3.5 rounded-2xl border border-neutral-800">
                <label className="text-[10px] uppercase font-bold text-neutral-400 block">
                  Category *
                </label>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'scooty', label: 'Scooty' },
                    { id: 'bullet', label: 'Bullet' },
                    { id: 'bike', label: 'Bike' },
                    { id: 'sports', label: 'Sports' },
                    { id: 'flexible', label: 'Flexible' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setLeadForm(prev => ({ ...prev, vehicle_preference: cat.id as LeadVehiclePreference, specific_vehicle_id: null }))}
                      className={`py-2 px-3 rounded-xl text-center border text-xs font-bold transition-all cursor-pointer ${
                        leadForm.vehicle_preference === cat.id
                          ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-sm'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Specific Vehicle Dropdown */}
                <div className="pt-1">
                  <select
                    value={leadForm.specific_vehicle_id || ''}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, specific_vehicle_id: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">Any {leadForm.vehicle_preference} (Flexible model)</option>
                    {filteredVehiclesForPreference.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} — ₹{b.dailyRate}/day
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates & Duration */}
              <div className="space-y-2 bg-black p-3.5 rounded-2xl border border-neutral-800">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Dates *
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button type="button" onClick={() => applyDatePreset('today')} className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300">Today</button>
                    <button type="button" onClick={() => applyDatePreset('tomorrow')} className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300">Tomorrow</button>
                    <button type="button" onClick={() => applyDatePreset('weekend')} className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300">Weekend</button>
                    <button type="button" onClick={() => applyDatePreset('nextWeek')} className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300">+7D</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] text-neutral-500 block mb-1">Pickup</label>
                    <input
                      type="date"
                      required
                      value={leadForm.pickup_date}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        const days = leadForm.rental_duration_days || 1;
                        const end = new Date(new Date(newStart).getTime() + days * 86400000).toISOString().split('T')[0];
                        setLeadForm(prev => ({ ...prev, pickup_date: newStart, return_date: end }));
                      }}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-500 block mb-1">Return</label>
                    <input
                      type="date"
                      required
                      value={leadForm.return_date}
                      onChange={(e) => {
                        const newEnd = e.target.value;
                        const start = new Date(leadForm.pickup_date).getTime();
                        const end = new Date(newEnd).getTime();
                        const days = Math.max(1, Math.round((end - start) / 86400000));
                        setLeadForm(prev => ({ ...prev, return_date: newEnd, rental_duration_days: days }));
                      }}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-500 block mb-1">Days</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 7].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => applyDurationPreset(d)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            leadForm.rental_duration_days === d
                              ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {d}D
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Purpose & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Purpose *
                  </label>
                  <select
                    value={leadForm.purpose}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, purpose: e.target.value as RentalPurpose }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="Weekend Trip / Outing">Weekend Trip</option>
                    <option value="Daily Commute / Office">Daily Commute</option>
                    <option value="Local City Errands">City Errands</option>
                    <option value="Long Highway Tour">Highway Tour</option>
                    <option value="Exam / Interview / Work">Exam / Work</option>
                    <option value="Vehicle in Service / Replacement">Bike in Service</option>
                    <option value="Wedding / Family Function">Wedding / Function</option>
                    <option value="Joyride / Trial">Joyride</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Status *
                  </label>
                  <select
                    value={leadForm.status}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, status: e.target.value as LeadStatus }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="need_follow_up">Need Follow-Up</option>
                    <option value="contacted">Contacted</option>
                    <option value="booked">Booked</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="lost_to_availability">Lost - Unavailable</option>
                    <option value="lost_to_price">Lost - Price High</option>
                    <option value="postponed">Postponed</option>
                  </select>
                </div>
              </div>

              {/* Follow-up Date Input (shown when status is need_follow_up) */}
              {leadForm.status === 'need_follow_up' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                      Follow-Up Schedule *
                    </span>
                    <span className="text-[10px] text-amber-400 font-medium">Prompt on status</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Date *</label>
                      <input
                        type="date"
                        required
                        value={leadForm.follow_up_date}
                        onChange={(e) => setLeadForm(prev => ({ ...prev, follow_up_date: e.target.value }))}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Quick Date</label>
                      <div className="flex items-center gap-1 flex-wrap">
                        {['Today', 'Tomorrow', '+2 Days', '+7 Days'].map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              const now = new Date();
                              let d = now;
                              if (preset === 'Tomorrow') d = new Date(now.getTime() + 86400000);
                              else if (preset === '+2 Days') d = new Date(now.getTime() + 2 * 86400000);
                              else if (preset === '+7 Days') d = new Date(now.getTime() + 7 * 86400000);
                              setLeadForm(prev => ({ ...prev, follow_up_date: d.toISOString().split('T')[0] }));
                            }}
                            className="px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 font-semibold cursor-pointer"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-neutral-400 block">
                  Notes
                </label>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    'Discount',
                    'Home Delivery',
                    'Solo',
                    'Helmet',
                    'Tour',
                    'Friends',
                    'Salary'
                  ].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => appendNoteChip(chip)}
                      className="px-2 py-0.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white transition-all cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  placeholder="Notes..."
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {editingLead ? 'Save Changes' : 'Log Lead'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CONVERT TO BOOKING MODAL */}
      {convertingLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-neutral-800 w-full max-w-xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in my-8">
            
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Convert Lead → Confirmed Booking
                </span>
                <h3 className="text-lg font-heading tracking-wide uppercase text-white mt-0.5">
                  Lock Reservation for {convertingLead.customer_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConvertingLead(null)}
                className="text-neutral-400 hover:text-white p-2 rounded-xl bg-neutral-900 border border-neutral-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmConversion} className="space-y-5">
              <div className="bg-black p-4 rounded-2xl border border-neutral-800 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Rider Name</span>
                  <span className="text-white font-bold text-sm">{convertingLead.customer_name}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Phone Number</span>
                  <span className="text-white font-mono font-bold text-sm">{convertingLead.customer_phone}</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase font-bold text-neutral-400 block mb-1.5">
                  Select Machine Slot *
                </label>
                <select
                  value={convertForm.bikeId}
                  onChange={(e) => setConvertForm(prev => ({ ...prev, bikeId: Number(e.target.value) }))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:border-orange-500 focus:outline-none"
                >
                  {allFleetBikes.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} — ₹{b.dailyRate}/day ({b.category}) {b.rc_number ? `· ${b.rc_number}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                    Pickup Date & Time
                  </label>
                  <input
                    type="date"
                    required
                    value={convertForm.pickupDate}
                    onChange={(e) => setConvertForm(prev => ({ ...prev, pickupDate: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white mb-2"
                  />
                  <input
                    type="time"
                    required
                    value={convertForm.pickupTime}
                    onChange={(e) => setConvertForm(prev => ({ ...prev, pickupTime: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                    Return Date & Time
                  </label>
                  <input
                    type="date"
                    required
                    value={convertForm.returnDate}
                    onChange={(e) => setConvertForm(prev => ({ ...prev, returnDate: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white mb-2"
                  />
                  <input
                    type="time"
                    required
                    value={convertForm.returnTime}
                    onChange={(e) => setConvertForm(prev => ({ ...prev, returnTime: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-black p-4 rounded-2xl border border-neutral-800">
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1 uppercase font-semibold">Advance (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={convertForm.advanceAmount}
                    onChange={(e) => setConvertForm(prev => ({ ...prev, advanceAmount: Number(e.target.value) }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1 uppercase font-semibold">Deposit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={convertForm.depositAmount}
                    onChange={(e) => setConvertForm(prev => ({ ...prev, depositAmount: Number(e.target.value) }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1 uppercase font-semibold">Method</label>
                  <select
                    value={convertForm.paymentMethod}
                    onChange={(e) => setConvertForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setConvertingLead(null)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Creating Booking...' : 'Confirm & Create Booking'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
